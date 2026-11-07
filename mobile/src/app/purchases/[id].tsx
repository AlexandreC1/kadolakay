import { useLocalSearchParams, useRouter } from "expo-router";
import { WarningCircle } from "phosphor-react-native";
import { StyleSheet, View } from "react-native";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { businessOf, findList } from "@/data/store";
import { space } from "@/theme/tokens";
import { Card, Empty, Section } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { GiftArt } from "@/ui/GiftArt";
import { OrderTimeline } from "@/ui/OrderTimeline";
import { Screen } from "@/ui/Screen";
import { T } from "@/ui/Text";

export default function Purchase() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const router = useRouter();
  const { state } = useStore();
  const k = useCopy();
  const order = state.orders.find((o) => o.id === id && o.buyerId === state.user?.id);
  if (!order) return <Screen back title={k.t.purchases.title}><Empty icon={WarningCircle} text={k.t.list.notFound} /></Screen>;
  const line = order.lines[0];
  const list = findList(state, order.registrySlug);
  const shop = businessOf(state, order.businessSlug);
  const total = order.lines.reduce((s, l) => s + l.quantity * (order.currency === "USD" ? l.priceUSD : l.priceHTG), 0);

  return (
    <Screen back title={line.title} eyebrow={order.orderNumber} subtitle={list ? k.t.purchases.forList(list.title) : undefined}>
      <View style={{ gap: space.xl }}>
        <Card style={styles.summary}>
          <GiftArt id={line.giftId} name={line.title} size="thumb" />
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">{`${line.quantity} × ${line.title}`}</T>
            <T variant="caption" color="muted">{`${k.money(total, order.currency)} · ${k.t.purchases.paidWith} ${k.t.offer.methods[order.method]}`}</T>
          </View>
        </Card>
        <Section title={k.t.purchases.timeline}><OrderTimeline status={order.status} /></Section>
        {order.giftMessage ? (
          <Section title={k.t.purchases.message}>
            <View style={[styles.note, { borderColor: c.accent }]}>
              <T style={{ fontFamily: "Fraunces_400Regular_Italic", fontSize: 17, lineHeight: 25 }}>{order.giftMessage}</T>
            </View>
          </Section>
        ) : null}
        {shop ? (
          <Section title={k.t.purchases.shop}>
            <Card onPress={() => router.push({ pathname: "/shop/[slug]", params: { slug: shop.slug } })} label={shop.name}>
              <T variant="bodyStrong">{shop.name}</T>
              <T variant="caption" color="muted">{shop.fulfillmentPolicy}</T>
            </Card>
          </Section>
        ) : null}
        {list ? <Button kind="secondary" label={k.home.open} onPress={() => router.push({ pathname: "/r/[slug]", params: { slug: list.slug } })} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: space.sm },
  note: { borderLeftWidth: 3, paddingLeft: space.md },
});
