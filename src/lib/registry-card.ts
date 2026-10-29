import sharp, { type OverlayOptions } from "sharp";
import { join } from "node:path";
import { formatEventDate } from "./event-date";
import { isOccasion, occasionLabel } from "./occasions";

const copy = {
  en: { WEDDING: "Wedding gift registry", BABY_SHOWER: "Baby gift registry", BIRTHDAY: "Birthday gift registry", generic: "Gift registry", scan: "Scan to view the gift list", link: "Or open this link", local: "Local preview. Guests need the deployed website link." },
  fr: { WEDDING: "Liste de cadeaux de mariage", BABY_SHOWER: "Liste de cadeaux pour bébé", BIRTHDAY: "Liste de cadeaux d’anniversaire", generic: "Liste de cadeaux", scan: "Scannez pour voir la liste de cadeaux", link: "Ou ouvrez ce lien", local: "Aperçu local. Vos proches ont besoin du lien du site déployé." },
  ht: { WEDDING: "Lis kado pou maryaj", BABY_SHOWER: "Lis kado pou tibebe", BIRTHDAY: "Lis kado pou fèt anivèsè", generic: "Lis kado", scan: "Eskane pou wè lis kado a", link: "Oswa louvri lyen sa a", local: "Egzanp lokal. Envite yo bezwen lyen sit ki deplwaye a." },
};
/** Escape untrusted titles/URLs before passing them to Pango markup. */
function escape(value: string) {
  return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}
async function text(value: string, size: number, color: string, bold = false) {
  return sharp({ text: { text: `<span foreground="${color}"${bold ? ' weight="bold"' : ""}>${escape(value)}</span>`, font: `Manrope ${size}`, fontfile: join(process.cwd(), "src/assets/fonts/Manrope.ttf"), width: 1040, wrap: "word-char", align: "centre", spacing: 12, rgba: true } }).png().toBuffer({ resolveWithObject: true });
}
export async function renderRegistryShareCard(registry: { title: string; type: string; eventDate: Date | null }, url: string, locale: string, qrPng: Buffer) {
  const c = copy[locale as keyof typeof copy] || copy.en;
  const title = registry.title.replace(/\s+/gu, " ").trim();
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
  const [brand, kind, heading, date, instruction, linkLabel, address, notice] = await Promise.all([
    text("Bayou", 38, "#086858", true),
    text(c[registry.type as "WEDDING" | "BABY_SHOWER" | "BIRTHDAY"] || (isOccasion(registry.type) ? `${occasionLabel(registry.type, locale)} · ${c.generic}` : c.generic), 25, "#516E64"),
    text(title, 62, "#102E29", true),
    registry.eventDate ? text(formatEventDate(registry.eventDate, locale), 30, "#516E64") : null,
    text(c.scan, 30, "#102E29", true), text(c.link, 23, "#516E64"), text(url, 25, "#086858"),
    local ? text(c.local, 21, "#9E3525") : null,
  ]);
  const layers: OverlayOptions[] = [];
  let y = 62;
  function add(block: { data: Buffer; info: { width: number; height: number } }, gap: number) {
    layers.push({ input: block.data, left: Math.round((1200-block.info.width)/2), top: y });
    y += block.info.height + gap;
  }
  add(brand, 50); add(kind, 24); add(heading, 24);
  if (date) add(date, 32);
  add(instruction, 24);
  // QR retains its opaque white four-module quiet zone, without overlaid text or logos.
  layers.push({ input: qrPng, left: 220, top: y }); y += 760 + 30;
  add(linkLabel, 14); add(address, 64);
  if (notice) add(notice, 40);
  const background = Buffer.from(`<svg width="1200" height="${y}" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="${y}" fill="#F7FAF9"/><rect width="1200" height="12" fill="#5EEAD4"/></svg>`);
  return sharp(background).composite(layers).withMetadata({ density: 300 }).png().toBuffer();
}
