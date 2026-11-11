"use client";

import { useState, type FormEvent } from "react";

import { Button, ErrorField } from "../ui";

type Range = { weekday: number; startMinute: number; endMinute: number };

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function timeToMinutes(value: string) {
  const hours = Number(value.slice(0, 2));
  const minutes = Number(value.slice(3, 5));
  return hours * 60 + minutes;
}

export function AvailabilityForm({ ranges }: { ranges: Range[] }) {
  const [days, setDays] = useState(() =>
    weekdays.map((_, weekday) => ({
      weekday,
      enabled: ranges.some((range) => range.weekday === weekday),
      ranges: ranges.filter((range) => range.weekday === weekday),
    })),
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  function updateDay(weekday: number, updater: (day: (typeof days)[number]) => (typeof days)[number]) {
    setSaved(false);
    setDays((current) => current.map((day) => (day.weekday === weekday ? updater(day) : day)));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSaved(false);
    try {
      const submitted = days.flatMap((day) => (day.enabled ? day.ranges : [])).map(({ weekday, startMinute, endMinute }) => ({ weekday, startMinute, endMinute }));
      if (submitted.length === 0) {
        setError("Add at least one time range.");
        setPending(false);
        return;
      }
      const response = await fetch("/api/availability", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ranges: submitted }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        setError(result.error || "Your availability couldn’t be saved. Please try again.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Your availability couldn’t be saved. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-stack availability-form" onSubmit={save}>
      {days.map((day) => (
        <fieldset className="availability-day" key={day.weekday}>
          <legend>
            <label className="checkbox-field">
              <input type="checkbox" checked={day.enabled} onChange={(change) => updateDay(day.weekday, (current) => ({ ...current, enabled: change.target.checked, ranges: change.target.checked && current.ranges.length === 0 ? [{ weekday: current.weekday, startMinute: 540, endMinute: 1020 }] : current.ranges }))} />
              <span>{weekdays[day.weekday]}</span>
            </label>
          </legend>
          {day.enabled && (
            <div className="availability-ranges">
              {day.ranges.map((range, index) => (
                <div className="time-range" key={`${day.weekday}-${index}`}>
                  <label className="field-label">Start</label>
                  <input className="input range-input" type="time" value={minutesToTime(range.startMinute)} onChange={(change) => {
                    const value = change.target.value;
                    if (!value) return;
                    updateDay(day.weekday, (current) => ({ ...current, ranges: current.ranges.map((item, itemIndex) => (itemIndex === index ? { ...item, startMinute: timeToMinutes(value) } : item)) }));
                  }} />
                  <label className="field-label">End</label>
                  <input className="input range-input" type="time" value={minutesToTime(range.endMinute)} onChange={(change) => {
                    const value = change.target.value;
                    if (!value) return;
                    updateDay(day.weekday, (current) => ({ ...current, ranges: current.ranges.map((item, itemIndex) => (itemIndex === index ? { ...item, endMinute: timeToMinutes(value) } : item)) }));
                  }} />
                  <Button type="button" variant="secondary" disabled={day.ranges.length === 1} onClick={() => updateDay(day.weekday, (current) => ({ ...current, ranges: current.ranges.filter((_, itemIndex) => itemIndex !== index) }))} aria-label={`Remove ${weekdays[day.weekday]} time range`}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={() => updateDay(day.weekday, (current) => ({ ...current, ranges: [...current.ranges, { weekday: current.weekday, startMinute: 540, endMinute: 1020 }] }))}>Add time range</Button>
            </div>
          )}
        </fieldset>
      ))}
      {error && <ErrorField>{error}</ErrorField>}
      {saved && <p className="success-message" role="status">Your weekly availability is up to date.</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save availability"}</Button>
    </form>
  );
}
