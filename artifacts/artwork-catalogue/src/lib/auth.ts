const SESSION_KEY = "catalogue-session-unlocked";

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "hourglass-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function setSessionUnlocked() {
  sessionStorage.setItem(SESSION_KEY, "1");
}

export function isSessionUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function lockSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
