import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "../components/forms/auth-forms";
import { getAuth } from "../../server/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <main className="auth-shell">
      <Link className="brand" href="/" aria-label="Saffron home"><span className="brand-mark" aria-hidden="true">s</span><span>saffron</span></Link>
      <section className="auth-panel">
        <p className="eyebrow page-eyebrow">Welcome back</p>
        <h1>Good to see you.</h1>
        <p className="auth-intro">Log in to pick up where you left off.</p>
        <LoginForm />
      </section>
      <p className="auth-footnote">Your schedule, at your own pace.</p>
    </main>
  );
}
