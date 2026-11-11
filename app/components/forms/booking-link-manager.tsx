"use client";

import { useEffect, useState, type FormEvent } from "react";

import { formatInstant, getDateInTimezone, zonedWallTimeToUtc } from "../../../server/timezone";
import { CopyButton } from "../copy-button";
import { Button, Card, EmptyState, ErrorField, Input } from "../ui";

export type BookingLinkRecord = {
  id: string;
  token: string;
  kind: "event_type" | "one_off";
  status: "active" | "used" | "deleted";
  createdAt: string;
  eventTypeName: string | null;
  meetingName: string | null;
  durationMinutes: number | null;
  booking: null | {
    id: string;
    startUtc: string | null;
    endUtc: string | null;
    status: string;
    inviteeName: string;
    inviteeEmail: string;
  };
};

type ProposedStart = { date: string; time: string };

function errorFromResponse(result: unknown, fallback: string) {
  if (result && typeof result === "object" && "error" in result && typeof result.error === "string") {
    return result.error;
  }
  return fallback;
}

function linkTitle(link: BookingLinkRecord) {
  return link.kind === "event_type" ? link.eventTypeName ?? "Event type" : link.meetingName ?? "One-off meeting";
}

function linkStatus(status: BookingLinkRecord["status"]) {
  return status[0].toUpperCase() + status.slice(1);
}

export function BookingLinkManager({ initialLinks, timezone }: { initialLinks: BookingLinkRecord[]; timezone: string }) {
  const [links, setLinks] = useState(initialLinks);
  const [origin, setOrigin] = useState("");
  const [name, setName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [starts, setStarts] = useState<ProposedStart[]>([{ date: "", time: "" }]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingAction, setPendingAction] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const minimumDate = getDateInTimezone(new Date(), timezone);

  async function refreshLinks() {
    const response = await fetch("/api/booking-links", { cache: "no-store" });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(errorFromResponse(result, "Your booking links couldn’t be loaded."));
    if (!Array.isArray(result)) throw new Error("Your booking links couldn’t be loaded.");
    setLinks(result as BookingLinkRecord[]);
  }

  function updateStart(index: number, field: keyof ProposedStart, value: string) {
    setStarts((current) => current.map((start, startIndex) =>
      startIndex === index ? { ...start, [field]: value } : start,
    ));
  }

  async function createOneOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const localStarts = starts.map(({ date, time }) => {
      if (!date || !time) return null;
      const [hours, minutes] = time.split(":").map(Number);
      return zonedWallTimeToUtc(date, hours * 60 + minutes, timezone);
    });
    if (localStarts.some((start) => start === null)) {
      setError("Choose a valid date and time for every proposed start.");
      return;
    }
    const utcStarts = localStarts as Date[];
    if (utcStarts.some((start) => start.getTime() <= Date.now())) {
      setError("Each proposed start time must be in the future.");
      return;
    }
    if (new Set(utcStarts.map((start) => start.getTime())).size !== utcStarts.length) {
      setError("Choose unique proposed start times.");
      return;
    }

    setPendingAction("create");
    try {
      const response = await fetch("/api/booking-links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "one_off",
          name,
          durationMinutes: Number(durationMinutes),
          description,
          location,
          proposedStarts: utcStarts.map((start) => start.toISOString()),
        }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(errorFromResponse(result, "Your one-off meeting link couldn’t be created."));
        return;
      }

      setName("");
      setDurationMinutes("30");
      setDescription("");
      setLocation("");
      setStarts([{ date: "", time: "" }]);
      setSuccess("Your one-off meeting link has been created.");
      try {
        await refreshLinks();
      } catch {
        setError("The meeting link was created, but the list couldn’t be refreshed. Reload the page to see it.");
      }
    } catch {
      setError("Your one-off meeting link couldn’t be created. Check your connection and try again.");
    } finally {
      setPendingAction("");
    }
  }

  async function deleteLink(link: BookingLinkRecord) {
    setError("");
    setSuccess("");
    setPendingAction(link.id);
    try {
      const response = await fetch(`/api/booking-links/${encodeURIComponent(link.id)}`, { method: "DELETE" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(errorFromResponse(result, "This booking link couldn’t be deleted."));
        return;
      }
      setLinks((current) => current.map((item) => item.id === link.id ? { ...item, status: "deleted" } : item));
      try {
        await refreshLinks();
      } catch {
        setError("The link was deleted, but the list couldn’t be refreshed. Reload the page to confirm its status.");
      }
    } catch {
      setError("This booking link couldn’t be deleted. Check your connection and try again.");
    } finally {
      setPendingAction("");
    }
  }

  return (
    <div className="question-editor">
      <Card className="scheduling-card">
        <h2>Create a one-off meeting</h2>
        <p className="empty-note">Offer specific times in your timezone ({timezone}). Invitees can choose only times that remain free.</p>
        <form className="form-stack" onSubmit={createOneOff}>
          <Input label="Meeting name" name="meeting-name" value={name} onChange={(change) => setName(change.target.value)} required maxLength={80} />
          <Input label="Duration (minutes)" name="meeting-duration" type="number" min={5} max={480} step={1} value={durationMinutes} onChange={(change) => setDurationMinutes(change.target.value)} required />
          <div className="field">
            <label htmlFor="meeting-description">Description (optional)</label>
            <textarea id="meeting-description" className="input" value={description} onChange={(change) => setDescription(change.target.value)} maxLength={2000} rows={3} />
          </div>
          <Input label="Location (optional)" name="meeting-location" value={location} onChange={(change) => setLocation(change.target.value)} maxLength={500} />
          <div className="question-list">
            <div>
              <span className="field-label">Proposed start times</span>
              <p className="empty-note">Add 1–20 future dates and times. Times are entered in {timezone}.</p>
            </div>
            {starts.map((start, index) => (
              <div className="question-item" key={index}>
                <Input label={`Date ${index + 1}`} name={`start-date-${index}`} type="date" min={minimumDate} value={start.date} onChange={(change) => updateStart(index, "date", change.target.value)} required />
                <Input label={`Local time ${index + 1}`} name={`start-time-${index}`} type="time" value={start.time} onChange={(change) => updateStart(index, "time", change.target.value)} required />
                <Button type="button" variant="secondary" disabled={starts.length === 1 || Boolean(pendingAction)} onClick={() => setStarts((current) => current.filter((_, startIndex) => startIndex !== index))} aria-label={`Remove proposed time ${index + 1}`}>Remove time</Button>
              </div>
            ))}
            <Button type="button" variant="secondary" disabled={starts.length >= 20 || Boolean(pendingAction)} onClick={() => setStarts((current) => [...current, { date: "", time: "" }])}>Add another time</Button>
          </div>
          {error && <ErrorField>{error}</ErrorField>}
          {success && <p className="success-message" role="status">{success}</p>}
          <Button type="submit" disabled={Boolean(pendingAction)}>{pendingAction === "create" ? "Creating…" : "Create one-off link"}</Button>
        </form>
      </Card>

      <Card className="scheduling-card">
        <h2>Your booking links</h2>
        {links.length === 0 ? (
          <EmptyState title="No links yet" description="One-off meeting links you create will appear here." />
        ) : (
          <div className="question-list">
            {links.map((link) => (
              <article className="question-item" key={link.id}>
                <div className="booking-row-entry">
                  <div className="booking-row-content">
                    <h3>{linkTitle(link)}</h3>
                    <p>{link.kind === "event_type" ? "Event type link" : `One-off meeting · ${link.durationMinutes ?? "—"} minutes`}</p>
                    <p>Created {formatInstant(new Date(link.createdAt), timezone)}</p>
                    <p>Status: <strong>{linkStatus(link.status)}</strong></p>
                    {link.booking ? (
                      <p>
                        Booking: {link.booking.inviteeName} ({link.booking.inviteeEmail})
                        {link.booking.startUtc ? ` · ${formatInstant(new Date(link.booking.startUtc), timezone)}` : ""}
                        {link.booking.status !== "active" ? ` · ${link.booking.status}` : ""}
                      </p>
                    ) : (
                      <p>No booking yet.</p>
                    )}
                  </div>
                  {link.status === "active" && (
                    <div className="question-actions">
                      <CopyButton value={origin ? `${origin}/link/${encodeURIComponent(link.token)}` : ""} disabled={!origin} />
                      <Button type="button" variant="secondary" disabled={Boolean(pendingAction)} onClick={() => void deleteLink(link)} aria-label={`Delete ${linkTitle(link)} link`}>
                        {pendingAction === link.id ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
