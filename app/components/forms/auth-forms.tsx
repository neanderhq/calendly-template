"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "../auth-client";
import { Button, ErrorField, Input } from "../ui";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const values = new FormData(event.currentTarget);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const result = await authClient.signUp.email({
        name: String(values.get("name")).trim(),
        email: String(values.get("email")).trim().toLowerCase(),
        password: String(values.get("password")),
        timezone,
      });
      if (result.error) {
        setError(result.error.message?.toLowerCase().includes("already exists") ? "An account already uses that email address." : result.error.message || "We couldn’t create your account. Please try again.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("We couldn’t create your account. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <Input name="name" label="Your name" autoComplete="name" maxLength={80} required />
      <Input name="email" label="Email address" type="email" autoComplete="email" maxLength={254} required />
      <Input name="password" label="Password" type="password" autoComplete="new-password" minLength={8} required hint="Use at least 8 characters." />
      {error && <ErrorField>{error}</ErrorField>}
      <Button type="submit" disabled={pending}>{pending ? "Creating your account…" : "Create account"}</Button>
      <p className="form-switch">Already have an account? <Link href="/login">Log in</Link></p>
    </form>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const values = new FormData(event.currentTarget);
      const result = await authClient.signIn.email({
        email: String(values.get("email")).trim().toLowerCase(),
        password: String(values.get("password")),
      });
      if (result.error) {
        setError("That email and password don’t match. Check them and try again.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("We couldn’t sign you in. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <Input name="email" label="Email address" type="email" autoComplete="email" maxLength={254} required />
      <Input name="password" label="Password" type="password" autoComplete="current-password" required />
      {error && <ErrorField>{error}</ErrorField>}
      <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Log in"}</Button>
      <p className="form-switch">New to Daymark? <Link href="/signup">Create an account</Link></p>
    </form>
  );
}
