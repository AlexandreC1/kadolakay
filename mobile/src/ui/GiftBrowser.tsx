import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { useCopy } from "@/copy";
import { useStore } from "@/data/StoreProvider";
import { businessOf } from "@/data/store";
import { space } from "@/theme/tokens";
import { Chip } from "./Chip";
import { ProductTile } from "./domain";
import { SearchField } from "./Field";
import { T } from "./Text";

const budgets = [[0, 5000], [5000, 15000], [15000, Infinity]] as const;
const categories = ["all", "baby", "kitchen", "furniture", "crafts"] as const;

/**
 * Search, budget and category filters over approved shop products, in a grid
 * whose tiles glide into place as filters change. With `onToggle`, tiles become
 * checkboxes for adding several gifts to a list at once.
 */
export function GiftBrowser({ initialBudget, selected = [], onToggle, exclude = [] }: { initialBudget?: number; selected?: string[]; onToggle?: (id: string) => void; exclude?: string[] }) {
  const { state } = useStore();
  const k = useCopy();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState<number | null>(initialBudget ?? null);
  const [category, setCategory] = useState<(typeof categories)[number]>("all");
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const results = useMemo(() => state.products.filter((p) => {
    if (exclude.includes(p.id)) return false;
    const shop = businessOf(state, p.businessSlug);
    if (!shop || shop.status !== "APPROVED") return false;
    if (category !== "all" && p.category !== category) return false;
    if (budget !== null) { const [lo, hi] = budgets[budget]; if (p.priceHTG < lo || p.priceHTG >= hi) return false; }
    const q = norm(query.trim());
    return !q || norm(p.name).includes(q) || norm(shop.name).includes(q) || norm(p.description).includes(q);
  }), [state, query, budget, category, exclude]);

  const tileW = (Math.min(width, 640) - space.md * 2 - space.sm) / 2;

  return (
    <View style={{ gap: space.md }}>
      <SearchField value={query} onChangeText={setQuery} placeholder={k.guest.searchGifts} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
        <Chip label={k.t.gifts.anyBudget} selected={budget === null} onPress={() => setBudget(null)} />
        {k.t.gifts.budgets.map((b, i) => <Chip key={b} label={b} selected={budget === i} onPress={() => setBudget(budget === i ? null : i)} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
        {categories.map((cat) => <Chip key={cat} label={k.t.gifts.categories[cat]} selected={category === cat} onPress={() => setCategory(cat)} />)}
      </ScrollView>
      <T variant="caption" color="muted" accessibilityLiveRegion="polite">{k.guest.giftCount(results.length)}</T>
      {results.length ? (
        <View style={styles.grid}>
          {results.map((p) => (
            <Animated.View key={p.id} layout={LinearTransition.springify().damping(22)} entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
              <ProductTile product={p} shop={businessOf(state, p.businessSlug)} width={tileW}
                selected={selected.includes(p.id)} onSelect={onToggle ? () => onToggle(p.id) : undefined} />
            </Animated.View>
          ))}
        </View>
      ) : <T color="muted">{k.t.gifts.none}</T>}
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space.md },
  chips: { paddingHorizontal: space.md, gap: space.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, rowGap: space.lg },
});
