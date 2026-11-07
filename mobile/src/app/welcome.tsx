import { useRouter } from "expo-router";
import { CaretRight, Gift, ListPlus, Storefront } from "phosphor-react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { radius, space } from "@/theme/tokens";
import { Reveal } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { Tap } from "@/ui/Tap";
import { T } from "@/ui/Text";

/** One question after sign-in, then straight into the task. Nothing is required. */
export default function Welcome() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const k = useCopy();
  const choices = [
    { icon: ListPlus, title: k.t.onboarding.make, hint: k.t.onboarding.makeHint, go: () => router.replace("/create") },
    { icon: Gift, title: k.t.onboarding.give, hint: k.t.onboarding.giveHint, go: () => router.replace("/") },
    { icon: Storefront, title: k.t.onboarding.sell, hint: k.t.onboarding.sellHint, go: () => router.replace("/business") },
  ];
  return (
    <View style={[styles.root, { backgroundColor: c.canvas, paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.md }]}>
      <Reveal style={{ gap: space.xs }}>
        <T variant="overline" color="accentInk">{state.user ? k.t.home.greeting(state.user.name).toUpperCase() : "BAYOU"}</T>
        <T variant="largeTitle" accessibilityRole="header">{k.t.onboarding.title}</T>
      </Reveal>
      <View style={{ gap: space.sm, flex: 1 }}>
        {choices.map((ch, i) => (
          <Reveal key={ch.title} index={i + 1}>
            <Tap onPress={ch.go} accessibilityLabel={`${ch.title}. ${ch.hint}`} style={[styles.choice, { backgroundColor: c.surface, borderColor: c.line }]}>
              <View style={[styles.icon, { backgroundColor: c.accentSoft }]}><ch.icon size={26} color={c.accentInk} /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="heading">{ch.title}</T>
                <T variant="caption" color="muted">{ch.hint}</T>
              </View>
              <CaretRight size={18} color={c.muted} />
            </Tap>
          </Reveal>
        ))}
      </View>
      <Button kind="quiet" label={k.t.onboarding.skip} onPress={() => router.replace("/")} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.md, gap: space.xl },
  choice: { flexDirection: "row", alignItems: "center", gap: space.md, borderWidth: 1, borderRadius: radius.lg, padding: space.md, minHeight: 84 },
  icon: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
