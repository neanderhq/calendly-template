import { notFound } from "next/navigation";

import { PublicPoll } from "../../components/public-poll";

export default async function PublicPollPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) notFound();

  return <PublicPoll token={token} />;
}
