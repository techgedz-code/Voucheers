import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voucher App — Reviews & Rewards for Restaurants",
  description:
    "Turn diners into reviews and repeat visits. Scan, play, win a voucher.",
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
