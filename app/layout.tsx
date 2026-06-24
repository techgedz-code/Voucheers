import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voucher App — Reviews & Rewards for Restaurants",
  description:
    "Turn diners into reviews and repeat visits. Scan, play, win a voucher.",
};

// Ensure every surface (dashboard included) renders at the device's real width
// instead of a zoomed-out desktop width on phones. User zoom is intentionally
// left enabled so customers can pinch the voucher QR larger for staff to scan.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
