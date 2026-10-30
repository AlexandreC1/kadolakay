import type { Role } from "@prisma/client";
const members: readonly Role[] = ["USER", "BUSINESS_OWNER", "ADMIN", "SUPERADMIN"];
const merchants: readonly Role[] = ["BUSINESS_OWNER", "ADMIN", "SUPERADMIN"];
export function isAdministrator(role: Role | undefined): boolean { return role === "ADMIN" || role === "SUPERADMIN"; }
export const permissions = {
  "session:revoke": members,
  "premium:personalize": members, "payment:setup": merchants,
  "premium:grant": ["SUPERADMIN"] as readonly Role[],
  profile: members, "onboarding:profile": members, "onboarding:finish": members,
  "registry:create": members, "registry:update": members, "registry:publish": members, "registry:archive": members,
  "item:add": members, "item:remove": members, "item:update": members, "item:catalog": members,
  "business:register": members, "product:add": merchants, "product:edit": merchants,
  upload: members, "admin:business": ["ADMIN", "SUPERADMIN"] as readonly Role[],
} as const;
export type Permission = keyof typeof permissions;
export function canPerform(role: Role, action: string): boolean {
  return Object.hasOwn(permissions, action) && permissions[action as Permission].includes(role);
}
