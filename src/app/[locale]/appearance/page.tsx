import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { foundationsCopy } from "@/lib/foundations-copy";
import { parseSeasonPreference, seasonCookie } from "@/lib/seasons";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { saveSeasonPreference } from "@/actions/foundations";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

export default async function AppearancePage() {
  const locale = await getLocale();
  const c = foundationsCopy(locale);
  const preference = parseSeasonPreference(
    (await cookies()).get(seasonCookie)?.value,
  );
  return (
    <div className="foundation-page foundation-narrow">
      <header className="foundation-intro">
        <h1>{c.season}</h1>
        <p>{c.seasonalHelp}</p>
      </header>
      <ThemeSwitcher showLabel />
      <FoundationForm
        action={saveSeasonPreference}
        label={c.savePreference}
        locale={locale}
      >
        <label htmlFor="preference">{c.season}</label>
        <select id="preference" name="preference" defaultValue={preference}>
          <option value="auto">{c.seasonalOn}</option>
          <option value="off">{c.seasonalOff}</option>
        </select>
      </FoundationForm>
    </div>
  );
}
