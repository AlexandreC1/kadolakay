import { z } from "zod";
import { seasons, type Season } from "./seasons";
import { occasions } from "./gift-discovery";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    try {
      return new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
    } catch {
      return false;
    }
  });
export const campaignSchema = z
  .strictObject({
    id: z.string().max(100).optional(),
    titleEN: z.string().trim().min(2).max(120),
    titleFR: z.string().trim().min(2).max(120),
    titleHT: z.string().trim().min(2).max(120),
    season: z.enum(seasons),
    kind: z.enum(["GIFTING", "COMMEMORATION"]),
    occasion: z.enum(occasions),
    startDate: date,
    endDate: date,
    priority: z.number().int().min(0).max(100),
    enabled: z.boolean(),
  })
  .superRefine((v, c) => {
    if (
      v.endDate < v.startDate ||
      Date.parse(v.endDate) - Date.parse(v.startDate) > 366 * 86400000
    )
      c.addIssue({ code: "custom", message: "Choose a window up to one year" });
    if (v.kind === "COMMEMORATION" && v.occasion !== "ANY")
      c.addIssue({
        code: "custom",
        message: "Commemorations do not promote gifts",
      });
  });
export function haitiMidnight(value: string) {
  date.parse(value);
  const target = Date.parse(`${value}T00:00:00Z`);
  let instant = target;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Port-au-Prince",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(instant)).map((p) => [p.type, p.value]),
    );
    const local = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const next = target - (local - instant);
    if (next === instant) break;
    instant = next;
  }
  return new Date(instant);
}
export function inclusiveCampaignEnd(value: string) {
  date.parse(value);
  return haitiMidnight(
    new Date(Date.parse(`${value}T00:00:00Z`) + 86400000)
      .toISOString()
      .slice(0, 10),
  );
}
export function haitiDate(value: Date) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Port-au-Prince",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const parts = Object.fromEntries(p.map((v) => [v.type, v.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export type CampaignView = {
  id: string;
  season: string;
  kind: string;
  occasion: string;
  titleEN: string;
  titleFR: string;
  titleHT: string;
  startsAt: Date;
  endsAt: Date;
  priority: number;
};
export function activeCampaign(
  rows: CampaignView[],
  now: Date,
): CampaignView | undefined {
  return rows
    .filter((c) => c.startsAt <= now && c.endsAt > now)
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))[0];
}
export function campaignSeason(value: string): Season {
  return seasons.includes(value as Season) ? (value as Season) : "everyday";
}
