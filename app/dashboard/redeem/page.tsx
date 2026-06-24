import { requireAuth } from "@/lib/auth";
import { RedeemClient } from "./RedeemClient";
import { CustomerSearch } from "../customers/CustomerSearch";

export default async function RedeemPage() {
  await requireAuth(["merchant", "staff"]);
  return (
    <div className="space-y-8">
      <RedeemClient />
      <div>
        <h2 className="mb-1 text-lg font-semibold">Lookup by phone</h2>
        <p className="mb-4 text-sm text-gray-500">
          Search a customer&apos;s phone number to view and redeem their vouchers.
        </p>
        <CustomerSearch />
      </div>
    </div>
  );
}
