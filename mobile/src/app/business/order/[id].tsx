import { useLocalSearchParams } from "expo-router";
import { CheckCircle, WarningCircle } from "phosphor-react-native";
import { StyleSheet, View } from "react-native";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { findList, nextStatus } from "@/data/store";
import { space } from "@/theme/tokens";
import { Banner, Card, Empty, Section } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { OrderTimeline } from "@/ui/OrderTimeline";
import { Screen } from "@/ui/Screen";
import { T } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/**
 * One order for the shop. Each tap moves it exactly one step (paid, confirmed,
 * on the way, delivered); the guest and the family see the same timeline.
 */
export default function MerchantOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const toast = useToast();
  const { state, dispatch } = useStore();
  const k = useCopy();
  const order = state.orders.find((o) => o.id === id && o.businessSlug === state.user?.businessSlug);
  if (!order) return <Screen back title={k.t.merchant.orders}><Empty icon={WarningCircle} text={k.t.list.notFound} /></Screen>;
  const list = findList(state, order.registrySlug);
  const next = nextStatus(order.status);
  const total = order.lines.reduce((s, l) => s + l.quantity * (order.currency === "USD" ? l.priceUSD : l.priceHTG), 0);

  return (
    <Screen
      back
      title={order.orderNumber}
      subtitle={list ? k.t.merchant.orderFor(list.title) : undefined}
      footer={next ? (
        <Button full label={k.t.merchant.advance[next]} onPress={() => { dispatch({ type: "orderStatus", orderId: order.id, status: next }); toast(k.t.purchases.status[next]); }} />
      ) : undefined}
    >
      <View style={{ gap: space.xl }}>
        <Card>
          {order.lines.map((l) => (
            <View key={l.giftId} style={styles.line}>
              <T variant="bodyStrong" style={{ flex: 1 }}>{`${l.quantity} × ${l.title}`}</T>
              <T variant="label">{k.money(l.quantity * (order.currency === "USD" ? l.priceUSD : l.priceHTG), order.currency)}</T>
            </View>
          ))}
          <View style={[styles.line, styles.total, { borderColor: c.line }]}>
            <T variant="caption" color="muted" style={{ flex: 1 }}>{`${k.t.purchases.paidWith} ${k.t.offer.methods[order.method]}`}</T>
            <T variant="heading">{k.money(total, order.currency)}</T>
          </View>
        </Card>

        <Section title={k.t.purchases.timeline}>
          <OrderTimeline status={order.status} />
          {!next ? <Banner icon={CheckCircle} tone="success">{k.t.merchant.finished}</Banner> : null}
        </Section>

        <Section title={k.t.merchant.buyer}>
          <T>{order.isAnonymous ? k.t.merchant.anonymous : order.buyerName}</T>
          {list ? <T variant="caption" color="muted">{`${list.ownerName}${list.place ? ` · ${list.place}` : ""}`}</T> : null}
        </Section>

        {order.giftMessage ? (
          <Section title={k.t.merchant.giftMessage}>
            <View style={[styles.note, { borderColor: c.accent }]}>
              <T style={{ fontFamily: "Fraunces_400Regular_Italic", fontSize: 17, lineHeight: 25 }}>{order.giftMessage}</T>
            </View>
          </Section>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row", alignItems: "center", gap: space.sm },
  total: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm },
  note: { borderLeftWidth: 3, paddingLeft: space.md },
});
