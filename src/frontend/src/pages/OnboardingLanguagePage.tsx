import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LanguageCode } from "../config/languages";
import { onboardingSteps } from "../config/onboardingSteps";
import { LanguageGrid } from "../components/LanguageGrid";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";
import { setCompletedOnboarding } from "../lib/storage";

export function OnboardingLanguagePage() {
  const navigate = useNavigate();
  const { language, setLanguage, persistLanguagePreference, t } = useLanguage();
  const { showToast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | null>(language ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleContinue() {
    if (!selectedLanguage) {
      return;
    }

    setIsSubmitting(true);
    try {
      await persistLanguagePreference(selectedLanguage);
    } catch {
      // Continue with local preference even if backend is temporarily unavailable.
      setLanguage(selectedLanguage);
      showToast(t("toast.languageUpdateFailed"), "error");
    } finally {
      setIsSubmitting(false);
    }

    setCompletedOnboarding(true);
    navigate("/login", { replace: true });
  }

  function handleSkip() {
    if (selectedLanguage) {
      setLanguage(selectedLanguage);
    }
    setCompletedOnboarding(true);
    navigate("/login", { replace: true });
  }

  return (
    <main className="screen-shell">
      <section className="panel panel-wide">
        <p className="step-text">{t("onboarding.step", { current: 1, total: onboardingSteps.length })}</p>
        <h1 className="screen-title">{t("onboarding.title")}</h1>
        <p className="screen-subtitle">{t("onboarding.subtitle")}</p>

        <LanguageGrid selectedLanguage={selectedLanguage} onSelect={setSelectedLanguage} />

        <div className="actions-row">
          <button type="button" className="ghost-btn" onClick={handleSkip} disabled={isSubmitting}>
            {t("onboarding.skip")}
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={handleContinue}
            disabled={!selectedLanguage || isSubmitting}
          >
            {isSubmitting ? "Saving..." : t("onboarding.continue")}
          </button>
        </div>
      </section>
    </main>
  );
}
