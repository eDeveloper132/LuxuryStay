// src/types.ts
export type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type ToolContext = {
  userId?: string;         // logged-in user id (ObjectId string)
  role?: string;           // user role like 'guest'|'admin'
  [k: string]: unknown;
};

export type ToolHandler = (
  args: Record<string, unknown>,
  context?: ToolContext
) => Promise<string>;

export type CurrentUser = {
  userId: string | null;
  role: string | null;
  email: string | null;
};