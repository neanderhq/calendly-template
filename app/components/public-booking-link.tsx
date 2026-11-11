"use client";

import { useCallback, useEffect, useState } from "react";

import { BookingWidget } from "./booking-widget";
import { Button, Card, PageHeader } from "./ui";

type LinkQuestion = {
  id: string;
  label: string;
  questionType: "short_text" | "long_text" | "single_choice";
  options: string[] | null;
  required: boolean;
};

type PublicLink = {
  kind: "event_type" | "one_off";
  bookingHorizonDays: number;
  host: { name: string; timezone: string; username: string | null };
  meeting: { name: string; durationMinutes: number; description: string | null; location: string | null };
  questions: LinkQuestion[];
  proposedStarts?: string[];
};

type LinkPageState =
  | { status: "loading" }
  | { status: "unavailable"; message: string; retryable?: boolean }
  | { status: "active"; link: PublicLink };

export function PublicBookingLink({ token }: { token: string }) {
  const [state, setState] = useState<LinkPageState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const handleLinkUnavailable = useCallback((message: "This link has already been used" | "This link is no longer available") => {
    setState({ status: "unavailable", message });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLink() {
      try {
        const response = await fetch(`/api/public/booking-links/${encodeURIComponent(token)}`, {
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({})) as PublicLink & { error?: string };
        if (!response.ok) {
          setState({
            status: "unavailable",
            message: result.error === "This link has already been used"
              ? "This link has already been used"
              : result.error === "This link is no longer available"
                ? "This link is no longer available"
                : "This booking link couldn’t be loaded. Please try again.",
            retryable: result.error !== "This link has already been used" && result.error !== "This link is no longer available",
          });
          return;
        }
        if (
          (result.kind !== "event_type" && result.kind !== "one_off") ||
          !Number.isInteger(result.bookingHorizonDays) || result.bookingHorizonDays < 1 || result.bookingHorizonDays > 365 ||
          typeof result.host?.name !== "string" ||
          typeof result.host?.timezone !== "string" ||
          typeof result.meeting?.name !== "string" ||
          !Number.isInteger(result.meeting?.durationMinutes) ||
          !Array.isArray(result.questions) ||
          (result.kind === "one_off" && (!Array.isArray(result.proposedStarts) || result.proposedStarts.some((start) => typeof start !== "string")))
        ) {
          throw new Error();
        }
        setState({ status: "active", link: result });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setState({ status: "unavailable", message: "This booking link couldn’t be loaded. Please try again.", retryable: true });
        }
      }
    }

    void loadLink();
    return () => controller.abort();
  }, [retryKey, token]);

  if (state.status === "loading") {
    return (
      <main className="app-shell">
        <div className="dashboard-content scheduling-content">
          <Card className="scheduling-card"><p role="status">Loading booking link…</p></Card>
        </div>
      </main>
    );
  }

  if (state.status === "unavailable") {
    return (
      <main className="app-shell">
        <div className="dashboard-content scheduling-content">
          <Card className="scheduling-card">
            <p role="status">{state.message}</p>
            {state.retryable && (
              <Button type="button" variant="secondary" onClick={() => {
                setState({ status: "loading" });
                setRetryKey((current) => current + 1);
              }}>
                Try again
              </Button>
            )}
          </Card>
        </div>
      </main>
    );
  }

  const { link } = state;
  return (
    <main className="app-shell">
      <div className="dashboard-content scheduling-content">
        <PageHeader eyebrow="Booking" title={link.meeting.name} description={`With ${link.host.name}`} />
        <div className="booking-page-grid">
          <Card className="scheduling-card booking-details">
            <p><span className="field-label">Host</span> {link.host.name}</p>
            <p><span className="field-label">Duration</span> {link.meeting.durationMinutes} minutes</p>
            {link.meeting.description && <p><span className="field-label">About</span> {link.meeting.description}</p>}
            {link.meeting.location && <p><span className="field-label">Location</span> {link.meeting.location}</p>}
            {link.kind === "one_off" && (
              <p className="notice-banner">This one-off meeting can be cancelled, but it can’t be rescheduled.</p>
            )}
          </Card>
          <Card className="scheduling-card">
            <BookingWidget
              durationMinutes={link.meeting.durationMinutes}
              questions={link.questions}
              timezones={Intl.supportedValuesOf("timeZone")}
              horizonDays={link.bookingHorizonDays}
              idPrefix="booking-link"
              bookingLink={{ token, kind: link.kind }}
              offeredStarts={link.kind === "one_off" ? link.proposedStarts : undefined}
              onBookingLinkUnavailable={handleLinkUnavailable}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}
