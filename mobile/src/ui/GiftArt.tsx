import { StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useColors, useScheme } from "@/data/StoreProvider";
import { radius } from "@/theme/tokens";
import { T } from "./Text";

const tints = { light: ["#EAF3EF", "#C7F3EA", "#DCEAE5", "#F3EEDF"], dark: ["#193B31", "#1D4A40", "#16332C", "#2B3A2C"] };

/**
 * A gift without a photo, as on the web: a tinted tile that carries the gift's
 * name in Fraunces. The tint is stable per gift so a shelf never repeats one tile.
 * A faint woven corner ties it to the list's progress band.
 */
export function GiftArt({ id, name, size = "tile", style }: { id: string; name: string; size?: "tile" | "thumb" | "hero"; style?: ViewStyle }) {
  const c = useColors();
  const scheme = useScheme();
  const tint = tints[scheme][[...id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 4];
  const thumb = size === "thumb";
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.base, { backgroundColor: tint, borderRadius: size === "hero" ? radius.xl : thumb ? radius.md : radius.lg }, size === "hero" ? styles.hero : thumb ? styles.thumb : styles.tile, style]}
    >
      <Svg width={thumb ? 28 : 64} height={thumb ? 28 : 64} viewBox="0 0 64 64" style={styles.weave}>
        {[10, 26, 42, 58].map((p) => <Path key={`h${p}`} d={`M${p} 0 V64`} stroke={c.accentInk} strokeOpacity={0.07} strokeWidth={6} />)}
        {[14, 38].map((p) => <Path key={`v${p}`} d={`M0 ${p} H64`} stroke={c.accentInk} strokeOpacity={0.05} strokeWidth={8} />)}
      </Svg>
      {thumb ? (
        <T variant="displaySmall" style={{ fontSize: 20, lineHeight: 24 }}>{initials(name)}</T>
      ) : size === "hero" ? (
        // The gift page titles the gift right below, so the picture carries its monogram instead.
        <T variant="display" style={{ fontSize: 64, lineHeight: 72, color: c.accentInk }}>{initials(name)}</T>
      ) : (
        <T variant="displaySmall" numberOfLines={4} style={{ fontSize: 18, lineHeight: 22 }}>
          {name}
        </T>
      )}
    </View>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

const styles = StyleSheet.create({
  base: { overflow: "hidden", justifyContent: "flex-end", padding: 14 },
  tile: { aspectRatio: 1 },
  hero: { aspectRatio: 1.6, padding: 24, alignItems: "center", justifyContent: "center" },
  thumb: { width: 56, height: 56, padding: 0, alignItems: "center", justifyContent: "center" },
  weave: { position: "absolute", top: 0, right: 0 },
});
