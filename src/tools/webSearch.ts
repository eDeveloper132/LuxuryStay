import { ToolHandler } from '../types/types.js';


// Simple SerpAPI wrapper; falls back to a mocked result if SERPAPI_API_KEY is missing.
export const webSearch: ToolHandler = async (args) => {
const q = String(args.query ?? '');
const apiKey = process.env.SERPAPI_API_KEY;


if (!q) return 'No query provided';


if (!apiKey) {
// In dev without a search key, return a placeholder that allows agent testing.
return `MOCK SEARCH: results for \"${q}\" (set SERPAPI_API_KEY to enable real search)`;
}


const params = new URLSearchParams({
q,
api_key: apiKey,
engine: 'google'
});


const url = `https://serpapi.com/search.json?${params.toString()}`;
try {
const r = await fetch(url);
const json = await r.json();
// Lightweight summarization: join top snippet snippets if present
const items = (json.organic_results ?? json.top ?? [])
.slice(0, 5)
.map((it: any) => (it.snippet ?? it.title ?? JSON.stringify(it)).toString());


return items.length ? items.join('\n---\n') : JSON.stringify(json).slice(0, 800);
} catch (err: any) {
return `Search error: ${err.message ?? String(err)}`;
}
};