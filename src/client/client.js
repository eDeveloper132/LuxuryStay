import OpenAI from 'openai';
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey)
    throw new Error('OPENAI_API_KEY is required in environment');
export const client = new OpenAI({ apiKey });
export async function createChatCompletion(opts) {
    const res = await client.chat.completions.create({
        model: opts.model,
        messages: opts.messages,
        functions: opts.functions,
        function_call: opts.function_call ?? 'auto',
        max_tokens: opts.max_tokens ?? 800
    });
    // Return the first choice (caller can inspect more if needed)
    return res.choices?.[0];
}
