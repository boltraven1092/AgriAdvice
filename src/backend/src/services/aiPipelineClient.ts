import axios, { AxiosError } from "axios";
import { config } from "../config/env";
import { ConsultationData } from "../types/api";

const aiClient = axios.create({
  baseURL: config.aiMicroserviceUrl,
  timeout: config.downstreamTimeoutMs,
  headers: {
    "Content-Type": "application/json",
  },
});

type PythonResponse = {
  status: string;
  session_id?: string;
  detected_language?: string;
  original_transcript?: string;
  translated_response?: string;
  audio?: {
    mime_type: string;
    encoding: "base64";
    content: string;
  };
};

export async function requestConsultationByText(textQuery: string): Promise<ConsultationData> {
  try {
    const response = await aiClient.post<PythonResponse>("/api/agri-advice", {
      input_type: "text",
      text_query: textQuery,
    });
    return mapPythonResponse(response.data);
  } catch (error) {
    throw mapDownstreamError(error);
  }
}

export async function requestConsultationByAudio(base64Audio: string): Promise<ConsultationData> {
  try {
    const response = await aiClient.post<PythonResponse>("/api/agri-advice", {
      input_type: "audio",
      audio_base64: base64Audio,
    });
    return mapPythonResponse(response.data);
  } catch (error) {
    throw mapDownstreamError(error);
  }
}

function mapPythonResponse(payload: PythonResponse): ConsultationData {
  return {
    sessionId: payload.session_id,
    detectedLanguage: payload.detected_language,
    originalTranscript: payload.original_transcript,
    translatedResponse: payload.translated_response,
    audio: payload.audio
      ? {
          mimeType: payload.audio.mime_type,
          encoding: payload.audio.encoding,
          content: payload.audio.content,
        }
      : undefined,
  };
}

function mapDownstreamError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
    const statusCode = axiosError.response?.status ?? 502;
    const detail =
      axiosError.response?.data?.detail ??
      axiosError.response?.data?.message ??
      axiosError.message ??
      "Unknown downstream error";

    const downstreamError = new Error(`AI microservice error (${statusCode}): ${detail}`);
    (downstreamError as Error & { statusCode?: number }).statusCode =
      statusCode >= 400 && statusCode < 600 ? statusCode : 502;
    return downstreamError;
  }

  return new Error("Unexpected downstream communication failure");
}
