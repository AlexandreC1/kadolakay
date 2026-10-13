import type { LegalDoc } from "./content";
import { LEGAL_VERSION } from "./content";

export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">{doc.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {doc.updated}: {LEGAL_VERSION.slice(0, 10)}
      </p>
      {doc.sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900">{s.heading}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="mt-3 leading-relaxed text-gray-700">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
