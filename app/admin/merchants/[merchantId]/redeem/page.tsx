import { requireAuth } from "@/lib/auth";
import { RedeemClient } from "@/app/dashboard/redeem/RedeemClient";
import { CustomerSearch } from "@/app/dashboard/customers/CustomerSearch";

export default async function AdminMerchantRedeem({
  params,
}: {
  params: Promise<{ merchantId: string }>;
}) {
  const { merchantId } = await params;
  await requireAuth(["super_admin"]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Redeem</h1>
        <p className="mt-1 text-sm text-gray-500">
          Scan or enter a voucher code, or look up a customer by phone to redeem
          on this merchant&apos;s behalf.
        </p>
      </div>
      <RedeemClient />
      <div>
        <h2 className="mb-1 text-lg font-semibold">Lookup by phone</h2>
        <p className="mb-4 text-sm text-gray-500">
          Search a customer&apos;s phone number to view and redeem their vouchers.
        </p>
        <CustomerSearch merchantId={merchantId} />
      </div>
    </div>
  );
}
