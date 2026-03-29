import { useState } from "react";
import { Link } from "react-router-dom";

import { requestAudioConsultation, requestTextConsultation } from "../lib/api.ts";
import { INDIAN_LANGUAGES } from "../config/languages";
import { FormattedConsultationResponse } from "../components/FormattedConsultationResponse";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";

type ChatResponse = {
  detectedLanguage?: string;
  originalTranscript?: string;
  translatedResponse?: string;
  audio?: {
    mimeType: string;
    encoding: "base64";
    content: string;
  };
};

const MAX_AUDIO_FILE_SIZE_BYTES = 12 * 1024 * 1024;
const MAX_AUDIO_DURATION_SECONDS = 180;

async function getAudioDurationSeconds(file: File): Promise<number> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const audio = document.createElement("audio");
      audio.preload = "metadata";

      audio.onloadedmetadata = () => {
        const value = Number.isFinite(audio.duration) ? audio.duration : 0;
        resolve(value);
      };

      audio.onerror = () => {
        reject(new Error("Unable to read audio metadata"));
      };

      audio.src = objectUrl;
    });

    return duration;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getLanguageLabel(code?: string): string {
  if (!code) {
    return "Unknown";
  }

  const language = INDIAN_LANGUAGES.find((entry) => entry.code === code);
  if (language) {
    return `${language.englishName} (${language.code.toUpperCase()})`;
  }

  return code.toUpperCase();
}

export function ConsultationChatPage() {
  const [mode, setMode] = useState<"text" | "audio">("text");
  const [query, setQuery] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioValidationMessage, setAudioValidationMessage] = useState<string | null>(null);
  const [isValidatingAudio, setIsValidatingAudio] = useState(false);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  async function handleAudioFileChange(file: File | null) {
    setAudioValidationMessage(null);
    setAudioFile(null);

    if (!file) {
      return;
    }

    if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
      setAudioValidationMessage(
        t("chat.audioTooLarge", { maxMb: Math.floor(MAX_AUDIO_FILE_SIZE_BYTES / (1024 * 1024)) })
      );
      return;
    }

    setIsValidatingAudio(true);
    try {
      const durationSeconds = await getAudioDurationSeconds(file);
      if (durationSeconds > MAX_AUDIO_DURATION_SECONDS) {
        setAudioValidationMessage(
          t("chat.audioTooLong", { maxSeconds: MAX_AUDIO_DURATION_SECONDS })
        );
        return;
      }

      setAudioFile(file);
    } catch {
      setAudioValidationMessage(t("chat.audioAnalyzeFailed"));
    } finally {
      setIsValidatingAudio(false);
    }
  }

  async function handleCopyResponse() {
    if (!response?.translatedResponse) {
      return;
    }

    const adviceLanguage = getLanguageLabel(response.detectedLanguage ?? language);
    const originalLanguage = getLanguageLabel(response.detectedLanguage);
    const payload = [
      `${t("chat.response.advice")} [${adviceLanguage}]`,
      response.translatedResponse,
      response.originalTranscript
        ? `${t("chat.response.original")} [${originalLanguage}]\n${response.originalTranscript}`
        : "",
      response.detectedLanguage
        ? `${t("chat.response.detectedLanguage")}: ${getLanguageLabel(response.detectedLanguage)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = payload;
        textArea.setAttribute("readonly", "true");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      showToast(t("chat.actions.copied"), "success");
    } catch {
      showToast(t("chat.actions.copyFailed"), "error");
    }
  }

  function handleDownloadResponse() {
    if (!response?.translatedResponse) {
      return;
    }

    const adviceLanguage = getLanguageLabel(response.detectedLanguage ?? language);
    const originalLanguage = getLanguageLabel(response.detectedLanguage);
    const content = [
      `${t("chat.response.title")} - ${new Date().toLocaleString()}`,
      "",
      `${t("chat.response.advice")} [${adviceLanguage}]`,
      response.translatedResponse,
      "",
      response.originalTranscript
        ? `${t("chat.response.original")} [${originalLanguage}]\n${response.originalTranscript}`
        : "",
      response.detectedLanguage
        ? `${t("chat.response.detectedLanguage")}: ${getLanguageLabel(response.detectedLanguage)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `consultation-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();
    const isTextInvalid = mode === "text" && !trimmed;
    const isAudioInvalid = mode === "audio" && !audioFile;
    if (isTextInvalid || isAudioInvalid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const consultation =
        mode === "text" && trimmed
          ? await requestTextConsultation(trimmed)
          : await requestAudioConsultation(audioFile as File);

      setResponse({
        detectedLanguage: consultation.detectedLanguage,
        originalTranscript: consultation.originalTranscript,
        translatedResponse: consultation.translatedResponse,
        audio: consultation.audio,
      });

      if (mode === "text") {
        setQuery("");
      } else {
        setAudioFile(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start consultation";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="screen-shell">
      <section className="panel panel-wide">
        <header className="settings-header">
          <h1 className="screen-title">{t("chat.title")}</h1>
          <nav className="settings-nav">
            <Link to="/app/history">{t("app.history")}</Link>
            <Link to="/app/settings">{t("app.settings")}</Link>
          </nav>
        </header>

        <p className="screen-subtitle">{t("chat.subtitle")}</p>

        <div className="auth-mode-row">
          <button
            type="button"
            className={`ghost-btn ${mode === "text" ? "active-mode" : ""}`}
            onClick={() => {
              setMode("text");
              setAudioValidationMessage(null);
            }}
          >
            {t("chat.mode.text")}
          </button>
          <button
            type="button"
            className={`ghost-btn ${mode === "audio" ? "active-mode" : ""}`}
            onClick={() => {
              setMode("audio");
              setAudioValidationMessage(null);
            }}
          >
            {t("chat.mode.audio")}
          </button>
        </div>

        <form className="chat-form" onSubmit={handleSubmit}>
          {mode === "text" ? (
            <label className="field" htmlFor="chat-query">
              <span>{t("chat.questionLabel")}</span>
              <textarea
                id="chat-query"
                className="chat-textarea"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("chat.placeholder")}
                rows={5}
              />
            </label>
          ) : (
            <label className="field" htmlFor="chat-audio-file">
              <span>{t("chat.audioLabel")}</span>
              <input
                id="chat-audio-file"
                className="chat-audio-input"
                type="file"
                accept="audio/*,.mp3,.wav,.webm,.ogg,.m4a,.mp4"
                onChange={(event) => {
                  void handleAudioFileChange(event.target.files?.[0] ?? null);
                }}
              />
              <small className="field-hint">
                {isValidatingAudio
                  ? t("chat.audioAnalyzing")
                  : audioValidationMessage
                    ? audioValidationMessage
                    : audioFile
                      ? `${t("chat.audioSelected")}: ${audioFile.name}`
                      : t("chat.audioHint")}
              </small>
            </label>
          )}
          <div className="actions-row">
            <button
              type="submit"
              className="primary-btn"
              disabled={
                isSubmitting ||
                isValidatingAudio ||
                (mode === "text" ? query.trim().length === 0 : !audioFile || Boolean(audioValidationMessage))
              }
            >
              {isSubmitting ? t("chat.submitting") : t("chat.submit")}
            </button>
          </div>
        </form>

        {response ? (
          <article className="response-card">
            <h2>{t("chat.response.title")}</h2>
            <div className="response-toolbar">
              <button type="button" className="ghost-btn" onClick={() => void handleCopyResponse()}>
                {t("chat.actions.copy")}
              </button>
              <button type="button" className="ghost-btn" onClick={handleDownloadResponse}>
                {t("chat.actions.download")}
              </button>
            </div>
            {response.translatedResponse ? (
              <div className="response-section">
                <h3>
                  {t("chat.response.advice")}
                  <span className="language-tag">
                    {t("chat.response.languageTag", { language: getLanguageLabel(response.detectedLanguage ?? language) })}
                  </span>
                </h3>
                <FormattedConsultationResponse text={response.translatedResponse} />
              </div>
            ) : null}
            {response.originalTranscript ? (
              <div className="response-section">
                <h3>
                  {t("chat.response.original")}
                  <span className="language-tag">
                    {t("chat.response.languageTag", { language: getLanguageLabel(response.detectedLanguage) })}
                  </span>
                </h3>
                <p>{response.originalTranscript}</p>
              </div>
            ) : null}
            {response.detectedLanguage ? (
              <p>
                <b>{t("chat.response.detectedLanguage")}:</b> {response.detectedLanguage}
              </p>
            ) : null}
            {response.audio ? (
              <div className="response-section">
                <h3>{t("chat.response.audio")}</h3>
                <audio controls src={`data:${response.audio.mimeType};base64,${response.audio.content}`} />
              </div>
            ) : null}
          </article>
        ) : null}
      </section>
    </main>
  );
}
