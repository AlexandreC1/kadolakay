import { useRouter } from "expo-router";
import { CaretRight } from "phosphor-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, SlideInLeft, SlideInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { occasionTypes } from "@web/occasions";
import { copyFor, useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import type { Locale } from "@/data/types";
import { radius, space } from "@/theme/tokens";
import { Steps } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { occasionIcons } from "@/ui/icons";
import { Segmented } from "@/ui/Segmented";
import { haptic, Tap } from "@/ui/Tap";
import { T } from "@/ui/Text";

const languages: { key: Locale; label: string }[] = [{ key: "ht", label: "Kreyòl" }, { key: "fr", label: "Français" }, { key: "en", label: "English" }];

/**
 * First-use setup, the flow approved for the web (docs/ONBOARDING-BRIEF.md):
 * 1. a display name and a language, both optional and prefilled;
 * 2. an occasion, which opens the create flow on it, or Explore, or Skip.
 * No task cards, no photo, username or country. Skipping can be resumed from Home.
 */
export default function Welcome() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, actions } = useStore();
  const k = useCopy();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(state.user?.name ?? "");
  const [language, setLanguage] = useState<Locale>(state.locale);
  // Step 1 previews the language being chosen, so people can read it before confirming.
  const w = copyFor(step === 1 ? language : state.locale).welcome;

  // Saving never blocks the next step: the choices are applied locally at once and sent along.
  const saveProfile = () => {
    void actions.saveProfile(name, language).catch(() => {});
    haptic();
    setStep(2);
  };
  const finish = (to: Parameters<typeof router.replace>[0], choice: Parameters<typeof actions.finishOnboarding>[0]) => {
    void actions.finishOnboarding(choice).catch(() => {});
    router.replace(to);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.root, { backgroundColor: c.canvas }]}>
      <View style={[styles.head, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.headRow}>
          {step === 2 ? <Button small kind="quiet" label={w.back} onPress={() => setStep(1)} /> : <View />}
          <T variant="label" color="muted">{step === 1 ? w.step1 : w.step2}</T>
          <View style={{ minWidth: 60 }} />
        </View>
        <Steps count={2} current={step - 1} label={step === 1 ? w.step1 : w.step2} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        {step === 1 ? (
          <Animated.View key="1" entering={SlideInLeft.springify().damping(24)} style={styles.step}>
            <View style={{ gap: space.xs }}>
              <T variant="display" accessibilityRole="header">{w.welcome}</T>
              <T color="muted">{w.intro}</T>
            </View>
            <Field label={w.name} optionalLabel={w.optional} hint={w.nameHint} value={name} onChangeText={setName}
              maxLength={100} autoComplete="name" textContentType="name" returnKeyType="next" onSubmitEditing={saveProfile} />
            <View style={{ gap: 6 }}>
              <T variant="label" color="secondary">{w.language}</T>
              <Segmented label={w.language} value={language} onChange={setLanguage} options={languages} />
            </View>
          </Animated.View>
        ) : (
          <Animated.View key="2" entering={SlideInRight.springify().damping(24)} style={styles.step}>
            <View style={{ gap: space.xs }}>
              <T variant="display" accessibilityRole="header">{w.title}</T>
              <T color="muted">{w.subtitle}</T>
            </View>
            <View style={{ gap: space.sm }}>
              {occasionTypes.map((o, i) => {
                const Icon = occasionIcons[o];
                return (
                  <Animated.View key={o} entering={FadeIn.delay(60 + i * 40)}>
                    <Tap accessibilityLabel={k.occasion(o)} onPress={() => finish({ pathname: "/create", params: { type: o } }, o)}
                      style={[styles.occasion, { backgroundColor: c.surface, borderColor: c.line }]}>
                      <View style={[styles.icon, { backgroundColor: c.accentSoft }]}><Icon size={24} color={c.accentInk} /></View>
                      <T variant="bodyStrong" style={{ flex: 1 }}>{k.occasion(o)}</T>
                      <CaretRight size={18} color={c.muted} />
                    </Tap>
                  </Animated.View>
                );
              })}
            </View>
            <T variant="caption" color="muted">{w.privacy}</T>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.sm, borderColor: c.line }]}>
        {step === 1 ? (
          <>
            <Button full label={w.continue} onPress={saveProfile} />
            <Button full kind="quiet" label={w.later} onPress={() => setStep(2)} />
          </>
        ) : (
          <View style={styles.pair}>
            <Button kind="secondary" label={w.explore} style={{ flex: 1 }} onPress={() => finish({ pathname: "/gifts", params: { tab: "shops" } }, "EXPLORE")} />
            <Button kind="quiet" label={w.skip} style={{ flex: 1 }} onPress={() => finish("/lists", "SKIP")} />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingHorizontal: space.md, gap: space.sm, paddingBottom: space.sm },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  body: { padding: space.md, paddingBottom: space.xxl },
  step: { gap: space.lg, maxWidth: 520, width: "100%", alignSelf: "center" },
  occasion: { flexDirection: "row", alignItems: "center", gap: space.sm, borderWidth: 1, borderRadius: radius.lg, padding: space.sm, paddingRight: space.md, minHeight: 64 },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  footer: { paddingHorizontal: space.md, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: space.xs },
  pair: { flexDirection: "row", gap: space.xs },
});
