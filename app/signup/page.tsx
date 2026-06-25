import Link from "next/link";
import { signup } from "../login/actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-center text-lg font-extrabold text-brand">
        Voucheers
      </Link>
      <div className="card">
        <h1 className="text-xl font-bold">Create your restaurant account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Start a voucher campaign. Your account is activated once we approve your
          subscription.
        </p>

        {sp.error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {sp.error}
          </p>
        )}

        <form action={signup} className="mt-5 space-y-4">
          <div>
            <label className="label" htmlFor="business_name">Restaurant / business name</label>
            <input id="business_name" name="business_name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="full_name">Your name</label>
            <input id="full_name" name="full_name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" minLength={6} required className="input" />
          </div>
          <SubmitButton className="btn-primary w-full" pendingText="Creating account…">Create account</SubmitButton>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand">
          Sign in
        </Link>
      </p>
    </main>
  );
}
