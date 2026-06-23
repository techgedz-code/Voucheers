"use client";

import { useState } from "react";
import Link from "next/link";
import { SpinWheel, type WheelSeg } from "@/components/SpinWheel";

type Step = "form" | "review" | "instagram" | "game" | "result";

interface DrawResult {
  prizeIndex: number;
  won: boolean;
  voucher?: {
    code: string;
    rewardText: string;
    label: string;
    expiresAt: string;
    conditions: string | null;
  };
  walletToken?: string;
  walletUrl?: string;
  label?: string;
}

export function CustomerFlow({
  qrToken,
  outletName,
  brandColor,
  logoUrl,
  reviewUrl,
  instagramHandle,
  segments,
}: {
  qrToken: string;
  outletName: string;
  brandColor: string;
  logoUrl: string | null;
  reviewUrl: string | null;
  instagramHandle: string | null;
  segments: WheelSeg[];
}) {
  const [step, setStep] = useState<Step>("form");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [reviewClicked, setReviewClicked] = useState(false);
  const [instaClicked, setInstaClicked] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<DrawResult | null>(null);

  const n = segments.length;
  const slice = 360 / n;

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[0-9+\-\s]{7,}$/.test(phone)) {
      setError("Please enter a valid phone number.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }
    if (!consent) {
      setError("Please agree to continue.");
      return;
    }
    setStep(reviewUrl ? "review" : instagramHandle ? "instagram" : "game");
  }

  async function spin() {
    if (loading || spinning) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken,
          phone,
          email,
          pdpa_consent: consent,
          review_clicked: reviewClicked,
          instagram_clicked: instaClicked,
        }),
      });
      const data = (await res.json()) as DrawResult & { error?: string };
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      // Animate so the winning segment lands under the top pointer.
      const target = data.prizeIndex;
      const center = target * slice + slice / 2;
      const finalRotation = 360 * 5 - center;
      setResult(data);
      setSpinning(true);
      setLoading(false);
      // next tick so transition applies
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setRotation(finalRotation))
      );
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  function onSpinEnd() {
    setSpinning(false);
    setStep("result");
  }

  const accent = { background: brandColor } as const;

  return (
    <main className="min-h-screen" style={{ background: `${brandColor}10` }}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={outletName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-white"
              style={accent}
            >
              {outletName.charAt(0)}
            </div>
          )}
          <div className="font-bold">{outletName}</div>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* STEP: form */}
          {step === "form" && (
            <div className="card">
              <h1 className="text-xl font-extrabold">Win a reward! 🎁</h1>
              <p className="mt-1 text-sm text-gray-600">
                Enter your details, then spin to win a voucher for your next
                visit.
              </p>
              <form onSubmit={submitForm} className="mt-4 space-y-3">
                <div>
                  <label className="label" htmlFor="phone">Mobile number</label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    className="input"
                    placeholder="012-345 6789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    className="input"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <label className="flex items-start gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    I agree to be contacted about my voucher and to the{" "}
                    <Link href="/privacy" target="_blank" className="underline">
                      privacy notice
                    </Link>{" "}
                    (PDPA).
                  </span>
                </label>
                <button type="submit" className="btn w-full text-white" style={accent}>
                  Continue
                </button>
              </form>
            </div>
          )}

          {/* STEP: review (soft gate) */}
          {step === "review" && (
            <div className="card text-center">
              <h1 className="text-xl font-extrabold">Love your visit? ⭐</h1>
              <p className="mt-1 text-sm text-gray-600">
                A quick Google review really helps {outletName}. It only takes a
                moment — then come back to spin!
              </p>
              <a
                href={reviewUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
                onClick={() => setReviewClicked(true)}
                className="btn mt-4 w-full text-white"
                style={accent}
              >
                ⭐ Leave a Google review
              </a>
              <button
                onClick={() => setStep(instagramHandle ? "instagram" : "game")}
                className="mt-3 w-full text-sm font-medium text-gray-500"
              >
                {reviewClicked ? "I've left my review — continue" : "Skip & continue"}
              </button>
            </div>
          )}

          {/* STEP: instagram (optional) */}
          {step === "instagram" && (
            <div className="card text-center">
              <h1 className="text-xl font-extrabold">Follow us on Instagram</h1>
              <p className="mt-1 text-sm text-gray-600">
                Stay in the loop with offers and new dishes.
              </p>
              <a
                href={`https://instagram.com/${(instagramHandle ?? "").replace(/^@/, "")}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => setInstaClicked(true)}
                className="btn mt-4 w-full text-white"
                style={accent}
              >
                Follow {instagramHandle}
              </a>
              <button
                onClick={() => setStep("game")}
                className="mt-3 w-full text-sm font-medium text-gray-500"
              >
                {instaClicked ? "Done — continue" : "Skip & continue"}
              </button>
            </div>
          )}

          {/* STEP: game */}
          {step === "game" && (
            <div className="card text-center">
              <h1 className="text-xl font-extrabold">Spin to win! 🎉</h1>
              <p className="mt-1 text-sm text-gray-600">Tap the button to spin.</p>
              <div className="my-5 flex justify-center">
                <SpinWheel
                  segments={segments}
                  rotation={rotation}
                  durationMs={spinning ? 4500 : 0}
                  onSpinEnd={onSpinEnd}
                  size={300}
                />
              </div>
              <button
                onClick={spin}
                disabled={loading || spinning}
                className="btn w-full text-white"
                style={accent}
              >
                {loading ? "Preparing…" : spinning ? "Spinning…" : "SPIN"}
              </button>
            </div>
          )}

          {/* STEP: result */}
          {step === "result" && result && (
            <div className="card text-center">
              {result.won && result.voucher ? (
                <>
                  <div className="text-4xl">🎉</div>
                  <h1 className="mt-2 text-2xl font-extrabold" style={{ color: brandColor }}>
                    You won!
                  </h1>
                  <div className="mt-1 text-lg font-bold">
                    {result.voucher.rewardText}
                  </div>
                  <div className="mt-4 rounded-xl border-2 border-dashed p-4" style={{ borderColor: brandColor }}>
                    <div className="text-xs text-gray-500">Your voucher code</div>
                    <div className="text-2xl font-extrabold tracking-widest">
                      {result.voucher.code}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Valid until{" "}
                      {new Date(result.voucher.expiresAt).toLocaleDateString("en-MY", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  {result.voucher.conditions && (
                    <p className="mt-2 text-xs text-gray-500">
                      {result.voucher.conditions}
                    </p>
                  )}
                  <p className="mt-3 text-sm text-gray-600">
                    We&apos;ve emailed you a copy. Save it to your phone:
                  </p>
                  <a
                    href={result.walletUrl}
                    className="btn mt-3 w-full text-white"
                    style={accent}
                  >
                    Open my voucher wallet
                  </a>
                </>
              ) : (
                <>
                  <div className="text-4xl">🙂</div>
                  <h1 className="mt-2 text-xl font-extrabold">
                    {result.label || "Better luck next time!"}
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Thanks for visiting {outletName}. Come back soon for another
                    chance to win!
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-400">
          Powered by Voucher App · Reward is for participating; reviews are
          optional and never required.
        </p>
      </div>
    </main>
  );
}
