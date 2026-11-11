import {
  AlreadyVotedError,
  alreadyVotedMessage,
  invalidPollDetailsMessage,
  PollNotFoundError,
  pollNotFoundMessage,
  submitPollVote,
} from "../../../../../../server/polls";
import { readJsonBody } from "../../../../../../server/scheduling";

type RouteContext = { params: Promise<{ token: string }> };

const pollTokenPattern = /^[A-Za-z0-9_-]{32}$/;

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!pollTokenPattern.test(token)) return Response.json({ error: pollNotFoundMessage }, { status: 404 });

  const body = await readJsonBody(request);
  if (!body) return Response.json({ error: invalidPollDetailsMessage }, { status: 400 });

  try {
    const result = await submitPollVote(token, body);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AlreadyVotedError) {
      return Response.json({ error: alreadyVotedMessage }, { status: 409 });
    }
    if (error instanceof PollNotFoundError) {
      return Response.json({ error: pollNotFoundMessage }, { status: 404 });
    }
    throw error;
  }
}
