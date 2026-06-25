"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MerchantNav({
  merchantId,
  businessName,
}: {
  merchantId: string;
  businessName: string;
}) {
  const pathname = usePathname();
  const base = `/admin/merchants/${merchantId}`;

  const links = [
    { href: base, label: "Overview" },
    { href: `${base}/outlets`, label: "Outlets" },
    { href: `${base}/analytics`, label: "Analytics" },
    { href: `${base}/customers`, label: "Customers" },
    { href: `${base}/redeem`, label: "Redeem" },
    { href: `${base}/staff`, label: "Staff" },
  ];

  function isActive(href: string) {
    if (href === base) return pathname === base;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin" className="text-gray-500 hover:text-brand">
            ← All merchants
          </Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold">{businessName}</span>
        </div>
      </div>
      <nav className="mt-3 flex flex-wrap gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              isActive(l.href)
                ? "bg-brand text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
