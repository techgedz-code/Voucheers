import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffManager } from "./StaffManager";

export default async function StaffPage() {
  await requireAuth(["merchant"]);
  const supabase = await createClient();

  // Fetch staff profiles belonging to this merchant.
  const { data: staffProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("role", "staff")
    .order("created_at", { ascending: true });

  // Fetch their emails from auth.users via admin client.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
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
        <h1 className="text-2xl font-bold">Staff</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage staff accounts. Staff can only access the Redeem page.
        </p>
      </div>
      <StaffManager staff={staff} />
    </div>
  );
}
