/**
 * Auth helper contract (plan §4.4). Implementation: src/lib/authz.ts.
 * WS2 may change the implementation (e.g. tokenVersion checks) but not these signatures.
 */
import type { Role } from "@prisma/client";

export interface AuthedUser {
  id: string;
  role: Role;
}

export type OwnedResource = "registry" | "registryItem" | "business" | "product";

export type RequireUser = () => Promise<AuthedUser>;
/** Re-reads the role from the DB (never trusts the JWT role for privileged actions). */
export type RequireRole = (role: Role | Role[]) => Promise<AuthedUser>;
/** Throws AuthError("NOT_FOUND") for missing or foreign rows (no existence oracle). ADMIN passes. */
export type RequireOwner = (kind: OwnedResource, id: string) => Promise<AuthedUser>;
