import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { PollsManager } from "../../components/forms/polls-manager";
import { SignOutButton } from "../../components/sign-out-button";
import { PageHeader } from "../../components/ui";
import { getAuth } from "../../../server/auth";
import { getDb } from "../../../server/db";
import { listPolls } from "../../../server/polls";
import { user } from "../../../server/schema";

export const dynamic = "force-dynamic";

export default async function PollsPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [profile] = await getDb()
    .select({ timezone: user.timezone })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const hostTimezone = profile?.timezone ?? session.user.timezone;
  const polls = await listPolls(session.user.id);

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Saffron home"><span className="brand-mark" aria-hidden="true">s</span><span>saffron</span></Link>
        <Link className="text-link" href="/dashboard">← Back to your workspace</Link>
        <nav className="account-nav" aria-label="Account navigation">
          <span className="account-greeting">{session.user.name}</span>
          <Link className="text-link" href="/settings">Settings</Link>
          <SignOutButton />
        </nav>
      </header>
      <div className="dashboard-content scheduling-content">
        <PageHeader eyebrow="Your workspace" title="Polls" description="Propose times, collect votes, book the time that wins." />
        <PollsManager
          timezone={hostTimezone}
          initialPolls={polls.map((poll) => ({
            id: poll.id,
            title: poll.title,
            status: poll.status,
            optionCount: poll.optionCount,
            createdAt: poll.createdAt.toISOString(),
            updatedAt: poll.updatedAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
