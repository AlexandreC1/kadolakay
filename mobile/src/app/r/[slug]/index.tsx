import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarBlank, CaretRight, CheckCircle, CircleIcon as Circle, Export, LockSimple, MapPin, PencilSimple, Plus, Star, Trash, WarningCircle } from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { matchesGiftFilter, type GiftFilter } from "@web/registry-progress";
import { daysUntil } from "@web/wishlist-copy";
import { errorText, useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { availableOf, findList } from "@/data/store";
import type { Gift } from "@/data/types";
import { radius, space } from "@/theme/tokens";
import { Banner, Card, Empty, Pill } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { GiftRow, progressOf } from "@/ui/domain";
import { RoundButton, Screen } from "@/ui/Screen";
import { Tap } from "@/ui/Tap";
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
  const { state, dispatch, actions } = useStore();
  const k = useCopy();
  const list = findList(state, slug);
  const owner = !!list?.owner;
  const [filter, setFilter] = useState<GiftFilter>("all");
  const [menu, setMenu] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "offline">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Always fetch fresh: someone may have just promised a gift.
  useEffect(() => {
    let live = true;
    actions.loadList(slug)
      .then((l) => { if (!live) return; setStatus(l ? "ready" : "missing"); if (l && !l.owner && l.status === "PUBLISHED") dispatch({ type: "visit", slug: l.slug }); })
      .catch(() => live && setStatus("offline"));
    return () => { live = false; };
  }, [slug, actions, dispatch, state.user?.id]);

  const run = async (key: string, work: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    try { await work(); if (done) toast(done); } catch (e) { toast(errorText(k.t, e)); } finally { setBusy(null); setMenu(null); }
  };
  const refresh = async () => { setRefreshing(true); await actions.loadList(slug).catch(() => {}); setRefreshing(false); };

  const items = useMemo(() => {
    if (!list) return [];
    const rank = (g: Gift) => { const q = availableOf(g); return q.confirmed >= q.requested ? 3 : q.available > 0 ? 0 : 2; };
    return list.items.filter((g) => matchesGiftFilter(asProgress(g), filter))
      .sort((a, b) => rank(a) - rank(b) || b.priority - a.priority);
  }, [list, filter]);

  // The server already hides drafts and private lists from everyone but their owner.
  if (!list) {
    return (
      <Screen back title={k.t.lists.find}>
        {status === "loading" ? <T color="muted">{k.t.common.loading}</T>
          : <Empty icon={WarningCircle} text={status === "offline" ? k.t.errors.OFFLINE : k.t.list.notFound}>
              {status === "offline" ? <Button kind="secondary" label={k.t.common.retry} onPress={() => { setStatus("loading"); void refresh().then(() => setStatus(findList(state, slug) ? "ready" : "missing")); }} /> : null}
            </Empty>}
      </Screen>
    );
  }
  const pledgesFor = (giftId: string) => (list.pledges ?? []).filter((p) => p.itemId === giftId);
  const publish = () => run("publish", () => actions.publish(list.slug), k.t.list.published);

  const { requested, given } = progressOf(list);
  const held = list.items.reduce((s, g) => s + availableOf(g).held, 0);
  const days = list.eventDate ? daysUntil(new Date(`${list.eventDate}T00:00:00Z`)) : null;
  const counts = Object.fromEntries(filters.map((f) => [f, list.items.filter((g) => matchesGiftFilter(asProgress(g), f)).length]));
  const share = () => router.push({ pathname: "/share/[slug]", params: { slug: list.slug } });

  return (
    <Screen
      back
      title={list.title}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
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
          {requested > 0 ? <Card style={{ gap: space.sm }}>
            <WovenProgress strands={strandsFor(list.items)} label={k.list.weave(given, requested)} />
            <T variant="bodyStrong">{k.list.summary(given, requested)}</T>
            <T variant="caption" color="muted">
              {[requested - given > 0 ? `${k.list.remaining(requested - given)}.` : null, held > 0 ? k.list.heldNote(held) : null].filter(Boolean).join(" ")}
            </T>
          </Card> : null}
        </View>
      }
      footer={owner ? (
        list.status === "DRAFT" ? (
          <Button full label={k.t.list.publish} onPress={publish} busy={busy === "publish"} disabled={list.items.length === 0} />
        ) : (
          <Button full icon={Export} label={k.list.share} onPress={share} />
        )
      ) : undefined}
    >
      <View style={{ gap: space.md }}>
        {owner ? (
          <>
            {list.status === "DRAFT" ? <Banner icon={LockSimple} tone="warning">{k.t.list.draftBanner}</Banner> : null}
            {list.status === "DRAFT" || list.items.length === 0 ? <Checklist steps={[
              { label: k.t.onboarding.stepName, done: true },
              { label: k.t.onboarding.stepGift, done: list.items.length > 0, go: () => router.push({ pathname: "/add-gifts/[slug]", params: { slug: list.slug } }) },
              { label: k.t.onboarding.stepPublish, done: list.status === "PUBLISHED", go: list.items.length ? publish : undefined },
              { label: k.t.onboarding.stepShare, done: false, go: share },
            ]} title={k.t.onboarding.checklist} /> : null}
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
            {owner ? pledgesFor(g.id).map((p) => (
              <View key={p.id} style={[styles.pledge, { borderColor: c.accent }]}>
                <T variant="label" color="secondary">{`${p.quantity} × ${p.isAnonymous || !p.name ? k.t.list.promisedByGuest : k.t.list.promisedBy(p.name)}`}</T>
                {p.message ? <T variant="caption" color="muted" style={{ fontFamily: "Fraunces_400Regular_Italic" }}>{p.message}</T> : null}
              </View>
            )) : null}
            {owner && menu === g.id ? (
              <Animated.View entering={FadeIn.duration(160)} style={styles.menu}>
                <Button small kind="secondary" icon={Star} label={g.priority ? k.t.list.unmarkWanted : k.t.list.markWanted}
                  busy={busy === `wanted-${g.id}`} onPress={() => run(`wanted-${g.id}`, () => actions.setWanted(list.slug, g.id, !g.priority))} />
                {g.fulfilledQty === 0 && g.reservedQty === 0 ? (
                  <Button small kind="quiet" icon={Trash} label={k.t.common.remove}
                    busy={busy === `remove-${g.id}`} onPress={() => run(`remove-${g.id}`, () => actions.removeGift(list.slug, g.id))} />
                ) : <T variant="caption" color="muted" style={{ alignSelf: "center" }}>{k.t.list.removeHint}</T>}
              </Animated.View>
            ) : null}
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

/** Next steps derived from the list itself, as the onboarding brief asks: nothing is ticked that did not happen. */
function Checklist({ title, steps }: { title: string; steps: { label: string; done: boolean; go?: () => void }[] }) {
  const c = useColors();
  return (
    <Card style={{ gap: 2 }}>
      <T variant="label" color="secondary" style={{ marginBottom: space.xs }}>{title}</T>
      {steps.map((s, i) => (
        <Tap key={s.label} disabled={s.done || !s.go} onPress={s.go} accessibilityLabel={s.label} accessibilityState={{ checked: s.done }} accessibilityRole="checkbox"
          scaleTo={0.99} style={styles.check}>
          {s.done ? <CheckCircle size={22} color={c.success} weight="fill" /> : <Circle size={22} color={c.lineStrong} />}
          <T variant="body" style={[{ flex: 1 }, s.done && { color: c.muted, textDecorationLine: "line-through" }]}>{`${i + 1}. ${s.label}`}</T>
          {!s.done && s.go ? <CaretRight size={16} color={c.muted} /> : null}
        </Tap>
      ))}
    </Card>
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
  check: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 44 },
  pledge: { borderLeftWidth: 3, paddingLeft: space.sm, marginLeft: space.sm, gap: 2 },
  menu: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, paddingLeft: space.sm },
});
