import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingLanguagePage } from "./pages/OnboardingLanguagePage";
import { ConsultationHistoryPage } from "./pages/ConsultationHistoryPage";
import { ConsultationChatPage } from "./pages/ConsultationChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { hasCompletedOnboarding, isLoggedIn } from "./lib/storage";
import "./App.css";

function FirstLoadOnboardingRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const completed = hasCompletedOnboarding();

  useEffect(() => {
    if (!completed && !location.pathname.startsWith("/onboarding")) {
      navigate("/onboarding/language", { replace: true });
    }
  }, [completed, location.pathname, navigate]);

  return null;
}

function RequireOnboarding({ children }: { children: ReactNode }) {
  if (!hasCompletedOnboarding()) {
    return <Navigate to="/onboarding/language" replace />;
  }
  return <>{children}</>;
}

function RequireAuth({ children }: { children: ReactNode }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <>
      <FirstLoadOnboardingRedirect />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/onboarding/language" element={<OnboardingLanguagePage />} />
        <Route
          path="/login"
          element={
            <RequireOnboarding>
              <LoginPage />
            </RequireOnboarding>
          }
        />
        <Route
          path="/app"
          element={
            <RequireOnboarding>
              <RequireAuth>
                <Navigate to="/app/history" replace />
              </RequireAuth>
            </RequireOnboarding>
          }
        />
        <Route
          path="/app/settings"
          element={
            <RequireOnboarding>
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            </RequireOnboarding>
          }
        />
        <Route
          path="/app/chat"
          element={
            <RequireOnboarding>
              <RequireAuth>
                <ConsultationChatPage />
              </RequireAuth>
            </RequireOnboarding>
          }
        />
        <Route
          path="/app/history"
          element={
            <RequireOnboarding>
              <RequireAuth>
                <ConsultationHistoryPage />
              </RequireAuth>
            </RequireOnboarding>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
