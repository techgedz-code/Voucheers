"use client";

import { useState } from "react";

/**
 * Voucher QR that the customer can tap to enlarge to full screen, so dim
 * lighting / small phones don't stop staff from scanning. The source image is
 * rendered at high resolution by the server so it stays crisp when blown up.
 */
export function VoucherQr({ src, code }: { src: string; code: string }) {
  const [zoom, setZoom] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        className="flex flex-col items-center"
        aria-label="Enlarge voucher QR"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Voucher QR" width={160} height={160} />
        <span className="mt-1 text-[11px] font-medium text-gray-400">
          Tap to enlarge 🔍
        </span>
      </button>

      {zoom && (
        <div
          onClick={() => setZoom(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 p-6"
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Voucher QR" className="w-full max-w-xs" />
          <div className="mt-4 text-2xl font-extrabold tracking-widest">
            {code}
          </div>
          <p className="mt-3 text-sm text-gray-500">Tap anywhere to close</p>
        </div>
      )}
    </>
  );
}
