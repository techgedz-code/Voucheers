import Link from "next/link";
import { sendResetEmail } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const sp = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/login" className="mb-8 text-center text-lg font-extrabold text-brand">
        Voucheers
      </Link>
      <div className="card">
        <h1 className="text-xl font-bold">Reset your password</h1>

        {sp.sent ? (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Check your email — we&apos;ve sent a password reset link. It expires in 1 hour.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-500">
              Enter your account email and we&apos;ll send you a reset link.
            </p>
            {sp.error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {sp.error}
              </p>
            )}
            <form action={sendResetEmail} className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" name="email" type="email" required className="input" />
              </div>
              <button type="submit" className="btn-primary w-full">
                Send reset link
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        <Link href="/login" className="font-semibold text-brand">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
