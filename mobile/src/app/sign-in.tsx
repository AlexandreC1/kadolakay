import { useRouter } from "expo-router";
import { EnvelopeSimple, GoogleLogo, Info } from "phosphor-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";
import { errorText, useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import type { User } from "@/data/types";
import { radius, space } from "@/theme/tokens";
import { Banner } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Screen } from "@/ui/Screen";
import { T } from "@/ui/Text";

/**
 * Email code or Google. The code is six digits, works for ten minutes and five
 * tries; the server answers the same whether or not the address has an account.
 */
export default function SignIn() {
  const c = useColors();
  const router = useRouter();
  const { actions } = useStore();
  const k = useCopy();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState<"send" | "verify" | "google" | null>(null);
  const [error, setError] = useState<string>();

  // First sign-in meets the setup once; afterwards, straight back to what they were doing.
  const done = (user: User | null) => {
    if (!user) return;
    if (user.onboarding === "new") router.replace("/welcome");
    else if (user.business && !router.canGoBack()) router.replace("/business");
    else if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const send = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(k.t.auth.emailInvalid); return; }
    setBusy("send"); setError(undefined);
    try { await actions.startEmail(email.trim()); setStep("code"); setCode(""); }
    catch (e) { setError(errorText(k.t, e)); }
    finally { setBusy(null); }
  };
  const verify = async (value = code) => {
    if (!/^\d{6}$/.test(value)) return;
    setBusy("verify"); setError(undefined);
    try { done(await actions.verifyEmail(email.trim(), value)); }
    catch (e) { setError(errorText(k.t, e)); }
    finally { setBusy(null); }
  };
  const google = async () => {
    setBusy("google"); setError(undefined);
    try { done(await actions.google()); }
    catch (e) { setError(errorText(k.t, e)); }
    finally { setBusy(null); }
  };

  return (
    <Screen close title={k.t.auth.title} hero={
      <View style={styles.hero}>
        <View style={[styles.mark, { backgroundColor: c.action }]}><T variant="title" style={{ color: c.onAction }}>B</T></View>
        <T variant="largeTitle" accessibilityRole="header">{step === "email" ? k.t.auth.title : k.t.auth.codeTitle}</T>
        <T color="muted">{step === "email" ? k.t.auth.intro : k.t.auth.codeSent(email.trim())}</T>
      </View>
    }>
      {step === "email" ? (
        <Animated.View key="email" entering={FadeIn} style={{ gap: space.md }}>
          <Field label={k.t.auth.email} value={email} placeholder={k.t.auth.emailPlaceholder}
            onChangeText={(v) => { setEmail(v); setError(undefined); }} onSubmitEditing={send} returnKeyType="send"
            keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
          <Button full icon={EnvelopeSimple} label={k.t.auth.sendCode} onPress={send} busy={busy === "send"} />
          {actions.googleAvailable ? (
            <>
              <View style={styles.or}>
                <View style={[styles.line, { backgroundColor: c.line }]} />
                <T variant="caption" color="muted">{k.t.auth.or}</T>
                <View style={[styles.line, { backgroundColor: c.line }]} />
              </View>
              <Button full kind="secondary" icon={GoogleLogo} label={k.t.auth.google} onPress={google} busy={busy === "google"} />
            </>
          ) : null}
        </Animated.View>
      ) : (
        <Animated.View key="code" entering={SlideInRight.springify().damping(24)} style={{ gap: space.md }}>
          <Field label={k.t.auth.code} value={code} placeholder="000000" maxLength={6} autoFocus
            keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code"
            style={styles.code}
            onChangeText={(v) => { const d = v.replace(/\D/g, "").slice(0, 6); setCode(d); setError(undefined); if (d.length === 6) void verify(d); }} />
          <Button full label={k.t.auth.verify} onPress={() => verify()} busy={busy === "verify"} disabled={code.length !== 6} />
          <View style={styles.pair}>
            <Button small kind="quiet" label={k.t.auth.resend} onPress={send} busy={busy === "send"} />
            <Button small kind="quiet" label={k.t.auth.changeEmail} onPress={() => { setStep("email"); setError(undefined); }} />
          </View>
        </Animated.View>
      )}
      {error ? <Animated.View entering={FadeIn} style={{ marginTop: space.md }}><Banner icon={Info} tone="warning">{error}</Banner></Animated.View> : null}
      <T variant="caption" color="muted" style={{ textAlign: "center", marginTop: space.lg }}>{k.t.auth.terms}</T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.xs, paddingBottom: space.lg },
  mark: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  or: { flexDirection: "row", alignItems: "center", gap: space.sm },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  code: { fontSize: 28, letterSpacing: 10, textAlign: "center", minHeight: 64 },
  pair: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap" },
});
