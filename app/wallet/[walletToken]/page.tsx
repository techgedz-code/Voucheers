import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { qrPngDataUrl } from "@/lib/qr";
import { rewardDescription } from "@/lib/constants";
import type { RewardType, VoucherStatus } from "@/lib/types";
import { WalletPwa } from "./WalletPwa";
import { VoucherQr } from "./VoucherQr";

export const dynamic = "force-dynamic";

interface VoucherRow {
  id: string;
  code: string;
  status: VoucherStatus;
  expires_at: string;
  issued_at: string;
  voucher_types: {
    label: string;
    reward_type: RewardType;
    value: number | null;
    conditions: string | null;
  } | null;
  outlets: { name: string; brand_color: string | null; logo_url: string | null } | null;
}

async function loadOutletName(walletToken: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("issued_vouchers")
    .select("outlets(name, brand_color)")
    .eq("wallet_token", walletToken)
    .limit(1)
    .maybeSingle();
  return (data?.outlets ?? null) as { name: string; brand_color: string | null } | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ walletToken: string }>;
}): Promise<Metadata> {
  const { walletToken } = await params;
  const outlet = await loadOutletName(walletToken);
  const name = outlet?.name ? `${outlet.name} Vouchers` : "My Vouchers";
  return {
    title: name,
    manifest: `/wallet/${walletToken}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: outlet?.name ?? "Vouchers", statusBarStyle: "default" },
    icons: {
      icon: `/wallet/${walletToken}/icon`,
      apple: `/wallet/${walletToken}/icon`,
    },
  };
}

export default async function WalletPage({
  params,
}: {
  params: Promise<{ walletToken: string }>;
}) {
  const { walletToken } = await params;
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("issued_vouchers")
    .select(
      "id, code, status, expires_at, issued_at, voucher_types(label, reward_type, value, conditions), outlets(name, brand_color, logo_url)"
    )
    .eq("wallet_token", walletToken)
    .order("issued_at", { ascending: false });

  const vouchers = (data ?? []) as unknown as VoucherRow[];

  if (vouchers.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="card max-w-sm text-center">
          <h1 className="text-lg font-bold">No vouchers here yet</h1>
          <p className="mt-2 text-sm text-gray-600">
            This wallet is empty. Win a voucher by scanning a participating
            restaurant&apos;s QR code.
          </p>
        </div>
      </main>
    );
  }

  const outlet = vouchers[0].outlets;
  const brand = outlet?.brand_color ?? "#e11d48";

  // Pre-render QR codes for each voucher.
  const qrMap: Record<string, string> = {};
  for (const v of vouchers) {
    // Render at high resolution so the QR stays sharp when tapped to enlarge.
    if (v.status === "active") qrMap[v.id] = await qrPngDataUrl(v.code, { width: 512 });
  }

  function isExpired(v: VoucherRow) {
    return v.status === "expired" || new Date(v.expires_at) < new Date();
  }

  return (
    <main className="min-h-screen" style={{ background: `${brand}10` }}>
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-4 flex items-center gap-3">
          {outlet?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={outlet.logo_url} alt={outlet.name} className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white"
              style={{ background: brand }}
            >
              {outlet?.name?.charAt(0) ?? "V"}
            </div>
          )}
          <div>
            <div className="font-bold leading-tight">{outlet?.name}</div>
            <div className="text-xs text-gray-500">My vouchers</div>
          </div>
        </div>

        <div className="mb-4">
          <WalletPwa brandColor={brand} />
        </div>

        <div className="space-y-4">
          {vouchers.map((v) => {
            const vt = v.voucher_types;
            const used = v.status === "redeemed";
            const expired = isExpired(v) && !used;
            const reward = vt
              ? rewardDescription(vt.reward_type, vt.value, vt.label)
              : "Voucher";
            return (
              <div
                key={v.id}
                className={`card ${used || expired ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-extrabold" style={{ color: brand }}>
                      {reward}
                    </div>
                    {vt?.conditions && (
                      <div className="mt-0.5 text-xs text-gray-500">{vt.conditions}</div>
                    )}
                  </div>
                  {used && (
                    <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                      Used
                    </span>
                  )}
                  {expired && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                      Expired
                    </span>
                  )}
                </div>

                {!used && !expired && (
                  <div className="mt-3 flex flex-col items-center rounded-xl bg-gray-50 p-3">
                    <VoucherQr src={qrMap[v.id]} code={v.code} />
                    <div className="mt-2 text-xs text-gray-500">Show this to staff</div>
                    <div className="text-xl font-extrabold tracking-widest">{v.code}</div>
                  </div>
                )}

                <div className="mt-2 text-center text-xs text-gray-400">
                  {used
                    ? "Redeemed"
                    : expired
                    ? "Expired"
                    : `Valid until ${new Date(v.expires_at).toLocaleDateString("en-MY", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}`}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-400">
          Powered by Voucheers
        </p>
      </div>
    </main>
  );
}
