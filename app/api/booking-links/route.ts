import { getAuth } from "../../../server/auth";
import {
  createBookingLink,
  invalidBookingLinkDetailsMessage,
  listBookingLinks,
  validateBookingLinkInput,
} from "../../../server/booking-links";
import { readJsonBody } from "../../../server/scheduling";

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to view your booking links." }, { status: 401 });
  return Response.json(await listBookingLinks(session.user.id));
}

export async function POST(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to create a booking link." }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body) return Response.json({ error: invalidBookingLinkDetailsMessage }, { status: 400 });
  const validated = validateBookingLinkInput(body);
  if (!validated.ok) return Response.json({ error: validated.error }, { status: 400 });

  try {
    return Response.json(await createBookingLink(session.user.id, validated.value), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Event type not found.") {
      return Response.json({ error: "This event type is not available." }, { status: 404 });
    }
    throw error;
  }
}
