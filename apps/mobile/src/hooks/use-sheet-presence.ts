import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { openSheetCountAtom } from "@/state/ui";

// Registra que um sheet está aberto enquanto `open` for true (a tab bar some
// nesse período). Usa contador para suportar sheets sobrepostos.
export function useSheetPresence(open: boolean) {
  const setCount = useSetAtom(openSheetCountAtom);
  useEffect(() => {
    if (!open) return;
    setCount((c) => c + 1);
    return () => setCount((c) => Math.max(0, c - 1));
  }, [open, setCount]);
}
