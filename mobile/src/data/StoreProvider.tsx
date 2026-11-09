import { getLocales } from "expo-localization";
import { createContext, type Dispatch, type ReactNode, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { useColorScheme } from "react-native";
import { palette, type Colors } from "@/theme/tokens";
import { type Actions, makeActions } from "./actions";
import { type Action, initialState, reducer, type State } from "./store";
import type { Locale } from "./types";

/** The app has one store; actions read its latest committed state from here. */
let latest: State | null = null;

const StoreContext = createContext<{ state: State; dispatch: Dispatch<Action>; actions: Actions } | null>(null);

function deviceLocale(): Locale {
  const code = getLocales()[0]?.languageCode;
  return code === "en" || code === "ht" ? code : "fr";
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(deviceLocale()));
  // Actions read the latest state without re-creating themselves on every change.
  useEffect(() => { latest = state; }, [state]);
  const [actions] = useState(() => makeActions(dispatch, () => latest ?? initialState()));
  useEffect(() => { void actions.boot(); }, [actions]);
  const value = useMemo(() => ({ state, dispatch, actions }), [state, actions]);
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
