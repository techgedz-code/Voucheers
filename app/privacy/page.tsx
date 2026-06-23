export const metadata = { title: "Privacy Notice (PDPA)" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">Privacy Notice</h1>
      <p className="mt-2 text-sm text-gray-500">
        In line with Malaysia&apos;s Personal Data Protection Act 2010 (PDPA).
      </p>

      <div className="prose mt-6 space-y-4 text-sm text-gray-700">
        <p>
          When you take part in a restaurant&apos;s rewards campaign, we collect
          your <strong>mobile number</strong> and <strong>email address</strong>{" "}
          so we can issue and deliver your voucher and let the restaurant contact
          you about it.
        </p>
        <p>
          <strong>How we use it.</strong> Your details are used only to issue,
          deliver, and validate your voucher, and to share basic, aggregated
          campaign analytics with the participating restaurant. We do not sell
          your data.
        </p>
        <p>
          <strong>Reviews are optional.</strong> Leaving a Google review or
          following a social account is entirely voluntary and is never required
          to receive a reward, and your reward does not depend on what you write.
        </p>
        <p>
          <strong>Retention.</strong> We keep your details for the duration of
          the campaign and a reasonable period afterwards, then delete them.
        </p>
        <p>
          <strong>Your rights.</strong> You may request access to, correction of,
          or deletion of your personal data at any time by contacting the
          restaurant or us.
        </p>
      </div>
    </main>
  );
}
