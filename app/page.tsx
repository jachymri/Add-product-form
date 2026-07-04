import Link from "next/link";

export default function Home() {
  return (
    <main className="shell narrow">
      <h1>Přidat nové dresy</h1>
      <div className="actions">
        <Link className="buttonLink" href="/login">Přihlášení zákazníka</Link>
        <Link className="buttonLink secondary" href="/dashboard">Dashboard</Link>
      </div>
    </main>
  );
}
