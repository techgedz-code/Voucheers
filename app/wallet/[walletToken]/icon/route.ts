import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Branded app icon for the wallet PWA. If the outlet has a logo URL we
 * redirect to it; otherwise we render an SVG tile with the outlet's
 * brand colour and initial — so the home-screen icon is recognisable.
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

  if (outlet?.logo_url) {
    return Response.redirect(outlet.logo_url, 302);
  }

  const color = outlet?.brand_color ?? "#e11d48";
  const letter = (outlet?.name ?? "V").charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="96" fill="${color}"/>
    <text x="50%" y="50%" dy="0.35em" text-anchor="middle"
      font-family="system-ui, Arial, sans-serif" font-size="280" font-weight="800" fill="#ffffff">${letter}</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
