"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { formatInstant } from "../../../server/timezone";
import { Button, Card, EmptyState, ErrorField, Input } from "../ui";

type PollRecord = {
  id: string;
  title: string;
  status: "open" | "closed";
  optionCount: number;
  createdAt: string;
  updatedAt: string;
};

type ChosenTime = {
  inputIndex: number;
  value: string;
  instant: Date;
};

async function readError(response: Response, fallback: string) {
  const result = (await response.json().catch(() => ({}))) as { error?: string };
  return result.error || fallback;
}

function timezoneParts(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
  };
}

function utcFromHostWallTime(value: string, timezone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const expected = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const wallTime = Date.UTC(expected.year, expected.month - 1, expected.day, expected.hour, expected.minute);
  const firstParts = timezoneParts(new Date(wallTime), timezone);
  const firstOffset = Date.UTC(firstParts.year, firstParts.month - 1, firstParts.day, firstParts.hour, firstParts.minute) - wallTime;
  const firstCandidate = new Date(wallTime - firstOffset);
  const secondParts = timezoneParts(firstCandidate, timezone);
  const secondOffset = Date.UTC(secondParts.year, secondParts.month - 1, secondParts.day, secondParts.hour, secondParts.minute) - wallTime;
  const adjacentOffsets = [-86_400_000, 0, 86_400_000].map((adjustment) => {
    const parts = timezoneParts(new Date(wallTime + adjustment), timezone);
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - wallTime;
  });
  const candidates = [
    wallTime - firstOffset,
    wallTime - secondOffset,
    ...adjacentOffsets.map((offset) => wallTime - offset),
  ].map((timestamp) => new Date(timestamp));
  const validCandidates = candidates.filter((candidate) => {
    const actual = timezoneParts(candidate, timezone);
    return (
      actual.year === expected.year &&
      actual.month === expected.month &&
      actual.day === expected.day &&
      actual.hour === expected.hour &&
      actual.minute === expected.minute
    );
  });
  return validCandidates.length > 0 ? new Date(Math.min(...validCandidates.map((candidate) => candidate.getTime()))) : null;
}

function getChosenTimes(values: string[], timezone: string) {
  const chosen: ChosenTime[] = [];
  for (const [inputIndex, value] of values.entries()) {
    if (!value) continue;
    const instant = utcFromHostWallTime(value, timezone);
    if (instant) chosen.push({ inputIndex, value, instant });
  }
  return chosen.sort((left, right) => left.instant.getTime() - right.instant.getTime());
}

function getTimePickerError(values: string[], timezone: string) {
  const entered = values.filter(Boolean);
  const chosen = getChosenTimes(values, timezone);
  if (chosen.length !== entered.length) return "Enter a valid proposed time in the host time zone.";
  if (chosen.some((time) => time.instant.getTime() <= Date.now())) return "Proposed times must be in the future.";
  if (new Set(chosen.map((time) => time.instant.toISOString())).size !== chosen.length) {
    return "Each proposed time must be different.";
  }
  if (chosen.length > 0 && chosen.length < 2) return "Choose at least two proposed times.";
  return "";
}

export function PollsManager({ initialPolls, timezone }: { initialPolls: PollRecord[]; timezone: string }) {
  const router = useRouter();
  const [polls] = useState(initialPolls);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [showVotes, setShowVotes] = useState(false);
  const [timeValues, setTimeValues] = useState([""]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const chosenTimes = getChosenTimes(timeValues, timezone);
  const pickerError = getTimePickerError(timeValues, timezone);

  function addTime() {
    if (timeValues.length < 40) setTimeValues((current) => [...current, ""]);
  }

  function updateTime(index: number, value: string) {
    setTimeValues((current) => current.map((time, timeIndex) => (timeIndex === index ? value : time)));
  }

  function removeTime(index: number) {
    setTimeValues((current) => current.filter((_, timeIndex) => timeIndex !== index));
    if (timeValues.length === 1) setTimeValues([""]);
  }

  async function createPoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (chosenTimes.length < 2 || pickerError) {
      setError(pickerError || "Choose at least two proposed times.");
      return;
    }

    setPending(true);
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const response = await fetch("/api/polls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: values.get("title"),
          description: String(values.get("description") || "").trim() || null,
          durationMinutes,
          showVotes,
          options: chosenTimes.map((time) => time.instant.toISOString()),
        }),
      });
      if (!response.ok) {
        setError(await readError(response, "Unable to create this poll."));
        return;
      }
      const created = (await response.json()) as { id?: string };
      if (!created.id) throw new Error("Unable to create this poll.");
      router.push(`/dashboard/polls/${created.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create this poll. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="polls-layout">
      <Card className="poll-create-card">
        <div className="poll-section-heading">
          <h2>Create a poll</h2>
          <p>Times use {timezone}.</p>
        </div>
        <form className="form-stack" onSubmit={createPoll}>
          <Input
            name="title"
            label="Poll title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            minLength={1}
            maxLength={80}
            required
          />
          <Input
            name="description"
            label="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
          />
          <Input
            name="duration"
            label="Duration in minutes"
            type="number"
            min={5}
            max={480}
            step={1}
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
            hint="Between 5 and 480 minutes."
            required
          />
          <label className="checkbox-field">
            <input type="checkbox" checked={showVotes} onChange={(event) => setShowVotes(event.target.checked)} />
            <span>Show votes to participants</span>
          </label>

          <fieldset className="poll-time-picker">
            <legend>Proposed times</legend>
            <p className="field-hint">Enter wall-clock times in {timezone}.</p>
            <div className="poll-time-inputs">
              {timeValues.map((value, index) => (
                <div className="poll-time-input-row" key={`poll-time-${index}`}>
                  <Input
                    id={`poll-time-${index}`}
                    name={`poll-time-${index}`}
                    label={`Proposed time ${index + 1}`}
                    type="datetime-local"
                    step={60}
                    value={value}
                    onChange={(event) => updateTime(index, event.target.value)}
                  />
                  <Button type="button" variant="secondary" onClick={() => removeTime(index)} disabled={pending}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={addTime} disabled={timeValues.length >= 40}>
              Add another time
            </Button>
            {pickerError && <ErrorField>{pickerError}</ErrorField>}
            {chosenTimes.length > 1 && (
              <div className="poll-chosen-times" aria-label="Chosen proposed times">
                <p className="field-label">Chosen times</p>
                {chosenTimes.map((time) => (
                  <div className="poll-chosen-time" key={time.instant.toISOString()}>
                    <time dateTime={time.instant.toISOString()}>{formatInstant(time.instant, timezone)}</time>
                    <Button type="button" variant="secondary" onClick={() => removeTime(time.inputIndex)} disabled={pending}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </fieldset>

          {error && <ErrorField>{error}</ErrorField>}
          <Button type="submit" disabled={pending || chosenTimes.length < 2 || Boolean(pickerError)}>
            {pending ? "Creating…" : "Create poll"}
          </Button>
        </form>
      </Card>

      <section className="poll-list-section" aria-labelledby="poll-list-title">
        <div className="poll-section-heading">
          <h2 id="poll-list-title">Your polls</h2>
          <p>Dates use {timezone}.</p>
        </div>
        {polls.length > 0 ? (
          <div className="poll-list">
            {polls.map((poll) => (
              <Card className="poll-row" key={poll.id}>
                <div className="poll-row-main">
                  <h3><Link href={`/dashboard/polls/${poll.id}`}>{poll.title}</Link></h3>
                  <p>{poll.optionCount} proposed {poll.optionCount === 1 ? "time" : "times"}</p>
                </div>
                <div className="poll-row-meta">
                  <span className={`poll-badge ${poll.status === "closed" ? "poll-badge-closed" : ""}`}>
                    {poll.status === "open" ? "Open" : "Closed"}
                  </span>
                  <time dateTime={poll.createdAt}>Created {formatInstant(new Date(poll.createdAt), timezone)}</time>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No polls yet" description="Create a poll to propose times and collect votes." />
        )}
      </section>
    </div>
  );
}
