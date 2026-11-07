import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle, Globe, Link as LinkIcon, LockSimple, Plus, Trash, X } from "phosphor-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isOccasion, occasionTypes, type Occasion } from "@web/occasions";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { findList, MAX_BATCH, nextListSlug } from "@/data/store";
import type { Visibility } from "@/data/types";
import { hit, radius, space } from "@/theme/tokens";
import { Banner, Card, Steps, Stepper } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { ListCard } from "@/ui/domain";
import { Field } from "@/ui/Field";
import { GiftBrowser } from "@/ui/GiftBrowser";
import { occasionIcons } from "@/ui/icons";
import { Segmented } from "@/ui/Segmented";
import { haptic, Tap } from "@/ui/Tap";
import { T } from "@/ui/Text";

type Idea = { title: string; priceHTG?: number; quantity: number };
const visibilities: { key: Visibility; icon: typeof Globe }[] = [{ key: "PUBLIC", icon: Globe }, { key: "LINK", icon: LinkIcon }, { key: "PRIVATE", icon: LockSimple }];
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/**
 * New list in four steps on one screen, so going back never loses what was typed:
 * occasion, details, gifts, then the finished list ready to publish and share.
 */
export default function Create() {
  const params = useLocalSearchParams<{ type?: string }>();
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { state, dispatch } = useStore();
  const k = useCopy();
  const preset = isOccasion(params.type) ? params.type : null;
  const [step, setStep] = useState(preset ? 1 : 0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [type, setType] = useState<Occasion | null>(preset);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("LINK");
  const [picked, setPicked] = useState<string[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [source, setSource] = useState<"shops" | "idea">("shops");
  const [idea, setIdea] = useState({ title: "", price: "", qty: 1 });
  const [errors, setErrors] = useState<{ title?: string; date?: string }>({});
  const [created, setCreated] = useState<string | null>(null);

  const go = (to: number) => { setDir(to > step ? 1 : -1); haptic(); setStep(to); };
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (!state.user) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.canvas, paddingTop: insets.top }]}>
        <Card style={{ gap: space.sm, maxWidth: 420, alignSelf: "stretch", marginHorizontal: space.md }}>
          <T variant="title">{k.t.create.title}</T>
          <T color="muted">{k.t.create.signInFirst}</T>
          <Button label={k.t.account.signIn} onPress={() => router.replace("/sign-in")} />
          <Button kind="quiet" label={k.t.common.cancel} onPress={close} />
        </Card>
      </View>
    );
  }

  const checkDetails = () => {
    const e: typeof errors = {};
    if (!title.trim()) e.title = k.t.create.nameNeeded;
    if (date && !isDate(date)) e.date = k.t.create.dateInvalid;
    setErrors(e);
    if (!e.title && !e.date) go(2);
  };

  const finish = () => {
    if (!type) return;
    const slug = nextListSlug(state, title);
    dispatch({ type: "createList", draft: { type, title, eventDate: date || undefined, place: place.trim() || undefined, description: note.trim() || undefined, visibility } });
    if (picked.length) dispatch({ type: "addProducts", slug, productIds: picked });
    ideas.forEach((i) => dispatch({ type: "addCustom", slug, title: i.title, priceHTG: i.priceHTG, quantity: i.quantity }));
    setCreated(slug);
    haptic("success");
    go(3);
  };

  const addIdea = () => {
    if (!idea.title.trim()) return;
    const price = Number(idea.price.replace(/[^\d.]/g, ""));
    setIdeas([...ideas, { title: idea.title.trim(), priceHTG: price > 0 ? price : undefined, quantity: idea.qty }]);
    setIdea({ title: "", price: "", qty: 1 });
  };

  const tileW = (Math.min(width, 640) - space.md * 2 - space.sm) / 2;
  const createdList = created ? findList(state, created) : undefined;
  const count = picked.length + ideas.length;

  const body = [
    // 0. Occasion
    <View key="0" style={styles.stepBody}>
      <T variant="largeTitle" accessibilityRole="header">{k.t.create.occasion}</T>
      <View style={styles.grid}>
        {occasionTypes.map((o) => {
          const Icon = occasionIcons[o];
          const on = type === o;
          return (
            <Tap key={o} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={k.occasion(o)}
              onPress={() => { setType(o); setTimeout(() => go(1), 140); }}
              style={[styles.occasion, { width: tileW, backgroundColor: on ? c.accentSoft : c.surface, borderColor: on ? c.accentInk : c.line }]}>
              <Icon size={30} color={c.accentInk} weight={on ? "fill" : "regular"} />
              <T variant="bodyStrong">{k.occasion(o)}</T>
            </Tap>
          );
        })}
      </View>
    </View>,

    // 1. Details
    <View key="1" style={styles.stepBody}>
      <T variant="largeTitle" accessibilityRole="header">{k.t.create.details}</T>
      <Field label={k.t.create.name} value={title} onChangeText={(v) => { setTitle(v); setErrors({ ...errors, title: undefined }); }}
        placeholder={type ? k.t.create.namePlaceholder[type] : ""} error={errors.title} maxLength={100} autoFocus={Platform.OS !== "web"} />
      <View style={styles.pair}>
        <View style={{ flex: 1 }}>
          <Field label={k.t.create.date} optionalLabel={k.t.common.optional} value={date} placeholder={k.t.create.datePlaceholder} error={errors.date}
            keyboardType="numbers-and-punctuation" maxLength={10} onChangeText={(v) => { setDate(autoDate(v)); setErrors({ ...errors, date: undefined }); }} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label={k.t.create.place} optionalLabel={k.t.common.optional} value={place} onChangeText={setPlace} placeholder={k.t.create.placePlaceholder} maxLength={80} />
        </View>
      </View>
      <Field label={k.t.create.note} optionalLabel={k.t.common.optional} value={note} onChangeText={setNote} placeholder={k.t.create.notePlaceholder} multiline maxLength={1000} />
      <View style={{ gap: space.xs }}>
        <T variant="label" color="secondary">{k.t.create.who}</T>
        {visibilities.map(({ key, icon: Icon }) => {
          const on = visibility === key;
          return (
            <Tap key={key} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${k.t.visibility[key]}. ${k.t.visibility[`${key}_hint`]}`}
              onPress={() => setVisibility(key)} style={[styles.choice, { borderColor: on ? c.accentInk : c.line, backgroundColor: on ? c.accentSoft : c.surface }]}>
              <Icon size={22} color={on ? c.accentInk : c.secondary} />
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{k.t.visibility[key]}</T>
                <T variant="caption" color="muted">{k.t.visibility[`${key}_hint`]}</T>
              </View>
              {on ? <CheckCircle size={22} color={c.accentInk} weight="fill" /> : null}
            </Tap>
          );
        })}
      </View>
    </View>,

    // 2. Gifts
    <View key="2" style={styles.stepBody}>
      <T variant="largeTitle" accessibilityRole="header">{k.t.create.gifts}</T>
      <T color="muted">{k.t.create.giftsHint}</T>
      <Segmented label={k.t.create.gifts} value={source} onChange={setSource} options={[{ key: "shops", label: k.t.create.fromShops }, { key: "idea", label: k.t.create.ownIdea }]} />
      {source === "shops" ? (
        <GiftBrowser selected={picked} onToggle={(id) => setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_BATCH ? s : [...s, id]))} />
      ) : (
        <Animated.View entering={FadeIn} style={{ gap: space.md }}>
          <Field label={k.t.create.ideaName} value={idea.title} onChangeText={(v) => setIdea({ ...idea, title: v })} placeholder={k.t.create.ideaNamePlaceholder} maxLength={100} />
          <View style={styles.pair}>
            <View style={{ flex: 1 }}>
              <Field label={k.t.create.ideaPrice} optionalLabel={k.t.common.optional} value={idea.price} keyboardType="number-pad" onChangeText={(v) => setIdea({ ...idea, price: v })} placeholder="3500" />
            </View>
            <View style={{ gap: 6 }}>
              <T variant="label" color="secondary">{k.t.create.ideaQty}</T>
              <Stepper label={k.t.create.ideaQty} value={idea.qty} min={1} max={99} onChange={(n) => setIdea({ ...idea, qty: n })} />
            </View>
          </View>
          <Button kind="secondary" icon={Plus} label={k.t.create.ideaAdd} onPress={addIdea} disabled={!idea.title.trim()} />
          <Banner>{k.t.create.ideaNote}</Banner>
          {ideas.map((i, n) => (
            <Animated.View key={`${i.title}-${n}`} entering={FadeIn} style={[styles.ideaRow, { borderColor: c.line, backgroundColor: c.surface }]}>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{i.title}</T>
                <T variant="caption" color="muted">{[i.priceHTG ? k.money(i.priceHTG, "HTG") : null, `× ${i.quantity}`].filter(Boolean).join(" · ")}</T>
              </View>
              <Tap accessibilityLabel={`${k.t.common.remove}: ${i.title}`} onPress={() => setIdeas(ideas.filter((_, x) => x !== n))} style={styles.iconBtn}>
                <Trash size={20} color={c.error} />
              </Tap>
            </Animated.View>
          ))}
        </Animated.View>
      )}
    </View>,

    // 3. Ready
    <View key="3" style={[styles.stepBody, { alignItems: "stretch" }]}>
      <Animated.View entering={ZoomIn.springify().damping(14)} style={{ alignSelf: "center" }}>
        <CheckCircle size={64} color={c.success} weight="fill" />
      </Animated.View>
      <T variant="largeTitle" style={{ textAlign: "center" }} accessibilityRole="header">{k.t.create.readyTitle}</T>
      <T color="muted" style={{ textAlign: "center" }}>{k.t.create.readyText}</T>
      {createdList ? <ListCard list={createdList} /> : null}
    </View>,
  ];

  const footer = step === 0 ? null
    : step === 1 ? <Button full label={k.t.common.continue} onPress={checkDetails} />
    : step === 2 ? <Button full label={k.t.create.createWith(count)} onPress={finish} />
    : (
      <>
        <Button full label={k.t.list.publish} onPress={() => { dispatch({ type: "publishList", slug: created! }); router.replace({ pathname: "/share/[slug]", params: { slug: created! } }); }} />
        <Button full kind="secondary" label={k.t.create.openList} onPress={() => router.replace({ pathname: "/r/[slug]", params: { slug: created! } })} />
      </>
    );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.root, { backgroundColor: c.canvas }]}>
      <View style={[styles.head, { paddingTop: insets.top + space.xs }]}>
        <View style={styles.headRow}>
          {step > 0 && step < 3 ? (
            <Button small kind="quiet" label={k.t.common.back} onPress={() => go(step - 1)} />
          ) : <View style={{ width: hit }} />}
          <T variant="label" color="muted" style={{ flex: 1, textAlign: "center" }}>{step < 3 ? k.t.create.step(step + 1, 3) : k.t.create.title}</T>
          <Tap accessibilityLabel={k.t.common.close} onPress={close} style={[styles.iconBtn, { backgroundColor: c.surfaceMuted }]}>
            <X size={20} color={c.ink} weight="bold" />
          </Tap>
        </View>
        {step < 3 ? <Steps count={3} current={step} label={k.t.create.step(step + 1, 3)} /> : null}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Animated.View key={step} entering={(dir > 0 ? SlideInRight : SlideInLeft).springify().damping(24)} exiting={(dir > 0 ? SlideOutLeft : SlideOutRight).duration(160)}>
          {body[step]}
        </Animated.View>
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.sm, borderColor: c.line }]}>
          {step === 2 && count ? <T variant="caption" color="muted" style={{ textAlign: "center" }}>{k.t.create.selected(count)}</T> : null}
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** Lets people type 20261224 and see 2026-12-24. */
function autoDate(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean).join("-");
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  head: { paddingHorizontal: space.md, gap: space.sm, paddingBottom: space.sm },
  headRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  scroll: { padding: space.md, paddingBottom: space.xxl },
  stepBody: { gap: space.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  occasion: { borderWidth: 1.5, borderRadius: radius.lg, padding: space.md, gap: space.lg, minHeight: 120, justifyContent: "space-between" },
  pair: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  choice: { flexDirection: "row", alignItems: "center", gap: space.sm, borderWidth: 1.5, borderRadius: radius.lg, padding: space.md },
  ideaRow: { flexDirection: "row", alignItems: "center", gap: space.sm, borderWidth: 1, borderRadius: radius.lg, padding: space.sm, paddingLeft: space.md },
  iconBtn: { width: hit, height: hit, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  footer: { paddingHorizontal: space.md, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: space.xs },
});
