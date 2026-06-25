import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  // Exchange the one-time code from the reset email for a session.
  if (sp.code) {
    await supabase.auth.exchangeCodeForSession(sp.code);
  }

  // Verify we have a valid session (either just exchanged or already set).
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/login" className="mb-8 text-center text-lg font-extrabold text-brand">
        Voucheers
      </Link>
      <div className="card">
        <h1 className="text-xl font-bold">Set a new password</h1>

        {!user ? (
          <div className="mt-3">
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              This reset link is invalid or has expired. Please request a new one.
            </p>
            <Link href="/forgot-password" className="btn-primary mt-4 block w-full text-center">
              Request new link
            </Link>
          </div>
        ) : (
          <>
            {sp.error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {sp.error}
              </p>
            )}
            <form action={updatePassword} className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="password">New password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  className="input"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="label" htmlFor="confirm">Confirm new password</label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  minLength={8}
                  required
                  className="input"
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Update password
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
