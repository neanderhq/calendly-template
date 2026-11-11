"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button, Card, EmptyState, ErrorField, Input } from "../ui";

type ContactRecord = {
  id: string;
  name: string;
  email: string;
  timezone: string | null;
  bookingCount: number;
  lastBookingAt: string | null;
};

async function readError(response: Response, fallback: string) {
  const result = (await response.json().catch(() => ({}))) as { error?: string };
  return result.error || fallback;
}

function formatLastBooking(value: string | null, timezone: string) {
  if (!value) return "No bookings yet";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function ContactsManager({ initialContacts, timezone }: { initialContacts: ContactRecord[]; timezone: string }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState("");
  const [createError, setCreateError] = useState("");
  const [created, setCreated] = useState(false);
  const [searchPending, setSearchPending] = useState(false);
  const [createPending, setCreatePending] = useState(false);

  async function loadContacts(searchTerm: string) {
    const query = searchTerm.trim();
    const response = await fetch(query ? `/api/contacts?search=${encodeURIComponent(query)}` : "/api/contacts");
    if (!response.ok) throw new Error(await readError(response, "Unable to search contacts."));
    const result = (await response.json()) as { contacts: ContactRecord[] };
    setContacts(result.contacts);
  }

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchPending(true);
    setSearchError("");
    try {
      await loadContacts(search);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Unable to search contacts.");
    } finally {
      setSearchPending(false);
    }
  }

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatePending(true);
    setCreateError("");
    setCreated(false);
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: values.get("name"), email: values.get("email") }),
      });
      if (!response.ok) {
        setCreateError(await readError(response, "Unable to add this contact."));
        return;
      }
      form.reset();
      setCreated(true);
      try {
        await loadContacts(search);
      } catch {
        setSearchError("Contact added, but the list could not be refreshed. Search again to see it.");
      }
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Unable to add this contact. Check your connection and try again.");
    } finally {
      setCreatePending(false);
    }
  }

  return (
    <div className="contacts-layout">
      <Card className="contacts-add-card">
        <h2>Add a contact</h2>
        <p className="contacts-intro">Save someone you work with. Bookings stay in your booking history if you later remove a contact.</p>
        <form className="form-stack" onSubmit={addContact}>
          <Input name="name" label="Name" autoComplete="name" maxLength={80} required />
          <Input name="email" label="Email address" type="email" autoComplete="email" maxLength={254} required />
          {createError && <ErrorField>{createError}</ErrorField>}
          {created && <p className="success-message" role="status">Contact added.</p>}
          <Button type="submit" disabled={createPending}>{createPending ? "Adding…" : "Add contact"}</Button>
        </form>
      </Card>

      <section className="contacts-list-section" aria-labelledby="contacts-list-title">
        <div className="contacts-section-heading">
          <h2 id="contacts-list-title">Your contacts</h2>
          <p className="timezone-note">Last booking dates use {timezone}.</p>
        </div>
        <form className="contacts-search" onSubmit={submitSearch} role="search">
          <Input name="search" label="Search by name or email" type="search" value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} />
          <Button type="submit" variant="secondary" disabled={searchPending}>{searchPending ? "Searching…" : "Search"}</Button>
        </form>
        {searchError && <ErrorField>{searchError}</ErrorField>}
        {contacts.length > 0 ? (
          <div className="contacts-list">
            {contacts.map((contact) => (
              <Card className="contact-row" key={contact.id}>
                <div className="contact-row-main">
                  <h3><Link href={`/dashboard/contacts/${contact.id}`}>{contact.name}</Link></h3>
                  <p>{contact.email}</p>
                </div>
                <dl className="contact-row-meta">
                  <div><dt>Time zone</dt><dd>{contact.timezone ?? "Not recorded"}</dd></div>
                  <div><dt>Bookings</dt><dd>{contact.bookingCount}</dd></div>
                  <div><dt>Last booking</dt><dd>{formatLastBooking(contact.lastBookingAt, timezone)}</dd></div>
                </dl>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title={search ? "No matching contacts" : "No contacts yet"} description={search ? "Try another name or email address." : "Add a contact to keep their details and booking history together."} />
        )}
      </section>
    </div>
  );
}
