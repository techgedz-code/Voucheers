import { requireAuth } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAuth(["merchant", "staff"]);
  const status = ctx.merchant?.subscription_status ?? "pending";

  const isStaff = ctx.profile.role === "staff";
  const merchantLinks = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/outlets", label: "Outlets" },
    { href: "/dashboard/analytics", label: "Analytics" },
    { href: "/dashboard/customers", label: "Customers" },
    { href: "/dashboard/redeem", label: "Redeem" },
    { href: "/dashboard/staff", label: "Staff" },
  ];
  const staffLinks = [
    { href: "/dashboard/redeem", label: "Redeem" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        title={ctx.merchant?.business_name ?? "Dashboard"}
        subtitle={isStaff ? "Staff" : "Merchant"}
        links={isStaff ? staffLinks : merchantLinks}
      />

      {status !== "active" && (
        <div className="bg-amber-50 px-5 py-2.5 text-center text-sm text-amber-800 print:hidden">
          Your subscription is <strong>{status}</strong>. Some features are
          locked until a super admin activates your account.
        </div>
      )}

      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
    </div>
  );
}
