import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import { ContactDeleteButton } from "../../../components/forms/contact-delete-button";
import { ContactEditForm } from "../../../components/forms/contact-edit-form";
import { SignOutButton } from "../../../components/sign-out-button";
import { Card, EmptyState, PageHeader } from "../../../components/ui";
import { getAuth } from "../../../../server/auth";
import { getContact } from "../../../../server/contacts";
import { getDb } from "../../../../server/db";
import { booking, eventType, user } from "../../../../server/schema";
import { formatInstant } from "../../../../server/timezone";

export const dynamic = "force-dynamic";

export default async function ContactDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { id } = await params;

  const contact = await getContact(session.user.id, id);
  if (!contact) notFound();

  const [profile] = await getDb()
    .select({ timezone: user.timezone })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const hostTimezone = profile?.timezone ?? session.user.timezone;
  const contactBookings = await getDb()
    .select({
      id: booking.id,
      startUtc: booking.startUtc,
      endUtc: booking.endUtc,
      status: booking.status,
      eventName: eventType.name,
    })
    .from(booking)
    .innerJoin(eventType, eq(booking.eventTypeId, eventType.id))
    .where(and(eq(booking.hostId, session.user.id), eq(booking.inviteeEmail, contact.email)))
    .orderBy(desc(booking.startUtc));

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Saffron home"><span className="brand-mark" aria-hidden="true">s</span><span>saffron</span></Link>
        <Link className="text-link" href="/dashboard/contacts">← Back to contacts</Link>
        <nav className="account-nav" aria-label="Account navigation">
          <span className="account-greeting">{session.user.name}</span>
          <Link className="text-link" href="/settings">Settings</Link>
          <SignOutButton />
        </nav>
      </header>
      <div className="dashboard-content scheduling-content">
        <PageHeader eyebrow="Contact" title={contact.name} description={contact.email} />
        <div className="contact-detail-grid">
          <Card className="contact-detail-card">
            <h2>Contact details</h2>
            <p className="timezone-note">Update the name or email address for this contact.</p>
            <dl className="contact-row-meta">
              <div><dt>Time zone</dt><dd>{contact.timezone ?? "Not recorded"}</dd></div>
            </dl>
            <ContactEditForm contact={{ id: contact.id, name: contact.name, email: contact.email }} />
            <div className="contact-delete-section">
              <h3>Remove contact</h3>
              <p>Removing a contact does not delete any bookings.</p>
              <ContactDeleteButton contactId={contact.id} contactName={contact.name} />
            </div>
          </Card>
          <section className="contact-bookings" aria-labelledby="contact-bookings-heading">
            <div className="contacts-section-heading">
              <h2 id="contact-bookings-heading">Bookings</h2>
              <p className="timezone-note">Times shown in {hostTimezone}.</p>
            </div>
            {contactBookings.length > 0 ? (
              <div className="contacts-list">
                {contactBookings.map((item) => (
                  <Card className="contact-booking-row" key={item.id}>
                    <h3>{item.eventName}</h3>
                    <p><time dateTime={item.startUtc.toISOString()}>{formatInstant(item.startUtc, hostTimezone)}</time></p>
                    <p>Ends: {formatInstant(item.endUtc, hostTimezone)}</p>
                    <p>Status: {item.status === "cancelled" ? "Cancelled" : item.endUtc.getTime() <= Date.now() ? "Past" : "Confirmed"}</p>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState title="No bookings yet" description="Bookings with this contact will appear here." />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
