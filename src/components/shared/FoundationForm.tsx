import { foundationsCopy } from "@/lib/foundations-copy";
import { FoundationActionForm } from "./FoundationActionForm";
import type { FoundationResult } from "@/lib/foundation-result";
import type { ReactNode } from "react";
export function FoundationForm({
  locale,
  ...props
}: {
  locale: string;
  label: string;
  action: (
    previous: FoundationResult,
    form: FormData,
  ) => Promise<FoundationResult>;
  children: ReactNode;
}) {
  const c = foundationsCopy(locale);
  return (
    <FoundationActionForm
      {...props}
      messages={{
        saved: c.saved,
        failed: c.failed,
        premiumInactive: c.premiumInactive,
        saving: c.saving,
        invalidDetails: c.invalidDetails,
      }}
    />
  );
}
