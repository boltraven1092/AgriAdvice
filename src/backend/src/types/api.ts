export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: ApiError | null;
};

export type ConsultationData = {
  sessionId?: string;
  detectedLanguage?: string;
  originalTranscript?: string;
  translatedResponse?: string;
  audio?: {
    mimeType: string;
    encoding: "base64";
    content: string;
  };
};
