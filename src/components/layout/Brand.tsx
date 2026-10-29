export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand" aria-label="KadoLakay">
    <svg className="brand-mark" width="32" height="36" viewBox="0 0 40 44" fill="none" aria-hidden="true">
      <path d="M9 7v30M31 7 11 22l20 15" stroke="var(--brand-ocean)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m17 18-6 4 7 5" stroke="var(--brand-canvas)" strokeWidth="9" />
      <path d="m17 18-6 4 7 5" stroke="var(--brand-coral)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    {!compact && <span className="brand-word">Kado<span>Lakay</span></span>}
  </span>;
}
