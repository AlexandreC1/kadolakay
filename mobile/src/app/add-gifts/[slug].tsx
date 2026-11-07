import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useCopy } from "@/copy";
import { useStore } from "@/data/StoreProvider";
import { findList, MAX_BATCH } from "@/data/store";
import { space } from "@/theme/tokens";
import { Banner } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { GiftBrowser } from "@/ui/GiftBrowser";
import { Screen } from "@/ui/Screen";
import { useToast } from "@/ui/Toast";

/** Opened from a list: tick shop gifts, then add them all to that list in one save. */
export default function AddGifts() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const toast = useToast();
  const { state, dispatch } = useStore();
  const k = useCopy();
  const list = findList(state, slug);
  const [selected, setSelected] = useState<string[]>([]);
  if (!list) return null;
  const onList = list.items.map((g) => g.productId).filter((id): id is string => !!id);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_BATCH ? s : [...s, id]));

  return (
    <Screen
      back
      title={k.t.list.addGifts}
      subtitle={list.title}
      footer={
        <Button full disabled={!selected.length} label={selected.length ? `${k.guest.addSelected} · ${k.guest.selectedCount(selected.length)}` : k.guest.addSelected}
          onPress={() => { dispatch({ type: "addProducts", slug: list.slug, productIds: selected }); toast(k.guest.added(selected.length)); router.back(); }} />
      }
    >
      <View style={{ gap: space.md }}>
        {selected.length >= MAX_BATCH ? <Banner tone="warning">{k.guest.selectionLimit}</Banner> : null}
        <GiftBrowser selected={selected} onToggle={toggle} exclude={onList} />
      </View>
    </Screen>
  );
}
