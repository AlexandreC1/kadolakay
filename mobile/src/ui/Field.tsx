import { MagnifyingGlass, XCircle } from "phosphor-react-native";
import { type ComponentRef, forwardRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { useColors } from "@/data/StoreProvider";
import { fonts, hit, radius, space } from "@/theme/tokens";
import { T } from "./Text";

export const Field = forwardRef<ComponentRef<typeof TextInput>, TextInputProps & { label: string; hint?: string; error?: string; optionalLabel?: string }>(
  function Field({ label, hint, error, optionalLabel, style, ...input }, ref) {
    const c = useColors();
    const [focus, setFocus] = useState(false);
    return (
      <View style={styles.wrap}>
        <T variant="label" color="secondary">
          {label}{optionalLabel ? <T variant="caption" color="muted">{`  ${optionalLabel}`}</T> : null}
        </T>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={c.muted}
          {...input}
          onFocus={(e) => { setFocus(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); input.onBlur?.(e); }}
          style={[
            styles.input,
            input.multiline && styles.multi,
            { color: c.ink, backgroundColor: c.surface, borderColor: error ? c.error : focus ? c.accentInk : c.lineStrong },
            style,
          ]}
        />
        {error ? <T variant="caption" color="error" accessibilityLiveRegion="polite">{error}</T> : hint ? <T variant="caption" color="muted">{hint}</T> : null}
      </View>
    );
  },
);

export function SearchField({ value, onChangeText, placeholder, onSubmit, autoFocus }: { value: string; onChangeText: (s: string) => void; placeholder: string; onSubmit?: () => void; autoFocus?: boolean }) {
  const c = useColors();
  return (
    <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.line }]}>
      <MagnifyingGlass size={20} color={c.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.searchInput, { color: c.ink }]}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear" hitSlop={10} onPress={() => onChangeText("")}>
          <XCircle size={20} color={c.muted} weight="fill" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, fontFamily: fonts.regular, fontSize: 16 },
  multi: { minHeight: 96, paddingTop: 14, textAlignVertical: "top" },
  search: { flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: 50, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: space.md },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 16, minHeight: hit },
});
