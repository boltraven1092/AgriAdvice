import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LanguageSettingsModal } from "../components/LanguageSettingsModal";
import { useLanguage, getLanguageDisplayName } from "../context/LanguageContext";
import { clearAuthToken, setLoggedIn } from "../lib/storage";

export function SettingsPage() {
  const { language, t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <main className="screen-shell">
      <section className="panel panel-wide">
        <header className="settings-header">
          <h1 className="screen-title">{t("settings.title")}</h1>
          <nav className="settings-nav">
            <Link to="/">{t("app.home")}</Link>
            <Link to="/app/history">History</Link>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setLoggedIn(false);
                clearAuthToken();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </nav>
        </header>

        <article className="settings-card">
          <h2>{t("settings.language.label")}</h2>
          <p>
            {t("settings.language.current")}: <strong>{getLanguageDisplayName(language)}</strong>
          </p>
          <div className="actions-row">
            <button type="button" className="ghost-btn" onClick={() => setIsModalOpen(true)}>
              {t("settings.language.change")}
            </button>
            <button type="button" className="primary-btn" onClick={() => navigate("/app/history")}
            >
              Continue to App
            </button>
          </div>
        </article>
      </section>

      <LanguageSettingsModal
        isOpen={isModalOpen}
        initialLanguage={language}
        onClose={() => setIsModalOpen(false)}
      />
    </main>
  );
}
