import { useLocalSearchParams, useRouter } from "expo-router";
import { CaretRight, CheckCircle, Package, ShieldCheck, Storefront, Truck, WarningCircle } from "phosphor-react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { availableOf, businessOf, findList, myLists, productsOf } from "@/data/store";
import { space } from "@/theme/tokens";
import { Card, Empty, Pill, Reveal, Section } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { ProductTile } from "@/ui/domain";
import { GiftArt } from "@/ui/GiftArt";
import { Screen } from "@/ui/Screen";
import { T } from "@/ui/Text";

export default function GiftPage() {
  const { id, list: slug, item } = useLocalSearchParams<{ id: string; list?: string; item?: string }>();
  const c = useColors();
  const router = useRouter();
  const { state } = useStore();
  const k = useCopy();
  const product = state.products.find((p) => p.id === id);
  if (!product) return <Screen back title={k.t.gifts.title}><Empty icon={WarningCircle} text={k.t.list.notFound} /></Screen>;

  const shop = businessOf(state, product.businessSlug);
  const list = slug ? findList(state, slug) : undefined;
  const gift = list?.items.find((g) => g.id === item);
  const guestCanGive = !!list && !!gift && !list.owner && list.status === "PUBLISHED" && availableOf(gift).available > 0;
  const onMyLists = myLists(state).filter((l) => l.items.some((g) => g.productId === product.id));
  const price = k.money(state.currency === "USD" ? product.priceUSD : product.priceHTG, state.currency);
  const other = k.money(state.currency === "USD" ? product.priceHTG : product.priceUSD, state.currency === "USD" ? "HTG" : "USD");
  const more = productsOf(state, product.businessSlug).filter((p) => p.id !== product.id);
  const stock = product.stockQuantity === null ? k.t.gift.stockUnknown : product.stockQuantity === 0 ? k.t.gift.outOfStock : k.t.gift.inStock(product.stockQuantity);

  return (
    <Screen
      back
      title={product.name}
      hero={<Reveal><GiftArt id={product.id} name={product.name} size="hero" style={{ marginTop: space.xs, marginBottom: space.lg }} /></Reveal>}
      footer={
        guestCanGive ? (
          <Button full label={k.t.list.give} onPress={() => router.push({ pathname: "/offer/[item]", params: { item: gift!.id, list: list!.slug } })} />
        ) : product.stockQuantity !== 0 ? (
          <Button full kind={list ? "secondary" : "primary"} label={k.t.gift.addToList}
            onPress={() => router.push(state.user ? { pathname: "/pick-list", params: { products: product.id } } : "/sign-in")} />
        ) : undefined
      }
    >
      <View style={{ gap: space.lg }}>
        <View style={{ gap: 4 }}>
          <T variant="overline" color="accentInk">{k.t.gift.shopGift.toUpperCase()}</T>
          <T variant="title" accessibilityRole="header">{product.name}</T>
          <View style={styles.priceRow}>
            <T variant="title">{price}</T>
            <T color="muted">{`≈ ${other}`}</T>
          </View>
          <T color="secondary">{product.description}</T>
        </View>

        <View style={styles.facts}>
          <Pill label={stock} tone={product.stockQuantity === 0 ? "warning" : "success"} />
          {onMyLists.length ? <Pill label={`${k.t.gift.onLists}: ${onMyLists.map((l) => l.title).join(", ")}`} tone="accent" /> : null}
          {gift && availableOf(gift).confirmed >= gift.quantity ? <Pill label={k.t.list.given} tone="success" /> : null}
        </View>

        {shop ? (
          <Card onPress={() => router.push({ pathname: "/shop/[slug]", params: { slug: shop.slug } })} label={`${k.t.gift.soldBy} ${shop.name}`} style={styles.shop}>
            <Storefront size={24} color={c.accentInk} />
            <View style={{ flex: 1 }}>
              <T variant="caption" color="muted">{k.t.gift.soldBy}</T>
              <T variant="bodyStrong">{shop.name}</T>
              <View style={styles.inline}><ShieldCheck size={14} color={c.success} weight="fill" /><T variant="caption" color="success">{k.t.shop.reviewed}</T></View>
            </View>
            <CaretRight size={18} color={c.muted} />
          </Card>
        ) : null}

        {shop ? (
          <View style={styles.policy}>
            <Truck size={22} color={c.accentInk} />
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="bodyStrong">{k.t.gift.delivery}</T>
              <T color="secondary">{shop.fulfillmentPolicy}</T>
            </View>
          </View>
        ) : null}

        {list && gift ? (
          <View style={styles.policy}>
            <Package size={22} color={c.accentInk} />
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="bodyStrong">{list.title}</T>
              <T color="secondary">{k.list.left(availableOf(gift).available, gift.quantity)}</T>
            </View>
            {availableOf(gift).confirmed >= gift.quantity ? <CheckCircle size={20} color={c.success} weight="fill" /> : null}
          </View>
        ) : null}

        {more.length ? (
          <Section title={k.t.shop.products}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.shelf}>
              {more.map((p) => <ProductTile key={p.id} product={p} shop={shop} width={140} />)}
            </ScrollView>
          </Section>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: space.sm, marginVertical: 4 },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  shop: { flexDirection: "row", alignItems: "center", gap: space.sm },
  inline: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  policy: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  bleed: { marginHorizontal: -space.md },
  shelf: { paddingHorizontal: space.md, gap: space.sm },
});
