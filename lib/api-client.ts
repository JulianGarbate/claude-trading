const PASSWORD_KEY = "trading-pwa:app-password";

export function getStoredPassword(): string {
  return window.localStorage.getItem(PASSWORD_KEY) ?? "";
}

export function setStoredPassword(password: string): void {
  window.localStorage.setItem(PASSWORD_KEY, password);
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const password = getStoredPassword();
  if (password) headers.set("x-app-password", password);

  return fetch(url, { ...options, headers });
}
