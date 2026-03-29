import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { FormattedConsultationResponse } from "../components/FormattedConsultationResponse";
import { getConsultationHistory, type ConsultationRecord } from "../lib/api.ts";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";

export function ConsultationHistoryPage() {
  const [history, setHistory] = useState<ConsultationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const data = await getConsultationHistory();
        if (!cancelled) {
          setHistory(data);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load consultation history";
        showToast(message, "error");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  return (
    <main className="screen-shell">
      <section className="panel panel-wide">
        <header className="settings-header">
          <h1 className="screen-title">{t("history.title")}</h1>
          <nav className="settings-nav">
            <Link to="/app/chat">{t("app.newChat")}</Link>
            <Link to="/app/settings">{t("app.settings")}</Link>
          </nav>
        </header>
        <p className="screen-subtitle">{t("history.subtitle")}</p>

        {isLoading ? <p>Loading history...</p> : null}

        {!isLoading && history.length === 0 ? (
          <section className="empty-state-card" aria-live="polite">
            <h2>{t("history.empty.title")}</h2>
            <p>{t("history.empty.subtitle")}</p>
            <div className="actions-row">
              <Link className="primary-btn" to="/app/chat">
                {t("history.empty.cta")}
              </Link>
            </div>
          </section>
        ) : null}

        <div className="history-list">
          {history.map((item) => (
            <article key={item.id} className="history-card">
              <header>
                <strong>{item.inputType === "audio" ? "Audio consultation" : "Text consultation"}</strong>
                <span>{new Date(item.createdAt).toLocaleString()}</span>
              </header>
              {item.textQuery ? <p><b>Query:</b> {item.textQuery}</p> : null}
              {item.translatedResponse ? (
                <div>
                  <b>Advice:</b> <span className="language-tag">Language: {item.detectedLanguage?.toUpperCase() ?? "UNKNOWN"}</span>
                  <FormattedConsultationResponse text={item.translatedResponse} className="formatted-response-compact" />
                </div>
              ) : null}
              {item.detectedLanguage ? <p><b>Detected language:</b> {item.detectedLanguage}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
