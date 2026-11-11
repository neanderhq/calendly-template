import { PublicBookingLink } from "../../components/public-booking-link";

export const dynamic = "force-dynamic";

export default async function BookingLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicBookingLink token={token} />;
}
