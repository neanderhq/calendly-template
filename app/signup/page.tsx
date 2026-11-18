import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignupForm } from "../components/forms/auth-forms";
import { getAuth } from "../../server/auth";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <main className="auth-shell">
      <Link className="brand" href="/" aria-label="Daymark home"><span className="brand-mark" aria-hidden="true">d</span><span>daymark</span></Link>
      <section className="auth-panel">
        <p className="eyebrow page-eyebrow">A fresh start</p>
        <h1>Create your account</h1>
        <p className="auth-intro">A little more ease starts here.</p>
        <SignupForm />
      </section>
      <p className="auth-footnote">Your schedule, at your own pace.</p>
    </main>
  );
}
