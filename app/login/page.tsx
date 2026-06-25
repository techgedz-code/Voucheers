import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const sp = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-center text-lg font-extrabold text-brand">
        Voucheers
      </Link>
      <div className="card">
        <h1 className="text-xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-gray-500">
          For restaurant owners, staff, and admins.
        </p>

        {sp.message && (
          <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {sp.message}
          </p>
        )}
        {sp.error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {sp.error}
          </p>
        )}

        <form action={login} className="mt-5 space-y-4">
          <input type="hidden" name="next" value={sp.next ?? ""} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required className="input" />
          </div>
          <button type="submit" className="btn-primary w-full">Sign in</button>
          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-brand">
              Forgot password?
            </Link>
          </div>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        New restaurant?{" "}
        <Link href="/signup" className="font-semibold text-brand">
          Create an account
        </Link>
      </p>
    </main>
  );
}
