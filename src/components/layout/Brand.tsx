export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand" aria-label="KDOM"><span className="brand-word">{compact ? "K" : "KDOM"}</span></span>;
}
