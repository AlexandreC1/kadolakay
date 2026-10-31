import { Baby, Cake, Gift, Heart, type LucideProps } from "lucide-react";

const ICONS: Record<string, typeof Gift> = {
  BABY_SHOWER: Baby,
  WEDDING: Heart,
  BIRTHDAY: Cake,
};

/** Icon for a registry type; falls back to a gift box for unknown types. */
export function RegistryTypeIcon({
  type,
  ...props
}: { type?: string | null } & LucideProps) {
  const Icon = (type && ICONS[type]) || Gift;
  return <Icon aria-hidden="true" {...props} />;
}
