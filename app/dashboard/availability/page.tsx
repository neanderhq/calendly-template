import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { AvailabilityForm } from "../../components/forms/availability-form";
import { AvailabilityOverrideForm } from "../../components/forms/availability-override-form";
import { AvailabilityRulesForm } from "../../components/forms/availability-rules-form";
import { BlockedTimesForm } from "../../components/forms/blocked-times-form";
import { SignOutButton } from "../../components/sign-out-button";
import { Card, PageHeader } from "../../components/ui";
import { getAuth } from "../../../server/auth";
import { getDb } from "../../../server/db";
import { ensureSchedulingDefaults } from "../../../server/scheduling";
import { availabilityOverride, availabilityRange, blockedTime, user } from "../../../server/schema";
import { getAvailabilityRules } from "../../../server/slots";

export const dynamic = "force-dynamic";

function bufferLabel(minutes: number) {
  return minutes === 0 ? "None" : `${minutes} min`;
}

function noticeLabel(hours: number) {
  return hours === 0 ? "None" : `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export default async function AvailabilityPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  await ensureSchedulingDefaults(session.user.id);
  const ranges = await getDb()
    .select({
      id: availabilityRange.id,
      weekday: availabilityRange.weekday,
      startMinute: availabilityRange.startMinute,
      endMinute: availabilityRange.endMinute,
    })
    .from(availabilityRange)
    .where(eq(availabilityRange.userId, session.user.id))
    .orderBy(asc(availabilityRange.weekday), asc(availabilityRange.startMinute));
  const [profile] = await getDb()
    .select({ timezone: user.timezone })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const timezone = profile?.timezone ?? session.user.timezone;
  const rules = await getAvailabilityRules(session.user.id);
  const overrides = await getDb()
    .select({
      id: availabilityOverride.id,
      date: availabilityOverride.date,
      kind: availabilityOverride.kind,
      startMinute: availabilityOverride.startMinute,
      endMinute: availabilityOverride.endMinute,
    })
    .from(availabilityOverride)
    .where(eq(availabilityOverride.userId, session.user.id))
    .orderBy(asc(availabilityOverride.date), asc(availabilityOverride.startMinute));
  const blocks = await getDb()
    .select({
      id: blockedTime.id,
      date: blockedTime.date,
      startMinute: blockedTime.startMinute,
      endMinute: blockedTime.endMinute,
      note: blockedTime.note,
    })
    .from(blockedTime)
    .where(eq(blockedTime.userId, session.user.id))
    .orderBy(asc(blockedTime.date), asc(blockedTime.startMinute));
  const overrideDates = new Set(overrides.map((override) => override.date));
  const closedDates = new Set(
    overrides.filter((override) => override.kind === "unavailable").map((override) => override.date),
  );

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
        <PageHeader eyebrow="Host settings" title="Weekly availability" description="Set the hours invitees can book, in your own time zone." />
        <Card className="scheduling-card">
          <p className="timezone-note">Time zone: {timezone}</p>
          <p className="rules-summary">
            Buffers: {bufferLabel(rules.bufferBeforeMinutes)} before, {bufferLabel(rules.bufferAfterMinutes)} after
            · Minimum notice: {noticeLabel(rules.minimumNoticeHours)}
            · Booking horizon: {rules.bookingHorizonDays} days
            · Start spacing: {rules.startTimeIncrementMinutes === null ? "same as event duration" : `${rules.startTimeIncrementMinutes} min`}
            · Meeting limits: {rules.dailyMeetingLimit ?? "No daily limit"} / day, {rules.weeklyMeetingLimit ?? "No weekly limit"} / week, {rules.monthlyMeetingLimit ?? "No monthly limit"} / month
            · Date-specific days: {overrideDates.size} ({closedDates.size} closed)
            · Blocked ranges: {blocks.length}
          </p>
          <AvailabilityForm ranges={ranges} />
        </Card>
        <Card className="scheduling-card rules-card">
          <div className="section-heading">
            <h2>Booking rules</h2>
            <p>Set buffers, minimum notice, how far ahead people can book, start-time spacing and meeting limits.</p>
          </div>
          <AvailabilityRulesForm rules={rules} />
        </Card>
        <Card className="scheduling-card rules-card">
          <div className="section-heading">
            <h2>Date-specific hours</h2>
            <p>Override your weekly hours for one date, or close the whole day. Times are in your time zone: {timezone}.</p>
          </div>
          <AvailabilityOverrideForm overrides={overrides} />
        </Card>
        <Card className="scheduling-card rules-card">
          <div className="section-heading">
            <h2>Blocked times</h2>
            <p>Block a time range on one date, like an appointment or a break. Times are in your time zone: {timezone}.</p>
          </div>
          <BlockedTimesForm blocks={blocks} />
        </Card>
      </div>
    </main>
  );
}
