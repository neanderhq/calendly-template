import { eq } from "drizzle-orm";

import { getAuth } from "../../../../server/auth";
import { getDb } from "../../../../server/db";
import { hasOnlyKeys, readJsonBody } from "../../../../server/scheduling";
import { bookingQuestion, user } from "../../../../server/schema";

export async function PUT(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to reorder questions." }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body || !hasOnlyKeys(body, ["questionIds"])) {
    return Response.json({ error: "Enter a complete question order." }, { status: 400 });
  }
  if (!Array.isArray(body.questionIds) || body.questionIds.some((id) => typeof id !== "string")) {
    return Response.json({ error: "Enter a complete question order." }, { status: 400 });
  }
  const questionIds = body.questionIds as string[];

  const reordered = await getDb().transaction(async (transaction) => {
    await transaction.select({ id: user.id }).from(user).where(eq(user.id, session.user.id)).for("update");
    const questions = await transaction
      .select({ id: bookingQuestion.id })
      .from(bookingQuestion)
      .where(eq(bookingQuestion.userId, session.user.id));
    const existingIds = new Set(questions.map((question) => question.id));
    const submittedIds = new Set(questionIds);
    if (
      questionIds.length !== existingIds.size ||
      submittedIds.size !== questionIds.length ||
      questionIds.some((id) => !existingIds.has(id))
    ) {
      return false;
    }

    for (const [index, id] of questionIds.entries()) {
      await transaction
        .update(bookingQuestion)
        .set({ position: index + 1, updatedAt: new Date() })
        .where(eq(bookingQuestion.id, id));
    }
    return true;
  });

  if (!reordered) return Response.json({ error: "Question order must include every question exactly once." }, { status: 400 });
  return Response.json({ questionIds });
}
