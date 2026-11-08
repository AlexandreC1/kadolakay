import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle, Info, WhatsappLogo } from "phosphor-react-native";
import { useState } from "react";
import { Linking, StyleSheet, Switch, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { errorText, useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { availableOf, businessOf, canPledge, findList } from "@/data/store";
import { space } from "@/theme/tokens";
import { Banner, Card, Empty, Stepper } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { GiftArt } from "@/ui/GiftArt";
import { SheetScreen } from "@/ui/Sheet";
import { haptic } from "@/ui/Tap";
import { T } from "@/ui/Text";

/**
 * "I'll give this": a guest promises a gift and buys or brings it themselves.
 * No payment step: money never moves through Bayou while checkout is off.
 */
export default function PledgeSheet() {
  const { item, list: slug } = useLocalSearchParams<{ item: string; list: string }>();
  const c = useColors();
  const router = useRouter();
  const { state, actions } = useStore();
  const k = useCopy();
  const list = findList(state, slug);
  const gift = list?.items.find((g) => g.id === item);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  if (!state.user) {
    return (
      <SheetScreen title={k.t.offer.title}>
        <Empty icon={Info} text={k.t.offer.signInFirst}>
          <Button label={k.t.account.signIn} onPress={() => router.replace("/sign-in")} />
        </Empty>
      </SheetScreen>
    );
  }
  if (!list || !gift || (!done && !canPledge(list, gift, state.user.id))) {
    return <SheetScreen title={k.t.offer.title}><Empty icon={Info} text={k.t.errors.NOT_FOUND} /></SheetScreen>;
  }
  const shop = businessOf(state, gift.businessSlug);
  const q = availableOf(gift);
  const unit = state.currency === "USD" ? gift.priceUSD : gift.priceHTG;
  const digits = (n: string) => n.replace(/[^\d]/g, "");

  if (done) {
    return (
      <SheetScreen title={k.t.offer.title} onClose={() => router.back()}
        footer={
          <>
            {shop?.whatsapp ? <Button full icon={WhatsappLogo} label={k.t.offer.contactShop} onPress={() => void Linking.openURL(`https://wa.me/${digits(shop.whatsapp!)}`)} /> : null}
            <Button full kind={shop?.whatsapp ? "secondary" : "primary"} label={k.t.offer.backToList} onPress={() => router.back()} />
          </>
        }
      >
        <View style={styles.success}>
          <Animated.View entering={ZoomIn.springify().damping(14)}>
            <CheckCircle size={72} color={c.success} weight="fill" />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(120)} style={{ gap: space.xs, alignItems: "center" }}>
            <T variant="title" style={{ textAlign: "center" }} accessibilityRole="header">{k.t.offer.successTitle}</T>
            <T color="muted" style={{ textAlign: "center" }}>{k.t.offer.successText(list.ownerName.split(" ")[0] || list.title)}</T>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(220)} style={{ alignSelf: "stretch" }}>
            <Card style={{ gap: 2 }}>
              <T variant="bodyStrong">{`${qty} × ${gift.title}`}</T>
              <T variant="caption" color="muted">{shop ? k.t.offer.whereToBuy(shop.name) : k.t.offer.ownIdea}</T>
              {shop?.fulfillmentPolicy ? <T variant="caption" color="muted">{shop.fulfillmentPolicy}</T> : null}
            </Card>
          </Animated.View>
        </View>
      </SheetScreen>
    );
  }

  const promise = async () => {
    setBusy(true); setError(undefined);
    try {
      await actions.pledge(list.slug, gift.id, { quantity: qty, anonymous, message: message.trim() || undefined });
      haptic("success");
      setDone(true);
    } catch (e) {
      setError(errorText(k.t, e));
      // Someone else may have just taken it; the list was refreshed with the real numbers.
      void actions.loadList(list.slug).catch(() => {});
    } finally { setBusy(false); }
  };

  return (
    <SheetScreen title={k.t.offer.title} subtitle={list.title}
      footer={<Button full label={k.t.offer.confirm} onPress={promise} busy={busy} disabled={q.available < 1} />}
    >
      <Card style={styles.summary}>
        <GiftArt id={gift.id} name={gift.title} size="thumb" />
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong">{gift.title}</T>
          <T variant="caption" color="muted">
            {[shop ? k.t.offer.whereToBuy(shop.name) : k.t.offer.ownIdea, unit ? k.money(unit, state.currency) : null].filter(Boolean).join(" · ")}
          </T>
        </View>
      </Card>

      <Banner icon={Info}>{k.t.offer.how}</Banner>

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

      <View style={styles.rowBetween}>
        <T variant="label" style={{ flex: 1 }}>{k.t.offer.anonymous}</T>
        <Switch value={anonymous} onValueChange={setAnonymous} accessibilityLabel={k.t.offer.anonymous}
          trackColor={{ true: c.accentInk, false: c.line }} thumbColor={c.surfaceRaised} />
      </View>

      {error ? <Banner tone="warning" icon={Info}>{error}</Banner> : null}
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: space.sm },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  success: { alignItems: "center", gap: space.lg, paddingTop: space.lg },
});
