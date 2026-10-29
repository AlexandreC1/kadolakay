export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand" aria-label="Bayou">
    <svg className="brand-mark" width="32" height="36" viewBox="0 0 40 44" fill="none" aria-hidden="true">
      <path d="M10 7v30h12c7 0 11-3 11-7.5S29 22 22 22H10m0-15h10c7 0 11 3 11 7.5S27 22 20 22" stroke="var(--brand-ocean)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 22h10" stroke="var(--brand-accent)" strokeWidth="5" strokeLinecap="round" />
    </svg>
    {!compact && <span className="brand-word">Bayou</span>}
  </span>;
}
