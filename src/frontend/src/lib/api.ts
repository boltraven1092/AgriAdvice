export type ConsultationResponse = {
  success: boolean;
  data: {
    sessionId?: string;
    detectedLanguage?: string;
    originalTranscript?: string;
    translatedResponse?: string;
    audio?: {
      mimeType: string;
      encoding: "base64";
      content: string;
    };
  } | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function buildUrl(path: string): string {
  if (!API_BASE) {
    return path;
  }

  return `${API_BASE}${path}`;
}

export async function requestTextConsultation(textQuery: string): Promise<ConsultationResponse> {
  const response = await fetch(buildUrl("/api/v1/consultation"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputType: "text",
      textQuery,
    }),
  });

  const payload = (await response.json()) as ConsultationResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Text consultation failed");
  }

  return payload;
}

export async function requestAudioConsultation(audioFile: File): Promise<ConsultationResponse> {
  const formData = new FormData();
  formData.append("inputType", "audio");
  formData.append("audio", audioFile);

  const response = await fetch(buildUrl("/api/v1/consultation"), {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as ConsultationResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Audio consultation failed");
  }

  return payload;
}

export function base64ToObjectUrl(base64: string, mimeType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}
