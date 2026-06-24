"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { redeem, type RedeemState } from "./actions";

const initial: RedeemState = { done: false };

// Minimal typing for the experimental BarcodeDetector API.
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}

export function RedeemClient() {
  const [state, formAction, pending] = useActionState(redeem, initial);
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" && "BarcodeDetector" in window
    );
  }, []);

  // Reset the field after a successful redemption so staff can scan the next one.
  useEffect(() => {
    if (state.done && state.ok) setCode("");
  }, [state]);

  function stopScan() {
    setScanning(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startScan() {
    if (!supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      // @ts-expect-error experimental global
      detectorRef.current = new window.BarcodeDetector({
        formats: ["qr_code"],
      });
      // Set scanning to true to mount the video element; attachment happens
      // in useEffect once videoRef is ready.
      setScanning(true);
    } catch {
      setScanning(false);
    }
  }

  // Once scanning is true and the video element is mounted, attach the stream
  // and start the detection loop. This handles the timing issue on Android.
  useEffect(() => {
    if (!scanning || !videoRef.current || !streamRef.current || !detectorRef.current) {
      return;
    }

    const video = videoRef.current;
    const stream = streamRef.current;
    const detector = detectorRef.current;

    video.srcObject = stream;
    video.play().catch(() => {
      // Some browsers may reject autoplay; this is OK, the user can manually
      // unmute or interact further if needed.
    });

    const tick = async () => {
      if (!streamRef.current || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          const value = codes[0].rawValue.trim();
          setCode(value);
          stopScan();
          // Auto-submit.
          requestAnimationFrame(() => formRef.current?.requestSubmit());
          return;
        }
      } catch {
        // ignore per-frame errors
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => stopScan();
  }, [scanning]);

  useEffect(() => () => stopScan(), []);

  const resultColor =
    state.done && state.ok ? "green" : state.done ? "red" : "gray";

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card">
        <h1 className="text-xl font-bold">Redeem a voucher</h1>
        <p className="mt-1 text-sm text-gray-500">
          Scan the customer&apos;s voucher QR, or type the code shown beneath it.
        </p>

        {scanning && (
          <div className="relative mt-4 h-80 w-80 mx-auto overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              className="w-full"
              muted
              playsInline
              autoPlay
            />
            {/* Aiming reticle — clear square in a dimmed surround so staff know
                where to point the camera at the customer's voucher QR. */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-3/5 w-3/5 rounded-2xl border-4 border-white/90 shadow-[0_0_0_2000px_rgba(0,0,0,0.45)]" />
            </div>
            <p className="pointer-events-none absolute inset-x-0 top-3 text-center text-xs font-medium text-white/90">
              Point at the voucher QR
            </p>
            <button
              onClick={stopScan}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-white/90 px-4 py-1.5 text-sm font-semibold text-gray-800 hover:bg-white"
            >
              Stop camera
            </button>
          </div>
        )}

        <form ref={formRef} action={formAction} className="mt-4 space-y-3">
          <input
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. VABCDEFG"
            className="input text-center text-lg font-bold tracking-widest"
            autoComplete="off"
            autoCapitalize="characters"
          />
          <div className="flex gap-2">
            {supported && !scanning && (
              <button
                type="button"
                onClick={startScan}
                className="btn-outline flex-1"
              >
                📷 Scan QR
              </button>
            )}
            <button
              type="submit"
              disabled={pending}
              className="btn-primary flex-1"
            >
              {pending ? "Checking…" : "Redeem"}
            </button>
          </div>
          {!supported && (
            <p className="text-center text-xs text-gray-400">
              Camera scanning isn&apos;t available on this browser — type the code
              instead.
            </p>
          )}
        </form>
      </div>

      {state.done && (
        <div
          className={`card border-2 ${
            resultColor === "green"
              ? "border-green-300 bg-green-50"
              : "border-red-300 bg-red-50"
          }`}
        >
          {state.ok ? (
            <div className="text-center">
              <div className="text-3xl">✅</div>
              <div className="mt-1 text-lg font-bold text-green-800">
                {state.rewardText}
              </div>
              <div className="text-sm text-green-700">{state.code}</div>
              {state.conditions && (
                <div className="mt-1 text-xs text-green-700">{state.conditions}</div>
              )}
              <div className="mt-2 text-sm font-semibold text-green-800">
                Redeemed — give the customer their reward.
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-3xl">⛔</div>
              <div className="mt-1 font-semibold text-red-800">
                {state.message}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
