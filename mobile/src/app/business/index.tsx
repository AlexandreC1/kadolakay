import { Redirect, useRouter } from "expo-router";
import { ClockCountdown, Gift, Package, Storefront, WarningCircle } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Linking, RefreshControl, StyleSheet, useWindowDimensions, View } from "react-native";
import { useCopy } from "@/copy";
import { WEB_URL } from "@/config";
import { useColors, useStore } from "@/data/StoreProvider";
import { radius, space } from "@/theme/tokens";
import { Banner, Card, Empty, Group, Reveal, Row, Section } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { Screen } from "@/ui/Screen";
import { T } from "@/ui/Text";

/**
 * The shop owner's view while payments are off: their products and stock, and
 * the guests who promised one of their products (and will buy it from them).
 */
export default function ShopDashboard() {
  const c = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { state, actions } = useStore();
  const k = useCopy();
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => { void actions.refreshShop().catch(() => {}); }, [actions]);
  if (!state.user) return <Redirect href="/sign-in" />;
  const shop = state.shop;

  if (!state.user.business || !shop) {
    return (
      <Screen back title={k.t.account.sell}>
        <Empty icon={Storefront} title={k.home.merchantTitle} text={k.home.merchantText}>
          {state.user.business ? <Banner icon={ClockCountdown}>{k.t.merchant.pending}</Banner> : null}
          <Button kind="secondary" label={k.home.merchantTitle} onPress={() => void Linking.openURL(`${WEB_URL}/${state.locale}/business/signup`)} />
        </Empty>
      </Screen>
    );
  }

  const low = shop.products.filter((p) => p.stockQuantity !== null && p.stockQuantity <= 2).length;
  const promised = shop.pledges.reduce((s, p) => s + p.quantity, 0);
  const stats = [
    { icon: Gift, label: k.t.merchant.promised, value: String(promised) },
    { icon: Package, label: k.t.merchant.products, value: String(shop.products.length) },
    { icon: WarningCircle, label: k.t.merchant.lowStock, value: String(low) },
  ];
  const tileW = (Math.min(width, 640) - space.md * 2 - space.sm * 2) / 3;
  const refresh = async () => { setRefreshing(true); await actions.refreshShop().catch(() => {}); setRefreshing(false); };

  return (
    <Screen back title={shop.name} eyebrow={k.t.merchant.title.toUpperCase()} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <View style={{ gap: space.xl }}>
        {shop.status !== "APPROVED" ? <Banner icon={ClockCountdown}>{k.t.merchant.pending}</Banner> : null}
        <View style={styles.stats}>
          {stats.map((s, i) => (
            <Reveal key={s.label} index={i}>
              <View style={[styles.stat, { width: tileW, backgroundColor: i === 0 && promised ? c.accentSoft : c.surface, borderColor: c.line }]}
                accessible accessibilityLabel={`${s.label}: ${s.value}`}>
                <s.icon size={22} color={c.accentInk} />
                <T variant="title">{s.value}</T>
                <T variant="caption" color="muted" numberOfLines={2}>{s.label}</T>
              </View>
            </Reveal>
          ))}
        </View>

        <Section title={k.t.merchant.pledges}>
          <T variant="caption" color="muted">{k.t.merchant.pledgesHint}</T>
          {shop.pledges.length === 0 ? <Empty icon={Gift} text={k.t.merchant.none} /> : shop.pledges.map((p) => (
            <Card key={p.id} style={{ gap: 2 }}>
              <T variant="bodyStrong">{`${p.quantity} × ${p.title}`}</T>
              <T variant="caption" color="muted">{[k.t.merchant.forList(p.list), p.place, k.date(p.createdAt.slice(0, 10))].filter(Boolean).join(" · ")}</T>
            </Card>
          ))}
        </Section>

        <Group>
          <Row icon={Package} label={k.t.merchant.products} value={String(shop.products.length)} onPress={() => router.push("/business/products")} />
          <Row icon={Storefront} label={k.t.merchant.profile} onPress={() => router.push({ pathname: "/shop/[slug]", params: { slug: shop.slug } })} last />
        </Group>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  stat: { borderWidth: 1, borderRadius: radius.lg, padding: space.md, gap: 4, minHeight: 116 },
});
