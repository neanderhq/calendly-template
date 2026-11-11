import { asc, and, count, eq, exists, ilike, max, or, sql } from "drizzle-orm";

import { getDb } from "./db";
import { invalidEmailMessage, normalizeEmail, normalizeUserName } from "./profile-validation";
import { booking, bookingAttendee, contact } from "./schema";

export const invalidContactDetailsMessage = "Enter a valid name and email address.";

export type ContactInput = { name: string; email: string };

type ContactInsertExecutor = Pick<ReturnType<typeof getDb>, "insert">;

function mostRecentInviteeTimezone() {
  return sql<string | null>`(
    select ${booking.inviteeTimezone}
    from ${booking}
    where ${booking.hostId} = ${contact.hostId}
      and ${booking.inviteeEmail} = ${contact.email}
    order by ${booking.startUtc} desc
    limit 1
  )`;
}

export function validateContactInput(body: unknown):
  | { ok: true; value: ContactInput }
  | { ok: false; error: string } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: invalidContactDetailsMessage };
  }
  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "name" && key !== "email")) {
    return { ok: false, error: invalidContactDetailsMessage };
  }

  const name = normalizeUserName(record.name);
  if (name === null) return { ok: false, error: invalidContactDetailsMessage };

  const email = normalizeEmail(record.email);
  if (email === null) return { ok: false, error: invalidEmailMessage };

  return { ok: true, value: { name, email } };
}

export async function listContacts(hostId: string, search?: string) {
  const searchTerm = search?.trim();
  const searchPattern = searchTerm
    ? `%${searchTerm.replace(/[\\%_]/g, "\\$&")}%`
    : null;
  return getDb()
    .select({
      id: contact.id,
      hostId: contact.hostId,
      name: contact.name,
      email: contact.email,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      timezone: mostRecentInviteeTimezone(),
      bookingCount: count(booking.id),
      lastBookingAt: max(booking.startUtc),
    })
    .from(contact)
    .leftJoin(
      booking,
      and(
        eq(booking.hostId, contact.hostId),
        or(
          eq(booking.inviteeEmail, contact.email),
          exists(
            getDb()
              .select({ id: bookingAttendee.id })
              .from(bookingAttendee)
              .where(
                and(
                  eq(bookingAttendee.bookingId, booking.id),
                  eq(bookingAttendee.email, contact.email),
                ),
              ),
          ),
        ),
      ),
    )
    .where(
      searchPattern
        ? and(
            eq(contact.hostId, hostId),
            or(ilike(contact.name, searchPattern), ilike(contact.email, searchPattern)),
          )
        : eq(contact.hostId, hostId),
    )
    .groupBy(contact.id)
    .orderBy(asc(contact.name), asc(contact.email));
}

export async function getContact(hostId: string, contactId: string) {
  const [result] = await getDb()
    .select({
      id: contact.id,
      hostId: contact.hostId,
      name: contact.name,
      email: contact.email,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      timezone: mostRecentInviteeTimezone(),
      bookingCount: count(booking.id),
      lastBookingAt: max(booking.startUtc),
    })
    .from(contact)
    .leftJoin(
      booking,
      and(
        eq(booking.hostId, contact.hostId),
        or(
          eq(booking.inviteeEmail, contact.email),
          exists(
            getDb()
              .select({ id: bookingAttendee.id })
              .from(bookingAttendee)
              .where(
                and(
                  eq(bookingAttendee.bookingId, booking.id),
                  eq(bookingAttendee.email, contact.email),
                ),
              ),
          ),
        ),
      ),
    )
    .where(and(eq(contact.hostId, hostId), eq(contact.id, contactId)))
    .groupBy(contact.id)
    .limit(1);
  return result ?? null;
}

export async function createContact(hostId: string, body: unknown) {
  const validated = validateContactInput(body);
  if (!validated.ok) return validated;

  const [created] = await getDb()
    .insert(contact)
    .values({ id: crypto.randomUUID(), hostId, ...validated.value })
    .returning();
  return { ok: true as const, value: created };
}

export async function updateContact(hostId: string, contactId: string, body: unknown) {
  const validated = validateContactInput(body);
  if (!validated.ok) return validated;

  const [updated] = await getDb()
    .update(contact)
    .set({ ...validated.value, updatedAt: new Date() })
    .where(and(eq(contact.id, contactId), eq(contact.hostId, hostId)))
    .returning();
  return updated ?? null;
}

export async function deleteContact(hostId: string, contactId: string): Promise<boolean> {
  const [deleted] = await getDb()
    .delete(contact)
    .where(and(eq(contact.id, contactId), eq(contact.hostId, hostId)))
    .returning({ id: contact.id });
  return deleted !== undefined;
}

export async function upsertBookingContact(
  executor: ContactInsertExecutor,
  hostId: string,
  nameValue: unknown,
  emailValue: unknown,
): Promise<void> {
  const name = normalizeUserName(nameValue);
  const email = normalizeEmail(emailValue);
  if (name === null || email === null) throw new Error(invalidContactDetailsMessage);

  await executor
    .insert(contact)
    .values({ id: crypto.randomUUID(), hostId, name, email })
    .onConflictDoUpdate({
      target: [contact.hostId, contact.email],
      set: { name, updatedAt: new Date() },
    });
}
