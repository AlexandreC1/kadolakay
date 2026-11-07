import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle, CreditCard, DeviceMobile, Info } from "phosphor-react-native";
import { useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { availableOf, businessOf, canPayInApp, findList, orderNumberFor } from "@/data/store";
import type { PaymentMethod } from "@/data/types";
import { radius, space } from "@/theme/tokens";
import { Banner, Card, Empty, Stepper } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { GiftArt } from "@/ui/GiftArt";
import { Segmented } from "@/ui/Segmented";
import { SheetScreen } from "@/ui/Sheet";
import { haptic, Tap } from "@/ui/Tap";
import { T } from "@/ui/Text";

const methods: PaymentMethod[] = ["MONCASH", "NATCASH", "CARD"];

export default function OfferSheet() {
  const { item, list: slug } = useLocalSearchParams<{ item: string; list: string }>();
  const c = useColors();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const k = useCopy();
  const list = findList(state, slug);
  const gift = list?.items.find((g) => g.id === item);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState("");
  const [name, setName] = useState(state.user?.name ?? "");
  const [anonymous, setAnonymous] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>(state.currency === "USD" ? "CARD" : "MONCASH");
  const [currency, setCurrency] = useState<"HTG" | "USD">(state.currency);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState<{ orderId: string; number: string } | null>(null);

  if (!list || !gift || !canPayInApp(gift)) {
    return <SheetScreen title={k.t.offer.title}><Empty icon={Info} text={k.t.list.notFound} /></SheetScreen>;
  }
  const shop = businessOf(state, gift.businessSlug);
  const q = availableOf(gift);
  const unit = currency === "USD" ? gift.priceUSD ?? 0 : gift.priceHTG ?? 0;
  const total = k.money(unit * qty, currency);

  if (done) {
    return (
      <SheetScreen title={k.t.offer.title} onClose={() => router.back()}
        footer={
          <>
            {state.user ? <Button full label={k.t.offer.track} onPress={() => router.replace({ pathname: "/purchases/[id]", params: { id: done.orderId } })} /> : null}
            <Button full kind={state.user ? "secondary" : "primary"} label={k.t.offer.backToList} onPress={() => router.back()} />
          </>
        }
      >
        <View style={styles.success}>
          <Animated.View entering={ZoomIn.springify().damping(14)}>
            <CheckCircle size={72} color={c.success} weight="fill" />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(120)} style={{ gap: space.xs, alignItems: "center" }}>
            <T variant="title" style={{ textAlign: "center" }} accessibilityRole="header">{k.t.offer.successTitle}</T>
            <T color="muted" style={{ textAlign: "center" }}>{k.t.offer.successText(list.ownerName.split(" ")[0], shop?.name ?? "")}</T>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(220)} style={{ alignSelf: "stretch" }}>
            <Card style={styles.receipt}>
              <T variant="caption" color="muted">{k.t.offer.orderNumber}</T>
              <T variant="heading" selectable>{done.number}</T>
              <T variant="caption" color="muted">{`${qty} × ${gift.title} · ${total}`}</T>
            </Card>
          </Animated.View>
          <T variant="caption" color="muted">{k.t.offer.demoPay}</T>
        </View>
      </SheetScreen>
    );
  }

  const pay = () => {
    if (!name.trim()) { setError(k.t.offer.nameNeeded); return; }
    const orderId = `o-${state.seq}`;
    dispatch({ type: "offer", offer: { slug: list.slug, giftId: gift.id, quantity: qty, buyerName: name, anonymous, message, currency, method } });
    haptic("success");
    setDone({ orderId, number: orderNumberFor(state.seq) });
  };

  return (
    <SheetScreen
      title={k.t.offer.title}
      subtitle={list.title}
      footer={
        <>
          <Button full label={k.t.offer.pay(total)} onPress={pay} disabled={q.available < 1} />
          <T variant="caption" color="muted" style={{ textAlign: "center" }}>{k.t.offer.demoPay}</T>
        </>
      }
    >
      <Card style={styles.summary}>
        <GiftArt id={gift.id} name={gift.title} size="thumb" />
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong">{gift.title}</T>
          <T variant="caption" color="muted">{[shop?.name, k.money(unit, currency)].filter(Boolean).join(" · ")}</T>
        </View>
      </Card>

      {q.available > 1 ? (
        <View style={styles.rowBetween}>
          <View>
            <T variant="heading">{k.t.offer.howMany}</T>
            <T variant="caption" color="muted">{k.t.offer.left(q.available)}</T>
          </View>
          <Stepper label={k.t.offer.howMany} value={qty} min={1} max={q.available} onChange={setQty} />
        </View>
      ) : null}

      <Field label={k.t.offer.message} placeholder={k.t.offer.messageHint} value={message} onChangeText={setMessage} multiline maxLength={500} />

      <View style={{ gap: space.sm }}>
        <Field label={k.t.offer.yourName} value={name} onChangeText={(v) => { setName(v); setError(undefined); }} error={error} autoComplete="name" maxLength={100} />
        <View style={styles.rowBetween}>
          <T variant="label" style={{ flex: 1 }}>{k.t.offer.anonymous}</T>
          <Switch value={anonymous} onValueChange={setAnonymous} accessibilityLabel={k.t.offer.anonymous}
            trackColor={{ true: c.accentInk, false: c.line }} thumbColor={c.surfaceRaised} />
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <T variant="heading">{k.t.offer.payWith}</T>
        {methods.map((m) => {
          const on = method === m;
          const Icon = m === "CARD" ? CreditCard : DeviceMobile;
          return (
            <Tap key={m} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${k.t.offer.methods[m]}. ${k.t.offer.methodHint[m]}`}
              onPress={() => { setMethod(m); if (m === "CARD") setCurrency("USD"); else setCurrency("HTG"); }}
              style={[styles.method, { borderColor: on ? c.accentInk : c.line, backgroundColor: on ? c.accentSoft : c.surface }]}>
              <Icon size={24} color={on ? c.accentInk : c.secondary} />
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{k.t.offer.methods[m]}</T>
                <T variant="caption" color="muted">{k.t.offer.methodHint[m]}</T>
              </View>
              <View style={[styles.radio, { borderColor: on ? c.accentInk : c.lineStrong }]}>
                {on ? <Animated.View entering={FadeIn.duration(120)} style={[styles.radioDot, { backgroundColor: c.accentInk }]} /> : null}
              </View>
            </Tap>
          );
        })}
      </View>

      <View style={styles.rowBetween}>
        <T variant="label" color="secondary">{k.t.offer.currency}</T>
        <View style={{ width: 160 }}>
          <Segmented label={k.t.offer.currency} value={currency} onChange={setCurrency} options={[{ key: "HTG", label: "HTG" }, { key: "USD", label: "USD" }]} />
        </View>
      </View>

      <Banner icon={Info}>{shop?.fulfillmentPolicy ?? ""}</Banner>

      <View style={[styles.rowBetween, styles.total, { borderColor: c.line }]}>
        <T variant="heading">{k.t.offer.total}</T>
        <T variant="title">{total}</T>
      </View>
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: space.sm },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  method: { flexDirection: "row", alignItems: "center", gap: space.sm, borderWidth: 1.5, borderRadius: radius.lg, padding: space.md, minHeight: 64 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  total: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md },
  success: { alignItems: "center", gap: space.lg, paddingTop: space.lg },
  receipt: { alignItems: "center", gap: 2 },
});
