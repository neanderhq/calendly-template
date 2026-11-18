import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { EventTypeForm } from "../../components/forms/event-type-form";
import { EventBookingLinkButton } from "../../components/forms/event-booking-link-button";
import { SignOutButton } from "../../components/sign-out-button";
import { Card, PageHeader } from "../../components/ui";
import { getAuth } from "../../../server/auth";
import { getDb } from "../../../server/db";
import { ensureSchedulingDefaults, getOrCreateEventType, getQuestions } from "../../../server/scheduling";
import { user } from "../../../server/schema";

export const dynamic = "force-dynamic";

export default async function EventTypePage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  await ensureSchedulingDefaults(session.user.id);
  const event = await getOrCreateEventType(session.user.id);
  const questions = await getQuestions(session.user.id);
  const [profile] = await getDb()
    .select({ username: user.username })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  return (
    <main className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="Daymark home"><span className="brand-mark" aria-hidden="true">d</span><span>daymark</span></a>
        <Link className="text-link" href="/dashboard">← Back to your workspace</Link>
        <nav className="account-nav" aria-label="Account navigation">
          <span className="account-greeting">{session.user.name}</span>
          <a className="text-link" href="/settings">Settings</a>
          <SignOutButton />
        </nav>
      </header>
      <div className="dashboard-content scheduling-content">
        <PageHeader eyebrow="Host settings" title="Event type" description="Set up the meeting details, public link, and questions invitees will see." />
        <Card className="scheduling-card">
          <EventTypeForm event={event} username={profile?.username ?? null} questions={questions} />
        </Card>
        <EventBookingLinkButton />
      </div>
    </main>
  );
}
