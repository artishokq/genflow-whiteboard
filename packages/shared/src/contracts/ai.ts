export type AiGenerationMode = "text" | "image" | "video";

export type AiGenerationCreateResponse = {
  requestId: string;
  status: string;
  model: string | null;
  mode: AiGenerationMode;
};

export type AiGenerationStatusResponse = {
  requestId: string;
  status: string;
  responseType: string | null;
  progress: number | null;
  result: string[];
  fullResponse: unknown[];
};
