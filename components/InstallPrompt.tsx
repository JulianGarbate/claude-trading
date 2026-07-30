"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api-client";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0))).buffer;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    // @ts-expect-error - prompt() is not in the base Event type
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
  }

  async function enablePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Este navegador no soporta notificaciones push");
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      alert("Push no configurado (falta NEXT_PUBLIC_VAPID_PUBLIC_KEY)");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await authFetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });

    setPushEnabled(true);
  }

  return (
    <div className="flex items-center gap-1">
      {deferredPrompt && (
        <button
          onClick={install}
          title="Instalar app"
          className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container motion-safe:active:scale-90 transition-[transform,background-color] duration-150 ease-snappy p-1 rounded-full text-[20px]"
        >
          install_mobile
        </button>
      )}
      <button
        onClick={enablePush}
        title={pushEnabled ? "Notificaciones activas" : "Activar notificaciones"}
        className={`material-symbols-outlined motion-safe:active:scale-90 transition-[transform,background-color,color] duration-150 ease-snappy p-1 rounded-full text-[20px] ${
          pushEnabled ? "text-secondary" : "text-on-surface-variant hover:bg-surface-container"
        }`}
      >
        notifications
      </button>
    </div>
  );
}
