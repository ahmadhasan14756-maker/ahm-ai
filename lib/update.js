"use client";
import { useEffect, useState } from "react";

// The version this phone/computer opened (fixed when the app is built).
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "";

// Checks every few minutes (and when the app comes back to the screen) whether a newer
// version was deployed. Returns true once an update is waiting.
export function useUpdateReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!BUILD_ID) return;
    let stop = false;
    const check = async () => {
      if (stop || document.visibilityState === "hidden") return;
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const { v } = await r.json();
        if (v && v !== BUILD_ID) setReady(true);
      } catch {}
    };
    const first = setTimeout(check, 15000);
    const timer = setInterval(check, 3 * 60 * 1000);
    const onShow = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => { stop = true; clearTimeout(first); clearInterval(timer); document.removeEventListener("visibilitychange", onShow); window.removeEventListener("focus", onShow); };
  }, []);
  return ready;
}

// Loads the newest version: clears the saved app files, updates the service worker, reloads.
export async function refreshApp() {
  try {
    if ("caches" in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
    await Promise.all(regs.map((r) => r.update().catch(() => {})));
  } catch {}
  const u = new URL(window.location.href);
  u.searchParams.set("v", Date.now().toString(36)); // skip any stale copy
  window.location.replace(u.toString());
}
