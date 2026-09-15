import { useState } from "react";
import { loadKey, saveKey } from "./storage";

// Synchronous read on first render — localStorage is fast enough that there
// is no reason to make the UI wait behind a loading state.
export function useStored(key, fallback) {
  const [data, setData] = useState(() => loadKey(key, fallback));

  const save = (next) => {
    setData(next);
    saveKey(key, next);
  };

  return [data, save];
}
