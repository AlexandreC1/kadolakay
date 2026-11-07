import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckSquare, X } from "phosphor-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { MAX_BATCH, productsOf } from "@/data/store";
import { radius, space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { ShopRow } from "@/ui/domain";
import { GiftBrowser } from "@/ui/GiftBrowser";
import { RoundButton, Screen, TAB_BAR_SPACE } from "@/ui/Screen";
import { Segmented } from "@/ui/Segmented";
import { T } from "@/ui/Text";

export default function Gifts() {
  const params = useLocalSearchParams<{ tab?: string; budget?: string }>();
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const k = useCopy();
  const [tab, setTab] = useState<"gifts" | "shops">(params.tab === "shops" ? "shops" : "gifts");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  // A shortcut can open this tab on Shops; follow the link when it changes, without an effect.
  const [linkedTab, setLinkedTab] = useState(params.tab);
  if (params.tab !== linkedTab) {
    setLinkedTab(params.tab);
    if (params.tab === "shops" || params.tab === "gifts") setTab(params.tab);
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_BATCH ? s : [...s, id]));
  const stopSelecting = () => { setSelecting(false); setSelected([]); };

  return (
    <View style={{ flex: 1 }}>
      <Screen
        inTabs
        title={k.t.gifts.title}
        right={tab === "gifts" && state.user ? (
          <RoundButton label={selecting ? k.guest.clearSelection : k.t.gifts.select} onPress={selecting ? stopSelecting : () => setSelecting(true)}>
            {selecting ? <X size={20} color={c.ink} weight="bold" /> : <CheckSquare size={20} color={c.ink} />}
          </RoundButton>
        ) : undefined}
      >
        <View style={{ gap: space.lg, paddingBottom: selected.length ? 72 : 0 }}>
          <Segmented label={k.t.gifts.title} value={tab} onChange={setTab} options={[{ key: "gifts", label: k.t.gifts.tabGifts }, { key: "shops", label: k.t.gifts.tabShops }]} />
          <Animated.View key={tab} entering={FadeIn.duration(180)}>
            {tab === "gifts" ? (
              <GiftBrowser initialBudget={params.budget ? Number(params.budget) : undefined} selected={selected} onToggle={selecting ? toggle : undefined} />
            ) : (
              <View style={{ gap: space.sm }}>
                <T variant="caption" color="muted">{k.guest.shopCount(state.businesses.filter((b) => b.status === "APPROVED").length)}</T>
                {state.businesses.filter((b) => b.status === "APPROVED").map((b) => <ShopRow key={b.slug} shop={b} count={productsOf(state, b.slug).length} />)}
              </View>
            )}
          </Animated.View>
        </View>
      </Screen>
      {selecting && selected.length ? (
        <Animated.View entering={SlideInDown.springify().damping(20)} exiting={SlideOutDown.duration(160)}
          style={[styles.bar, { bottom: insets.bottom + TAB_BAR_SPACE - 8, backgroundColor: c.ink }]}>
          <T variant="label" style={{ color: c.canvas, flex: 1 }}>{k.guest.selectedCount(selected.length)}</T>
          <Button small kind="accent" label={k.guest.addSelected} onPress={() => { router.push({ pathname: "/pick-list", params: { products: selected.join(",") } }); stopSelecting(); }} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: "absolute", left: space.md, right: space.md, flexDirection: "row", alignItems: "center", gap: space.sm, paddingLeft: space.md, paddingRight: 6, paddingVertical: 6, borderRadius: radius.pill },
});
