import { and, eq } from "drizzle-orm";

import { getAuth } from "../../../../server/auth";
import { getDb } from "../../../../server/db";
import {
  hasOnlyKeys,
  invalidQuestionDetailsMessage,
  readJsonBody,
  validateQuestionInput,
} from "../../../../server/scheduling";
import { bookingQuestion } from "../../../../server/schema";

const allowedKeys = ["label", "questionType", "options", "required"];

type RouteContext = { params: Promise<{ id: string }> };

async function update(request: Request, context: RouteContext) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to update questions." }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body || !hasOnlyKeys(body, allowedKeys)) {
    return Response.json({ error: invalidQuestionDetailsMessage }, { status: 400 });
  }
  const validatedQuestion = validateQuestionInput(body);
  if (!validatedQuestion.ok) return Response.json({ error: validatedQuestion.error }, { status: 400 });

  const { id } = await context.params;
  const [updated] = await getDb()
    .update(bookingQuestion)
    .set({ ...validatedQuestion.value, updatedAt: new Date() })
    .where(and(eq(bookingQuestion.id, id), eq(bookingQuestion.userId, session.user.id)))
    .returning();
  if (!updated) return Response.json({ error: "Question not found." }, { status: 404 });
  return Response.json(updated);
}

async function remove(request: Request, context: RouteContext) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to delete questions." }, { status: 401 });

  const { id } = await context.params;
  const [deleted] = await getDb()
    .delete(bookingQuestion)
    .where(and(eq(bookingQuestion.id, id), eq(bookingQuestion.userId, session.user.id)))
    .returning({ id: bookingQuestion.id });
  if (!deleted) return Response.json({ error: "Question not found." }, { status: 404 });
  return Response.json(deleted);
}

export const PUT = update;
export const PATCH = update;
export const DELETE = remove;
