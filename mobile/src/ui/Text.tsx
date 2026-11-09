import { Text as RNText, type TextProps } from "react-native";
import { useColors } from "@/data/StoreProvider";
import { type Colors, type as typeScale } from "@/theme/tokens";

type Variant = keyof typeof typeScale;

export function T({ variant = "body", color = "ink", style, ...rest }: TextProps & { variant?: Variant; color?: keyof Colors }) {
  const c = useColors();
  return <RNText maxFontSizeMultiplier={1.6} {...rest} style={[typeScale[variant], { color: c[color] }, style]} />;
}
