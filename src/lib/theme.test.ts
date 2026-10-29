import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import postcss from "postcss";
import { parseTheme, resolveTheme, shouldAnimateTheme, themePreferenceCookie } from "./theme";
describe("visitor theme preference", () => {
  it("accepts only known non-sensitive preference values", () => {
    expect(parseTheme("light")).toBe("light"); expect(parseTheme("dark")).toBe("dark");
    for (const value of [undefined, "system", "dark; Path=/admin", {}, "<script>"]) expect(parseTheme(value)).toBe("system");
  });
  it("resolves system without overriding explicit preferences", () => {
    expect(resolveTheme("system", true)).toBe("dark"); expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light"); expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("bounds and scopes a preference cookie without accepting injected attributes", () => {
    expect(themePreferenceCookie("dark", true)).toBe("kadolakay-theme=dark; Path=/; Max-Age=31536000; SameSite=Lax; Secure");
    expect(themePreferenceCookie("light", false)).not.toContain("Secure");
  });
  it("skips animation for reduced motion, unsupported browsers and unchanged system appearance", () => {
    expect(shouldAnimateTheme("light","dark",false,false,true)).toBe(true);
    expect(shouldAnimateTheme("light","dark",false,true,true)).toBe(false);
    expect(shouldAnimateTheme("light","dark",false,false,false)).toBe(false);
    expect(shouldAnimateTheme("system","dark",true,false,true)).toBe(false);
  });
  it("keeps actual stylesheet text/action/status contrast above WCAG normal-text minimum", () => {
    const css = postcss.parse(readFileSync("src/app/globals.css", "utf8") + readFileSync("src/app/theme.css", "utf8"));
    for (const mode of ["light", "dark"]) {
    const values: Record<string,string> = {};
    css.walkRules(rule => { if (rule.selector === ":root" || (mode === "dark" && rule.selector === "html[data-theme=dark]")) rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; }); });
    const resolve = (value: string, depth = 0): string => {
      if (depth > 8 || !value) throw new Error("Unresolved contrast token");
      const match = value.match(/^var\((--[\w-]+)\)$/);
      return match ? resolve(values[match[1]], depth + 1) : value;
    };
    const luminance = (raw: string) => {
      const value = resolve(raw);
      let rgb: number[];
      if (/^#[0-9a-f]{6}$/i.test(value)) rgb = value.slice(1).match(/../g)!.map(part => parseInt(part,16)/255);
      else {
        const [h,s,l] = value.match(/[\d.]+/g)!.map(Number);
        const c = (1 - Math.abs(2*l/100 - 1))*s/100, x = c*(1-Math.abs((h/60)%2-1)), m = l/100-c/2;
        rgb = [[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(h/60)].map(channel => channel+m);
      }
      const [r,g,b] = rgb.map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
      return r*.2126+g*.7152+b*.0722;
    };
    for (const [fg,bg] of [["--brand-ink","--brand-canvas"],["--brand-muted","--brand-surface"],["--brand-on-action","--brand-action"],["--brand-error","--brand-error-surface"],["--brand-warning","--brand-warning-surface"],["--brand-success","--brand-success-surface"]]) {
      const a=luminance(values[fg]), b=luminance(values[bg]); expect((Math.max(a,b)+.05)/(Math.min(a,b)+.05),`${mode}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    }
  });
});
