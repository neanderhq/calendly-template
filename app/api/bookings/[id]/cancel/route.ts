import { cancelBookingAsHost, validateCancellationReason } from "../../../../../server/bookings";
import { getAuth } from "../../../../../server/auth";
import { hasOnlyKeys, readJsonBody } from "../../../../../server/scheduling";
import { bookingActionErrorResponse, isBookingId } from "../../action-utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to cancel this booking." }, { status: 401 });

  const { id } = await context.params;
  if (!isBookingId(id)) return Response.json({ error: "Enter a valid booking ID." }, { status: 400 });

  const body = await readJsonBody(request);
  if (!body || !hasOnlyKeys(body, ["reason"])) {
    return Response.json({ error: "Enter a valid cancellation reason." }, { status: 400 });
  }
  const reason = validateCancellationReason(body.reason);
  if (!reason.ok) return Response.json({ error: reason.error }, { status: 400 });

  try {
    const cancelled = await cancelBookingAsHost({
      hostId: session.user.id,
      bookingId: id,
      reason: reason.value,
    });
    return Response.json(cancelled);
  } catch (error) {
    return bookingActionErrorResponse(error);
  }
}
