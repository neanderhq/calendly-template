import { getPublicPoll, pollNotFoundMessage } from "../../../../../server/polls";

type RouteContext = { params: Promise<{ token: string }> };

const pollTokenPattern = /^[A-Za-z0-9_-]{32}$/;

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!pollTokenPattern.test(token)) return Response.json({ error: pollNotFoundMessage }, { status: 404 });

  const publicPoll = await getPublicPoll(token);
  if (!publicPoll) return Response.json({ error: pollNotFoundMessage }, { status: 404 });
  return Response.json({
    title: publicPoll.title,
    description: publicPoll.description,
    durationMinutes: publicPoll.durationMinutes,
    showVotes: publicPoll.showVotes,
    status: publicPoll.status,
    options: publicPoll.options.map((option: { id: string; startUtc: Date }) => ({
      id: option.id,
      startUtc: option.startUtc.toISOString(),
    })),
    votes: publicPoll.votes.map((vote: { name: string; optionIds: string[] }) => ({
      name: vote.name,
      optionIds: vote.optionIds,
    })),
    booking: publicPoll.booking
      ? {
          startUtc: publicPoll.booking.startUtc.toISOString(),
        }
      : null,
  });
}
