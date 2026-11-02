import { FoundationForm } from "@/components/shared/FoundationForm";
import { saveSeasonCampaign } from "@/actions/workspaces";
import { workspaceCopy } from "@/lib/workspace-copy";
import { seasons } from "@/lib/seasons";
import { occasions } from "@/lib/gift-discovery";
import { foundationsCopy } from "@/lib/foundations-copy";
import { haitiDate } from "@/lib/campaign";
type Campaign = {
  id: string;
  titleEN: string;
  titleFR: string;
  titleHT: string;
  season: string;
  kind: string;
  occasion: string;
  startsAt: Date;
  endsAt: Date;
  priority: number;
  enabled: boolean;
};
export function CampaignForm({
  locale,
  campaign,
}: {
  locale: string;
  campaign?: Campaign;
}) {
  const c = workspaceCopy(locale),
    f = foundationsCopy(locale),
    today = haitiDate(new Date());
  return (
    <FoundationForm action={saveSeasonCampaign} locale={locale} label={c.save}>
      {campaign && <input type="hidden" name="id" value={campaign.id} />}{" "}
      {(["titleEN", "titleFR", "titleHT"] as const).map((field) => (
        <div key={field}>
          <label htmlFor={`${campaign?.id || "new"}-${field}`}>
            {c.title} ({field.slice(-2)})
          </label>
          <input
            id={`${campaign?.id || "new"}-${field}`}
            name={field}
            required
            minLength={2}
            maxLength={120}
            defaultValue={campaign?.[field] || ""}
          />
        </div>
      ))}
      <label htmlFor={`season-${campaign?.id || "new"}`}>{c.preset}</label>
      <select
        name="season"
        id={`season-${campaign?.id || "new"}`}
        defaultValue={campaign?.season || "everyday"}
      >
        {seasons.map((s) => (
          <option key={s} value={s}>
            {s === "everyday" ? f.standard : f[s]}
          </option>
        ))}
      </select>
      <label htmlFor={`kind-${campaign?.id || "new"}`}>{c.campaignKind}</label>
      <select
        name="kind"
        id={`kind-${campaign?.id || "new"}`}
        defaultValue={campaign?.kind || "GIFTING"}
      >
        <option value="GIFTING">{c.GIFTING}</option>
        <option value="COMMEMORATION">{c.COMMEMORATION}</option>
      </select>
      <label htmlFor={`occasion-${campaign?.id || "new"}`}>{c.occasion}</label>
      <select
        name="occasion"
        id={`occasion-${campaign?.id || "new"}`}
        defaultValue={campaign?.occasion || "ANY"}
      >
        {occasions.map((o) => (
          <option value={o} key={o}>
            {f.occasions[o]}
          </option>
        ))}
      </select>
      <label htmlFor={`start-${campaign?.id || "new"}`}>{c.startDate}</label>
      <input
        type="date"
        name="startDate"
        id={`start-${campaign?.id || "new"}`}
        required
        defaultValue={campaign ? haitiDate(campaign.startsAt) : today}
      />
      <label htmlFor={`end-${campaign?.id || "new"}`}>{c.endDate}</label>
      <input
        type="date"
        name="endDate"
        id={`end-${campaign?.id || "new"}`}
        required
        defaultValue={
          campaign ? haitiDate(new Date(campaign.endsAt.getTime() - 1)) : today
        }
      />
      <label htmlFor={`priority-${campaign?.id || "new"}`}>{c.priority}</label>
      <input
        name="priority"
        id={`priority-${campaign?.id || "new"}`}
        type="number"
        min={0}
        max={100}
        required
        defaultValue={campaign?.priority || 0}
      />
      <label className="workspace-check">
        <input
          type="checkbox"
          name="enabled"
          value="true"
          defaultChecked={campaign?.enabled || false}
        />
        {c.enabledCampaign}
      </label>
    </FoundationForm>
  );
}
