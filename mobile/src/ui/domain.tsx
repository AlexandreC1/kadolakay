import { useRouter } from "expo-router";
import { CheckCircle, CircleIcon as Circle, DotsThree, MapPin, Star, Storefront } from "phosphor-react-native";
import { StyleSheet, View } from "react-native";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { availableOf, businessOf, canPayInApp } from "@/data/store";
import type { Business, Gift, Product, Registry } from "@/data/types";
import { radius, space } from "@/theme/tokens";
import { Button } from "./Button";
import { GiftArt } from "./GiftArt";
import { Tap } from "./Tap";
import { T } from "./Text";
import { Card, Pill } from "./bits";
import { strandsFor, WovenProgress } from "./WovenProgress";

export function progressOf(list: Registry) {
  const requested = list.items.reduce((s, g) => s + g.quantity, 0);
  const given = list.items.reduce((s, g) => s + Math.min(g.quantity, g.fulfilledQty), 0);
  return { requested, given };
}

export function ListCard({ list, compact }: { list: Registry; compact?: boolean }) {
  const c = useColors();
  const router = useRouter();
  const k = useCopy();
  const { requested, given } = progressOf(list);
  const meta = [k.occasion(list.type), list.eventDate ? k.date(list.eventDate) : null].filter(Boolean).join(" · ");
  return (
    <Card onPress={() => router.push({ pathname: "/r/[slug]", params: { slug: list.slug } })} label={`${list.title}. ${k.home.listProgress(given, requested)}`} style={compact ? styles.compactCard : undefined}>
      <View style={styles.cardTop}>
        <T variant="overline" color="accentInk" style={{ flex: 1 }} numberOfLines={1}>{meta.toUpperCase()}</T>
        {list.status === "DRAFT" ? <Pill label={k.t.common.draft} tone="warning" /> : null}
      </View>
      <T variant="displaySmall" numberOfLines={2}>{list.title}</T>
      <WovenProgress strands={strandsFor(list.items)} label={k.list.weave(given, requested)} />
      <View style={styles.cardFoot}>
        <T variant="label" color="secondary">{k.home.listProgress(given, requested)}</T>
        {list.place && !compact ? (
          <View style={styles.inline}><MapPin size={14} color={c.muted} /><T variant="caption" color="muted">{list.place}</T></View>
        ) : null}
      </View>
    </Card>
  );
}

/** A gift on a list, with the action that fits who is looking and how it can be given. */
export function GiftRow({ list, gift, owner, onGive, onMenu }: { list: Registry; gift: Gift; owner: boolean; onGive: () => void; onMenu?: () => void }) {
  const c = useColors();
  const router = useRouter();
  const { state } = useStore();
  const k = useCopy();
  const q = availableOf(gift);
  const shop = businessOf(state, gift.businessSlug);
  const price = state.currency === "USD" ? gift.priceUSD : gift.priceHTG;
  const done = q.confirmed >= q.requested;
  const open = () => (gift.productId
    ? router.push({ pathname: "/gift/[id]", params: { id: gift.productId, list: list.slug, item: gift.id } })
    : onMenu?.());
  return (
    <View style={[styles.gift, { borderColor: c.line, backgroundColor: c.surface }]}>
      <Tap onPress={open} haptics={false} scaleTo={0.99} accessibilityLabel={gift.title} style={styles.giftMain}>
        <GiftArt id={gift.id} name={gift.title} size="thumb" />
        <View style={{ flex: 1, gap: 2 }}>
          {gift.priority ? (
            <View style={styles.inline}><Star size={12} color={c.accentInk} weight="fill" /><T variant="overline" color="accentInk">{k.t.list.mostWanted.toUpperCase()}</T></View>
          ) : null}
          <T variant="bodyStrong" numberOfLines={2} style={done ? { color: c.muted } : undefined}>{gift.title}</T>
          <T variant="caption" color="muted" numberOfLines={1}>
            {[price !== undefined ? k.money(price, state.currency) : null, shop ? `${k.list.fromShop} ${shop.name}` : k.t.gift.ownIdea].filter(Boolean).join(" · ")}
          </T>
          {q.requested > 1 ? <Units requested={q.requested} confirmed={q.confirmed} held={q.held} /> : null}
        </View>
      </Tap>
      <View style={styles.giftAction}>
        <T variant="caption" color="muted" style={{ flex: 1 }}>
          {done || q.requested <= 1 ? "" : owner ? k.list.left(q.requested - q.confirmed, q.requested) : k.list.left(q.available, q.requested)}
        </T>
        {done ? (
          <View style={styles.inline}><CheckCircle size={18} color={c.success} weight="fill" /><T variant="label" color="success">{k.t.list.given}</T></View>
        ) : owner ? null : q.available <= 0 ? (
          <T variant="caption" color="muted">{k.t.list.bePaid}</T>
        ) : canPayInApp(gift) && list.status === "PUBLISHED" ? (
          <Button small label={k.t.list.give} onPress={onGive} />
        ) : (
          <T variant="label" color="secondary" style={{ maxWidth: 190, textAlign: "right" }}>{k.list.giveDirectly}</T>
        )}
        {owner && onMenu ? (
          <Tap onPress={onMenu} accessibilityLabel={`${k.t.common.edit}: ${gift.title}`} style={[styles.dots, { borderColor: c.line }]}>
            <DotsThree size={20} color={c.ink} weight="bold" />
          </Tap>
        ) : null}
      </View>
    </View>
  );
}

function Units({ requested, confirmed, held }: { requested: number; confirmed: number; held: number }) {
  const c = useColors();
  return (
    <View style={styles.units} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: Math.min(requested, 12) }, (_, i) => (
        <View key={i} style={[styles.unit, { backgroundColor: i < confirmed ? c.strandGiven : i < confirmed + held ? c.strandHeld : c.strandOpen }]} />
      ))}
    </View>
  );
}

export function ProductTile({ product, shop, selected, onSelect, width }: { product: Product; shop?: Business; selected?: boolean; onSelect?: () => void; width: number }) {
  const c = useColors();
  const router = useRouter();
  const { state } = useStore();
  const k = useCopy();
  const out = product.stockQuantity === 0;
  const price = k.money(state.currency === "USD" ? product.priceUSD : product.priceHTG, state.currency);
  return (
    <Tap
      onPress={onSelect ?? (() => router.push({ pathname: "/gift/[id]", params: { id: product.id } }))}
      accessibilityLabel={`${product.name}, ${price}${shop ? `, ${shop.name}` : ""}`}
      accessibilityState={onSelect ? { checked: !!selected, disabled: out } : undefined}
      accessibilityRole={onSelect ? "checkbox" : "button"}
      disabled={!!onSelect && out}
      style={{ width, gap: 6, opacity: out ? 0.5 : 1 }}
    >
      <View>
        <GiftArt id={product.id} name={product.name} />
        {onSelect ? (
          <View style={[styles.check, { backgroundColor: selected ? c.action : c.surface, borderColor: selected ? c.action : c.lineStrong }]}>
            {selected ? <CheckCircle size={26} color={c.onAction} weight="fill" /> : <Circle size={26} color="transparent" />}
          </View>
        ) : null}
      </View>
      <T variant="bodyStrong">{price}</T>
      <T variant="caption" color="muted" numberOfLines={1}>{out ? k.t.gift.outOfStock : shop?.name}</T>
    </Tap>
  );
}

export function ShopRow({ shop, count }: { shop: Business; count: number }) {
  const c = useColors();
  const router = useRouter();
  const k = useCopy();
  return (
    <Card onPress={() => router.push({ pathname: "/shop/[slug]", params: { slug: shop.slug } })} label={shop.name} style={styles.shopRow}>
      <View style={[styles.shopMark, { backgroundColor: c.accentSoft }]}>
        <Storefront size={24} color={c.accentInk} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="bodyStrong">{shop.name}</T>
        <T variant="caption" color="muted" numberOfLines={1}>{[k.t.gifts.categories[shop.category] ?? shop.category, shop.city].join(" · ")}</T>
        <T variant="caption" color="secondary">{k.guest.giftCount(count)}</T>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  compactCard: { width: 280 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: space.xs },
  cardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.xs },
  inline: { flexDirection: "row", alignItems: "center", gap: 4 },
  gift: { borderWidth: 1, borderRadius: radius.lg, padding: space.sm, gap: space.sm },
  giftMain: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  giftAction: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 36 },
  dots: { width: 44, height: 36, borderRadius: radius.pill, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  units: { flexDirection: "row", gap: 3, marginTop: 4 },
  unit: { width: 10, height: 10, borderRadius: 3 },
  check: { position: "absolute", top: 8, right: 8, borderRadius: radius.pill, borderWidth: 1.5, overflow: "hidden" },
  shopRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  shopMark: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
