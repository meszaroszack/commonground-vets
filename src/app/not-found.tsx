import Link from "next/link";

export default function NotFound() {
  return (
    <section className="py-20">
      <p className="font-mono text-[11px] uppercase tracking-widest text-terracotta">404</p>
      <h1 className="mt-2 font-serif text-5xl">That page is not on the map.</h1>
      <Link href="/" className="mt-6 inline-block text-sm underline">Back to Common Ground</Link>
    </section>
  );
}
