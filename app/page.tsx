import Link from "next/link";
import { headers } from "next/headers";
import { getAuth } from "../server/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getAuth().api.getSession({ headers: await headers() });

  return (
    <main className="landing-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Daymark home">
          <span className="brand-mark" aria-hidden="true">d</span>
          <span>daymark</span>
        </Link>
        <nav className="site-nav" aria-label="Account">
          {session ? (
            <Link className="button button-small" href="/dashboard">Go to your dashboard</Link>
          ) : (
            <>
              <Link className="text-link" href="/login">Log in</Link>
              <Link className="button button-small" href="/signup">Create your account</Link>
            </>
          )}
        </nav>
      </header>

      <section className="hero">
        <p className="eyebrow"><span className="eyebrow-dot" /> Your time, thoughtfully arranged</p>
        <h1>Make room for<br /><span>good conversations.</span></h1>
        <p className="hero-copy">A calmer place to keep your scheduling work together. Start with a simple, personal home for what’s ahead.</p>
        <div className="hero-actions">
          {session ? (
            <Link className="button" href="/dashboard">Go to your dashboard</Link>
          ) : (
            <>
              <Link className="button" href="/signup">Get started <span aria-hidden="true">↗</span></Link>
              <Link className="quiet-link" href="/login">Already have an account?</Link>
            </>
          )}
        </div>
        <div className="hero-note"><span className="note-line" /> A little more ease in every week</div>
      </section>

      <footer className="landing-footer">
        <span>Simple scheduling, with space to breathe.</span>
        <span>Made for the way you work.</span>
      </footer>
    </main>
  );
}
