import { OpenAI } from "openai";

// AI Model Configuration
// Set these in your .env file:
// OPENAI_API_KEY=your-api-key
// OPENAI_MODEL=gpt-4o-mini (optional, defaults to gpt-4o-mini)
// OPENAI_MODEL_ADVANCED=gpt-4o (optional, for complex tasks like idea scoring)

export const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
export const AI_MODEL_ADVANCED = process.env.OPENAI_MODEL_ADVANCED || "gpt-4o";

// Singleton OpenAI client
let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// Helper to make AI completions with standard settings
export async function aiComplete(options: {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  jsonMode?: boolean;
}) {
  const client = getOpenAIClient();
  const model = options.model || AI_MODEL;

  const response = await client.chat.completions.create({
    model,
    messages: [
      ...(options.systemPrompt
        ? [{ role: "system" as const, content: options.systemPrompt }]
        : []),
      { role: "user" as const, content: options.prompt },
    ],
    ...(options.jsonMode && { response_format: { type: "json_object" as const } }),
  });

  return response.choices[0].message.content || "";
}
