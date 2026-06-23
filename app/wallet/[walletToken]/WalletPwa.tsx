"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Registers the service worker and shows an "Add to Home Screen" helper.
 * On Android/Chrome it triggers the native install prompt; on iOS it shows
 * the manual Share → Add to Home Screen instructions.
 */
export function WalletPwa({ brandColor }: { brandColor: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

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
      await deferred.userChoice;
      setDeferred(null);
    } else if (isIos) {
      setShowIosHelp(true);
    }
  }

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
      {showIosHelp && (
        <p className="mt-3 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
          Tap the <strong>Share</strong> icon in Safari, then choose{" "}
          <strong>“Add to Home Screen”</strong>.
        </p>
      )}
    </div>
  );
}
