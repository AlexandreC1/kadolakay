import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { Copy, ShareNetwork, WarningCircle, WhatsappLogo } from "phosphor-react-native";
import { Linking, Share, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useCopy } from "@/copy";
import { listUrl } from "@/config";
import { useColors, useStore } from "@/data/StoreProvider";
import { findList } from "@/data/store";
import { radius, space } from "@/theme/tokens";
import { Banner, Empty } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { SheetScreen } from "@/ui/Sheet";
import { T } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/**
 * The share card follows the web's downloadable card: title, occasion, date,
 * a QR code with a clear quiet zone and nothing over its modules, and the readable link.
 */
export default function ShareSheet() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const c = useColors();
  const toast = useToast();
  const { state } = useStore();
  const k = useCopy();
  const list = findList(state, slug);
  if (!list || list.visibility === "PRIVATE" && list.ownerId !== state.user?.id) {
    return <SheetScreen title={k.t.sharing.title}><Empty icon={WarningCircle} text={k.t.list.notFound} /></SheetScreen>;
  }
  const url = listUrl(list.slug, state.locale);
  const message = k.t.sharing.message(list.title, url);

  return (
    <SheetScreen
      title={k.t.sharing.title}
      footer={
        <>
          <Button full icon={WhatsappLogo} label={k.t.sharing.whatsapp} onPress={() => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`)} />
          <View style={styles.pair}>
            <Button kind="secondary" icon={Copy} label={k.t.sharing.copy} style={{ flex: 1 }} onPress={async () => { await Clipboard.setStringAsync(url); toast(k.t.sharing.copied); }} />
            <Button kind="secondary" icon={ShareNetwork} label={k.t.sharing.more} style={{ flex: 1 }} onPress={() => void Share.share({ message, url })} />
          </View>
        </>
      }
    >
      {list.status === "DRAFT" ? <Banner tone="warning" icon={WarningCircle}>{k.t.sharing.draftWarning}</Banner> : null}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]} accessible accessibilityLabel={`${list.title}. ${k.t.sharing.scan}. ${url}`}>
        <View style={styles.brand}>
          <View style={[styles.mark, { backgroundColor: c.action }]}><T variant="label" style={{ color: c.onAction }}>B</T></View>
          <T variant="label">Bayou</T>
        </View>
        <T variant="overline" color="accentInk">{[k.occasion(list.type), list.eventDate ? k.date(list.eventDate) : null].filter(Boolean).join(" · ").toUpperCase()}</T>
        <T variant="display" style={{ textAlign: "center" }}>{list.title}</T>
        <View style={styles.qr}>
          {/* Always dark on white so every phone camera reads it, in either theme. */}
          <QRCode value={url} size={184} color="#102E29" backgroundColor="#FFFFFF" quietZone={16} ecl="M" />
        </View>
        <T variant="label" color="secondary">{k.t.sharing.scan}</T>
        <T variant="caption" color="muted" selectable style={{ textAlign: "center" }}>{url}</T>
      </View>
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", gap: space.sm, borderWidth: 1, borderRadius: radius.xl, padding: space.lg },
  brand: { flexDirection: "row", alignItems: "center", gap: 6 },
  mark: { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  qr: { padding: 4, backgroundColor: "#FFFFFF", borderRadius: radius.md, marginVertical: space.xs },
  pair: { flexDirection: "row", gap: space.xs },
});
