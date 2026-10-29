import { useTranslations } from "next-intl";

export default function Loading() {
  const t = useTranslations("common");
  return <div className="loading-state" role="status"><span className="loading-ring" aria-hidden="true" /><p>{t("loading")}</p></div>;
}
