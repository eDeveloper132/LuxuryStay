// src/memory/memoryStore.ts
// Works with a range of @pinecone-database/pinecone SDK versions.
// Stores hashed email (emailHash) instead of raw email in metadata for privacy.
import { v4 as uuidv4 } from 'uuid';
import "dotenv/config";
import OpenAI from 'openai';
import crypto from 'crypto';
import { Pinecone } from '@pinecone-database/pinecone'; // some SDK versions use PineconeClient instead
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENV = process.env.PINECONE_ENV;
const PINECONE_INDEX = process.env.PINECONE_INDEX ?? 'luxurystay-conversations';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_EMBED_MODEL = process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small';
const MEMORY_TOP_K = Number(process.env.MEMORY_TOP_K ?? 5);
const UPSERT_BATCH_SIZE = Number(process.env.MEMORY_UPSERT_BATCH_SIZE ?? 100);
let pineconeClient = null;
let pineconeIndex = null;
let openai = null;
async function initClientsIfNeeded() {
    if (!openai) {
        if (!OPENAI_API_KEY)
            throw new Error('OPENAI_API_KEY not set');
        openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    }
    if (!pineconeClient) {
        if (!PINECONE_API_KEY)
            throw new Error('PINECONE_API_KEY not set');
        // Construct client - specific import differs by SDK version; this tries common modern constructor
        pineconeClient = new Pinecone({ apiKey: PINECONE_API_KEY });
    }
    if (!pineconeIndex) {
        // support both `.index(name)` and `.Index(name)` accessors across versions
        pineconeIndex = typeof pineconeClient.index === 'function'
            ? pineconeClient.index(PINECONE_INDEX)
            : pineconeClient.Index
                ? pineconeClient.Index(PINECONE_INDEX)
                : null;
        if (!pineconeIndex) {
            throw new Error('Cannot get Pinecone index accessor for the configured client');
        }
    }
}
/** Hash an email with SHA-256 and return hex string. Use lowercased email. */
function emailToHash(email) {
    return crypto.createHash('sha256').update(String(email).toLowerCase()).digest('hex');
}
/** Very simple PII redaction: removes emails and common phone patterns */
export function redactPII(text) {
    if (!text)
        return '';
    let t = String(text);
    // redact emails
    t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g, '[REDACTED_EMAIL]');
    // redact phone numbers (loose)
    t = t.replace(/(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g, (m) => {
        if (/^\d{4}$/.test(m.trim()))
            return m; // allow year-like short numbers
        return '[REDACTED_PHONE]';
    });
    t = t.replace(/\s+/g, ' ').trim();
    return t;
}
/** Chunk a long text into smaller pieces for embeddings (keeps them < ~1000 chars). */
function chunkText(text, chunkSize = 900) {
    const ret = [];
    let i = 0;
    while (i < text.length) {
        ret.push(text.slice(i, i + chunkSize));
        i += chunkSize;
    }
    return ret;
}
export async function embedText(text) {
    await initClientsIfNeeded();
    const clean = String(text).slice(0, 8192);
    const resp = await openai.embeddings.create({ model: OPENAI_EMBED_MODEL, input: clean });
    const vec = resp.data?.[0]?.embedding;
    if (!vec)
        throw new Error('No embedding returned from OpenAI');
    return vec;
}
/**
 * Upsert a conversation snippet(s) for a given email (hashed in metadata).
 * We redact PII (emails/phones) in the stored `text`.
 */
export async function upsertConversation(email, role, text) {
    try {
        if (!email)
            throw new Error('email required');
        await initClientsIfNeeded();
        const emailHash = emailToHash(email);
        const redacted = redactPII(text).slice(0, 2000);
        const chunks = chunkText(redacted, 900);
        // Generate embeddings in parallel (chunks count is usually small)
        const embedPromises = chunks.map((c) => embedText(c));
        const embeddings = await Promise.all(embedPromises);
        // Build vector objects
        const vectors = embeddings.map((vec, i) => ({
            id: uuidv4(),
            values: vec,
            metadata: {
                emailHash,
                role,
                text: chunks[i],
                ts: Date.now()
            }
        }));
        // Batch upsert vectors
        for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
            const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE);
            // try modern wrapper shapes with graceful fallbacks
            let upsertErr = null;
            try {
                if (typeof pineconeIndex.upsert === 'function') {
                    // try object wrapper first
                    try {
                        await pineconeIndex.upsert({ vectors: batch });
                    }
                    catch (err) {
                        // fallback to direct array param
                        await pineconeIndex.upsert(batch);
                    }
                }
                else if (typeof pineconeIndex.upsertMany === 'function') {
                    await pineconeIndex.upsertMany(batch);
                }
                else if (typeof pineconeIndex.upsert === 'undefined' && pineconeIndex.upsert !== null) {
                    // older envelope format
                    await pineconeIndex.upsert({ upsertRequest: { vectors: batch } });
                }
                else {
                    throw new Error('No known upsert method on pineconeIndex');
                }
            }
            catch (err) {
                upsertErr = err;
            }
            if (upsertErr) {
                console.error('❌ Pinecone upsert error for a batch:', upsertErr);
                // continue to next batch — don't throw to avoid breaking main flow: memory is "best-effort"
            }
        }
    }
    catch (err) {
        console.error('❌ upsertConversation error:', err);
    }
}
/**
 * Fetch relevant memory for given plain email and query.
 * We compute query embedding, search using emailHash filter, and return matches.
 */
export async function fetchRelevantMemory(email, query, topK = MEMORY_TOP_K) {
    try {
        if (!email)
            return [];
        await initClientsIfNeeded();
        const emailHash = emailToHash(email);
        const qvec = await embedText(redactPII(query).slice(0, 2000));
        // Build query object
        const queryReq = {
            vector: qvec,
            topK,
            includeMetadata: true,
            filter: { emailHash }
        };
        let resp = null;
        try {
            resp = await pineconeIndex.query({ queryRequest: queryReq });
        }
        catch (err) {
            // fallback shape
            resp = await pineconeIndex.query(queryReq);
        }
        const matches = resp?.matches ?? resp?.results?.[0]?.matches ?? [];
        return (matches ?? []).map((m) => ({
            id: m.id,
            score: m.score,
            text: m.metadata?.text ?? '',
            role: m.metadata?.role ?? 'user',
            ts: m.metadata?.ts ?? 0
        }));
    }
    catch (err) {
        console.error('❌ fetchRelevantMemory error:', err);
        return [];
    }
}
