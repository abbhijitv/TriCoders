export const AUTH_STORAGE_KEY = "contribAIAuthSession";

export type AuthSession = {
  email: string;
  firstName?: string;
  lastName?: string;
  githubUsername?: string;
  passwordHint?: string;
  role?: string;
  timezone?: string;
  loggedInAt: string;
};

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
