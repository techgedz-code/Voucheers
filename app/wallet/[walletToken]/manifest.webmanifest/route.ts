import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * Per-restaurant PWA manifest. Gives the customer's "Add to Home Screen"
 * an icon + name branded to the specific outlet.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ walletToken: string }> }
) {
  const { walletToken } = await params;
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("issued_vouchers")
    .select("outlets(name, brand_color, logo_url)")
    .eq("wallet_token", walletToken)
    .limit(1)
    .maybeSingle();

  const outlet = (data?.outlets ?? null) as
    | { name: string; brand_color: string | null; logo_url: string | null }
    | null;

  const name = outlet?.name ? `${outlet.name} Vouchers` : "My Vouchers";
  const color = outlet?.brand_color ?? "#e11d48";
  const base = appUrl();
  const iconUrl = outlet?.logo_url || `${base}/wallet/${walletToken}/icon`;
  const iconType = outlet?.logo_url ? "image/png" : "image/svg+xml";

  const manifest = {
    name,
    short_name: outlet?.name?.slice(0, 12) || "Vouchers",
    start_url: `/wallet/${walletToken}`,
    scope: `/wallet/${walletToken}`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: color,
    icons: [
      { src: iconUrl, sizes: "192x192", type: iconType, purpose: "any" },
      { src: iconUrl, sizes: "512x512", type: iconType, purpose: "any maskable" },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
