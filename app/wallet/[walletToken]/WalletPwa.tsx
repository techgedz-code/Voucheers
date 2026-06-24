"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop";

/**
 * Registers the service worker and helps the customer install the wallet.
 * Uses the native install prompt when the browser provides one; otherwise
 * always falls back to clear, platform-specific manual instructions so the
 * button never does "nothing".
 */
export function WalletPwa({ brandColor }: { brandColor: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");
    else setPlatform("desktop");

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    setInstalled(standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome !== "accepted") setShowHelp(true);
      return;
    }
    // No native prompt available — always show manual steps.
    setShowHelp(true);
  }

  const help =
    platform === "ios" ? (
      <>
        Tap the <strong>Share</strong> icon{" "}
        <span aria-hidden>⬆️</span> at the bottom of Safari, scroll down, then
        choose <strong>“Add to Home Screen”</strong>.
      </>
    ) : platform === "android" ? (
      <>
        Tap the <strong>⋮ menu</strong> (top-right of Chrome), then choose{" "}
        <strong>“Add to Home screen”</strong> or <strong>“Install app”</strong>.
      </>
    ) : (
      <>
        Click the <strong>install icon</strong>{" "}
        <span aria-hidden>⊕</span> in the browser address bar, or open the{" "}
        <strong>⋮ menu</strong> and choose <strong>“Install…”</strong>. (On a
        phone, you&apos;ll get an “Add to Home Screen” option.)
      </>
    );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
      <p className="text-sm font-semibold">Keep your vouchers handy 📲</p>
      <p className="mt-1 text-xs text-gray-500">
        Add this to your home screen for one-tap access on your next visit.
      </p>
      <button
        onClick={install}
        className="btn mt-3 w-full text-white"
        style={{ background: brandColor }}
      >
        Add to Home Screen
      </button>
      {showHelp && (
        <p className="mt-3 rounded-lg bg-gray-50 p-2 text-left text-xs text-gray-600">
          {help}
        </p>
      )}
    </div>
  );
}
