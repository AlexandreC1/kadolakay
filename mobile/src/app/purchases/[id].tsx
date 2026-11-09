import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowCounterClockwise, Info, WarningCircle, WhatsappLogo } from "phosphor-react-native";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { errorText, useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { businessOf } from "@/data/store";
import { space } from "@/theme/tokens";
import { Banner, Card, Empty, Section } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { GiftArt } from "@/ui/GiftArt";
import { Screen } from "@/ui/Screen";
import { T } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/** One promised gift: where to buy it, what was said, and a way to take the promise back. */
export default function PromisedGift() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { state, actions } = useStore();
  const k = useCopy();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const p = state.pledges.find((x) => x.id === id);
  if (!p) return <Screen back title={k.t.purchases.title}><Empty icon={WarningCircle} text={k.t.errors.NOT_FOUND} /></Screen>;
  const shop = businessOf(state, p.gift.businessSlug);
  const price = state.currency === "USD" ? p.gift.priceUSD : p.gift.priceHTG;

  const withdraw = async () => {
    setBusy(true); setError(undefined);
    try { await actions.cancelPledge(p.id, p.list.slug); toast(k.t.purchases.withdrawn); router.back(); }
    catch (e) { setError(errorText(k.t, e)); }
    finally { setBusy(false); }
  };

  return (
    <Screen back title={p.gift.title} subtitle={k.t.purchases.forList(p.list.title)}
      footer={<Button full kind="secondary" icon={ArrowCounterClockwise} label={k.t.purchases.withdraw} onPress={withdraw} busy={busy} />}>
      <View style={{ gap: space.xl }}>
        <Card style={styles.summary}>
          <GiftArt id={p.gift.id} name={p.gift.title} size="thumb" />
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">{`${p.quantity} × ${p.gift.title}`}</T>
            <T variant="caption" color="muted">{[price ? k.money(price * p.quantity, state.currency) : null, k.t.purchases.promisedOn(k.date(p.createdAt.slice(0, 10)))].filter(Boolean).join(" · ")}</T>
          </View>
        </Card>
        {shop ? (
          <Section title={k.t.purchases.shop}>
            <Card onPress={() => router.push({ pathname: "/shop/[slug]", params: { slug: shop.slug } })} label={shop.name}>
              <T variant="bodyStrong">{shop.name}</T>
              {shop.fulfillmentPolicy ? <T variant="caption" color="muted">{shop.fulfillmentPolicy}</T> : null}
            </Card>
            {shop.whatsapp ? <Button kind="secondary" icon={WhatsappLogo} label={k.t.offer.contactShop} onPress={() => void Linking.openURL(`https://wa.me/${shop.whatsapp!.replace(/[^\d]/g, "")}`)} /> : null}
          </Section>
        ) : <Banner icon={Info}>{k.t.offer.ownIdea}</Banner>}
        {p.message ? (
          <Section title={k.t.purchases.message}>
            <View style={[styles.note, { borderColor: c.accent }]}>
              <T style={{ fontFamily: "Fraunces_400Regular_Italic", fontSize: 17, lineHeight: 25 }}>{p.message}</T>
            </View>
          </Section>
        ) : null}
        <Button kind="secondary" label={k.home.open} onPress={() => router.push({ pathname: "/r/[slug]", params: { slug: p.list.slug } })} />
        {error ? <Banner tone="warning" icon={Info}>{error}</Banner> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: space.sm },
  note: { borderLeftWidth: 3, paddingLeft: space.md },
});
