import { useLocalSearchParams } from "expo-router";
import { MapPin, Phone, ShieldCheck, Truck, WarningCircle, WhatsappLogo } from "phosphor-react-native";
import { Linking, StyleSheet, useWindowDimensions, View } from "react-native";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { businessOf, productsOf } from "@/data/store";
import { radius, space } from "@/theme/tokens";
import { Card, Empty, Reveal, Section } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { ProductTile } from "@/ui/domain";
import { Screen } from "@/ui/Screen";
import { T } from "@/ui/Text";

export default function ShopPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const c = useColors();
  const { state } = useStore();
  const k = useCopy();
  const { width } = useWindowDimensions();
  const shop = businessOf(state, slug);
  if (!shop || shop.status !== "APPROVED") return <Screen back title={k.t.gifts.tabShops}><Empty icon={WarningCircle} text={k.t.list.notFound} /></Screen>;
  const items = productsOf(state, shop.slug);
  const tileW = (Math.min(width, 640) - space.md * 2 - space.sm) / 2;
  const digits = (n: string) => n.replace(/[^\d+]/g, "");

  return (
    <Screen
      back
      title={shop.name}
      hero={
        <Reveal style={styles.hero}>
          <View style={[styles.cover, { backgroundColor: c.accentSoft }]}>
            <T variant="display" style={{ color: c.accentInk, fontSize: 40, lineHeight: 46 }}>{shop.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</T>
          </View>
          <T variant="title" accessibilityRole="header">{shop.name}</T>
          <View style={styles.meta}>
            <MapPin size={15} color={c.muted} /><T variant="label" color="muted">{`${shop.city}, ${shop.department}`}</T>
          </View>
          <View style={styles.meta}>
            <ShieldCheck size={15} color={c.success} weight="fill" /><T variant="label" color="success">{k.t.shop.reviewed}</T>
            <T variant="label" color="muted">{` · ${k.t.shop.since(k.monthYear(shop.since))}`}</T>
          </View>
          <T color="secondary">{shop.description}</T>
          <View style={styles.contact}>
            {shop.whatsapp ? <Button small kind="secondary" icon={WhatsappLogo} label={k.t.shop.whatsapp} onPress={() => void Linking.openURL(`https://wa.me/${digits(shop.whatsapp!).replace("+", "")}`)} /> : null}
            {shop.phone ? <Button small kind="secondary" icon={Phone} label={k.t.shop.call} onPress={() => void Linking.openURL(`tel:${digits(shop.phone!)}`)} /> : null}
          </View>
        </Reveal>
      }
    >
      <View style={{ gap: space.xl }}>
        <Card style={styles.policy}>
          <Truck size={22} color={c.accentInk} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="bodyStrong">{k.t.shop.delivery}</T>
            <T color="secondary">{shop.fulfillmentPolicy}</T>
          </View>
        </Card>
        <Section title={k.t.shop.products}>
          <View style={styles.grid}>
            {items.map((p, i) => <Reveal key={p.id} index={i}><ProductTile product={p} shop={shop} width={tileW} /></Reveal>)}
          </View>
        </Section>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.xs, paddingBottom: space.lg },
  cover: { height: 132, borderRadius: radius.xl, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  contact: { flexDirection: "row", gap: space.xs, marginTop: space.sm },
  policy: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, rowGap: space.lg },
});
