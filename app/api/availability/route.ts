import { eq } from "drizzle-orm";

import { getAuth } from "../../../server/auth";
import { getDb } from "../../../server/db";
import {
  hasOnlyKeys,
  invalidAvailabilityDetailsMessage,
  readJsonBody,
  validateAvailabilityInput,
} from "../../../server/scheduling";
import { availabilityRange } from "../../../server/schema";

export async function PUT(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to update your availability." }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body || !hasOnlyKeys(body, ["ranges"])) {
    return Response.json({ error: invalidAvailabilityDetailsMessage }, { status: 400 });
  }
  const validatedRanges = validateAvailabilityInput(body);
  if (!validatedRanges.ok) return Response.json({ error: validatedRanges.error }, { status: 400 });

  const ranges = await getDb().transaction(async (transaction) => {
    await transaction.delete(availabilityRange).where(eq(availabilityRange.userId, session.user.id));
    return transaction
      .insert(availabilityRange)
      .values(validatedRanges.value.map((range) => ({ id: crypto.randomUUID(), userId: session.user.id, ...range })))
      .returning();
  });

  return Response.json({ ranges });
}
