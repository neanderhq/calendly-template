"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { BookingWidget } from "./booking-widget";
import { Button, ErrorField } from "./ui";

type BookingActionDetails = {
  username: string | null;
  eventSlug: string;
  durationMinutes: number;
  timezone: string;
  timezones: string[];
  horizonDays: number | null;
  idPrefix?: string;
  inline?: boolean;
};

type BookingAuthorization =
  | { kind: "invitee"; token: string }
  | { kind: "host"; bookingId: string };

type BookingActionsProps = BookingActionDetails & { authorization: BookingAuthorization };
type BookingConfirmationActionsProps = BookingActionDetails & { token: string };

export function BookingActions({
  authorization,
  username,
  eventSlug,
  durationMinutes,
  timezone,
  timezones,
  horizonDays,
  idPrefix = authorization.kind === "host" ? `booking-${authorization.bookingId}` : "invitee-booking",
  inline = false,
}: BookingActionsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "cancel" | "reschedule">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function cancelBooking() {
    setPending(true);
    setError("");
    try {
      const actionPath = authorization.kind === "host"
        ? `/api/bookings/${authorization.bookingId}`
        : `/api/public/bookings/${authorization.token}`;
      const response = await fetch(`${actionPath}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || null }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(result.error || "This booking couldn’t be cancelled. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("This booking couldn’t be cancelled. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`booking-form-actions${inline ? " booking-actions-inline" : ""}${mode !== "idle" ? " booking-actions-expanded" : ""}`}>
      {mode === "idle" && <>
        <Button type="button" variant="secondary" onClick={() => setMode("cancel")}>Cancel booking</Button>
        {username && <Button type="button" variant="secondary" onClick={() => setMode("reschedule")}>Reschedule</Button>}
        {!username && <p className="field-hint">Rescheduling is unavailable because this event has no public booking page.</p>}
      </>}
      {mode === "cancel" && <div className="booking-form">
        <p>Are you sure you want to cancel this booking?</p>
        <div className="field">
          <label htmlFor={`${idPrefix}-cancellation-reason`}>Reason (optional)</label>
          <textarea
            id={`${idPrefix}-cancellation-reason`}
            className="textarea"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <span className="field-hint">Up to 500 characters.</span>
        </div>
        {error && <ErrorField>{error}</ErrorField>}
        <div className="booking-form-actions">
          <Button type="button" disabled={pending} onClick={() => void cancelBooking()}>
            {pending ? "Cancelling…" : "Confirm cancellation"}
          </Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => { setMode("idle"); setError(""); }}>
            Keep booking
          </Button>
        </div>
      </div>}
      {mode === "reschedule" && username && <div className="booking-form">
        <h3>Choose a new time</h3>
        <BookingWidget
          username={username}
          eventSlug={eventSlug}
          durationMinutes={durationMinutes}
          questions={[]}
          timezones={timezones}
          horizonDays={horizonDays}
          idPrefix={idPrefix}
          reschedule={{
            ...(authorization.kind === "host"
              ? { bookingId: authorization.bookingId }
              : { token: authorization.token }),
            timezone,
            onRescheduled: () => {
              setMode("idle");
              router.refresh();
            },
          }}
        />
        <Button type="button" variant="secondary" onClick={() => { setMode("idle"); setError(""); }}>
          Keep current time
        </Button>
      </div>}
    </div>
  );
}

export function BookingConfirmationActions({ token, ...details }: BookingConfirmationActionsProps) {
  return <BookingActions {...details} authorization={{ kind: "invitee", token }} />;
}
