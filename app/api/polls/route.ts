import { getAuth } from "../../../server/auth";
import { createPoll, invalidPollDetailsMessage, listPolls } from "../../../server/polls";
import { readJsonBody } from "../../../server/scheduling";

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to view your polls." }, { status: 401 });
  return Response.json(await listPolls(session.user.id));
}

export async function POST(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to create a poll." }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body) return Response.json({ error: invalidPollDetailsMessage }, { status: 400 });

  const result = await createPoll(session.user.id, body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json(result.value, { status: 201 });
}
