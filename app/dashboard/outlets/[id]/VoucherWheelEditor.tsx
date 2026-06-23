"use client";

import { useActionState, useMemo, useState } from "react";
import { SpinWheel } from "@/components/SpinWheel";
import { WHEEL_COLORS, REWARD_TYPE_LABELS } from "@/lib/constants";
import { percentages } from "@/lib/wheel";
import type { RewardType, VoucherType } from "@/lib/types";
import { saveVoucherTypes, type SaveSegmentsState } from "./actions";
import type { SegmentInput } from "./actions";

const REWARD_TYPES: RewardType[] = [
  "percent_discount",
  "fixed_discount",
  "bogo",
  "free_item",
  "none",
];

function blank(i: number): SegmentInput {
  return {
    label: "",
    reward_type: "percent_discount",
    value: 10,
    validity_days: 30,
    conditions: "Valid on your next visit only",
    win_weight: 1,
    color: WHEEL_COLORS[i % WHEEL_COLORS.length],
    stock_limit: null,
    daily_limit: null,
    sort_order: i,
  };
}

const initialState: SaveSegmentsState = {};

export function VoucherWheelEditor({
  campaignId,
  initial,
}: {
  campaignId: string;
  initial: VoucherType[];
}) {
  const [segments, setSegments] = useState<SegmentInput[]>(
    initial.length
      ? initial.map((v, i) => ({
          id: v.id,
          label: v.label,
          reward_type: v.reward_type,
          value: v.value,
          validity_days: v.validity_days,
          conditions: v.conditions,
          win_weight: v.win_weight,
          color: v.color,
          stock_limit: v.stock_limit,
          daily_limit: v.daily_limit,
          sort_order: i,
        }))
      : [blank(0), { ...blank(1), reward_type: "none", label: "Try Again", value: null, win_weight: 1 }]
  );

  const [state, formAction, pending] = useActionState(
    saveVoucherTypes,
    initialState
  );

  const pcts = useMemo(() => percentages(segments), [segments]);
  const wheelSegs = segments.map((s) => ({
    label: s.label || "—",
    color: s.color || "#e11d48",
  }));

  function update(i: number, patch: Partial<SegmentInput>) {
    setSegments((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    );
  }
  function addSegment() {
    setSegments((prev) => [...prev, blank(prev.length)]);
  }
  function addTryAgain() {
    setSegments((prev) => [
      ...prev,
      { ...blank(prev.length), reward_type: "none", label: "Try Again", value: null },
    ]);
  }
  function remove(i: number) {
    setSegments((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Editor */}
      <form action={formAction} className="lg:col-span-3 space-y-4">
        <input type="hidden" name="campaign_id" value={campaignId} />
        <input
          type="hidden"
          name="segments"
          value={JSON.stringify(
            segments.map((s, i) => ({ ...s, sort_order: i }))
          )}
        />

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Wheel saved.
          </p>
        )}

        <div className="space-y-3">
          {segments.map((s, i) => {
            const showValue =
              s.reward_type === "percent_discount" ||
              s.reward_type === "fixed_discount";
            return (
              <div key={i} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={s.color ?? "#e11d48"}
                    onChange={(e) => update(i, { color: e.target.value })}
                    className="h-8 w-8 shrink-0 rounded border border-gray-300"
                    aria-label="Segment color"
                  />
                  <input
                    className="input !py-1.5"
                    placeholder="Prize label (shown on wheel)"
                    value={s.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                  />
                  <span className="ml-auto shrink-0 rounded bg-brand/10 px-2 py-1 text-xs font-bold text-brand">
                    {pcts[i]}%
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="shrink-0 text-gray-400 hover:text-red-600"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <label className="text-xs text-gray-500">
                    Reward
                    <select
                      className="input !py-1.5 mt-0.5"
                      value={s.reward_type}
                      onChange={(e) =>
                        update(i, { reward_type: e.target.value as RewardType })
                      }
                    >
                      {REWARD_TYPES.map((rt) => (
                        <option key={rt} value={rt}>
                          {REWARD_TYPE_LABELS[rt]}
                        </option>
                      ))}
                    </select>
                  </label>

                  {showValue && (
                    <label className="text-xs text-gray-500">
                      {s.reward_type === "percent_discount" ? "% off" : "RM off"}
                      <input
                        type="number"
                        min={0}
                        className="input !py-1.5 mt-0.5"
                        value={s.value ?? 0}
                        onChange={(e) =>
                          update(i, { value: Number(e.target.value) })
                        }
                      />
                    </label>
                  )}

                  <label className="text-xs text-gray-500">
                    Win weight
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      className="input !py-1.5 mt-0.5"
                      value={s.win_weight}
                      onChange={(e) =>
                        update(i, { win_weight: Number(e.target.value) })
                      }
                    />
                  </label>

                  <label className="text-xs text-gray-500">
                    Validity (days)
                    <input
                      type="number"
                      min={1}
                      className="input !py-1.5 mt-0.5"
                      value={s.validity_days}
                      onChange={(e) =>
                        update(i, { validity_days: Number(e.target.value) })
                      }
                    />
                  </label>

                  <label className="text-xs text-gray-500">
                    Stock cap (blank = ∞)
                    <input
                      type="number"
                      min={0}
                      className="input !py-1.5 mt-0.5"
                      value={s.stock_limit ?? ""}
                      onChange={(e) =>
                        update(i, {
                          stock_limit:
                            e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                {s.reward_type !== "none" && (
                  <input
                    className="input !py-1.5 mt-2"
                    placeholder="Conditions (e.g. Min spend RM30, dine-in only)"
                    value={s.conditions ?? ""}
                    onChange={(e) => update(i, { conditions: e.target.value })}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addSegment} className="btn-outline !py-1.5">
            + Add prize
          </button>
          <button type="button" onClick={addTryAgain} className="btn-outline !py-1.5">
            + Add “Try Again”
          </button>
          <button
            type="submit"
            disabled={pending}
            className="btn-primary !py-1.5 ml-auto"
          >
            {pending ? "Saving…" : "Save wheel"}
          </button>
        </div>
      </form>

      {/* Live preview */}
      <div className="lg:col-span-2">
        <div className="card sticky top-4 text-center">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Live preview
          </h3>
          <SpinWheel segments={wheelSegs} size={260} />
          <div className="mt-4 space-y-1 text-left text-xs">
            {segments.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: s.color ?? "#e11d48" }}
                  />
                  {s.label || "—"}
                </span>
                <span className="font-semibold text-gray-700">{pcts[i]}%</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
            Customers see equal-sized slices; these percentages are the real
            win odds and stay hidden from them.
          </p>
        </div>
      </div>
    </div>
  );
}
