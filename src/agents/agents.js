// src/agent/agent.ts
import { tools } from "../tools/index.js";
import { createChatCompletion } from "../client/client.js";
import { fetchRelevantMemory, redactPII, upsertConversation } from "../memory/memoryStore.js";
const MODEL = 'gpt-4o-mini'; // change to actual available model
export class Agent {
    maxSteps = 6;
    // run(prompt, context) -> context should include userId, role, email, cookie
    async run(userPrompt, context = {}) {
        // Build base system messages
        const systemMsg = {
            role: 'system',
            content: 'You are a bookings assistant. Always prefer calling the provided tools when you have the required arguments. ' +
                'If the user message contains an email or email is provided in context you should either call get_user_by_email OR include the email when calling book_room. ' +
                'If the context contains an authenticated userId, use it and do not ask for the user id again. ' +
                'When details are missing, ask exactly one clarifying question. Only call tools when you have the required arguments.'
        };
        // Context summary message
        const contextMsg = {
            role: 'system',
            content: `Context: userId=${context.userId ?? 'none'}, role=${context.role ?? 'none'}, email=${context.email ?? 'none'}, cookiePresent=${context.cookie ? 'yes' : 'no'}.`
        };
        // If user is logged in with an email, fetch relevant memory and include as a system message
        let memoryMsg = null;
        try {
            if (context.email) {
                const memMatches = await fetchRelevantMemory(String(context.email), userPrompt, 5);
                if (Array.isArray(memMatches) && memMatches.length) {
                    const snippets = memMatches.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n---\n');
                    memoryMsg = {
                        role: 'system',
                        content: `Relevant past conversation (sanitized):\n${snippets}\n\nUse this only to provide context.`
                    };
                }
            }
        }
        catch (e) {
            // memory fetch failing should not break agent flow
            console.error('❌ memory fetch failed in agent.run:', e);
        }
        // Build initial messages array
        const messages = [systemMsg, contextMsg];
        if (memoryMsg)
            messages.push(memoryMsg);
        messages.push({ role: 'user', content: userPrompt });
        // Store initial user prompt in memory (non-blocking preferred but we'll await to ensure persistence)
        try {
            if (context.email) {
                // store just the sanitized user message
                await upsertConversation(String(context.email), 'user', redactPII(userPrompt).slice(0, 2000));
            }
        }
        catch (e) {
            console.error('❌ saving user prompt to memory failed:', e);
        }
        // Agent loop (function-calling)
        for (let step = 0; step < this.maxSteps; step++) {
            const choice = await createChatCompletion({
                model: MODEL,
                messages,
                functions: Object.values(tools).map((t) => t.schema),
                function_call: 'auto',
                max_tokens: 800
            });
            const msg = choice?.message;
            if (!msg)
                return { success: false, result: 'No response from model' };
            if (msg.function_call) {
                const funcName = msg.function_call.name;
                let argsRaw = msg.function_call.arguments ?? '{}';
                let args = {};
                try {
                    args = typeof argsRaw === 'string' ? JSON.parse(argsRaw) : argsRaw;
                }
                catch {
                    args = {};
                }
                const toolEntry = tools[funcName];
                if (!toolEntry) {
                    messages.push({ role: 'assistant', content: `Tried to call unknown tool: ${funcName}` });
                    break;
                }
                // Execute tool with provided args and context
                const toolOutput = await toolEntry.handler(args, context);
                // Save a concise sanitized summary of the tool call into memory (if email present)
                try {
                    if (context.email) {
                        const summaryText = `Tool: ${funcName}\nArgs: ${JSON.stringify(args)}\nResult: ${String(toolOutput).slice(0, 1000)}`;
                        await upsertConversation(String(context.email), 'tool', redactPII(summaryText));
                    }
                }
                catch (e) {
                    console.error('❌ upsert tool call summary failed:', e);
                }
                // Add assistant function call and function result to history so LLM can produce final answer
                messages.push({
                    role: 'assistant',
                    content: null,
                    name: funcName,
                    function_call: { name: funcName, arguments: JSON.stringify(args) },
                });
                messages.push({ role: 'function', name: funcName, content: String(toolOutput) });
                // Continue loop to let model synthesize final answer
                continue;
            }
            // final textual response from assistant
            if (msg.content) {
                const assistantReply = String(msg.content);
                // Save assistant reply to memory (if email present)
                try {
                    if (context.email) {
                        await upsertConversation(String(context.email), 'assistant', redactPII(assistantReply).slice(0, 2000));
                    }
                }
                catch (e) {
                    console.error('❌ saving assistant reply to memory failed:', e);
                }
                return { success: true, result: assistantReply };
            }
        }
        return { success: false, result: 'Max steps reached without final answer' };
    }
}
