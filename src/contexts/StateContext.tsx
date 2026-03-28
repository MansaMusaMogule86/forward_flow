import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { type State } from "@/types/state";
import { STATES, getDefaultState } from "@/data/states";

const STORAGE_KEY = "ffc:selectedState";

type Ctx = {
  selectedState: State;
  setSelectedState: (state: State) => void;
};

const StateContext = createContext<Ctx | undefined>(undefined);

export const StateProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedState, setSelectedState] = useState<State>(getDefaultState());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        const valid = STATES.find((s) => s.code === parsed.code);
        if (valid) setSelectedState(valid);
      }
    } catch (_e) { /* localStorage unavailable */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedState));
    } catch (_e) { /* localStorage unavailable */ }
  }, [selectedState]);

  const value = useMemo(() => ({ selectedState, setSelectedState }), [selectedState]);
  return <StateContext.Provider value={value}>{children}</StateContext.Provider>;
};

export const useStateContext = () => {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error("useStateContext must be used within StateProvider");
  return ctx;
};
