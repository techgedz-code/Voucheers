import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Merchant } from "@/lib/types";
import { MerchantNav } from "./MerchantNav";

export default async function MerchantManageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ merchantId: string }>;
}) {
  const { merchantId } = await params;
  await requireAuth(["super_admin"]);
  const admin = createAdminClient();

  const { data: merchant } = await admin
    .from("merchants")
    .select("id, business_name")
    .eq("id", merchantId)
    .single();
  if (!merchant) notFound();

  return (
    <div>
      <MerchantNav
        merchantId={merchantId}
        businessName={(merchant as Pick<Merchant, "business_name">).business_name}
      />
      {children}
    </div>
  );
}
