"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { isAuthDisabled, isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type ProductForm = {
  name: string;
  price: string;
  quantity: string;
  club: string;
  notes: string;
};

type SelectedImage = {
  id: string;
  file: File;
  url: string;
};

type ProductDraft = ProductForm & {
  id: string;
  images: SelectedImage[];
};

const emptyForm: ProductForm = {
  name: "",
  price: "",
  quantity: "1",
  club: "",
  notes: "",
};

export default function DashboardPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(isSupabaseConfigured && !isAuthDisabled);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [batchNote, setBatchNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured || isAuthDisabled) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingAuth(false);
    });
  }, []);

  useEffect(() => {
    return () => {
      images.forEach((image) => URL.revokeObjectURL(image.url));
      drafts.forEach((draft) => draft.images.forEach((image) => URL.revokeObjectURL(image.url)));
    };
    // Only run on unmount. URLs are revoked manually when removed/submitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField(field: keyof ProductForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateImages(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);
    if (selectedFiles.length === 0) return;

    const selectedImages = selectedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }));

    setImages((current) => [...current, ...selectedImages]);
    event.currentTarget.value = "";
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function moveImage(fromIndex: number, direction: -1 | 1) {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= images.length) return;

    setImages((current) => {
      const next = [...current];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
  }

  function removeImage(index: number) {
    setImages((current) => {
      const removed = current[index];
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  function resetEditor() {
    if (!editingId) images.forEach((image) => URL.revokeObjectURL(image.url));
    setForm(emptyForm);
    setImages([]);
    setEditingId(null);
  }

  function addOrUpdateDraft() {
    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Název dresu je povinný.");
      return;
    }

    if (editingId) {
      setDrafts((current) =>
        current.map((draft) =>
          draft.id === editingId ? { ...form, id: editingId, images } : draft
        )
      );
      setMessage("Produkt upraven v seznamu.");
    } else {
      setDrafts((current) => [...current, { ...form, id: crypto.randomUUID(), images }]);
      setMessage("Produkt přidán do seznamu.");
    }

    setForm(emptyForm);
    setImages([]);
    setEditingId(null);
  }

  function editDraft(draft: ProductDraft) {
    if (!editingId) images.forEach((image) => URL.revokeObjectURL(image.url));

    setForm({
      name: draft.name,
      price: draft.price,
      quantity: draft.quantity,
      club: draft.club,
      notes: draft.notes,
    });
    setImages(draft.images);
    setEditingId(draft.id);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeDraft(id: string) {
    const draftToRemove = drafts.find((draft) => draft.id === id);
    draftToRemove?.images.forEach((image) => URL.revokeObjectURL(image.url));
    setDrafts((current) => current.filter((draft) => draft.id !== id));
    if (editingId === id) {
      setForm(emptyForm);
      setImages([]);
      setEditingId(null);
    }
  }

  async function uploadImages(customerId: string, draftImages: SelectedImage[]) {
    const uploadedPaths: string[] = [];

    for (const image of draftImages) {
      const safeName = image.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${customerId}/${crypto.randomUUID()}-${safeName}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, image.file, { upsert: false });

      if (error) throw error;
      uploadedPaths.push(path);
    }

    return uploadedPaths;
  }

  async function submitBatch() {
    if (!user && !isAuthDisabled) return;

    setError("");
    setMessage("");

    if (drafts.length === 0) {
      setError("Nejdřív přidej alespoň jeden produkt do seznamu.");
      return;
    }

    setLoading(true);

    try {
      if (isAuthDisabled) {
        setMessage(`Vývojový režim: ${drafts.length} produktů připraveno, ale neuloženo.`);
        drafts.forEach((draft) => draft.images.forEach((image) => URL.revokeObjectURL(image.url)));
        setDrafts([]);
        setBatchNote("");
        setForm(emptyForm);
        setImages([]);
        setEditingId(null);
        return;
      }

      if (!user) return;

      for (const draft of drafts) {
        const photoUrls = await uploadImages(user.id, draft.images);
        const combinedNotes = [draft.notes.trim(), batchNote.trim()].filter(Boolean).join(" | ");

        const { error } = await supabase.from("products").insert({
          customer_id: user.id,
          name: draft.name,
          price: draft.price ? Number(draft.price) : null,
          quantity: draft.quantity ? Number(draft.quantity) : null,
          club: draft.club || null,
          photo_urls: photoUrls,
          notes: combinedNotes || null,
          status: "new",
        });

        if (error) throw error;
      }

      setMessage(`${drafts.length} produktů odesláno.`);
      drafts.forEach((draft) => draft.images.forEach((image) => URL.revokeObjectURL(image.url)));
      setDrafts([]);
      setBatchNote("");
      setForm(emptyForm);
      setImages([]);
      setEditingId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nahrávání selhalo");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    location.href = "/login";
  }

  if (checkingAuth) {
    return <main className="shell">Kontroluji přihlášení...</main>;
  }

  if (!isSupabaseConfigured && !isAuthDisabled) {
    return (
      <main className="shell narrow">
        <h1>Chybí Supabase env</h1>
        <p className="muted">Nastav NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY.</p>
      </main>
    );
  }

  if (!user && !isAuthDisabled) {
    return (
      <main className="shell narrow">
        <h1>Nejsi přihlášený</h1>
        <p className="muted">Nejdřív použij schválený zákaznický email.</p>
        <Link className="buttonLink" href="/login">Přejít na přihlášení</Link>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <p className="eyebrow">{isAuthDisabled ? "Vývojový režim: přihlášení vypnuto" : `Přihlášen jako ${user?.email}`}</p>
          <h1>Seznam dresů</h1>
          <p className="muted">Přidej dresy, seřaď fotky, zkontroluj seznam a potom odešli vše najednou.</p>
        </div>
        {isAuthDisabled ? null : <button className="secondary" onClick={logout} type="button">Odhlásit</button>}
      </div>

      <section className="dashboardGrid">
        <form
          className="card form grid editorCard"
          onSubmit={(event) => {
            event.preventDefault();
            addOrUpdateDraft();
          }}
        >
          <div className="full sectionTitle">
            <h2>{editingId ? "Upravit produkt" : "Přidat produkt"}</h2>
            <p className="muted smallText">Produkt se nejdřív přidá do seznamu. Uloží se až při finálním odeslání.</p>
          </div>

          <label>
            Název dresu *
            <input required value={form.name} onChange={(event) => updateField("name", event.target.value)} />
          </label>

          <label>
            Cena *
            <input required inputMode="decimal" value={form.price} onChange={(event) => updateField("price", event.target.value)} />
          </label>

          <label>
            Množství
            <input inputMode="numeric" value={form.quantity} onChange={(event) => updateField("quantity", event.target.value)} />
          </label>

          <label>
            Klub
            <input placeholder="Barcelona, Arsenal, PSG..." value={form.club} onChange={(event) => updateField("club", event.target.value)} />
          </label>

          <div className="full filePicker">
            <span className="fieldLabel">Fotky</span>
            <input ref={fileInputRef} id="images" className="fileInputHidden" type="file" accept="image/*" multiple onChange={updateImages} />
            <button className="secondary fileButton" type="button" onClick={openFilePicker}>Přidat fotky</button>
            <span className="hint">
              Vybráno {images.length} fotek. Můžeš přidat další fotky dalším kliknutím. Pořadí uložených fotek nastav šipkami.
            </span>
          </div>

          {images.length > 0 ? (
            <div className="full imageGrid">
              {images.map((image, index) => (
                <div className="imageTile" key={image.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={`Fotka produktu ${index + 1}`} />
                  <div className="imageControls">
                    <span>#{index + 1}</span>
                    <button type="button" className="tiny" onClick={() => moveImage(index, -1)} disabled={index === 0}>←</button>
                    <button type="button" className="tiny" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1}>→</button>
                    <button type="button" className="tiny danger" onClick={() => removeImage(index)}>Smazat</button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <label className="full">
            Poznámky
            <textarea rows={4} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
          </label>

          {error ? <p className="error full">{error}</p> : null}
          {message ? <p className="successText full">{message}</p> : null}

          <div className="full actions">
            <button type="submit">{editingId ? "Uložit změny produktu" : "Přidat produkt do seznamu"}</button>
            {editingId ? <button className="secondary" type="button" onClick={resetEditor}>Zrušit úpravu</button> : null}
          </div>
        </form>

        <aside className="card batchCard">
          <div className="sectionTitle">
            <h2>Seznam ({drafts.length})</h2>
          </div>

          <label className="batchNoteField">
            Společná poznámka pro všechny produkty
            <textarea
              rows={4}
              value={batchNote}
              onChange={(event) => setBatchNote(event.target.value)}
            />
          </label>

          {drafts.length === 0 ? (
            <p className="emptyState">Zatím nejsou přidané žádné produkty.</p>
          ) : (
            <div className="draftList">
              {drafts.map((draft, index) => (
                <article className={`draftItem ${editingId === draft.id ? "active" : ""}`} key={draft.id}>
                  <button type="button" className="draftMain" onClick={() => editDraft(draft)}>
                    <span className="draftIndex">#{index + 1}</span>
                    <span>
                      <strong>{draft.name}</strong>
                      <small>{draft.club || "Bez klubu"} · Množství {draft.quantity || "—"} · {draft.images.length} fotek</small>
                    </span>
                  </button>
                  <button type="button" className="tiny danger" onClick={() => removeDraft(draft.id)}>Smazat</button>
                </article>
              ))}
            </div>
          )}

          <button className="submitBatch" disabled={loading || drafts.length === 0} type="button" onClick={submitBatch}>
            {loading ? "Odesílám seznam..." : `Odeslat ${drafts.length} produktů`}
          </button>
        </aside>
      </section>
    </main>
  );
}
