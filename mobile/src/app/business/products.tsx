import { Redirect } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { errorText, useCopy } from "@/copy";
import { useStore } from "@/data/StoreProvider";
import { space } from "@/theme/tokens";
import { Card, Pill, Reveal, Stepper } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { GiftArt } from "@/ui/GiftArt";
import { Screen } from "@/ui/Screen";
import { T } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/** Stock is the one thing a shop changes often, so it is edited right in the list and saved at once. */
export default function MerchantProducts() {
  const { state, actions } = useStore();
  const k = useCopy();
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  if (!state.shop) return <Redirect href="/business" />;

  const set = async (id: string, value: number | null) => {
    setSaving(id);
    try { await actions.setStock(id, value); } catch (e) { toast(errorText(k.t, e)); } finally { setSaving(null); }
  };

  return (
    <Screen back title={k.t.merchant.products} subtitle={k.t.merchant.stockHint}>
      <View style={{ gap: space.sm }}>
        {state.shop.products.map((p, i) => (
          <Reveal key={p.id} index={i}>
            <Card style={{ gap: space.sm, opacity: saving === p.id ? 0.6 : 1 }}>
              <View style={styles.head}>
                <GiftArt id={p.id} name={p.name} size="thumb" />
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="bodyStrong">{p.name}</T>
                  <T variant="caption" color="muted">{`${k.money(p.priceHTG, "HTG")} · ${k.money(p.priceUSD, "USD")}`}</T>
                  {p.stockQuantity === 0 ? <Pill label={k.t.gift.outOfStock} tone="warning" /> : p.stockQuantity === null ? <Pill label={k.t.merchant.stockUnknown} /> : null}
                </View>
              </View>
              <View style={styles.stock}>
                <T variant="label" color="secondary" style={{ flex: 1 }}>{k.t.merchant.stock}</T>
                {/* Unconfirmed stock starts the stepper at zero; the first tap confirms a number. */}
                <Stepper label={`${k.t.merchant.stock} ${p.name}`} value={p.stockQuantity ?? 0} min={0} max={999} onChange={(n) => void set(p.id, n)} />
              </View>
              {p.stockQuantity !== null ? (
                <Button small kind="quiet" label={k.t.merchant.setUnknown} onPress={() => void set(p.id, null)} style={{ alignSelf: "flex-end" }} />
              ) : null}
            </Card>
          </Reveal>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", gap: space.sm, alignItems: "center" },
  stock: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
