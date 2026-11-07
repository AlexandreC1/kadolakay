import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle, ListChecks, Plus } from "phosphor-react-native";
import { StyleSheet, View } from "react-native";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { MAX_BATCH, myLists } from "@/data/store";
import { radius, space } from "@/theme/tokens";
import { Banner, Empty } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { progressOf } from "@/ui/domain";
import { SheetScreen } from "@/ui/Sheet";
import { Tap } from "@/ui/Tap";
import { T } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/** Choose which of your lists receives one or more shop gifts. All are added, or none. */
export default function PickList() {
  const { products } = useLocalSearchParams<{ products: string }>();
  const ids = (products ?? "").split(",").filter(Boolean).slice(0, MAX_BATCH);
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { state, dispatch } = useStore();
  const k = useCopy();
  const lists = myLists(state);

  const add = (slug: string, title: string) => {
    dispatch({ type: "addProducts", slug, productIds: ids });
    toast(ids.length === 1 ? k.t.gift.addedTo(title) : k.guest.added(ids.length));
    router.back();
  };

  return (
    <SheetScreen title={k.guest.chooseList} subtitle={k.guest.selectedCount(ids.length)}>
      {lists.length === 0 ? (
        <Empty icon={ListChecks} text={k.guest.noListYet}>
          <Button icon={Plus} label={k.guest.createList} onPress={() => router.replace("/create")} />
        </Empty>
      ) : (
        <View style={{ gap: space.sm }}>
          {lists.map((l) => {
            const already = ids.some((id) => l.items.some((g) => g.productId === id));
            const p = progressOf(l);
            return (
              <Tap key={l.slug} disabled={already} onPress={() => add(l.slug, l.title)} accessibilityLabel={l.title} accessibilityState={{ disabled: already }}
                style={[styles.row, { borderColor: c.line, backgroundColor: c.surface, opacity: already ? 0.55 : 1 }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="displaySmall" style={{ fontSize: 18, lineHeight: 22 }}>{l.title}</T>
                  <T variant="caption" color="muted">{already ? k.t.gift.alreadyOn : `${k.occasion(l.type)} · ${k.home.listProgress(p.given, p.requested)}`}</T>
                </View>
                {already ? <CheckCircle size={22} color={c.success} weight="fill" /> : <Plus size={22} color={c.accentInk} weight="bold" />}
              </Tap>
            );
          })}
          {ids.length > 1 ? <Banner>{k.guest.selectionLimit}</Banner> : null}
        </View>
      )}
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, borderWidth: 1, borderRadius: radius.lg, padding: space.md, minHeight: 64 },
});
