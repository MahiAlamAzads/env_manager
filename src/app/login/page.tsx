import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LoginPage() {
  const store = await cookies();
  if (verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value)) redirect("/");

  return (
    <main className="vault-login-shell">
      <div className="container py-5 d-flex justify-content-center align-items-center min-vh-100">
        <LoginForm />
      </div>
    </main>
  );
}
