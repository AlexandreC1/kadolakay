import { ViewTransition, type ReactNode } from "react";

/**
 * Directional page motion for the guest journey. Only navigations tagged with a
 * transition type animate, so form refreshes and browser back stay instant.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
