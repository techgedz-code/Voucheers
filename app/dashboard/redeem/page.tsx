import { requireAuth } from "@/lib/auth";
import { RedeemClient } from "./RedeemClient";

export default async function RedeemPage() {
  await requireAuth(["merchant", "staff"]);
  return <RedeemClient />;
}
