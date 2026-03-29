import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { hasCompletedOnboarding, isLoggedIn } from "../lib/storage";

const featureIcons = [
  (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 9 9h-9V3Z" fill="currentColor" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16v3H4V6Zm0 5h16v3H4v-3Zm0 5h10v3H4v-3Z" fill="currentColor" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 3.2L6 8.4v7.2l6 3.2 6-3.2V8.4l-6-3.2Z" fill="currentColor" />
    </svg>
  ),
];

const featureCopyKeys = [
  { title: "feature.one.title", desc: "feature.one.desc" },
  { title: "feature.two.title", desc: "feature.two.desc" },
  { title: "feature.three.title", desc: "feature.three.desc" },
] as const;

export function LandingPage() {
  const { t } = useLanguage();
  const getStartedLink = isLoggedIn()
    ? "/app"
    : hasCompletedOnboarding()
      ? "/login"
      : "/onboarding/language";

  return (
    <div className="landing-shell">
      <header className="navbar">
        <div className="brand">AgriAdvice</div>
        <nav>
          <a href="#features">{t("nav.features")}</a>
          <a href="#proof">{t("nav.proof")}</a>
          <a href="#cta">{t("nav.pricing")}</a>
        </nav>
        <Link className="primary-btn" to={getStartedLink}>
          {t("nav.getStarted")}
        </Link>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">{t("hero.eyebrow")}</p>
        <h1>{t("hero.title")}</h1>
        <p>{t("hero.subtitle")}</p>
        <div className="hero-actions">
          <Link className="primary-btn" to={getStartedLink}>
            {t("hero.primaryCta")}
          </Link>
          <button type="button" className="ghost-btn">
            {t("hero.secondaryCta")}
          </button>
        </div>
        <div className="hero-mockup">Product Preview</div>
      </section>

      <section className="features" id="features">
        {featureCopyKeys.map((feature, index) => (
          <article key={feature.title} className="feature-card">
            <div className="icon-wrap">{featureIcons[index]}</div>
            <h3>{t(feature.title)}</h3>
            <p>{t(feature.desc)}</p>
          </article>
        ))}
      </section>

      <section className="social-proof" id="proof">
        <p className="quote">"{t("proof.quote")}"</p>
        <p className="author">{t("proof.author")}</p>
      </section>

      <section className="final-cta" id="cta">
        <h2>{t("cta.title")}</h2>
        <Link className="primary-btn" to={getStartedLink}>
          {t("cta.button")}
        </Link>
      </section>

      <footer className="footer">
        <div className="footer-links">
          <a href="#top">{t("footer.privacy")}</a>
          <a href="#top">{t("footer.terms")}</a>
          <a href="#top">{t("footer.contact")}</a>
        </div>
        <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}
