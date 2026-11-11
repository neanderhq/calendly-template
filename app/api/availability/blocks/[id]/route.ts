import { and, eq } from "drizzle-orm";

import { getAuth } from "../../../../../server/auth";
import { getDb } from "../../../../../server/db";
import { blockedTime } from "../../../../../server/schema";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to delete blocked times." }, { status: 401 });

  const { id } = await context.params;
  const [deleted] = await getDb()
    .delete(blockedTime)
    .where(and(eq(blockedTime.id, id), eq(blockedTime.userId, session.user.id)))
    .returning({ id: blockedTime.id });
  if (!deleted) return Response.json({ error: "Blocked time not found." }, { status: 404 });
  return Response.json(deleted);
}
