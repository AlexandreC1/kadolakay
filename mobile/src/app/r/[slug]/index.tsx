import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarBlank, Export, LockSimple, MapPin, PencilSimple, Plus, Star, Trash, WarningCircle } from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { matchesGiftFilter, type GiftFilter } from "@web/registry-progress";
import { daysUntil } from "@web/wishlist-copy";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { availableOf, findList } from "@/data/store";
import type { Gift } from "@/data/types";
import { radius, space } from "@/theme/tokens";
import { Banner, Card, Empty, Pill } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { GiftRow, progressOf } from "@/ui/domain";
import { RoundButton, Screen } from "@/ui/Screen";
import { T } from "@/ui/Text";
import { useToast } from "@/ui/Toast";
import { strandsFor, WovenProgress } from "@/ui/WovenProgress";

const filters: GiftFilter[] = ["all", "available", "held", "confirmed"];
const asProgress = (g: Gift) => ({ quantity: g.quantity, fulfilledQty: g.fulfilledQty, availableQty: g.quantity - g.fulfilledQty - g.reservedQty });

export default function ListPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { state, dispatch } = useStore();
  const k = useCopy();
  const list = findList(state, slug);
  const owner = !!list && list.ownerId === state.user?.id;
  const [filter, setFilter] = useState<GiftFilter>("all");
  const [menu, setMenu] = useState<string | null>(null);

  useEffect(() => { if (list && !owner && list.status === "PUBLISHED") dispatch({ type: "visit", slug: list.slug }); }, [list?.slug, owner]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => {
    if (!list) return [];
    const rank = (g: Gift) => { const q = availableOf(g); return q.confirmed >= q.requested ? 3 : q.available > 0 ? 0 : 2; };
    return list.items.filter((g) => matchesGiftFilter(asProgress(g), filter))
      .sort((a, b) => rank(a) - rank(b) || b.priority - a.priority);
  }, [list, filter]);

  // Drafts and private lists are invisible to everyone but their owner, as on the web.
  if (!list || (!owner && (list.status !== "PUBLISHED" || list.visibility === "PRIVATE"))) {
    return <Screen back title={k.t.lists.find}><Empty icon={WarningCircle} text={k.t.list.notFound} /></Screen>;
  }

  const { requested, given } = progressOf(list);
  const held = list.items.reduce((s, g) => s + availableOf(g).held, 0);
  const days = list.eventDate ? daysUntil(new Date(`${list.eventDate}T00:00:00Z`)) : null;
  const counts = Object.fromEntries(filters.map((f) => [f, list.items.filter((g) => matchesGiftFilter(asProgress(g), f)).length]));
  const share = () => router.push({ pathname: "/share/[slug]", params: { slug: list.slug } });

  return (
    <Screen
      back
      title={list.title}
      right={<RoundButton label={k.list.share} onPress={share}><Export size={20} color={c.ink} /></RoundButton>}
      hero={
        <View style={styles.hero}>
          <View style={styles.metaRow}>
            <T variant="overline" color="accentInk">{k.occasion(list.type).toUpperCase()}</T>
            {days !== null ? <Pill label={k.list.countdown(days)} tone="accent" /> : null}
            {owner ? <Pill label={list.status === "DRAFT" ? k.t.common.draft : k.t.visibility[list.visibility]} tone={list.status === "DRAFT" ? "warning" : "neutral"} /> : null}
          </View>
          <T variant="display" accessibilityRole="header">{list.title}</T>
          <View style={styles.facts}>
            <T variant="label" color="secondary">{k.list.owner(list.ownerName)}</T>
            {list.eventDate ? <Fact icon={CalendarBlank} text={k.date(list.eventDate)} /> : null}
            {list.place ? <Fact icon={MapPin} text={list.place} /> : null}
          </View>
          {list.description ? (
            <View style={[styles.note, { borderColor: c.accent }]}>
              <T variant="body" style={{ fontFamily: "Fraunces_400Regular_Italic", fontSize: 17, lineHeight: 25 }}>{list.description}</T>
            </View>
          ) : null}
          <Card style={{ gap: space.sm }}>
            <WovenProgress strands={strandsFor(list.items)} label={k.list.weave(given, requested)} />
            <T variant="bodyStrong">{k.list.summary(given, requested)}</T>
            <T variant="caption" color="muted">
              {[requested - given > 0 ? `${k.list.remaining(requested - given)}.` : null, held > 0 ? k.list.heldNote(held) : null].filter(Boolean).join(" ")}
            </T>
          </Card>
        </View>
      }
      footer={owner ? (
        list.status === "DRAFT" ? (
          <Button full label={k.t.list.publish} onPress={() => { dispatch({ type: "publishList", slug: list.slug }); toast(k.t.list.published); }} />
        ) : (
          <Button full icon={Export} label={k.list.share} onPress={share} />
        )
      ) : undefined}
    >
      <View style={{ gap: space.md }}>
        {owner ? (
          <>
            {list.status === "DRAFT" ? <Banner icon={LockSimple} tone="warning">{k.t.list.draftBanner}</Banner> : null}
            <View style={styles.ownerActions}>
              <Button small kind="secondary" icon={Plus} label={k.t.list.addGifts} onPress={() => router.push({ pathname: "/add-gifts/[slug]", params: { slug: list.slug } })} />
              <Button small kind="secondary" icon={PencilSimple} label={k.t.common.edit} onPress={() => router.push({ pathname: "/r/[slug]/edit", params: { slug: list.slug } })} />
            </View>
          </>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
          {filters.map((f) => (
            <Chip key={f} label={k.t.list.filters[f]} count={counts[f]} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>

        {items.length === 0 ? (
          <Empty icon={Plus} text={list.items.length === 0 && owner ? k.t.list.emptyOwner : k.t.list.emptyGuest} />
        ) : items.map((g) => (
          <Animated.View key={g.id} layout={LinearTransition.springify().damping(22)} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={{ gap: space.xs }}>
            <GiftRow
              list={list}
              gift={g}
              owner={owner}
              onGive={() => router.push({ pathname: "/offer/[item]", params: { item: g.id, list: list.slug } })}
              onMenu={owner ? () => setMenu(menu === g.id ? null : g.id) : undefined}
            />
            {owner && menu === g.id ? (
              <Animated.View entering={FadeIn.duration(160)} style={styles.menu}>
                <Button small kind="secondary" icon={Star} label={g.priority ? k.t.list.unmarkWanted : k.t.list.markWanted}
                  onPress={() => { dispatch({ type: "togglePriority", slug: list.slug, giftId: g.id }); setMenu(null); }} />
                {g.fulfilledQty === 0 && g.reservedQty === 0 ? (
                  <Button small kind="quiet" icon={Trash} label={k.t.common.remove}
                    onPress={() => { dispatch({ type: "removeGift", slug: list.slug, giftId: g.id }); setMenu(null); }} />
                ) : <T variant="caption" color="muted" style={{ alignSelf: "center" }}>{k.t.list.removeHint}</T>}
              </Animated.View>
            ) : null}
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

function Fact({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  const c = useColors();
  return <View style={styles.fact}><Icon size={15} color={c.muted} /><T variant="label" color="muted">{text}</T></View>;
}

const styles = StyleSheet.create({
  hero: { gap: space.md, paddingTop: space.xs, paddingBottom: space.lg },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.xs },
  facts: { flexDirection: "row", flexWrap: "wrap", columnGap: space.md, rowGap: 4, alignItems: "center" },
  fact: { flexDirection: "row", alignItems: "center", gap: 4 },
  note: { borderLeftWidth: 3, paddingLeft: space.md, paddingVertical: 2, borderRadius: radius.sm },
  ownerActions: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  bleed: { marginHorizontal: -space.md },
  chips: { paddingHorizontal: space.md, gap: space.xs },
  menu: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, paddingLeft: space.sm },
});
