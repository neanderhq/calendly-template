import { and, eq } from "drizzle-orm";

import { getAuth } from "../../../../server/auth";
import { getDb } from "../../../../server/db";
import {
  hasOnlyKeys,
  invalidAvailabilityOverrideMessage,
  invalidOverrideDateMessage,
  maxAvailabilityOverrides,
  readJsonBody,
  validateAvailabilityOverrideInput,
} from "../../../../server/scheduling";
import { availabilityOverride } from "../../../../server/schema";

const putKeys = ["date", "unavailable", "ranges"];
const deleteKeys = ["date"];

export async function PUT(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to update your availability." }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body || !hasOnlyKeys(body, putKeys)) {
    return Response.json({ error: invalidAvailabilityOverrideMessage }, { status: 400 });
  }
  const validated = validateAvailabilityOverrideInput(body);
  if (!validated.ok) return Response.json({ error: validated.error }, { status: 400 });

  const value = validated.value;
  const saved = await getDb().transaction(async (transaction) => {
    const existingDates = await transaction
      .selectDistinct({ date: availabilityOverride.date })
      .from(availabilityOverride)
      .where(eq(availabilityOverride.userId, session.user.id));
    const alreadyCovered = existingDates.some((row) => row.date === value.date);
    if (!alreadyCovered && existingDates.length >= maxAvailabilityOverrides) return null;

    await transaction
      .delete(availabilityOverride)
      .where(and(eq(availabilityOverride.userId, session.user.id), eq(availabilityOverride.date, value.date)));

    const rows = value.unavailable
      ? [{ kind: "unavailable" as const, startMinute: null, endMinute: null }]
      : value.ranges.map((range) => ({ kind: "available" as const, startMinute: range.startMinute, endMinute: range.endMinute }));

    return transaction
      .insert(availabilityOverride)
      .values(rows.map((row) => ({ id: crypto.randomUUID(), userId: session.user.id, date: value.date, ...row })))
      .returning();
  });

  if (!saved) {
    return Response.json({ error: `You can save up to ${maxAvailabilityOverrides} date-specific days.` }, { status: 400 });
  }

  return Response.json({
    date: value.date,
    unavailable: value.unavailable,
    ranges: saved.filter((row) => row.kind === "available").map((row) => ({ startMinute: row.startMinute, endMinute: row.endMinute })),
  });
}

export async function DELETE(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to update your availability." }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body || !hasOnlyKeys(body, deleteKeys) || typeof body.date !== "string" || body.date.length === 0) {
    return Response.json({ error: invalidOverrideDateMessage }, { status: 400 });
  }

  await getDb()
    .delete(availabilityOverride)
    .where(and(eq(availabilityOverride.userId, session.user.id), eq(availabilityOverride.date, body.date)));
  return Response.json({ ok: true });
}
