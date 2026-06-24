import { requireAuth } from "@/lib/auth";
import { CustomerSearch } from "./CustomerSearch";

export default async function CustomersPage() {
  await requireAuth(["merchant", "staff"]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="mt-1 text-sm text-gray-500">
          Look up a customer by phone number to view their visit history,
          vouchers, and redeem on their behalf.
        </p>
      </div>
      <CustomerSearch />
    </div>
  );
}
