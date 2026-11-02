import {
  createRegistryGrant,
  registryGrantValid,
  registryAccessCookie,
} from "./registry-access";
export const orderAccessCookie = (id: string) =>
  registryAccessCookie("order:" + id);
export const createOrderGrant = (id: string, capability: string) =>
  createRegistryGrant("order:" + id, capability);
export const orderGrantValid = (
  grant: unknown,
  id: string,
  capability: string | null,
) =>
  Boolean(capability && registryGrantValid(grant, "order:" + id, capability));
