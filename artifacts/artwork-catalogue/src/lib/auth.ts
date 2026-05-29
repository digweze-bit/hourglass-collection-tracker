const SESSION_KEY = "catalogue-session-unlocked";

/** Hash a password string using SHA-256 (Web Crypto API). */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "hourglass-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Mark this browser session as authenticated. */
export function setSessionUnlocked() {
  sessionStorage.setItem(SESSION_KEY, "1");
}

/** Check if this browser session is already authenticated. */
export function isSessionUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

/** Clear the session lock. */
export function lockSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
