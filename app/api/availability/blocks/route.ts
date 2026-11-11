import { asc, eq } from "drizzle-orm";

import { getAuth } from "../../../../server/auth";
import { getDb } from "../../../../server/db";
import {
  hasOnlyKeys,
  invalidBlockedTimeMessage,
  maxBlockedTimes,
  readJsonBody,
  validateBlockedTimeInput,
} from "../../../../server/scheduling";
import { blockedTime } from "../../../../server/schema";

const allowedKeys = ["date", "startMinute", "endMinute", "note"];

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to view your blocked times." }, { status: 401 });

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

  return Response.json({ blocks });
}

export async function POST(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to block time." }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body || !hasOnlyKeys(body, allowedKeys)) {
    return Response.json({ error: invalidBlockedTimeMessage }, { status: 400 });
  }
  const validated = validateBlockedTimeInput(body);
  if (!validated.ok) return Response.json({ error: validated.error }, { status: 400 });

  const created = await getDb().transaction(async (transaction) => {
    const existing = await transaction
      .select({ id: blockedTime.id })
      .from(blockedTime)
      .where(eq(blockedTime.userId, session.user.id));
    if (existing.length >= maxBlockedTimes) return null;

    const [inserted] = await transaction
      .insert(blockedTime)
      .values({ id: crypto.randomUUID(), userId: session.user.id, ...validated.value })
      .returning();
    return inserted;
  });

  if (!created) {
    return Response.json({ error: `You can save up to ${maxBlockedTimes} blocked times.` }, { status: 400 });
  }
  return Response.json(created);
}
