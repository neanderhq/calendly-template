"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { CopyButton } from "../copy-button";
import { Button, Card, ErrorField, Input } from "../ui";

type PollOptionRecord = {
  id: string;
  startUtc: string;
};

type PollBookingRecord = {
  id: string;
  startUtc: string;
  endUtc: string;
  status: "active" | "cancelled";
  confirmationToken: string;
};

type PollRecord = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  token: string;
  showVotes: boolean;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
  options: PollOptionRecord[];
  booking: PollBookingRecord | null;
};

type PollResultRecord = {
  id: string;
  startUtc: string;
  voteCount: number;
  voters: { name: string; email: string }[];
  conflictsWithBooking: boolean;
};

type AttendeeDraft = {
  name: string;
  email: string;
};

async function readError(response: Response, fallback: string) {
  const result = (await response.json().catch(() => ({}))) as { error?: string };
  return result.error || fallback;
}

function formatWithZone(value: string, timezone: string) {
  const instant = new Date(value);
  const base = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(instant);
  const zone = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  })
    .formatToParts(instant)
    .find((part) => part.type === "timeZoneName")?.value;
  return zone ? `${base} (${zone})` : base;
}

function preferredOption(results: PollResultRecord[], options: PollOptionRecord[]) {
  const nonConflicting = results.filter((result) => !result.conflictsWithBooking);
  const candidates = nonConflicting.length > 0 ? nonConflicting : results;
  const preferred = [...candidates].sort((left, right) => {
    if (right.voteCount !== left.voteCount) return right.voteCount - left.voteCount;
    return Date.parse(left.startUtc) - Date.parse(right.startUtc);
  })[0];
  return preferred?.id ?? options[0]?.id ?? "";
}

function validateAttendee(attendee: AttendeeDraft) {
  if (!attendee.name.trim()) return "Enter the attendee’s name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email.trim())) return "Enter a valid email address.";
  return "";
}

export function PollDetail({
  poll,
  results,
  timezone,
}: {
  poll: PollRecord;
  results: PollResultRecord[];
  timezone: string;
}) {
  const router = useRouter();
  const [shareUrl, setShareUrl] = useState("");
  const [showVotes, setShowVotes] = useState(poll.showVotes);
  const [togglePending, setTogglePending] = useState(false);
  const [toggleError, setToggleError] = useState("");
  const [booking, setBooking] = useState(poll.booking);
  const [selectedOptionId, setSelectedOptionId] = useState(() => preferredOption(results, poll.options));
  const [attendees, setAttendees] = useState<AttendeeDraft[]>([]);
  const [attendeeErrors, setAttendeeErrors] = useState<string[]>([]);
  const [bookingPending, setBookingPending] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const maxVotes = Math.max(0, ...results.map((result) => result.voteCount));
  const isBooked = booking !== null;
  const showBookingForm = poll.status === "open" && !isBooked;

  useEffect(() => {
    setShareUrl(`${window.location.origin}/polls/${poll.token}`);
  }, [poll.token]);

  async function updateShowVotes(nextValue: boolean) {
    setTogglePending(true);
    setToggleError("");
    try {
      const response = await fetch(`/api/polls/${poll.id}/show-votes`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ showVotes: nextValue }),
      });
      if (!response.ok) {
        setToggleError(await readError(response, "Unable to update vote visibility."));
        return;
      }
      setShowVotes(nextValue);
    } catch {
      setToggleError("Unable to update vote visibility. Check your connection and try again.");
    } finally {
      setTogglePending(false);
    }
  }

  function addAttendee() {
    if (attendees.length >= 10) return;
    setAttendees((current) => [...current, { name: "", email: "" }]);
    setAttendeeErrors((current) => [...current, ""]);
  }

  function updateAttendee(index: number, key: keyof AttendeeDraft, value: string) {
    setAttendees((current) => current.map((attendee, attendeeIndex) => attendeeIndex === index ? { ...attendee, [key]: value } : attendee));
    setAttendeeErrors((current) => current.map((error, errorIndex) => errorIndex === index ? "" : error));
  }

  function removeAttendee(index: number) {
    setAttendees((current) => current.filter((_, attendeeIndex) => attendeeIndex !== index));
    setAttendeeErrors((current) => current.filter((_, errorIndex) => errorIndex !== index));
  }

  async function bookTime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingError("");

    const attendeeValidation = attendees.map(validateAttendee);
    if (attendeeValidation.some(Boolean)) {
      setAttendeeErrors(attendeeValidation);
      return;
    }

    const option = poll.options.find((candidate) => candidate.id === selectedOptionId);
    if (!option) {
      setBookingError("Choose a proposed time.");
      return;
    }

    setBookingPending(true);
    try {
      const response = await fetch(`/api/polls/${poll.id}/book`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startUtc: option.startUtc,
          ...(attendees.length > 0 ? { extraAttendees: attendees } : {}),
        }),
      });
      if (!response.ok) {
        setBookingError(await readError(response, "Unable to book this time."));
        return;
      }
      const created = (await response.json()) as { id: string; confirmationToken: string };
      setBooking({
        id: created.id,
        startUtc: option.startUtc,
        endUtc: new Date(Date.parse(option.startUtc) + poll.durationMinutes * 60_000).toISOString(),
        status: "active",
        confirmationToken: created.confirmationToken,
      });
      router.refresh();
    } catch {
      setBookingError("Unable to book this time. Check your connection and try again.");
    } finally {
      setBookingPending(false);
    }
  }

  async function deletePoll() {
    if (!window.confirm("Delete this poll? This cannot be undone.")) return;
    setDeletePending(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/polls/${poll.id}`, { method: "DELETE" });
      if (!response.ok) {
        setDeleteError(await readError(response, "Unable to delete this poll."));
        return;
      }
      router.push("/dashboard/polls");
      router.refresh();
    } catch {
      setDeleteError("Unable to delete this poll. Check your connection and try again.");
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="poll-detail-layout">
      <div className="poll-detail-main">
        <Card className="poll-summary-card">
          <div className="poll-summary-heading">
            <div>
              <span className={`poll-badge ${poll.status === "closed" ? "poll-badge-closed" : ""}`}>
                {poll.status === "open" ? "Open" : "Closed"}
              </span>
              <h2>{poll.title}</h2>
            </div>
            <span className="poll-duration">{poll.durationMinutes} minutes</span>
          </div>
          {poll.description && <p className="poll-description">{poll.description}</p>}
          <div className="poll-share">
            <p className="field-label">Share link</p>
            {shareUrl ? (
              <>
                <code className="poll-share-url">{shareUrl}</code>
                <CopyButton value={shareUrl} />
              </>
            ) : (
              <span className="field-hint">Preparing share link…</span>
            )}
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={showVotes}
              disabled={togglePending || poll.status !== "open" || isBooked}
              onChange={(event) => updateShowVotes(event.target.checked)}
            />
            <span>Show votes to participants</span>
          </label>
          {toggleError && <ErrorField>{toggleError}</ErrorField>}
        </Card>

        <Card className="poll-results-card">
          <div className="section-heading">
            <h2>Results</h2>
            <p>Times use {timezone}.</p>
          </div>
          <div className="poll-option-list">
            {results.map((result) => {
              const isTop = maxVotes > 0 && result.voteCount === maxVotes;
              return (
                <div key={result.id}>
                  <div className={`poll-option-row result-row ${isTop ? "is-top" : ""}`}>
                    <div className="result-row-main">
                      <time dateTime={result.startUtc}>{formatWithZone(result.startUtc, timezone)}</time>
                      <div className="result-row-labels">
                        {isTop && <span className="poll-label poll-label-top">Most votes</span>}
                        {result.conflictsWithBooking && (
                          <span className="poll-label poll-label-warning">Conflicts with an existing booking</span>
                        )}
                      </div>
                    </div>
                    <strong className="result-vote-count">{result.voteCount} {result.voteCount === 1 ? "vote" : "votes"}</strong>
                  </div>
                  {result.voters.length > 0 ? (
                    <ul className="poll-voter-list">
                      {result.voters.map((voter) => (
                        <li key={`${result.id}-${voter.email}`}><span>{voter.name}</span><span>{voter.email}</span></li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-note poll-voter-empty">No votes for this time yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {!showBookingForm ? (
          <Card className="poll-final-card">
            <div className="section-heading">
              <h2>{booking ? "Booked time" : "Poll closed"}</h2>
            </div>
            {booking ? (
              <>
                <p className="booking-summary">{formatWithZone(booking.startUtc, timezone)}</p>
                <Link className="button button-secondary poll-booking-link" href={`/dashboard/bookings/${booking.id}`}>
                  View booking
                </Link>
              </>
            ) : (
              <p className="empty-note">This poll is no longer accepting votes or bookings.</p>
            )}
          </Card>
        ) : (
          <Card className="poll-booking-card">
            <div className="section-heading">
              <h2>Book a time</h2>
              <p>Choose one option and optionally add attendees.</p>
            </div>
            <form className="form-stack" onSubmit={bookTime}>
              <fieldset className="poll-time-picker">
                <legend>Proposed time</legend>
                <div className="poll-option-list">
                  {poll.options.map((option) => {
                    const result = results.find((candidate) => candidate.id === option.id);
                    return (
                      <label className="poll-option-row booking-option" key={option.id}>
                        <input
                          type="radio"
                          name="poll-option"
                          value={option.id}
                          checked={selectedOptionId === option.id}
                          onChange={() => setSelectedOptionId(option.id)}
                        />
                        <span>{formatWithZone(option.startUtc, timezone)}</span>
                        {result?.conflictsWithBooking && <span className="poll-label poll-label-warning">Conflict</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="poll-attendee-editor">
                <div className="poll-section-heading">
                  <div>
                    <h3>Add attendees</h3>
                    <p>Voters are included automatically.</p>
                  </div>
                  <Button type="button" variant="secondary" onClick={addAttendee} disabled={attendees.length >= 10}>
                    Add attendee
                  </Button>
                </div>
                {attendees.length > 0 && (
                  <div className="attendee-inline-list">
                    {attendees.map((attendee, index) => (
                      <div className="poll-attendee-row" key={`attendee-${index}`}>
                        <Input
                          id={`attendee-${index}-name`}
                          name={`attendee-${index}-name`}
                          label="Attendee name"
                          autoComplete="off"
                          maxLength={80}
                          value={attendee.name}
                          error={attendeeErrors[index]}
                          onChange={(event) => updateAttendee(index, "name", event.target.value)}
                        />
                        <Input
                          id={`attendee-${index}-email`}
                          name={`attendee-${index}-email`}
                          label="Attendee email"
                          type="email"
                          autoComplete="off"
                          maxLength={254}
                          value={attendee.email}
                          error={attendeeErrors[index] && attendeeErrors[index].includes("email") ? attendeeErrors[index] : ""}
                          onChange={(event) => updateAttendee(index, "email", event.target.value)}
                        />
                        <Button type="button" variant="secondary" onClick={() => removeAttendee(index)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {bookingError && <ErrorField>{bookingError}</ErrorField>}
              <Button type="submit" disabled={bookingPending || !selectedOptionId}>
                {bookingPending ? "Booking…" : "Book this time"}
              </Button>
            </form>
          </Card>
        )}

        {!isBooked && (
          <div className="poll-delete-section">
            {deleteError && <ErrorField>{deleteError}</ErrorField>}
            <Button type="button" variant="secondary" className="contact-delete-button" onClick={deletePoll} disabled={deletePending}>
              {deletePending ? "Deleting…" : "Delete poll"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
