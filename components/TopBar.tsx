import Link from "next/link";
import { logout } from "@/app/login/actions";

export function TopBar({
  title,
  subtitle,
  links,
}: {
  title: string;
  subtitle?: string;
  links: { href: string; label: string }[];
}) {
  return (
    <header className="border-b border-gray-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-base font-extrabold text-brand">
            Voucher App
          </Link>
          <span className="hidden text-sm text-gray-400 sm:inline">/</span>
          <div>
            <div className="text-sm font-semibold leading-tight">{title}</div>
            {subtitle && (
              <div className="text-xs text-gray-500">{subtitle}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <nav className="flex flex-wrap gap-3 text-sm font-medium text-gray-600">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-brand">
                {l.label}
              </Link>
            ))}
          </nav>
          <form action={logout}>
            <button className="text-sm font-medium text-gray-500 hover:text-red-600">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
