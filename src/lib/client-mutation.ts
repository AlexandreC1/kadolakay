import { unstable_rethrow } from "next/navigation";

/** Resolve ordinary failures to a bounded UI state; preserve Next navigation. */
export async function performMutation(operation: () => Promise<unknown>): Promise<boolean> {
  try {
    await operation();
    return true;
  } catch (error) {
    unstable_rethrow(error);
    return false;
  }
}
