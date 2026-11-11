import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { PollDetail } from "../../../components/forms/poll-detail";
import { SignOutButton } from "../../../components/sign-out-button";
import { PageHeader } from "../../../components/ui";
import { getAuth } from "../../../../server/auth";
import { getDb } from "../../../../server/db";
import { getHostPoll, getPollResults } from "../../../../server/polls";
import { user } from "../../../../server/schema";

export const dynamic = "force-dynamic";

export default async function PollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { id } = await params;

  const hostPoll = await getHostPoll(session.user.id, id);
  const results = await getPollResults(session.user.id, id);
  if (!hostPoll || !results) redirect("/dashboard/polls");

  const [profile] = await getDb()
    .select({ timezone: user.timezone })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const hostTimezone = profile?.timezone ?? session.user.timezone;

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Saffron home"><span className="brand-mark" aria-hidden="true">s</span><span>saffron</span></Link>
        <Link className="text-link" href="/dashboard/polls">← Back to your polls</Link>
        <nav className="account-nav" aria-label="Account navigation">
          <span className="account-greeting">{session.user.name}</span>
          <Link className="text-link" href="/settings">Settings</Link>
          <SignOutButton />
        </nav>
      </header>
      <div className="dashboard-content scheduling-content">
        <PageHeader eyebrow="Your workspace" title={hostPoll.title} description="Review votes, share the poll, and book the winning time." />
        <PollDetail
          timezone={hostTimezone}
          poll={{
            ...hostPoll,
            createdAt: hostPoll.createdAt.toISOString(),
            updatedAt: hostPoll.updatedAt.toISOString(),
            options: hostPoll.options.map((option) => ({
              ...option,
              startUtc: option.startUtc.toISOString(),
            })),
            booking: hostPoll.booking
              ? {
                  ...hostPoll.booking,
                  startUtc: hostPoll.booking.startUtc.toISOString(),
                  endUtc: hostPoll.booking.endUtc.toISOString(),
                }
              : null,
          }}
          results={results.map((result) => ({
            ...result,
            startUtc: result.startUtc.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
