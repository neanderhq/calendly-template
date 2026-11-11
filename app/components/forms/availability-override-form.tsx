"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button, ErrorField } from "../ui";

type OverrideRecord = {
  id: string;
  date: string;
  kind: "available" | "unavailable";
  startMinute: number | null;
  endMinute: number | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function formatDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function timeToMinutes(value: string) {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
}

async function readResult(response: Response) {
  const result = (await response.json().catch(() => ({}))) as { error?: string };
  return result.error || "Your date setting couldn’t be saved. Please try again.";
}

export function AvailabilityOverrideForm({ overrides }: { overrides: OverrideRecord[] }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [unavailable, setUnavailable] = useState(true);
  const [ranges, setRanges] = useState([{ startMinute: 540, endMinute: 1020 }]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const dates = new Map<string, OverrideRecord[]>();
  for (const override of overrides) {
    const rows = dates.get(override.date) ?? [];
    rows.push(override);
    dates.set(override.date, rows);
  }
  const dateStates = [...dates.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([stateDate, rows]) => ({
      date: stateDate,
      unavailable: rows.some((row) => row.kind === "unavailable"),
      ranges: rows
        .filter((row) => row.kind === "available" && row.startMinute !== null && row.endMinute !== null)
        .map((row) => ({ startMinute: row.startMinute as number, endMinute: row.endMinute as number }))
        .sort((left, right) => left.startMinute - right.startMinute),
    }));

  function updateRange(index: number, updater: (range: { startMinute: number; endMinute: number }) => { startMinute: number; endMinute: number }) {
    setSaved(false);
    setRanges((current) => current.map((range, rangeIndex) => (rangeIndex === index ? updater(range) : range)));
  }

  function removeRange(index: number) {
    setSaved(false);
    setRanges((current) => current.filter((_, rangeIndex) => rangeIndex !== index));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (!date) {
      setError("Choose a date.");
      return;
    }
    if (!unavailable && ranges.length === 0) {
      setError("Add at least one time range.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/availability/overrides", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, unavailable, ranges: unavailable ? [] : ranges }),
      });
      if (!response.ok) {
        setError(await readResult(response));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Your date setting couldn’t be saved. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function remove(stateDate: string) {
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/availability/overrides", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: stateDate }),
      });
      if (!response.ok) {
        setError(await readResult(response));
        return;
      }
      router.refresh();
    } catch {
      setError("Your date setting couldn’t be removed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="question-editor">
      <form className="form-stack availability-form" onSubmit={save}>
        <div className="field">
          <label htmlFor="override-date">Date</label>
          <input id="override-date" className="input" type="date" value={date} onChange={(change) => { setSaved(false); setDate(change.target.value); }} />
        </div>
        <label className="checkbox-field">
          <input type="checkbox" checked={unavailable} onChange={(change) => { setSaved(false); setUnavailable(change.target.checked); }} />
          <span>Whole day unavailable</span>
        </label>
        {!unavailable && (
          <div className="availability-ranges">
            {ranges.map((range, index) => (
              <div className="time-range" key={index}>
                <label className="field-label">Start</label>
                <input className="input range-input" type="time" aria-label="Date hours start" value={minutesToTime(range.startMinute)} onChange={(change) => {
                  const value = change.target.value;
                  if (!value) return;
                  updateRange(index, (current) => ({ ...current, startMinute: timeToMinutes(value) }));
                }} />
                <label className="field-label">End</label>
                <input className="input range-input" type="time" aria-label="Date hours end" value={minutesToTime(range.endMinute)} onChange={(change) => {
                  const value = change.target.value;
                  if (!value) return;
                  updateRange(index, (current) => ({ ...current, endMinute: timeToMinutes(value) }));
                }} />
                <Button type="button" variant="secondary" disabled={ranges.length === 1} onClick={() => removeRange(index)} aria-label="Remove date hours range">Remove</Button>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => { setSaved(false); setRanges((current) => [...current, { startMinute: 540, endMinute: 1020 }]); }}>Add time range</Button>
          </div>
        )}
        {error && <ErrorField>{error}</ErrorField>}
        {saved && <p className="success-message" role="status">Your date-specific hours are up to date.</p>}
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save this date"}</Button>
      </form>

      <div className="question-list">
        {dateStates.length === 0 ? (
          <p className="empty-note">No date-specific hours yet. Every date uses your weekly hours.</p>
        ) : (
          dateStates.map((state) => (
            <div className="question-item" key={state.date}>
              <div>
                <span className="field-label">{formatDate(state.date)}</span>
                <p className="override-state">{state.unavailable ? "Closed all day" : state.ranges.map((range) => `${minutesToTime(range.startMinute)}–${minutesToTime(range.endMinute)}`).join(", ")}</p>
              </div>
              <div className="question-actions">
                <Button type="button" variant="secondary" disabled={pending} onClick={() => remove(state.date)} aria-label={`Restore weekly hours for ${formatDate(state.date)}`}>Restore weekly hours</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
