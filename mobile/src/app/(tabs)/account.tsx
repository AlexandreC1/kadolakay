import { useRouter } from "expo-router";
import { ChatCircleText, Package, Scales, ShieldCheck, SignOut, Storefront } from "phosphor-react-native";
import { Linking, StyleSheet, View } from "react-native";
import { useCopy } from "@/copy";
import { APP_VERSION, WEB_URL } from "@/config";
import { useColors, useStore } from "@/data/StoreProvider";
import type { Locale, ThemeChoice } from "@/data/types";
import { radius, space } from "@/theme/tokens";
import { Card, Group, Reveal, Row, Section } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { Screen } from "@/ui/Screen";
import { Segmented } from "@/ui/Segmented";
import { T } from "@/ui/Text";

const languages: { key: Locale; label: string }[] = [{ key: "ht", label: "Kreyòl" }, { key: "fr", label: "Français" }, { key: "en", label: "English" }];

export default function Account() {
  const c = useColors();
  const router = useRouter();
  const { state, dispatch, actions } = useStore();
  const k = useCopy();
  const user = state.user;
  const promised = state.pledges.length;
  const web = (path: string) => void Linking.openURL(`${WEB_URL}/${state.locale}${path}`);

  return (
    <Screen inTabs title={k.t.account.title}>
      <View style={{ gap: space.xl }}>
        {user ? (
          <Reveal>
            <Card style={styles.profile}>
              <View style={[styles.avatar, { backgroundColor: c.accentSoft }]}>
                <T variant="heading" color="accentInk">{user.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T variant="heading">{user.name}</T>
                <T variant="caption" color="muted">{user.email}</T>
              </View>
            </Card>
          </Reveal>
        ) : (
          <Card style={{ gap: space.sm }}>
            <T color="secondary">{k.t.account.signedOut}</T>
            <Button label={k.t.account.signIn} onPress={() => router.push("/sign-in")} />
          </Card>
        )}

        {user ? (
          <Group>
            <Row icon={Package} label={k.t.account.purchases} value={promised ? String(promised) : undefined} onPress={() => router.push("/purchases")} />
            {user.business ? (
              <Row icon={Storefront} label={k.t.account.myShop} onPress={() => router.push("/business")} last />
            ) : (
              <Row icon={Storefront} label={k.t.account.sell} hint={k.t.account.sellHint} onPress={() => router.push("/business")} last />
            )}
          </Group>
        ) : null}

        <Section title={k.t.account.preferences}>
          <Card style={{ gap: space.md }}>
            <Pref label={k.t.account.language}>
              <Segmented label={k.t.account.language} value={state.locale} onChange={(l) => {
                // Saved to the account too, so emails and the web use the same language.
                dispatch({ type: "setLocale", locale: l });
                if (user) void actions.saveProfile(user.name, l).catch(() => {});
              }} options={languages} />
            </Pref>
            <Pref label={k.t.account.appearance}>
              <Segmented<ThemeChoice> label={k.t.account.appearance} value={state.theme} onChange={(t) => dispatch({ type: "setTheme", theme: t })}
                options={(["light", "dark", "system"] as const).map((t) => ({ key: t, label: k.t.account.themes[t] }))} />
            </Pref>
            <Pref label={k.t.account.currency}>
              <Segmented label={k.t.account.currency} value={state.currency} onChange={(cur) => dispatch({ type: "setCurrency", currency: cur })}
                options={[{ key: "HTG", label: "HTG" }, { key: "USD", label: "USD" }]} />
            </Pref>
          </Card>
        </Section>

        <Group>
          {user ? <Row icon={ShieldCheck} label={k.t.account.security} onPress={() => web("/security")} /> : null}
          <Row icon={Scales} label={k.t.account.legal} onPress={() => web("/terms")} />
          <Row icon={ChatCircleText} label={k.t.account.help} onPress={() => web("/contact")} last={!user} />
          {user ? <Row icon={SignOut} label={k.t.account.signOut} danger onPress={() => void actions.signOut()} last /> : null}
        </Group>

        <View style={{ gap: 4, alignItems: "center" }}>
          <T variant="caption" color="muted">{k.t.account.version(APP_VERSION)}</T>
        </View>
      </View>
    </Screen>
  );
}

function Pref({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ gap: 6 }}><T variant="label" color="secondary">{label}</T>{children}</View>;
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: space.sm },
  avatar: { width: 52, height: 52, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
