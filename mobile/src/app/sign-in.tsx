import { useRouter } from "expo-router";
import { EnvelopeSimple, GoogleLogo, Info, Storefront, UsersThree } from "phosphor-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { radius, space } from "@/theme/tokens";
import { Banner } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Screen } from "@/ui/Screen";
import { T } from "@/ui/Text";

/**
 * Email link and Google, the same providers the web offers. Both need the mobile
 * API (token sessions) before they work here, so they say so instead of pretending.
 */
export default function SignIn() {
  const c = useColors();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const k = useCopy();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState(false);

  const demo = (as: "host" | "merchant") => {
    dispatch({ type: "signIn", as });
    // First sign-in meets the setup once; a skipped setup is offered again from Home, never replayed.
    router.replace(as === "merchant" ? "/business" : state.onboarding === "new" ? "/welcome" : "/");
  };

  return (
    <Screen close title={k.t.auth.title} hero={
      <View style={styles.hero}>
        <View style={[styles.mark, { backgroundColor: c.action }]}><T variant="title" style={{ color: c.onAction }}>B</T></View>
        <T variant="largeTitle" accessibilityRole="header">{k.t.auth.title}</T>
        <T color="muted">{k.t.auth.intro}</T>
      </View>
    }>
      <View style={{ gap: space.md }}>
        <Field label={k.t.auth.email} value={email} placeholder={k.t.auth.emailPlaceholder} error={error}
          onChangeText={(v) => { setEmail(v); setError(undefined); }} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        <Button full icon={EnvelopeSimple} label={k.t.auth.sendLink} onPress={() => {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(k.t.auth.emailInvalid); return; }
          setNotice(true);
        }} />
        <View style={styles.or}>
          <View style={[styles.line, { backgroundColor: c.line }]} />
          <T variant="caption" color="muted">{k.t.auth.or}</T>
          <View style={[styles.line, { backgroundColor: c.line }]} />
        </View>
        <Button full kind="secondary" icon={GoogleLogo} label={k.t.auth.google} onPress={() => setNotice(true)} />
        {notice ? <Animated.View entering={FadeIn}><Banner icon={Info} tone="warning">{k.t.auth.notConnected}</Banner></Animated.View> : null}

        <View style={[styles.demo, { backgroundColor: c.surfaceMuted }]}>
          <T variant="overline" color="secondary">{k.t.common.demo.toUpperCase()}</T>
          <Button full kind="secondary" icon={UsersThree} label={k.t.auth.demoHost} onPress={() => demo("host")} />
          <Button full kind="secondary" icon={Storefront} label={k.t.auth.demoShop} onPress={() => demo("merchant")} />
        </View>
        <T variant="caption" color="muted" style={{ textAlign: "center" }}>{k.t.auth.terms}</T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.xs, paddingBottom: space.lg },
  mark: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  or: { flexDirection: "row", alignItems: "center", gap: space.sm },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  demo: { gap: space.xs, padding: space.md, borderRadius: radius.lg, marginTop: space.sm },
});
