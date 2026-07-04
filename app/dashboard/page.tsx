"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type ProductForm = {
  name: string;
  short_description: string;
  long_description: string;
  price: string;
  category: string;
  sku: string;
  stock_quantity: string;
  notes: string;
};

const emptyForm: ProductForm = {
  name: "",
  short_description: "",
  long_description: "",
  price: "",
  category: "",
  sku: "",
  stock_quantity: "",
  notes: "",
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(isSupabaseConfigured);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingAuth(false);
    });
  }, []);

  function updateField(field: keyof ProductForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateImages(event: ChangeEvent<HTMLInputElement>) {
    setImages(Array.from(event.target.files ?? []));
  }

  async function uploadImages(customerId: string) {
    const uploadedPaths: string[] = [];

    for (const image of images) {
      const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${customerId}/${crypto.randomUUID()}-${safeName}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, image, { upsert: false });

      if (error) throw error;
      uploadedPaths.push(path);
    }

    return uploadedPaths;
  }

  async function submitProduct() {
    if (!user) return;

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const imageUrls = await uploadImages(user.id);

      const { error } = await supabase.from("products").insert({
        customer_id: user.id,
        name: form.name,
        short_description: form.short_description || null,
        long_description: form.long_description || null,
        price: form.price ? Number(form.price) : null,
        category: form.category || null,
        sku: form.sku || null,
        stock_quantity: form.stock_quantity ? Number(form.stock_quantity) : null,
        notes: form.notes || null,
        status: "new",
        image_urls: imageUrls,
      });

      if (error) throw error;

      setMessage("Product submitted.");
      setForm(emptyForm);
      setImages([]);
      const input = document.getElementById("images") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    location.href = "/login";
  }

  if (checkingAuth) {
    return <main className="shell">Checking login...</main>;
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="shell narrow">
        <h1>Supabase env missing</h1>
        <p className="muted">Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="shell narrow">
        <h1>Not logged in</h1>
        <p className="muted">Use approved customer email first.</p>
        <Link className="buttonLink" href="/login">Go to login</Link>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <p className="eyebrow">Logged in as {user.email}</p>
          <h1>Add product</h1>
        </div>
        <button className="secondary" onClick={logout} type="button">Log out</button>
      </div>

      <form
        className="card form grid"
        onSubmit={(event) => {
          event.preventDefault();
          void submitProduct();
        }}
      >
        <label>
          Product name *
          <input required value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        </label>

        <label>
          Price
          <input inputMode="decimal" value={form.price} onChange={(event) => updateField("price", event.target.value)} />
        </label>

        <label>
          Category
          <input value={form.category} onChange={(event) => updateField("category", event.target.value)} />
        </label>

        <label>
          SKU
          <input value={form.sku} onChange={(event) => updateField("sku", event.target.value)} />
        </label>

        <label>
          Stock quantity
          <input inputMode="numeric" value={form.stock_quantity} onChange={(event) => updateField("stock_quantity", event.target.value)} />
        </label>

        <label className="full">
          Short description
          <input value={form.short_description} onChange={(event) => updateField("short_description", event.target.value)} />
        </label>

        <label className="full">
          Long description
          <textarea rows={5} value={form.long_description} onChange={(event) => updateField("long_description", event.target.value)} />
        </label>

        <label className="full">
          Notes
          <textarea rows={4} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
        </label>

        <label className="full">
          Images
          <input id="images" type="file" accept="image/*" multiple onChange={updateImages} />
        </label>

        {error ? <p className="error full">{error}</p> : null}
        {message ? <p className="successText full">{message}</p> : null}

        <button className="full" disabled={loading} type="submit">
          {loading ? "Submitting..." : "Submit product"}
        </button>
      </form>
    </main>
  );
}
