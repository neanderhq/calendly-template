import { getAuth } from "../../../../server/auth";
import { getDb } from "../../../../server/db";
import {
  hasOnlyKeys,
  invalidAvailabilityRulesMessage,
  readJsonBody,
  validateAvailabilityRulesInput,
} from "../../../../server/scheduling";
import { availabilityRule } from "../../../../server/schema";

const allowedKeys = [
  "bufferBeforeMinutes",
  "bufferAfterMinutes",
  "minimumNoticeHours",
  "bookingHorizonDays",
  "startTimeIncrementMinutes",
  "dailyMeetingLimit",
  "weeklyMeetingLimit",
  "monthlyMeetingLimit",
];

export async function PUT(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to update your availability rules." }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body || !hasOnlyKeys(body, allowedKeys)) {
    return Response.json({ error: invalidAvailabilityRulesMessage }, { status: 400 });
  }
  const validated = validateAvailabilityRulesInput(body);
  if (!validated.ok) return Response.json({ error: validated.error }, { status: 400 });

  const [saved] = await getDb()
    .insert(availabilityRule)
    .values({ id: crypto.randomUUID(), userId: session.user.id, ...validated.value })
    .onConflictDoUpdate({
      target: availabilityRule.userId,
      set: { ...validated.value, updatedAt: new Date() },
    })
    .returning();

  return Response.json(saved);
}
