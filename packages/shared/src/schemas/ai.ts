import { z } from "zod";

export const AiGenerationModeSchema = z.enum(["text", "image", "video"]);

export const AiGenerationCreateBodySchema = z.object({
  mode: AiGenerationModeSchema,
  prompt: z.string().trim().min(1).max(4000),
});

export const AiGenerationCreateResponseSchema = z.object({
  requestId: z.string().min(1),
  status: z.string(),
  model: z.string().nullable(),
  mode: AiGenerationModeSchema,
});

export const AiGenerationStatusResponseSchema = z.object({
  requestId: z.string().min(1),
  status: z.string(),
  responseType: z.string().nullable(),
  progress: z.number().nullable(),
  result: z.array(z.string()),
  fullResponse: z.array(z.unknown()),
});
