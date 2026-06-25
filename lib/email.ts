import { Resend } from "resend";

interface VoucherEmailArgs {
  to: string;
  outletName: string;
  brandColor: string;
  rewardText: string;
  code: string;
  expiresAt: string;
  conditions: string | null;
  walletUrl: string;
}

/**
 * Sends the voucher copy by email. No-ops (logs) when RESEND_API_KEY is unset,
 * so local dev works without email configured.
 */
export async function sendVoucherEmail(args: VoucherEmailArgs): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Voucheers <onboarding@resend.dev>";
  if (!key) {
    console.log("[email] RESEND_API_KEY not set — skipping voucher email to", args.to);
    return;
  }

  const expires = new Date(args.expiresAt).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const html = `
  <div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:auto">
    <div style="background:${args.brandColor};color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center">
      <div style="font-size:18px;font-weight:800">${args.outletName}</div>
      <div style="opacity:.9;font-size:13px">Your reward voucher 🎁</div>
    </div>
    <div style="border:1px solid #eee;border-top:0;border-radius:0 0 12px 12px;padding:20px">
      <div style="font-size:22px;font-weight:800;color:${args.brandColor};text-align:center">
        ${args.rewardText}
      </div>
      <div style="text-align:center;margin:16px 0">
        <div style="font-size:12px;color:#888">Show this code on your next visit</div>
        <div style="font-size:26px;letter-spacing:3px;font-weight:800;margin-top:4px">${args.code}</div>
      </div>
      <div style="font-size:13px;color:#555">
        <p><strong>Valid until:</strong> ${expires}</p>
        ${args.conditions ? `<p><strong>Conditions:</strong> ${args.conditions}</p>` : ""}
      </div>
      <a href="${args.walletUrl}"
        style="display:block;text-align:center;background:${args.brandColor};color:#fff;text-decoration:none;padding:12px;border-radius:8px;font-weight:700;margin-top:12px">
        Open my voucher wallet
      </a>
      <p style="font-size:11px;color:#aaa;text-align:center;margin-top:12px">
        Tip: open the wallet and tap “Add to Home Screen” to keep it handy.
      </p>
    </div>
  </div>`;

  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from,
      to: args.to,
      subject: `Your ${args.outletName} voucher — ${args.rewardText}`,
      html,
    });
    if (error) {
      console.error("[email] Resend API error:", JSON.stringify(error));
    } else {
      console.log("[email] sent ok, id:", data?.id);
    }
  } catch (e) {
    console.error("[email] failed to send voucher email:", e);
  }
}
