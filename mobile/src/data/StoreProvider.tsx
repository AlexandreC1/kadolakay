import { getLocales } from "expo-localization";
import { createContext, type Dispatch, type ReactNode, useContext, useMemo, useReducer } from "react";
import { useColorScheme } from "react-native";
import { palette, type Colors } from "@/theme/tokens";
import { type Action, initialState, reducer, type State } from "./store";
import type { Locale } from "./types";

const StoreContext = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);

function deviceLocale(): Locale {
  const code = getLocales()[0]?.languageCode;
  return code === "en" || code === "ht" ? code : "fr";
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(deviceLocale()));
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/** Resolved light or dark, honouring the person's choice over the system setting. */
export function useScheme(): "light" | "dark" {
  const system = useColorScheme();
  const { state } = useStore();
  return state.theme === "system" ? (system === "dark" ? "dark" : "light") : state.theme;
}

export function useColors(): Colors {
  return palette[useScheme()];
}
