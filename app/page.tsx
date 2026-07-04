import Link from "next/link";

export default function Home() {
  return (
    <main className="shell narrow">
      <p className="eyebrow">Customer product intake</p>
      <h1>Submit product details</h1>
      <p className="muted">
        Approved customers log in by email magic link, then upload product info and images.
      </p>
      <div className="actions">
        <Link className="buttonLink" href="/login">Customer login</Link>
        <Link className="buttonLink secondary" href="/dashboard">Dashboard</Link>
      </div>
    </main>
  );
}
