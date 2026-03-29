import type { LanguageCode } from "../config/languages";
import { getAuthToken } from "./storage";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function buildUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
};

type AuthResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    preferredLanguage: LanguageCode;
  };
};

type PreferencePayload = {
  preferredLanguage: LanguageCode;
};

export type ConsultationRecord = {
  id: string;
  userId: string;
  createdAt: string;
  inputType: "text" | "audio";
  textQuery?: string;
  detectedLanguage?: string;
  originalTranscript?: string;
  translatedResponse?: string;
};

export type ConsultationResponse = {
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

async function parseEnvelope<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "Request failed");
  }
  return payload.data;
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(buildUrl("/api/v1/auth/signup"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return parseEnvelope<AuthResponse>(response);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(buildUrl("/api/v1/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return parseEnvelope<AuthResponse>(response);
}

export async function getMe(): Promise<AuthResponse["user"]> {
  const response = await fetch(buildUrl("/api/v1/auth/me"), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseEnvelope<AuthResponse["user"]>(response);
}

export async function getUserPreference(): Promise<LanguageCode> {
  const response = await fetch(buildUrl("/api/v1/user/preferences"), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await parseEnvelope<PreferencePayload>(response);
  return data.preferredLanguage;
}

export async function patchUserPreference(language: LanguageCode): Promise<LanguageCode> {
  const response = await fetch(buildUrl("/api/v1/user/preferences"), {
    method: "PATCH",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ preferredLanguage: language }),
  });

  const data = await parseEnvelope<PreferencePayload>(response);
  return data.preferredLanguage;
}

export async function getConsultationHistory(): Promise<ConsultationRecord[]> {
  const response = await fetch(buildUrl("/api/v1/user/consultations"), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseEnvelope<ConsultationRecord[]>(response);
}

export async function requestTextConsultation(textQuery: string): Promise<ConsultationResponse> {
  const response = await fetch(buildUrl("/api/v1/consultation"), {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputType: "text",
      textQuery,
    }),
  });

  return parseEnvelope<ConsultationResponse>(response);
}

export async function requestAudioConsultation(audioFile: File): Promise<ConsultationResponse> {
  const formData = new FormData();
  formData.append("inputType", "audio");
  formData.append("audio", audioFile);

  const response = await fetch(buildUrl("/api/v1/consultation"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  return parseEnvelope<ConsultationResponse>(response);
}
