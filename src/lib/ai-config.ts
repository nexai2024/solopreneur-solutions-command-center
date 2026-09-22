import { OpenAI } from "openai";
import { withRetry, type RetryOptions } from "./retry";

// AI Model Configuration
// Set these in your .env file:
// OPENAI_API_KEY=your-api-key
// OPENAI_MODEL=gpt-4o-mini (optional, defaults to gpt-4o-mini)
// OPENAI_MODEL_ADVANCED=gpt-4o (optional, for complex tasks like idea scoring)

export const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
export const AI_MODEL_ADVANCED = process.env.OPENAI_MODEL_ADVANCED || "gpt-4o";

// Default retry options for OpenAI calls
const DEFAULT_AI_RETRY_OPTIONS: Partial<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 2000, // OpenAI recommends longer delays
  maxDelayMs: 60000,
  jitter: true,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  onRetry: (error, attempt, delayMs) => {
    console.warn(
      `[AI Retry] OpenAI call: Attempt ${attempt} failed. ` +
        `Retrying in ${Math.round(delayMs)}ms...`,
      error.message
    );
  },
};

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

// Helper to make AI completions with standard settings and retry logic
export async function aiComplete(options: {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  jsonMode?: boolean;
  retryOptions?: Partial<RetryOptions>;
}) {
  const client = getOpenAIClient();
  const model = options.model || AI_MODEL;

  const result = await withRetry(
    async () => {
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

      // Type assertion to handle the union return type
      const completion = response as OpenAI.ChatCompletion;
      return completion.choices[0]?.message?.content || "";
    },
    {
      ...DEFAULT_AI_RETRY_OPTIONS,
      operationName: `aiComplete(${model})`,
      ...options.retryOptions,
    }
  );

  if (!result.success) {
    throw result.error ?? new Error("AI completion failed after retries");
  }

  return result.data!;
}

// Helper for chat completions with retry (for direct client usage)
export async function chatCompletionWithRetry(
  params: Parameters<OpenAI["chat"]["completions"]["create"]>[0],
  retryOptions?: Partial<RetryOptions>
): Promise<OpenAI.ChatCompletion> {
  const client = getOpenAIClient();

  const result = await withRetry(
    async () => {
      const response = await client.chat.completions.create(params);
      // Type assertion to handle the union return type
      return response as OpenAI.ChatCompletion;
    },
    {
      ...DEFAULT_AI_RETRY_OPTIONS,
      operationName: `chatCompletion(${params.model})`,
      ...retryOptions,
    }
  );

  if (!result.success) {
    throw result.error ?? new Error("Chat completion failed after retries");
  }

  return result.data!;
}
