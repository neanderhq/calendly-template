import { BookingLinkAlreadyUsedError, BookingLinkNotFoundError, BookingLinkUnavailableError } from "../../../../../../server/bookings";
import { bookingLinkTokenPattern, getPublicBookingLink, proposedStartsForDate } from "../../../../../../server/booking-links";
import { getAvailableProposedStarts, getAvailableSlots } from "../../../../../../server/slots";
import { getDateInTimezone, isIanaTimezone } from "../../../../../../server/timezone";

type RouteContext = { params: Promise<{ token: string }> };

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function unavailableResponse(error: unknown) {
  if (error instanceof BookingLinkAlreadyUsedError) {
    return Response.json({ error: "This link has already been used" }, { status: 410 });
  }
  if (error instanceof BookingLinkUnavailableError) {
    return Response.json({ error: "This link is no longer available" }, { status: 410 });
  }
  if (error instanceof BookingLinkNotFoundError) {
    return Response.json({ error: "This link is no longer available" }, { status: 404 });
  }
  return null;
}

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!bookingLinkTokenPattern.test(token)) {
    return Response.json({ error: "This link is no longer available" }, { status: 404 });
  }

  const query = new URL(request.url).searchParams;
  const date = query.get("date") ?? "";
  const timezone = query.get("tz");
  if (!isCalendarDate(date)) return Response.json({ error: "Choose a date." }, { status: 400 });
  if (!isIanaTimezone(timezone)) return Response.json({ error: "Enter a valid IANA timezone." }, { status: 400 });

  try {
    const link = await getPublicBookingLink(token);
    if (link.kind === "event_type") {
      const slots = await getAvailableSlots({
        hostId: link.hostId,
        hostTimezone: link.hostTimezone,
        durationMinutes: link.durationMinutes,
        date,
        timezone,
      });
      return Response.json({ slots: slots.map((slot) => slot.toISOString()) });
    }

    const proposed = proposedStartsForDate(link.proposedStarts ?? [], date, timezone);
    const free = await getAvailableProposedStarts({
      hostId: link.hostId,
      hostTimezone: link.hostTimezone,
      durationMinutes: link.durationMinutes,
      starts: proposed,
    });
    return Response.json({ slots: free.filter((start) => getDateInTimezone(start, timezone) === date).map((start) => start.toISOString()) });
  } catch (error) {
    return unavailableResponse(error) ?? Response.json({ error: "Unable to load available times." }, { status: 500 });
  }
}
