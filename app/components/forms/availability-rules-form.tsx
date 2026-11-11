"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button, ErrorField, Input } from "../ui";

type Rules = {
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minimumNoticeHours: number;
  bookingHorizonDays: number;
  startTimeIncrementMinutes: number | null;
  dailyMeetingLimit: number | null;
  weeklyMeetingLimit: number | null;
  monthlyMeetingLimit: number | null;
};

export function AvailabilityRulesForm({ rules }: { rules: Rules }) {
  const router = useRouter();
  const [bufferBefore, setBufferBefore] = useState(String(rules.bufferBeforeMinutes));
  const [bufferAfter, setBufferAfter] = useState(String(rules.bufferAfterMinutes));
  const [notice, setNotice] = useState(String(rules.minimumNoticeHours));
  const [horizon, setHorizon] = useState(String(rules.bookingHorizonDays));
  const [increment, setIncrement] = useState(rules.startTimeIncrementMinutes === null ? "same" : String(rules.startTimeIncrementMinutes));
  const [dailyLimit, setDailyLimit] = useState(rules.dailyMeetingLimit === null ? "" : String(rules.dailyMeetingLimit));
  const [weeklyLimit, setWeeklyLimit] = useState(rules.weeklyMeetingLimit === null ? "" : String(rules.weeklyMeetingLimit));
  const [monthlyLimit, setMonthlyLimit] = useState(rules.monthlyMeetingLimit === null ? "" : String(rules.monthlyMeetingLimit));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/availability/rules", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bufferBeforeMinutes: Number(bufferBefore),
          bufferAfterMinutes: Number(bufferAfter),
          minimumNoticeHours: Number(notice),
          bookingHorizonDays: Number(horizon),
          startTimeIncrementMinutes: increment === "same" ? null : Number(increment),
          dailyMeetingLimit: dailyLimit === "" ? null : Number(dailyLimit),
          weeklyMeetingLimit: weeklyLimit === "" ? null : Number(weeklyLimit),
          monthlyMeetingLimit: monthlyLimit === "" ? null : Number(monthlyLimit),
        }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        setError(result.error || "Your rules couldn’t be saved. Please try again.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Your rules couldn’t be saved. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-stack availability-form" onSubmit={save}>
      <div className="form-grid">
        <Input name="buffer-before" label="Buffer before (minutes)" type="number" min={0} max={120} step={1} hint="0 to 120 minutes." value={bufferBefore} onChange={(change) => { setSaved(false); setBufferBefore(change.target.value); }} />
        <Input name="buffer-after" label="Buffer after (minutes)" type="number" min={0} max={120} step={1} hint="0 to 120 minutes." value={bufferAfter} onChange={(change) => { setSaved(false); setBufferAfter(change.target.value); }} />
        <Input name="minimum-notice" label="Minimum notice (hours)" type="number" min={0} max={720} step={1} hint="0 to 720 hours." value={notice} onChange={(change) => { setSaved(false); setNotice(change.target.value); }} />
        <Input name="booking-horizon" label="Booking horizon (days)" type="number" min={1} max={365} step={1} hint="How many days ahead people can book (1 to 365)." value={horizon} onChange={(change) => { setSaved(false); setHorizon(change.target.value); }} />
        <div className="field">
          <label htmlFor="start-time-increment">Start-time spacing</label>
          <select id="start-time-increment" className="input" value={increment} onChange={(change) => { setSaved(false); setIncrement(change.target.value); }}>
            <option value="same">Same as event duration</option>
            {[5, 10, 15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
          </select>
        </div>
        <Input name="daily-limit" label="Meetings per day" type="number" min={1} max={100} step={1} hint="Leave empty for no limit." value={dailyLimit} onChange={(change) => { setSaved(false); setDailyLimit(change.target.value); }} />
        <Input name="weekly-limit" label="Meetings per week" type="number" min={1} max={100} step={1} hint="Monday to Sunday; leave empty for no limit." value={weeklyLimit} onChange={(change) => { setSaved(false); setWeeklyLimit(change.target.value); }} />
        <Input name="monthly-limit" label="Meetings per month" type="number" min={1} max={100} step={1} hint="Leave empty for no limit." value={monthlyLimit} onChange={(change) => { setSaved(false); setMonthlyLimit(change.target.value); }} />
      </div>
      {error && <ErrorField>{error}</ErrorField>}
      {saved && <p className="success-message" role="status">Your rules are up to date.</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save rules"}</Button>
    </form>
  );
}
