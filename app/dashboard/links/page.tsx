import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { BookingLinkManager, type BookingLinkRecord } from "../../components/forms/booking-link-manager";
import { SignOutButton } from "../../components/sign-out-button";
import { PageHeader } from "../../components/ui";
import { getAuth } from "../../../server/auth";
import { getDb } from "../../../server/db";
import { listBookingLinks } from "../../../server/booking-links";
import { ensureSchedulingDefaults } from "../../../server/scheduling";
import { user } from "../../../server/schema";
import { isIanaTimezone } from "../../../server/timezone";

export const dynamic = "force-dynamic";

export default async function BookingLinksPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  await ensureSchedulingDefaults(session.user.id);
  const [profile] = await getDb()
    .select({ timezone: user.timezone })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const timezone = isIanaTimezone(profile?.timezone)
    ? profile.timezone
    : isIanaTimezone(session.user.timezone)
      ? session.user.timezone
      : "UTC";
  const records = await listBookingLinks(session.user.id);
  const initialLinks: BookingLinkRecord[] = records.map((link) => ({
    id: link.id,
    token: link.token,
    kind: link.kind,
    status: link.status,
    createdAt: link.createdAt.toISOString(),
    eventTypeName: link.eventTypeName,
    meetingName: link.meetingName,
    durationMinutes: link.durationMinutes,
    booking: link.booking
      ? {
          ...link.booking,
          startUtc: link.booking.startUtc ?? null,
          endUtc: link.booking.endUtc ?? null,
        }
      : null,
  }));

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Daymark home"><span className="brand-mark" aria-hidden="true">d</span><span>daymark</span></Link>
        <Link className="text-link" href="/dashboard">← Back to your workspace</Link>
        <nav className="account-nav" aria-label="Account navigation">
          <span className="account-greeting">{session.user.name}</span>
          <Link className="text-link" href="/settings">Settings</Link>
          <SignOutButton />
        </nav>
      </header>
      <div className="dashboard-content scheduling-content">
        <PageHeader eyebrow="Your workspace" title="Links" description="Create one-off meeting links and manage links you have shared." />
        <BookingLinkManager initialLinks={initialLinks} timezone={timezone} />
      </div>
    </main>
  );
}
