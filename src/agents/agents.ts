// src/agent/agent.ts

import { ToolContext } from "../types/types.js";
import { tools } from "../tools/index.js";
import { createChatCompletion } from "../client/client.js";


const MODEL = 'gpt-4o-mini'; // change to actual available model

export class Agent {
  maxSteps = 6;

  // run(prompt, context) -> context should include userId and role
  async run(userPrompt: string, context: ToolContext = {}) {
    const systemMsg = {
      role: 'system',
      content:
        'You are a bookings assistant. Always prefer calling the provided tools when you have the required arguments. ' +
        'If the user message contains an email, you should either call get_user_by_email OR include the email when calling book_room. ' +
        'If the context contains an authenticated userId, use it and do not ask for the user id again. ' +
        'Do not ask the user to "create an account" unless the required fields are missing or the user explicitly asks for account creation. ' +
        'When details are missing, ask a single clarifying question. Only call tools when you have the required arguments.'
    };
    const contextMsg = {
      role: 'system',
      content: `Context: userId=${context.userId ?? 'none'}, role=${context.role ?? 'none'}, cookiePresent=${context.cookie ? 'yes' : 'no'}. ` +
              'If userId is provided, treat the request as authenticated and use userId when calling booking APIs. Do not ask for the user id again.'
    };
    const messages: any[] = [systemMsg, contextMsg, { role: 'user', content: userPrompt }];

    for (let step = 0; step < this.maxSteps; step++) {
      const choice = await createChatCompletion({
        model: MODEL,
        messages,
        functions: Object.values(tools).map((t) => t.schema),
        function_call: 'auto',
        max_tokens: 800
      });

      const msg = choice?.message;
      if (!msg) return { success: false, result: 'No response from model' };

      if (msg.function_call) {
        const funcName = msg.function_call.name;
        let argsRaw = msg.function_call.arguments ?? '{}';
        let args: Record<string, unknown> = {};
        try {
          args = typeof argsRaw === 'string' ? JSON.parse(argsRaw) : argsRaw;
        } catch {
          args = {};
        }

        const toolEntry = (tools as any)[funcName];
        if (!toolEntry) {
          messages.push({ role: 'assistant', content: `Tried to call unknown tool: ${funcName}` });
          break;
        }

        // Execute tool with provided args and context
        const toolOutput = await toolEntry.handler(args, context);

        // Add assistant function call and function result to history so LLM can produce final answer
        messages.push({
          role: 'assistant',
          content: null,
          name: funcName,
          function_call: { name: funcName, arguments: JSON.stringify(args) },
        });
        messages.push({ role: 'function', name: funcName, content: toolOutput });

        // Continue loop to let model synthesize final answer
        continue;
      }

      // final textual response
      if (msg.content) {
        return { success: true, result: msg.content };
      }
    }

    return { success: false, result: 'Max steps reached without final answer' };
  }
}
