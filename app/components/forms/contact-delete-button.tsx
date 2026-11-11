"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, ErrorField } from "../ui";

export function ContactDeleteButton({ contactId, contactName }: { contactId: string; contactName: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function removeContact() {
    if (!window.confirm(`Delete ${contactName} from your contacts? Their bookings will not be deleted.`)) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        setError(result.error || "Unable to delete this contact.");
        return;
      }
      router.push("/dashboard/contacts");
      router.refresh();
    } catch {
      setError("Unable to delete this contact. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="contact-delete-control">
      {error && <ErrorField>{error}</ErrorField>}
      <Button type="button" variant="secondary" className="contact-delete-button" onClick={removeContact} disabled={pending}>
        {pending ? "Deleting…" : "Delete contact"}
      </Button>
    </div>
  );
}
