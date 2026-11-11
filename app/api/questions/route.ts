import { asc, eq } from "drizzle-orm";

import { getAuth } from "../../../server/auth";
import { getDb } from "../../../server/db";
import {
  hasOnlyKeys,
  invalidQuestionDetailsMessage,
  readJsonBody,
  validateQuestionInput,
} from "../../../server/scheduling";
import { bookingQuestion, user } from "../../../server/schema";

const allowedKeys = ["label", "questionType", "options", "required"];

export async function POST(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to add a question." }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body || !hasOnlyKeys(body, allowedKeys)) {
    return Response.json({ error: invalidQuestionDetailsMessage }, { status: 400 });
  }
  const validatedQuestion = validateQuestionInput(body);
  if (!validatedQuestion.ok) return Response.json({ error: validatedQuestion.error }, { status: 400 });

  const created = await getDb().transaction(async (transaction) => {
    await transaction.select({ id: user.id }).from(user).where(eq(user.id, session.user.id)).for("update");
    const questions = await transaction
      .select({ position: bookingQuestion.position })
      .from(bookingQuestion)
      .where(eq(bookingQuestion.userId, session.user.id))
      .orderBy(asc(bookingQuestion.position));
    if (questions.length >= 20) return null;

    const nextPosition = (questions.at(-1)?.position ?? 0) + 1;
    const [inserted] = await transaction
      .insert(bookingQuestion)
      .values({ id: crypto.randomUUID(), userId: session.user.id, ...validatedQuestion.value, position: nextPosition })
      .returning();
    return inserted;
  });

  if (!created) return Response.json({ error: "You can save up to 20 questions." }, { status: 400 });
  return Response.json(created);
}
