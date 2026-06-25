import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaffManager } from "@/app/dashboard/staff/StaffManager";
import type { Merchant } from "@/lib/types";

export default async function AdminMerchantStaffPage({
  params,
}: {
  params: Promise<{ merchantId: string }>;
}) {
  const { merchantId } = await params;
  await requireAuth(["super_admin"]);
  const admin = createAdminClient();

  const { data: merchantData } = await admin
    .from("merchants")
    .select("*")
    .eq("id", merchantId)
    .single();
  if (!merchantData) notFound();
  const merchant = merchantData as Merchant;

  const { data: staffProfiles } = await admin
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("merchant_id", merchantId)
    .eq("role", "staff")
    .order("created_at", { ascending: true });

  const { data: usersData } = await admin.auth.admin.listUsers();
  const userEmailMap = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? null])
  );

  const staff = (staffProfiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    created_at: p.created_at,
    email: userEmailMap.get(p.id) ?? null,
  }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin" className="hover:text-brand">Merchants</Link>
        <span>/</span>
        <Link href={`/admin/merchants/${merchantId}`} className="hover:text-brand">
          {merchant.business_name}
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-700">Staff</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Staff — {merchant.business_name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage staff accounts for this merchant. Staff can only access the Redeem page.
        </p>
      </div>

      <StaffManager staff={staff} merchantId={merchantId} />
    </div>
  );
}
