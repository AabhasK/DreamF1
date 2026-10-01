// Centralised auth-session helpers so token + username are stored consistently.
import { useSyncExternalStore } from "react"

// Same-tab changes fire "session"; other tabs fire the browser's "storage" event.
function notify() {
  window.dispatchEvent(new Event("session"))
}

export function setSession(token: string, username?: string | null) {
  localStorage.setItem("token", token)
  if (username) localStorage.setItem("username", username)
  notify()
}

export function clearSession() {
  localStorage.removeItem("token")
  localStorage.removeItem("username")
  notify()
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener("session", onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener("session", onChange)
  }
}

/**
 * The stored session, kept in sync across components and tabs. Both values are
 * `undefined` on the server and during hydration, since localStorage only exists
 * in the browser — treat that as "not known yet".
 */
export function useSession(): { token: string | null | undefined; username: string | null | undefined } {
  const token = useSyncExternalStore(subscribe, () => localStorage.getItem("token"), () => undefined)
  const username = useSyncExternalStore(subscribe, () => localStorage.getItem("username"), () => undefined)
  return { token, username }
}
