"use client";

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
        <h1>Chybí Supabase env</h1>
        <p className="muted">Nastav NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY.</p>
      </main>
    );
  }

  return (
    <main className="shell narrow">
      <h1>Přihlášení emailem</h1>
      <p className="muted">Zadej emailovou adresu. Potom potvrď přihlášení kliknutím na odkaz, který ti přijde do emailu.</p>

      {sent ? (
        <div className="card success">
          <h2>Zkontroluj email</h2>
          <p>Otevři přihlašovací odkaz z emailu. Po potvrzení se otevře dashboard.</p>
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
            {loading ? "Odesílám..." : "Poslat přihlašovací odkaz"}
          </button>
        </form>
      )}
    </main>
  );
}
