import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { type LanguageModel } from 'ai';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(0).max(65_535).default(8787),
  TUTOR_MODEL: z.string().min(1).default('openai/gpt-5-mini'),
  TUTOR_BASE_URL: z.url().optional(),
  TUTOR_API_KEY: z.string().optional(),
});

export type ServerConfig = {
  port: number;
  model: LanguageModel;
  modelLabel: string;
};

/**
 * Any provider, chosen by environment:
 * - TUTOR_BASE_URL set: an OpenAI-compatible endpoint (Ollama, LM Studio,
 *   vLLM, OpenRouter) with TUTOR_MODEL as its model name.
 * - otherwise: TUTOR_MODEL is an AI SDK global model id such as
 *   "openai/gpt-5-mini" or "google/gemini-2.5-flash", resolved through
 *   the AI Gateway with AI_GATEWAY_API_KEY.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = envSchema.parse({
    ...env,
    TUTOR_BASE_URL: env.TUTOR_BASE_URL || undefined,
  });

  if (parsed.TUTOR_BASE_URL) {
    const provider = createOpenAICompatible({
      name: 'tutor',
      baseURL: parsed.TUTOR_BASE_URL,
      apiKey: parsed.TUTOR_API_KEY,
      supportsStructuredOutputs: true,
    });
    return {
      port: parsed.PORT,
      model: provider.chatModel(parsed.TUTOR_MODEL),
      modelLabel: `${parsed.TUTOR_MODEL} @ ${new URL(parsed.TUTOR_BASE_URL).host}`,
    };
  }
  return { port: parsed.PORT, model: parsed.TUTOR_MODEL, modelLabel: parsed.TUTOR_MODEL };
}
