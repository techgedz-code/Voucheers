import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/constants";
import { qrSvg } from "@/lib/qr";
import type { Outlet } from "@/lib/types";
import { PrintButton } from "./PrintButton";

export default async function PrintPoster({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuth(["merchant", "staff"]);
  const supabase = await createClient();

  const { data: outlet } = await supabase
    .from("outlets")
    .select("*")
    .eq("id", id)
    .single();
  if (!outlet) notFound();
  const o = outlet as Outlet;

  const scanUrl = `${appUrl()}/c/${o.qr_token}`;
  const svg = await qrSvg(scanUrl, { dark: "#111827" });

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 12mm; }
        }
      `}</style>

      <div className="mx-auto max-w-md px-6 py-8 text-center">
        <div className="mb-4 flex justify-end">
          <PrintButton />
        </div>

        <div
          className="rounded-3xl border-4 p-8"
          style={{ borderColor: o.brand_color ?? "#e11d48" }}
        >
          <div className="text-2xl font-extrabold" style={{ color: o.brand_color ?? "#e11d48" }}>
            {o.name}
          </div>
          <div className="mt-1 text-lg font-bold text-gray-900">
            Scan • Review • Win 🎁
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Scan the code, leave us a quick Google review, and spin to win a
            voucher for your next visit!
          </p>

          <div
            className="mx-auto mt-5 w-60"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: svg }}
          />

          <p className="mt-4 text-xs text-gray-400">
            Point your phone camera at the QR code
          </p>
        </div>

        <p className="no-print mt-6 text-xs text-gray-400">
          Tip: print on A5 or stick on each table. Each outlet has its own unique
          code.
        </p>
      </div>
    </div>
  );
}
