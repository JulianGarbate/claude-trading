"use client";

import { useEffect, useState } from "react";
import { authFetch, setStoredPassword } from "@/lib/api-client";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "authenticated" | "locked">("checking");
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    authFetch("/api/watchlist")
      .then((res) => setStatus(res.ok ? "authenticated" : "locked"))
      .catch(() => setStatus("locked"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    setStoredPassword(value);

    const res = await authFetch("/api/watchlist").catch(() => null);
    setSubmitting(false);

    if (res?.ok) {
      setStatus("authenticated");
    } else {
      setError(true);
      setValue("");
    }
  }

  if (status === "checking") return null;
  if (status === "authenticated") return <>{children}</>;

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-surface-high border border-outline-variant mb-4">
            <span className="material-symbols-outlined text-primary text-[32px]">monitoring</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Trading Suggestions</h1>
          <p className="text-sm text-on-surface-variant mt-1">Acceso de seguridad</p>
        </div>

        <form onSubmit={submit} className="bg-surface-container border border-outline-variant p-6 rounded-xl space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                lock
              </span>
              <input
                id="password"
                type="password"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Ingresá tu contraseña"
                className="w-full h-12 pl-10 pr-4 bg-surface-low border border-outline-variant rounded-lg text-on-surface placeholder:text-outline/50 text-sm outline-none focus:border-primary transition-colors duration-150"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-error flex items-center gap-1 animate-fade-in-up">
              <span className="material-symbols-outlined text-[16px]">error</span>
              Contraseña incorrecta.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !value}
            className="w-full h-12 bg-primary text-on-primary font-semibold rounded-lg flex items-center justify-center gap-2 motion-safe:active:scale-[0.97] transition-[transform,opacity] duration-150 ease-snappy disabled:opacity-50"
          >
            {submitting ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
            ) : (
              <>
                <span>Acceder</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
