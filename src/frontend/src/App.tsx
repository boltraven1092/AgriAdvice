import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  base64ToObjectUrl,
  requestAudioConsultation,
  requestTextConsultation,
} from "./lib/api";
import "./App.css";

type Mode = "text" | "audio";

function App() {
  const [mode, setMode] = useState<Mode>("text");
  const [textQuery, setTextQuery] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translatedResponse, setTranslatedResponse] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [originalTranscript, setOriginalTranscript] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (isSubmitting) {
      return false;
    }

    if (mode === "text") {
      return textQuery.trim().length >= 2;
    }

    return Boolean(audioFile);
  }, [audioFile, isSubmitting, mode, textQuery]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setTranslatedResponse("");
    setDetectedLanguage("");
    setOriginalTranscript("");
    setSessionId("");
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const payload =
        mode === "text"
          ? await requestTextConsultation(textQuery.trim())
          : await requestAudioConsultation(audioFile as File);

      if (!payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "Consultation failed");
      }

      setSessionId(payload.data.sessionId ?? "");
      setDetectedLanguage(payload.data.detectedLanguage ?? "");
      setOriginalTranscript(payload.data.originalTranscript ?? "");
      setTranslatedResponse(payload.data.translatedResponse ?? "");

      if (payload.data.audio?.content && payload.data.audio?.mimeType) {
        const objectUrl = base64ToObjectUrl(payload.data.audio.content, payload.data.audio.mimeType);
        setAudioUrl(objectUrl);
      }
    } catch (submitError) {
      const errorMessage = submitError instanceof Error ? submitError.message : "Consultation failed";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="hero-card">
        <p className="eyebrow">AgriAdvice</p>
        <h1>AI Farm Consultation Gateway</h1>
        <p className="subhead">
          Submit text or voice from the frontend, route through the API Gateway, and receive multilingual advice plus
          generated audio.
        </p>
      </section>

      <section className="panel">
        <div className="mode-switch" role="tablist" aria-label="Consultation mode">
          <button
            type="button"
            className={mode === "text" ? "active" : ""}
            onClick={() => setMode("text")}
            aria-pressed={mode === "text"}
          >
            Text Consultation
          </button>
          <button
            type="button"
            className={mode === "audio" ? "active" : ""}
            onClick={() => setMode("audio")}
            aria-pressed={mode === "audio"}
          >
            Audio Consultation
          </button>
        </div>

        <form className="consultation-form" onSubmit={handleSubmit}>
          {mode === "text" ? (
            <label className="field">
              <span>Farm Query</span>
              <textarea
                value={textQuery}
                onChange={(event) => setTextQuery(event.target.value)}
                placeholder="Example: Pink bollworm risk is high after delayed rain. What should I do this week?"
                rows={5}
              />
            </label>
          ) : (
            <label className="field">
              <span>Upload Audio</span>
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/webm,audio/ogg,audio/mp4,audio/x-m4a"
                onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
              />
              <small>{audioFile ? `Selected: ${audioFile.name}` : "Accepted formats: mp3, wav, webm, ogg, m4a"}</small>
            </label>
          )}

          <button className="submit-btn" type="submit" disabled={!canSubmit}>
            {isSubmitting ? "Running AI Consultation..." : "Submit Consultation"}
          </button>
        </form>

        {error && <p className="error-banner">{error}</p>}
      </section>

      <section className="panel output-panel">
        <h2>Consultation Result</h2>
        {!translatedResponse && !isSubmitting && <p className="muted">No response yet. Submit a query to begin.</p>}

        {isSubmitting && <p className="muted">Gateway is processing your request...</p>}

        {translatedResponse && (
          <>
            <dl className="meta-grid">
              <div>
                <dt>Session</dt>
                <dd>{sessionId || "-"}</dd>
              </div>
              <div>
                <dt>Detected Language</dt>
                <dd>{detectedLanguage || "-"}</dd>
              </div>
            </dl>

            <article className="response-block">
              <h3>Translated Advice</h3>
              <p>{translatedResponse}</p>
            </article>

            {originalTranscript && (
              <article className="response-block transcript">
                <h3>Original Transcript</h3>
                <p>{originalTranscript}</p>
              </article>
            )}

            {audioUrl && (
              <article className="response-block">
                <h3>Audio Response</h3>
                <audio controls src={audioUrl} preload="metadata" />
                <a href={audioUrl} download={`agriadvice-${sessionId || "response"}.mp3`} className="download-link">
                  Download MP3
                </a>
              </article>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default App;
