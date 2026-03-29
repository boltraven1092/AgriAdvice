import type { LanguageCode } from "../config/languages";

export const storageKeys = {
  hasCompletedOnboarding: "hasCompletedOnboarding",
  preferredLanguage: "preferredLanguage",
  isLoggedIn: "isLoggedIn",
  authToken: "authToken",
} as const;

export function getStoredLanguage(): LanguageCode | null {
  const value = localStorage.getItem(storageKeys.preferredLanguage);
  return (value as LanguageCode | null) ?? null;
}

export function setStoredLanguage(language: LanguageCode): void {
  localStorage.setItem(storageKeys.preferredLanguage, language);
}

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(storageKeys.hasCompletedOnboarding) === "true";
}

export function setCompletedOnboarding(value: boolean): void {
  localStorage.setItem(storageKeys.hasCompletedOnboarding, value ? "true" : "false");
}

export function isLoggedIn(): boolean {
  return localStorage.getItem(storageKeys.isLoggedIn) === "true";
}

export function setLoggedIn(value: boolean): void {
  localStorage.setItem(storageKeys.isLoggedIn, value ? "true" : "false");
}

export function getAuthToken(): string | null {
  return localStorage.getItem(storageKeys.authToken);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(storageKeys.authToken, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(storageKeys.authToken);
}
