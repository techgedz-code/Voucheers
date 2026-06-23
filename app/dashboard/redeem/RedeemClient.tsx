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
      setScanning(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // @ts-expect-error experimental global
      const detector: BarcodeDetectorLike = new window.BarcodeDetector({
        formats: ["qr_code"],
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
    } catch {
      setScanning(false);
    }
  }

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
          <div className="mt-4 overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} className="w-full" muted playsInline />
            <button
              onClick={stopScan}
              className="btn-outline m-2 !py-1.5"
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
