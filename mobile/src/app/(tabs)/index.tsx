import { useRouter } from "expo-router";
import { Gift, ListChecks, Package, Plus, Storefront, Wallet } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { occasionTypes } from "@web/occasions";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { businessOf, findList, myLists, searchLists } from "@/data/store";
import { space, radius } from "@/theme/tokens";
import { Card, Reveal, Section } from "@/ui/bits";
import { Chip } from "@/ui/Chip";
import { occasionIcons } from "@/ui/icons";
import { SearchField } from "@/ui/Field";
import { ListCard, ProductTile, progressOf } from "@/ui/domain";
import { Screen } from "@/ui/Screen";
import { Tap } from "@/ui/Tap";
import { T } from "@/ui/Text";

export default function Home() {
  const c = useColors();
  const router = useRouter();
  const { state } = useStore();
  const k = useCopy();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchLists(state, query), [state, query]);
  const mine = myLists(state);
  const opened = state.visited.map((s) => findList(state, s)).filter((l) => l && l.ownerId !== state.user?.id && l.status === "PUBLISHED");
  const shelf = state.products.filter((p) => p.stockQuantity !== 0).slice(0, 8);
  const title = state.user ? k.t.home.greeting(state.user.name) : k.home.appTitle;

  const shortcuts = [
    { icon: ListChecks, label: k.home.qaPublic, hint: k.home.qaPublicHint, go: () => router.push("/lists") },
    { icon: Wallet, label: k.home.qaBudget, hint: k.home.qaBudgetHint, go: () => router.push({ pathname: "/gifts", params: { budget: "0" } }) },
    { icon: Storefront, label: k.home.qaShops, hint: k.home.qaShopsHint, go: () => router.push({ pathname: "/gifts", params: { tab: "shops" } }) },
    { icon: Package, label: k.home.qaTrack, hint: k.home.qaTrackHint, go: () => router.push(state.user ? "/purchases" : "/sign-in") },
  ];
  const tileW = (Math.min(width, 640) - space.md * 2 - space.sm) / 2;

  return (
    <Screen
      inTabs
      title={title}
      hero={
        <View style={styles.hero}>
          <View style={styles.brand}>
            <View style={[styles.mark, { backgroundColor: c.action }]}><T variant="heading" style={{ color: c.onAction }}>B</T></View>
            <T variant="heading">Bayou</T>
          </View>
          <T variant="largeTitle" accessibilityRole="header">{title}</T>
          {state.user ? <T color="muted">{k.home.appTitle}</T> : null}
        </View>
      }
    >
      <View style={{ gap: space.xs }}>
        <SearchField value={query} onChangeText={setQuery} placeholder={k.home.finderLabel} />
        {query.trim() ? null : <T variant="caption" color="muted">{k.home.finderHint}</T>}
      </View>

      {query.trim() ? (
        <Animated.View layout={LinearTransition} entering={FadeIn.duration(180)} style={styles.results} accessibilityLiveRegion="polite">
          {results.length ? (
            <>
              <T variant="overline" color="muted">{(query.includes("/r/") ? k.home.finderExact : k.home.finderPublic).toUpperCase()}</T>
              {results.map((l, i) => (
                <Animated.View key={l.slug} entering={FadeIn.delay(i * 40)} exiting={FadeOut} layout={LinearTransition}>
                  <ListCard list={l} />
                </Animated.View>
              ))}
            </>
          ) : (
            <Card><T color="muted">{k.home.finderNone}</T></Card>
          )}
        </Animated.View>
      ) : (
        <View style={styles.sections}>
          <Reveal index={0} style={styles.grid}>
            {shortcuts.map((s) => (
              <Tap key={s.label} onPress={s.go} accessibilityLabel={`${s.label}. ${s.hint}`} style={[styles.shortcut, { width: tileW, backgroundColor: c.surface, borderColor: c.line }]}>
                <s.icon size={24} color={c.accentInk} />
                <T variant="bodyStrong" numberOfLines={2}>{s.label}</T>
                <T variant="caption" color="muted" numberOfLines={2}>{s.hint}</T>
              </Tap>
            ))}
          </Reveal>

          {state.user ? (
            <Reveal index={1}>
              <Section title={k.home.yourLists} action={mine.length ? k.home.seeAll : undefined} onAction={() => router.push("/lists")}>
                {mine.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll} style={styles.bleed}>
                    {mine.map((l) => <ListCard key={l.slug} list={l} compact />)}
                  </ScrollView>
                ) : (
                  <Card onPress={() => router.push("/create")} label={k.home.noListsTitle} style={styles.emptyCard}>
                    <View style={[styles.plus, { backgroundColor: c.action }]}><Plus size={20} color={c.onAction} weight="bold" /></View>
                    <View style={{ flex: 1 }}>
                      <T variant="bodyStrong">{k.home.noListsTitle}</T>
                      <T variant="caption" color="muted">{k.home.noListsText}</T>
                    </View>
                  </Card>
                )}
              </Section>
            </Reveal>
          ) : null}

          {opened.length ? (
            <Reveal index={2}>
              <Section title={k.t.home.opened}>
                {opened.slice(0, 3).map((l) => {
                  const p = progressOf(l!);
                  return (
                    <Card key={l!.slug} onPress={() => router.push({ pathname: "/r/[slug]", params: { slug: l!.slug } })} label={l!.title} style={styles.openedRow}>
                      <Gift size={22} color={c.accentInk} />
                      <View style={{ flex: 1 }}>
                        <T variant="bodyStrong" numberOfLines={1}>{l!.title}</T>
                        <T variant="caption" color="muted">{k.home.listProgress(p.given, p.requested)}</T>
                      </View>
                    </Card>
                  );
                })}
              </Section>
            </Reveal>
          ) : null}

          <Reveal index={3}>
            <Section title={k.home.startTitle}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollChips} style={styles.bleed}>
                {occasionTypes.map((o) => (
                  <Chip key={o} icon={occasionIcons[o]} label={k.occasion(o)} onPress={() => router.push({ pathname: "/create", params: { type: o } })} />
                ))}
              </ScrollView>
            </Section>
          </Reveal>

          <Reveal index={4}>
            <Section title={k.home.shelfTitle} action={k.home.shelfAll} onAction={() => router.push({ pathname: "/gifts", params: { tab: "shops" } })}>
              <T variant="caption" color="muted">{k.home.shelfIntro}</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll} style={styles.bleed}>
                {shelf.map((p) => <ProductTile key={p.id} product={p} shop={businessOf(state, p.businessSlug)} width={148} />)}
              </ScrollView>
            </Section>
          </Reveal>

          {!state.user?.businessSlug ? (
            <Reveal index={5}>
              <Card onPress={() => router.push(state.user ? "/business" : "/sign-in")} label={k.home.merchantTitle} style={[styles.merchant, { backgroundColor: c.accentSoft, borderColor: "transparent" }]}>
                <Storefront size={28} color={c.accentInk} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="bodyStrong">{k.home.merchantTitle}</T>
                  <T variant="caption" color="secondary">{k.home.merchantText}</T>
                </View>
              </Card>
            </Reveal>
          ) : null}

          <T variant="caption" color="muted" style={{ textAlign: "center" }}>{k.t.common.demoNote}</T>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.xs, paddingTop: space.xs, paddingBottom: space.lg },
  brand: { flexDirection: "row", alignItems: "center", gap: space.xs, marginBottom: space.sm },
  mark: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  results: { gap: space.sm, marginTop: space.md },
  sections: { gap: space.xl, marginTop: space.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  shortcut: { borderWidth: 1, borderRadius: radius.lg, padding: space.md, gap: 4, minHeight: 112 },
  bleed: { marginHorizontal: -space.md },
  hScroll: { paddingHorizontal: space.md, gap: space.sm },
  hScrollChips: { paddingHorizontal: space.md, gap: space.xs },
  emptyCard: { flexDirection: "row", alignItems: "center", gap: space.sm },
  plus: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  openedRow: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.sm },
  merchant: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
