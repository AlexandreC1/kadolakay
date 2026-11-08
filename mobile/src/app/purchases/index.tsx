import { useRouter } from "expo-router";
import { Gift } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { useCopy } from "@/copy";
import { useStore } from "@/data/StoreProvider";
import { businessOf } from "@/data/store";
import { space } from "@/theme/tokens";
import { Card, Empty, Pill, Reveal } from "@/ui/bits";
import { GiftArt } from "@/ui/GiftArt";
import { Screen } from "@/ui/Screen";
import { T } from "@/ui/Text";

/** Gifts this person promised to bring, so they remember what to buy. */
export default function Promised() {
  const router = useRouter();
  const { state, actions } = useStore();
  const k = useCopy();
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => { void actions.refreshPledges().catch(() => {}); }, [actions]);
  const refresh = async () => { setRefreshing(true); await actions.refreshPledges().catch(() => {}); setRefreshing(false); };

  return (
    <Screen back title={k.t.purchases.title} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      {state.pledges.length === 0 ? <Empty icon={Gift} text={k.t.purchases.empty} /> : (
        <View style={{ gap: space.sm }}>
          {state.pledges.map((p, i) => {
            const shop = businessOf(state, p.gift.businessSlug);
            return (
              <Reveal key={p.id} index={i}>
                <Card onPress={() => router.push({ pathname: "/purchases/[id]", params: { id: p.id } })} label={`${p.gift.title}, ${k.t.purchases.forList(p.list.title)}`} style={styles.row}>
                  <GiftArt id={p.gift.id} name={p.gift.title} size="thumb" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="bodyStrong" numberOfLines={1}>{`${p.quantity} × ${p.gift.title}`}</T>
                    <T variant="caption" color="muted" numberOfLines={1}>{k.t.purchases.forList(p.list.title)}</T>
                    <Pill label={shop ? `${k.t.purchases.toBring} · ${shop.name}` : k.t.purchases.toBring} tone="accent" />
                  </View>
                </Card>
              </Reveal>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: space.sm } });
