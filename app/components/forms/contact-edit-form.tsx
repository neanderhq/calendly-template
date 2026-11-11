"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, ErrorField, Input } from "../ui";

async function readError(response: Response) {
  const result = (await response.json().catch(() => ({}))) as { error?: string };
  return result.error || "Unable to update this contact.";
}

export function ContactEditForm({ contact }: { contact: { id: string; name: string; email: string } }) {
  const router = useRouter();
  const [name, setName] = useState(contact.name);
  const [email, setEmail] = useState(contact.email);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Unable to update this contact. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-stack contact-edit-form" onSubmit={submit}>
      <Input name="name" label="Name" autoComplete="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} required />
      <Input name="email" label="Email address" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required />
      {error && <ErrorField>{error}</ErrorField>}
      {saved && <p className="success-message" role="status">Contact details updated.</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}
