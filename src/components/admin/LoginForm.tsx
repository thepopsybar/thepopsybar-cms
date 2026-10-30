"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ destination = "/admin" }: { destination?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError("Sign-in failed. Check your email and password and try again.");
      setPending(false);
      return;
    }
    router.replace(destination);
    router.refresh();
  }

  return (
    <form className="admin-login__form" onSubmit={handleSubmit} aria-busy={pending}>
      <label htmlFor="admin-email">Email</label>
      <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="admin-password">Password</label>
      <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <button className="btn btn--blush" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
