"use client";

import { useActionState } from "react";
import { copyConfigToAllOutlets, type CopyConfigState } from "./actions";

const initial: CopyConfigState = {};

export function CopyConfigButton({
  outletId,
  otherCount,
}: {
  outletId: string;
  otherCount: number;
}) {
  const [state, action, pending] = useActionState(copyConfigToAllOutlets, initial);

  const plural = otherCount !== 1 ? "s" : "";

  return (
    <form action={action}>
      <input type="hidden" name="outlet_id" value={outletId} />
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (
            !confirm(
              `This will overwrite the spin wheel, campaign settings, and branding (logo & colour) on your ${otherCount} other outlet${plural} with THIS outlet's setup.\n\nEach outlet's name, address, and Google review link are NOT changed.\n\nContinue?`
            )
          ) {
            e.preventDefault();
          }
        }}
        className="btn-primary !py-1.5"
      >
        {pending
          ? "Copying…"
          : `Copy this setup to all ${otherCount} other outlet${plural}`}
      </button>

      {state.ok && (
        <p className="mt-2 text-sm text-green-600">
          {state.count
            ? `✅ Copied to ${state.count} outlet${state.count !== 1 ? "s" : ""}.`
            : "No other outlets to copy to."}
        </p>
      )}
      {state.error && (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
