import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, eq, gt, lte } from "drizzle-orm";

import { BookingActions } from "../../components/booking-confirmation-actions";
import { SignOutButton } from "../../components/sign-out-button";
import { Card, EmptyState, PageHeader } from "../../components/ui";
import { getAuth } from "../../../server/auth";
import { getDb } from "../../../server/db";
import { booking, bookingLink, eventType, poll, user } from "../../../server/schema";
import { getAvailabilityRules } from "../../../server/slots";
import { formatInstant } from "../../../server/timezone";

export const dynamic = "force-dynamic";

type BookingView = "upcoming" | "past" | "cancelled";

const bookingViews: { id: BookingView; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

function getView(value: string | string[] | undefined): BookingView {
  const requestedView = Array.isArray(value) ? value[0] : value;
  return bookingViews.some((view) => view.id === requestedView) ? requestedView as BookingView : "upcoming";
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const now = new Date();
  const { view: requestedView } = await searchParams;
  const view = getView(requestedView);
  const [profile] = await getDb()
    .select({ timezone: user.timezone })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const rules = await getAvailabilityRules(session.user.id);
  const bookingConditions = [eq(booking.hostId, session.user.id)];
  if (view === "upcoming") {
    bookingConditions.push(eq(booking.status, "active"), gt(booking.startUtc, now));
  } else if (view === "past") {
    bookingConditions.push(eq(booking.status, "active"), lte(booking.startUtc, now));
  } else {
    bookingConditions.push(eq(booking.status, "cancelled"));
  }

  const bookings = await getDb()
    .select({
      id: booking.id,
      pollId: booking.pollId,
      startUtc: booking.startUtc,
      endUtc: booking.endUtc,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      status: booking.status,
      bookingLinkKind: bookingLink.kind,
      meetingName: bookingLink.meetingName,
      meetingDescription: bookingLink.description,
      meetingLocation: bookingLink.location,
      meetingDurationMinutes: bookingLink.durationMinutes,
      eventTypeName: eventType.name,
      eventSlug: eventType.slug,
      durationMinutes: eventType.durationMinutes,
      pollTitle: poll.title,
      username: user.username,
    })
    .from(booking)
    .leftJoin(eventType, eq(booking.eventTypeId, eventType.id))
    .leftJoin(poll, eq(booking.pollId, poll.id))
    .innerJoin(user, eq(booking.hostId, user.id))
    .leftJoin(bookingLink, eq(booking.bookingLinkId, bookingLink.id))
    .where(and(...bookingConditions))
    .orderBy(asc(booking.startUtc));
  const hostTimezone = profile?.timezone ?? session.user.timezone;
  const descriptions: Record<BookingView, string> = {
    upcoming: "Upcoming meetings with your invitees.",
    past: "Meetings that have already started.",
    cancelled: "Meetings that you or your invitees cancelled.",
  };

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
        <PageHeader eyebrow="Your workspace" title="Bookings" description={descriptions[view]} />
        <nav className="booking-tabs" aria-label="Booking history">
          {bookingViews.map((item) => (
            <Link
              key={item.id}
              className="booking-tab"
              href={item.id === "upcoming" ? "/dashboard/bookings" : `/dashboard/bookings?view=${item.id}`}
              aria-current={view === item.id ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="timezone-note">Time zone: {hostTimezone}</p>
        {bookings.length > 0 ? (
          <div className="bookings-list">
            {bookings.map((item) => {
              const sourceLabel = item.bookingLinkKind === "one_off"
                ? `One-off meeting${item.meetingName ? ` · ${item.meetingName}` : ""}`
                : item.pollTitle
                  ? `Meeting poll · ${item.pollTitle}`
                  : item.bookingLinkKind === "event_type"
                    ? "Single-use link"
                    : item.eventTypeName ?? "Event booking";
              return (
                <div className={`booking-row-entry${view === "upcoming" && item.bookingLinkKind === "one_off" ? " booking-row-entry-one-off" : ""}`} key={item.id}>
                  <Link
                    className="booking-row-link"
                    href={`/dashboard/bookings/${item.id}?view=${view}`}
                    aria-label={`View booking with ${item.inviteeName}`}
                  >
                    <Card className="booking-row">
                      <div className="booking-row-content">
                        <p className="booking-row-source">{sourceLabel}</p>
                        <h2>{item.inviteeName}</h2>
                        <p>{item.inviteeEmail}</p>
                        {item.bookingLinkKind === "one_off" && item.meetingDescription && <p>{item.meetingDescription}</p>}
                        {item.bookingLinkKind === "one_off" && item.meetingLocation && <p>Location: {item.meetingLocation}</p>}
                        <p className="booking-row-status">Status: {item.status === "cancelled" ? "Cancelled" : view === "past" ? "Past" : "Confirmed"}</p>
                      </div>
                      <time dateTime={item.startUtc.toISOString()}>{formatInstant(item.startUtc, hostTimezone)}</time>
                    </Card>
                  </Link>
                  {view === "upcoming" && (
                    <BookingActions
                      authorization={{ kind: "host", bookingId: item.id }}
                      username={item.bookingLinkKind === "one_off" ? null : item.username}
                      eventSlug={item.eventSlug ?? ""}
                      durationMinutes={item.meetingDurationMinutes ?? item.durationMinutes ?? Math.round((item.endUtc.getTime() - item.startUtc.getTime()) / 60000)}
                      timezone={hostTimezone}
                      timezones={[hostTimezone]}
                      horizonDays={item.pollId ? null : rules.bookingHorizonDays}
                      inline
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={view === "upcoming" ? "No upcoming bookings" : view === "past" ? "No past bookings" : "No cancelled bookings"}
            description={view === "upcoming" ? "When invitees book a time, it will show up here." : "Bookings in this section will appear here."}
          />
        )}
      </div>
    </main>
  );
}
