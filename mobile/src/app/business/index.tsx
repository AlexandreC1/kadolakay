import { Redirect, useRouter } from "expo-router";
import { CaretRight, ClockCountdown, Package, Receipt, Storefront, TrendUp, WarningCircle } from "phosphor-react-native";
import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { businessOf, findList, productsOf } from "@/data/store";
import { radius, space } from "@/theme/tokens";
import { Banner, Card, Empty, Group, Pill, Reveal, Row, Section } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { Screen } from "@/ui/Screen";
import { Segmented } from "@/ui/Segmented";
import { T } from "@/ui/Text";

export default function ShopDashboard() {
  const c = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { state } = useStore();
  const k = useCopy();
  const [filter, setFilter] = useState<"open" | "done">("open");
  if (!state.user) return <Redirect href="/sign-in" />;
  const shop = businessOf(state, state.user.businessSlug);

  if (!shop) {
    return (
      <Screen back title={k.t.account.sell}>
        <Empty icon={Storefront} title={k.home.merchantTitle} text={k.home.merchantText}>
          <Banner icon={ClockCountdown}>{k.t.merchant.pending}</Banner>
        </Empty>
      </Screen>
    );
  }

  const orders = state.orders.filter((o) => o.businessSlug === shop.slug);
  const products = productsOf(state, shop.slug);
  const month = new Date().toISOString().slice(0, 7);
  const sales = orders.filter((o) => o.createdAt.startsWith(month) && o.status !== "CANCELLED")
    .reduce((s, o) => s + o.lines.reduce((t, l) => t + l.quantity * l.priceHTG, 0), 0);
  const stats = [
    { icon: Receipt, label: k.t.merchant.newOrders, value: String(orders.filter((o) => o.status === "PAID").length) },
    { icon: Package, label: k.t.merchant.toPrepare, value: String(orders.filter((o) => o.status === "CONFIRMED").length) },
    { icon: WarningCircle, label: k.t.merchant.lowStock, value: String(products.filter((p) => p.stockQuantity !== null && p.stockQuantity <= 2).length) },
    { icon: TrendUp, label: k.t.merchant.month, value: k.money(sales, "HTG") },
  ];
  const shown = orders.filter((o) => (filter === "open" ? o.status !== "DELIVERED" && o.status !== "CANCELLED" : o.status === "DELIVERED" || o.status === "CANCELLED"));
  const tileW = (Math.min(width, 640) - space.md * 2 - space.sm) / 2;

  return (
    <Screen back title={shop.name} eyebrow={k.t.merchant.title.toUpperCase()}>
      <View style={{ gap: space.xl }}>
        <View style={styles.stats}>
          {stats.map((s, i) => (
            <Reveal key={s.label} index={i}>
              <View style={[styles.stat, { width: tileW, backgroundColor: i === 0 && s.value !== "0" ? c.accentSoft : c.surface, borderColor: c.line }]}
                accessible accessibilityLabel={`${s.label}: ${s.value}`}>
                <s.icon size={22} color={c.accentInk} />
                <T variant="title" numberOfLines={1} adjustsFontSizeToFit>{s.value}</T>
                <T variant="caption" color="muted">{s.label}</T>
              </View>
            </Reveal>
          ))}
        </View>

        <Section title={k.t.merchant.orders}>
          <Segmented label={k.t.merchant.orders} value={filter} onChange={setFilter} options={[{ key: "open", label: k.t.merchant.filters.open }, { key: "done", label: k.t.merchant.filters.done }]} />
          {shown.length === 0 ? <Empty icon={Receipt} text={k.t.merchant.none} /> : shown.map((o) => (
            <Animated.View key={o.id} layout={LinearTransition} entering={FadeIn}>
              <Card onPress={() => router.push({ pathname: "/business/order/[id]", params: { id: o.id } })} label={`${o.orderNumber}, ${k.t.purchases.status[o.status]}`} style={styles.order}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="bodyStrong" numberOfLines={1}>{o.lines.map((l) => `${l.quantity} × ${l.title}`).join(", ")}</T>
                  <T variant="caption" color="muted" numberOfLines={1}>{`${o.orderNumber} · ${k.t.merchant.orderFor(findList(state, o.registrySlug)?.title ?? "")}`}</T>
                  <Pill label={k.t.purchases.status[o.status]} tone={o.status === "PAID" ? "accent" : o.status === "DELIVERED" ? "success" : "neutral"} />
                </View>
                <CaretRight size={18} color={c.muted} />
              </Card>
            </Animated.View>
          ))}
        </Section>

        <Group>
          <Row icon={Package} label={k.t.merchant.products} value={String(products.length)} onPress={() => router.push("/business/products")} />
          <Row icon={Storefront} label={k.t.merchant.profile} onPress={() => router.push({ pathname: "/shop/[slug]", params: { slug: shop.slug } })} last />
        </Group>
        <Button kind="quiet" label={k.t.account.title} onPress={() => router.push("/account")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  stat: { borderWidth: 1, borderRadius: radius.lg, padding: space.md, gap: 4, minHeight: 116 },
  order: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
