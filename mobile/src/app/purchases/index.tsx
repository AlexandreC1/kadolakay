import { useRouter } from "expo-router";
import { Package } from "phosphor-react-native";
import { StyleSheet, View } from "react-native";
import { useCopy } from "@/copy";
import { useStore } from "@/data/StoreProvider";
import { findList } from "@/data/store";
import { space } from "@/theme/tokens";
import { Card, Empty, Pill, Reveal } from "@/ui/bits";
import { GiftArt } from "@/ui/GiftArt";
import { Screen } from "@/ui/Screen";
import { T } from "@/ui/Text";

export default function Purchases() {
  const router = useRouter();
  const { state } = useStore();
  const k = useCopy();
  const mine = state.user ? state.orders.filter((o) => o.buyerId === state.user!.id) : [];
  return (
    <Screen back title={k.t.purchases.title}>
      {mine.length === 0 ? <Empty icon={Package} text={k.t.account.purchasesEmpty} /> : (
        <View style={{ gap: space.sm }}>
          {mine.map((o, i) => {
            const line = o.lines[0];
            return (
              <Reveal key={o.id} index={i}>
                <Card onPress={() => router.push({ pathname: "/purchases/[id]", params: { id: o.id } })} label={`${line.title}, ${k.t.purchases.status[o.status]}`} style={styles.row}>
                  <GiftArt id={line.giftId} name={line.title} size="thumb" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="bodyStrong" numberOfLines={1}>{line.title}</T>
                    <T variant="caption" color="muted" numberOfLines={1}>{k.t.purchases.forList(findList(state, o.registrySlug)?.title ?? "")}</T>
                    <Pill label={k.t.purchases.status[o.status]} tone={o.status === "DELIVERED" ? "success" : "accent"} />
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
