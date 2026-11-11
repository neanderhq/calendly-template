"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button, ErrorField } from "../ui";

type BlockRecord = {
  id: string;
  date: string;
  startMinute: number;
  endMinute: number;
  note: string | null;
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
  return result.error || "Your blocked time couldn’t be saved. Please try again.";
}

export function BlockedTimesForm({ blocks }: { blocks: BlockRecord[] }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (!date) {
      setError("Enter the blocked date and the times to block.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/availability/blocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, startMinute: timeToMinutes(start), endMinute: timeToMinutes(end), note }),
      });
      if (!response.ok) {
        setError(await readResult(response));
        return;
      }
      setSaved(true);
      setNote("");
      router.refresh();
    } catch {
      setError("Your blocked time couldn’t be saved. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setError("");
    setPending(true);
    try {
      const response = await fetch(`/api/availability/blocks/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setError(await readResult(response));
        return;
      }
      router.refresh();
    } catch {
      setError("Your blocked time couldn’t be removed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="question-editor">
      <form className="form-stack availability-form" onSubmit={save}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="block-date">Date</label>
            <input id="block-date" className="input" type="date" value={date} onChange={(change) => { setSaved(false); setDate(change.target.value); }} />
          </div>
          <div className="field">
            <label htmlFor="block-note">Note (optional)</label>
            <input id="block-note" className="input" type="text" maxLength={200} value={note} onChange={(change) => { setSaved(false); setNote(change.target.value); }} />
          </div>
        </div>
        <div className="time-range">
          <label className="field-label" htmlFor="block-start">Start</label>
          <input id="block-start" className="input range-input" type="time" value={start} onChange={(change) => { setSaved(false); if (change.target.value) setStart(change.target.value); }} />
          <label className="field-label" htmlFor="block-end">End</label>
          <input id="block-end" className="input range-input" type="time" value={end} onChange={(change) => { setSaved(false); if (change.target.value) setEnd(change.target.value); }} />
          <span className="range-spacer" aria-hidden="true" />
        </div>
        {error && <ErrorField>{error}</ErrorField>}
        {saved && <p className="success-message" role="status">Your blocked time is saved.</p>}
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Block time"}</Button>
      </form>

      <div className="question-list">
        {blocks.length === 0 ? (
          <p className="empty-note">No blocked times yet.</p>
        ) : (
          blocks.map((block) => (
            <div className="question-item" key={block.id}>
              <div>
                <span className="field-label">{formatDate(block.date)}</span>
                <p className="override-state">{minutesToTime(block.startMinute)}–{minutesToTime(block.endMinute)}</p>
                {block.note && <p className="block-note">{block.note}</p>}
              </div>
              <div className="question-actions">
                <Button type="button" variant="secondary" disabled={pending} onClick={() => remove(block.id)} aria-label={`Delete block on ${formatDate(block.date)}`}>Delete</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
