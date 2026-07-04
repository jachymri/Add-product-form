"use client";

import Link from "next/link";
import { useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${location.origin}/dashboard`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="shell narrow">
        <h1>Supabase env missing</h1>
        <p className="muted">Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.</p>
      </main>
    );
  }

  return (
    <main className="shell narrow">
      <p className="eyebrow">Customer portal</p>
      <h1>Log in with email</h1>
      <p className="muted">Enter approved customer email. We send one-time magic link.</p>

      {sent ? (
        <div className="card success">
          <h2>Check email</h2>
          <p>Open login link, then submit products.</p>
          <Link href="/dashboard">Go to dashboard</Link>
        </div>
      ) : (
        <form
          className="card form"
          onSubmit={(event) => {
            event.preventDefault();
            void login();
          }}
        >
          <label>
            Email
            <input
              required
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button disabled={loading || !email} type="submit">
            {loading ? "Sending..." : "Send login link"}
          </button>
        </form>
      )}
    </main>
  );
}
