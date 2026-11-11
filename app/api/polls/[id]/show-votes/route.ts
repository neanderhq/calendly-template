import { getAuth } from "../../../../../server/auth";
import {
  getHostPoll,
  pollNotFoundMessage,
  setShowVotes,
} from "../../../../../server/polls";
import { hasOnlyKeys, readJsonBody } from "../../../../../server/scheduling";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to update this poll." }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body || !hasOnlyKeys(body, ["showVotes"]) || typeof body.showVotes !== "boolean") {
    return Response.json({ error: "Choose whether votes are shown." }, { status: 400 });
  }

  const { id } = await context.params;
  const updated = await setShowVotes(session.user.id, id, body.showVotes);
  if (!updated) return Response.json({ error: pollNotFoundMessage }, { status: 404 });
  return Response.json({ showVotes: body.showVotes });
}
