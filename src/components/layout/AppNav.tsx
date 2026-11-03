"use client";
import { Gift, Home, ListChecks, Plus, Store, UserRound } from "lucide-react";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { activeTab, shellCopy } from "@/lib/shell-copy";
import styles from "./app-shell.module.css";

const tabs = [
  { key: "home", href: "/", icon: Home },
  { key: "lists", href: "/find", icon: ListChecks },
  { key: "gifts", href: "/discover", icon: Gift },
  { key: "shops", href: "/browse", icon: Store },
] as const;

/** Top-bar sections on wide screens. The current one sits on a raised pill. */
export function AppNav() {
  const c = shellCopy(useLocale());
  const current = activeTab(usePathname());
  return (
    <nav className={styles.nav} aria-label={c.primary}>
      {tabs.map((tab) => (
        <Link key={tab.key} href={tab.href} aria-current={current === tab.key ? "page" : undefined}>
          {c[tab.key]}
        </Link>
      ))}
    </nav>
  );
}

/** Phone tab bar: the four sections, the account, and one raised action to start a list. */
export function TabBar({ signedIn }: { signedIn: boolean }) {
  const c = shellCopy(useLocale());
  const current = activeTab(usePathname());
  const items = [
    tabs[0],
    tabs[1],
    { key: "new", href: "/create", icon: Plus },
    tabs[2],
    { key: "account", href: signedIn ? "/dashboard" : "/login", icon: UserRound },
  ] as const;
  return (
    <nav className={styles.tabBar} aria-label={c.primary}>
      {items.map((item) => {
        const Icon = item.icon;
        const label = item.key === "new" ? c.newList : c[item.key];
        return (
          <Link
            key={item.key}
            href={item.href}
            className={item.key === "new" ? styles.tabNew : undefined}
            aria-current={item.key !== "new" && current === item.key ? "page" : undefined}
          >
            <span className={styles.tabIcon}>
              <Icon size={item.key === "new" ? 22 : 21} strokeWidth={item.key === "new" ? 2.4 : 1.9} aria-hidden="true" />
            </span>
            <span className={styles.tabLabel}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function NewListButton() {
  const c = shellCopy(useLocale());
  return (
    <Link href="/create" className={styles.newList}>
      <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
      {c.newList}
    </Link>
  );
}
