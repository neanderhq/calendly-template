import { getAuth } from "../../../../server/auth";
import {
  deletePoll,
  getHostPoll,
  PollBookedError,
  PollNotFoundError,
  pollNotFoundMessage,
} from "../../../../server/polls";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to view your poll." }, { status: 401 });

  const { id } = await context.params;
  const hostPoll = await getHostPoll(session.user.id, id);
  if (!hostPoll) return Response.json({ error: pollNotFoundMessage }, { status: 404 });
  return Response.json(hostPoll);
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to delete this poll." }, { status: 401 });

  const { id } = await context.params;
  try {
    const deleted = await deletePoll(session.user.id, id);
    if (deleted) return Response.json({ ok: true });
    return Response.json({ error: "Unable to delete this poll." }, { status: 500 });
  } catch (error) {
    if (error instanceof PollNotFoundError) {
      return Response.json({ error: pollNotFoundMessage }, { status: 404 });
    }
    if (error instanceof Error && error instanceof PollBookedError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    return Response.json({ error: "Unable to delete this poll." }, { status: 500 });
  }
}
