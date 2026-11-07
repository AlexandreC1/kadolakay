import { useRouter } from "expo-router";
import { X } from "phosphor-react-native";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCopy } from "@/copy";
import { useColors } from "@/data/StoreProvider";
import { hit, radius, space } from "@/theme/tokens";
import { Tap } from "./Tap";
import { T } from "./Text";

/**
 * Layout for routes presented as native form sheets (offer, share, pick a list).
 * The sheet itself is the platform's, so it drags, snaps and dismisses natively.
 */
export function SheetScreen({ title, subtitle, children, footer, onClose }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; onClose?: () => void }) {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useCopy();
  const close = onClose ?? (() => (router.canGoBack() ? router.back() : router.replace("/")));
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.root, { backgroundColor: c.canvas }]}>
      <View style={[styles.head, { paddingTop: Platform.OS === "web" ? insets.top + space.md : space.lg }]}>
        <View style={{ flex: 1 }}>
          <T variant="title" accessibilityRole="header">{title}</T>
          {subtitle ? <T color="muted" numberOfLines={2}>{subtitle}</T> : null}
        </View>
        <Tap accessibilityLabel={t.common.close} onPress={close} style={[styles.close, { backgroundColor: c.surfaceMuted }]}>
          <X size={18} color={c.ink} weight="bold" />
        </Tap>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>{children}</ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + space.sm, borderColor: c.line }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.sm, paddingHorizontal: space.md, paddingBottom: space.sm },
  close: { width: hit - 8, height: hit - 8, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginTop: 2 },
  body: { paddingHorizontal: space.md, paddingBottom: space.lg, gap: space.lg },
  footer: { paddingHorizontal: space.md, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: space.xs },
});
