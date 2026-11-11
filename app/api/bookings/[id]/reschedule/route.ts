import { getAuth } from "../../../../../server/auth";
import { rescheduleBookingAsHost } from "../../../../../server/bookings";
import { hasOnlyKeys, readJsonBody } from "../../../../../server/scheduling";
import { bookingActionErrorResponse, isBookingId, parseUtcStart } from "../../action-utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to reschedule this booking." }, { status: 401 });

  const { id } = await context.params;
  if (!isBookingId(id)) return Response.json({ error: "Enter a valid booking ID." }, { status: 400 });

  const body = await readJsonBody(request);
  if (!body || !hasOnlyKeys(body, ["startUtc"])) {
    return Response.json({ error: "Enter a valid UTC start time." }, { status: 400 });
  }
  const startUtc = parseUtcStart(body.startUtc);
  if (!startUtc) return Response.json({ error: "Enter a valid UTC start time." }, { status: 400 });

  try {
    const updated = await rescheduleBookingAsHost({ hostId: session.user.id, bookingId: id, startUtc });
    return Response.json({ ...updated, startUtc: startUtc.toISOString() });
  } catch (error) {
    return bookingActionErrorResponse(error);
  }
}
