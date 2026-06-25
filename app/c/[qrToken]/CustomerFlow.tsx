"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SpinWheel, type WheelSeg } from "@/components/SpinWheel";
import { FootballGame } from "@/components/FootballGame";
import type { GameType } from "@/lib/types";

type Step = "form" | "social" | "game" | "result";

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
  gameType,
}: {
  qrToken: string;
  outletName: string;
  brandColor: string;
  logoUrl: string | null;
  reviewUrl: string | null;
  instagramHandle: string | null;
  segments: WheelSeg[];
  gameType: GameType;
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
  const [footballPlaying, setFootballPlaying] = useState(false);
  const [footballScore, setFootballScore] = useState<number | null>(null);

  const n = segments.length;
  const slice = 360 / n;

  // Persist progress so leaving for Google/Instagram and coming back never
  // loses the customer's place or details (mobile-critical).
  const STORAGE_KEY = `vflow:${qrToken}`;
  const restoredRef = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<{
          step: Step;
          phone: string;
          email: string;
          consent: boolean;
          reviewClicked: boolean;
          instaClicked: boolean;
        }>;
        if (s.phone) setPhone(s.phone);
        if (s.email) setEmail(s.email);
        if (typeof s.consent === "boolean") setConsent(s.consent);
        if (s.reviewClicked) setReviewClicked(true);
        if (s.instaClicked) setInstaClicked(true);
        if (s.step && ["form", "social", "game"].includes(s.step)) {
          setStep(s.step);
        }
      }
    } catch {
      /* ignore */
    }
    restoredRef.current = true;
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (!restoredRef.current || step === "result") return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step, phone, email, consent, reviewClicked, instaClicked })
      );
    } catch {
      /* ignore */
    }
  }, [STORAGE_KEY, step, phone, email, consent, reviewClicked, instaClicked]);

  function goReview() {
    if (!reviewUrl) return;
    setReviewClicked(true);
    window.open(reviewUrl, "_blank", "noopener,noreferrer");
  }

  function goInstagram() {
    setInstaClicked(true);
    const handle = (instagramHandle ?? "").replace(/^@/, "");
    window.open(`https://instagram.com/${handle}`, "_blank", "noopener,noreferrer");
  }

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
    setStep("social");
  }

  // Shared, server-authoritative prize draw. Both games call this; the game is
  // only cosmetic and never decides the prize.
  async function drawPrize(): Promise<DrawResult | null> {
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
        return null;
      }
      setResult(data);
      return data;
    } catch {
      setError("Network error. Please try again.");
      return null;
    }
  }

  async function spin() {
    if (loading || spinning) return;
    setLoading(true);
    const data = await drawPrize();
    if (!data) {
      setLoading(false);
      return;
    }
    // Animate so the winning segment lands under the top pointer.
    const target = data.prizeIndex;
    const center = target * slice + slice / 2;
    const finalRotation = 360 * 5 - center;
    setSpinning(true);
    setLoading(false);
    // next tick so transition applies
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setRotation(finalRotation))
    );
  }

  function onSpinEnd() {
    setSpinning(false);
    setStep("result");
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  async function playFootball() {
    if (loading || footballPlaying) return;
    setLoading(true);
    const data = await drawPrize();
    if (!data) {
      setLoading(false);
      return;
    }
    // Prize is decided; the 30-second game runs purely for fun.
    setFootballPlaying(true);
    setLoading(false);
  }

  function handleFootballClaim(score: number) {
    setFootballScore(score);
    setStep("result");
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
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

          {/* STEP: social (Google review + optional Instagram, combined) */}
          {step === "social" && (
            <div className="card">
              <h1 className="text-xl font-extrabold">One step before you spin!</h1>
              <p className="mt-1 text-sm text-gray-600">
                Help us out — then spin for your reward.
              </p>
              <div className="mt-4 space-y-3">
                {/* Google Review row — always shown */}
                <button
                  onClick={goReview}
                  disabled={!reviewUrl}
                  className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition hover:bg-gray-50 disabled:opacity-50"
                  style={reviewClicked ? { borderColor: brandColor } : {}}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white">
                    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#4285F4" d="M45.5 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h12.1c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.7-9.5 6.7-15.9z"/>
                      <path fill="#34A853" d="M24 46c6.1 0 11.2-2 14.9-5.5l-7.1-5.5c-2 1.3-4.5 2.1-7.8 2.1-6 0-11-4-12.8-9.4H3.9v5.7C7.6 41.1 15.3 46 24 46z"/>
                      <path fill="#FBBC05" d="M11.2 27.7c-.5-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H3.9C2.4 16.4 1.5 20.1 1.5 24s.9 7.6 2.4 10.4l7.3-6.7z"/>
                      <path fill="#EA4335" d="M24 10.5c3.4 0 6.4 1.2 8.8 3.4l6.5-6.5C35.2 3.8 30.1 1.5 24 1.5 15.3 1.5 7.6 6.4 3.9 13.6l7.3 5.7C13 14.5 18 10.5 24 10.5z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Leave us a Google review</p>
                    <p className="text-xs text-gray-500">
                      {reviewUrl ? "Your feedback means the world to us" : "Review link not yet configured"}
                    </p>
                  </div>
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={reviewClicked
                      ? { background: "#dcfce7", border: "1px solid #86efac" }
                      : { background: "#f3f4f6", border: "1px solid #e5e7eb" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 6l3 3 5-5" stroke={reviewClicked ? "#16a34a" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>

                {/* Instagram row — only if configured */}
                {instagramHandle && (
                  <button
                    onClick={goInstagram}
                    className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition hover:bg-gray-50"
                    style={instaClicked ? { borderColor: brandColor } : {}}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white">
                      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                        <defs>
                          <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
                            <stop offset="0%" stopColor="#fdf497"/>
                            <stop offset="45%" stopColor="#fd5949"/>
                            <stop offset="60%" stopColor="#d6249f"/>
                            <stop offset="90%" stopColor="#285AEB"/>
                          </radialGradient>
                        </defs>
                        <rect width="48" height="48" rx="12" fill="url(#ig-grad)"/>
                        <rect x="13" y="13" width="22" height="22" rx="6" fill="none" stroke="#fff" strokeWidth="2.5"/>
                        <circle cx="24" cy="24" r="5.5" fill="none" stroke="#fff" strokeWidth="2.5"/>
                        <circle cx="34" cy="14" r="1.8" fill="#fff"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Follow us on Instagram</p>
                      <p className="text-xs text-gray-500">{instagramHandle}</p>
                    </div>
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={instaClicked
                        ? { background: "#dcfce7", border: "1px solid #86efac" }
                        : { background: "#f3f4f6", border: "1px solid #e5e7eb" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M2 6l3 3 5-5" stroke={instaClicked ? "#16a34a" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>
                )}
              </div>
              <p className="mt-3 text-center text-xs text-gray-400">
                These steps are optional — your reward is guaranteed either way.
              </p>
              <button
                onClick={() => setStep("game")}
                className="btn mt-4 w-full text-white"
                style={accent}
              >
                {gameType === "football" ? "Play & win" : "Spin the wheel"}
              </button>
            </div>
          )}

          {/* STEP: game — spin wheel */}
          {step === "game" && gameType === "spin_wheel" && (
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

          {/* STEP: game — football */}
          {step === "game" && gameType === "football" && (
            footballPlaying ? (
              <FootballGame brandColor={brandColor} onClaim={handleFootballClaim} />
            ) : (
              <div className="card text-center">
                <h1 className="text-xl font-extrabold">Kick It! ⚽</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Score as many goals as you can in 30 seconds — then claim your
                  reward! 🎁
                </p>
                <div className="my-6 text-6xl">⚽</div>
                <button
                  onClick={playFootball}
                  disabled={loading}
                  className="btn w-full text-white"
                  style={accent}
                >
                  {loading ? "Preparing…" : "Play"}
                </button>
              </div>
            )
          )}

          {/* STEP: result */}
          {step === "result" && result && (
            <div className="card text-center">
              {gameType === "football" && footballScore !== null && (
                <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                  ⚽ You scored {footballScore} points!
                </div>
              )}
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
          Powered by Voucheers · Reward is for participating; reviews are
          optional and never required.
        </p>
      </div>
    </main>
  );
}
