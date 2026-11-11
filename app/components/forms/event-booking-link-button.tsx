"use client";

import { useState } from "react";

import { CopyButton } from "../copy-button";
import { Button, Card, ErrorField } from "../ui";

type CreateLinkResponse = { token?: unknown; error?: unknown };

export function EventBookingLinkButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  async function createLink() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/booking-links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "event_type" }),
      });
      const result = (await response.json().catch(() => null)) as CreateLinkResponse | null;
      if (!response.ok) {
        setError(typeof result?.error === "string" ? result.error : "A single-use link couldn’t be created. Please try again.");
        return;
      }
      if (typeof result?.token !== "string" || !result.token) {
        setError("The link was created, but its URL couldn’t be read. Open Links in your workspace to check it.");
        return;
      }
      setLinkUrl(`${window.location.origin}/link/${encodeURIComponent(result.token)}`);
    } catch {
      setError("A single-use link couldn’t be created. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="scheduling-card">
      <h2>Create a single-use link</h2>
      <p className="empty-note">This link uses your event type settings and current availability, and can be booked once.</p>
      <Button type="button" onClick={createLink} disabled={pending}>
        {pending ? "Creating link…" : "Create single-use link"}
      </Button>
      {error && <ErrorField>{error}</ErrorField>}
      {linkUrl && (
        <div className="form-stack" role="status">
          <p className="empty-note">Your link is ready: <a className="text-link" href={linkUrl} target="_blank" rel="noreferrer">{linkUrl}</a></p>
          <CopyButton value={linkUrl} />
        </div>
      )}
    </Card>
  );
}
