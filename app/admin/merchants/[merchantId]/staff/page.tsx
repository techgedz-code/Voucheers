import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaffManager } from "@/app/dashboard/staff/StaffManager";

export default async function AdminMerchantStaffPage({
  params,
}: {
  params: Promise<{ merchantId: string }>;
}) {
  const { merchantId } = await params;
  await requireAuth(["super_admin"]);
  const admin = createAdminClient();

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
      <div>
        <h1 className="text-xl font-bold">Staff</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage staff accounts for this merchant. Staff can only access the Redeem page.
        </p>
      </div>

      <StaffManager staff={staff} merchantId={merchantId} />
    </div>
  );
}
