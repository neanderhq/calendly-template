import { and, eq, ne } from "drizzle-orm";

import { getAuth } from "../../../server/auth";
import { getDb } from "../../../server/db";
import { invalidSlugMessage, isReservedUsername, normalizeSlug, reservedUsernameMessage } from "../../../server/profile-validation";
import {
  ensureSchedulingDefaults,
  getOrCreateEventType,
  hasOnlyKeys,
  invalidEventDetailsMessage,
  isUniqueViolation,
  readJsonBody,
  validateEventInput,
} from "../../../server/scheduling";
import { eventType, user } from "../../../server/schema";

const allowedKeys = ["name", "description", "durationMinutes", "location", "slug", "active", "username"];

async function update(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to update your event type." }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body || !hasOnlyKeys(body, allowedKeys)) {
    return Response.json({ error: invalidEventDetailsMessage }, { status: 400 });
  }
  const validatedEvent = validateEventInput(body);
  if (!validatedEvent.ok) return Response.json({ error: validatedEvent.error }, { status: 400 });

  let username: string | undefined;
  if (body.username !== null && body.username !== undefined) {
    const validatedUsername = normalizeSlug(body.username);
    if (validatedUsername === null) return Response.json({ error: invalidSlugMessage }, { status: 400 });
    if (isReservedUsername(validatedUsername)) return Response.json({ error: reservedUsernameMessage }, { status: 400 });
    username = validatedUsername;
  }

  const database = getDb();
  await ensureSchedulingDefaults(session.user.id);
  const existing = await getOrCreateEventType(session.user.id);
  const event = validatedEvent.value;

  if (event.slug !== existing.slug) {
    const duplicateSlug = await database
      .select({ id: eventType.id })
      .from(eventType)
      .where(and(eq(eventType.userId, session.user.id), eq(eventType.slug, event.slug)))
      .limit(1);
    if (duplicateSlug[0]) return Response.json({ error: "Choose a unique event URL." }, { status: 409 });
  }

  if (username !== undefined) {
    const duplicateUsername = await database
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.username, username), ne(user.id, session.user.id)))
      .limit(1);
    if (duplicateUsername[0]) return Response.json({ error: "That username is already taken." }, { status: 409 });
  }

  try {
    const saved = await database.transaction(async (transaction) => {
      const [updatedEvent] = await transaction
        .update(eventType)
        .set({ ...event, updatedAt: new Date() })
        .where(eq(eventType.userId, session.user.id))
        .returning();
      if (!updatedEvent) return null;

      if (username !== undefined) {
        await transaction
          .update(user)
          .set({ username, updatedAt: new Date() })
          .where(eq(user.id, session.user.id));
      }
      return updatedEvent;
    });
    if (!saved) return Response.json({ error: "Event type not found." }, { status: 404 });
    return Response.json({ ...saved, username });
  } catch (error) {
    if (isUniqueViolation(error, "event_type_userId_slug_unique")) {
      return Response.json({ error: "Choose a unique event URL." }, { status: 409 });
    }
    if (isUniqueViolation(error, "user_username_unique")) {
      return Response.json({ error: "That username is already taken." }, { status: 409 });
    }
    throw error;
  }
}

export const PATCH = update;
export const PUT = update;
