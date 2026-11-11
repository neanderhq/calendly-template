import { getAuth } from "../../../../../server/auth";
import {
  getHostPoll,
  getPollResults,
  pollNotFoundMessage,
} from "../../../../../server/polls";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to view poll results." }, { status: 401 });

  const { id } = await context.params;
  const results = await getPollResults(session.user.id, id);
  if (!results) return Response.json({ error: pollNotFoundMessage }, { status: 404 });
  const hostPoll = await getHostPoll(session.user.id, id);
  if (!hostPoll) return Response.json({ error: pollNotFoundMessage }, { status: 404 });
  return Response.json({ poll: hostPoll, results });
}
