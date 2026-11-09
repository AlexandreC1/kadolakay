import { Redirect } from "expo-router";

/** The center tab never shows itself: its button opens /create. A direct visit lands there too. */
export default function NewTab() {
  return <Redirect href="/create" />;
}
