import type { SVGProps } from "react";

export function RegistryIcon({ type, ...props }: SVGProps<SVGSVGElement> & { type?: string }) {
  return <svg width="30" height="30" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {type === "BABY_SHOWER" ? <><path d="M7 10h18v9c0 6-4 9-9 9s-9-3-9-9v-9Zm0 0c0-6 4-8 9-8v8M7 18h18M11 28l-2 3m12-3 2 3" /></> : type === "WEDDING" ? <><ellipse cx="12" cy="20" rx="7" ry="9" transform="rotate(-20 12 20)" /><ellipse cx="21" cy="20" rx="7" ry="9" transform="rotate(20 21 20)" /><path d="m8 11 2-5h5l3 4-6 5-4-4Z" /></> : type === "BIRTHDAY" ? <><path d="M5 17h22v12H5V17Zm0 6c3 4 5-3 8 0s5-3 8 0 4-2 6 0M8 17v-5h16v5M12 12V7m8 5V7M3 29h26" /><path d="M12 5c-4-2-1-5 0-5 1 2 3 4 0 5Zm8 0c-4-2-1-5 0-5 1 2 3 4 0 5Z" /></> : <><path d="M5 13h22v16H5V13Zm-2-5h26v5H3V8Zm13 0v21" /><path d="M16 8C5 8 7-2 12 2c3 2 4 6 4 6Zm0 0c11 0 9-10 4-6-3 2-4 6-4 6Z" /></>}
  </svg>;
}
