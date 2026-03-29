import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { login, patchUserPreference, signup } from "../lib/api.ts";
import { getStoredLanguage, setAuthToken, setLoggedIn, setStoredLanguage } from "../lib/storage";
import { useToast } from "../context/ToastContext";

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { t, syncLanguageOnLogin } = useLanguage();
  const { showToast } = useToast();

  async function handleLogin() {
    setIsLoading(true);
    try {
      const authPayload =
        mode === "login" ? await login(email.trim(), password) : await signup(email.trim(), password);

      setAuthToken(authPayload.token);
      setLoggedIn(true);

      const localLanguage = getStoredLanguage();
      if (localLanguage && localLanguage !== authPayload.user.preferredLanguage) {
        try {
          await patchUserPreference(localLanguage);
          setStoredLanguage(localLanguage);
        } catch {
          // Fallback to backend language if preference sync fails.
          setStoredLanguage(authPayload.user.preferredLanguage);
        }
      } else {
        setStoredLanguage(authPayload.user.preferredLanguage);
      }

      await syncLanguageOnLogin();
      navigate("/app/settings", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="screen-shell">
      <section className="panel login-panel">
        <h1 className="screen-title">{t("login.title")}</h1>
        <p className="screen-subtitle">{t("login.subtitle")}</p>
        <div className="auth-mode-row">
          <button
            type="button"
            className={`ghost-btn ${mode === "login" ? "active-mode" : ""}`}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={`ghost-btn ${mode === "signup" ? "active-mode" : ""}`}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
            />
          </label>
        </div>
        <button type="button" className="primary-btn" onClick={handleLogin} disabled={isLoading}>
          {isLoading ? "Loading..." : mode === "login" ? t("login.button") : "Create Account"}
        </button>
      </section>
    </main>
  );
}
