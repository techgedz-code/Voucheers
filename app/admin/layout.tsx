import { requireAuth } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth(["super_admin"]);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        title="Super Admin"
        subtitle="Platform owner"
        links={[
          { href: "/admin", label: "Merchants" },
          { href: "/admin/abuse", label: "Abuse flags" },
        ]}
      />
      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
    </div>
  );
}
