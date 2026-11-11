import {
  BookingLinkNotActiveError,
  BookingLinkNotFoundError,
} from "../../../../server/bookings";
import { getAuth } from "../../../../server/auth";
import { deleteBookingLink } from "../../../../server/booking-links";

type RouteContext = { params: Promise<{ id: string }> };

const bookingLinkIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to delete this booking link." }, { status: 401 });

  const { id } = await context.params;
  if (!bookingLinkIdPattern.test(id)) return Response.json({ error: "Booking link not found." }, { status: 404 });

  try {
    await deleteBookingLink(session.user.id, id);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof BookingLinkNotFoundError) {
      return Response.json({ error: "Booking link not found." }, { status: 404 });
    }
    if (error instanceof BookingLinkNotActiveError) {
      return Response.json({ error: "Only active booking links can be deleted." }, { status: 409 });
    }
    throw error;
  }
}
