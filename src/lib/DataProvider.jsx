import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase, isConfigured } from "./supabase";
import { loadKey, saveKey, ALL_KEYS } from "./storage";

// Everything loads ONCE here, at app start, into memory. Tabs then read and
// write synchronously against that, which is why none of them need loading
// states or async handling.
//
// Writes go to localStorage immediately (so the UI never waits, and the app
// works offline) and are pushed to Supabase in the background. The cloud copy
// is the source of truth on load; localStorage is the offline fallback.

const DataContext = createContext(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData outside DataProvider");
  return ctx;
};

// Drop-in replacement for the old localStorage hook — same signature, so tab
// components didn't change when this moved to the cloud.
export function useStored(key, fallback) {
  const { data, setKey } = useData();
  const value = data[key] === undefined || data[key] === null ? fallback : data[key];
  return [value, (next) => setKey(key, next)];
}

export function DataProvider({ userId, children }) {
  const [data, setData] = useState(() => {
    const seed = {};
    ALL_KEYS.forEach((k) => (seed[k] = loadKey(k, null)));
    return seed;
  });
  const [status, setStatus] = useState(isConfigured && userId ? "loading" : "local");
  const pending = useRef(new Map());
  const timer = useRef(null);

  // ---- initial pull ----
  useEffect(() => {
    if (!isConfigured || !userId) {
      setStatus("local");
      return;
    }
    let cancelled = false;
    (async () => {
      setStatus("loading");
      const { data: rows, error } = await supabase.from("user_data").select("key, value").eq("user_id", userId);
      if (cancelled) return;
      if (error) {
        console.error("cloud load failed", error);
        setStatus("offline");
        return;
      }
      const cloud = {};
      rows.forEach((r) => (cloud[r.key] = r.value));

      // First sign-in on a device that already has local data: push it up
      // rather than silently discarding it.
      const orphans = ALL_KEYS.filter((k) => cloud[k] === undefined && Array.isArray(loadKey(k, null)) && loadKey(k, []).length > 0);
      if (orphans.length) {
        const payload = orphans.map((k) => ({ user_id: userId, key: k, value: loadKey(k, null) }));
        const { error: upErr } = await supabase.from("user_data").upsert(payload, { onConflict: "user_id,key" });
        if (!upErr) orphans.forEach((k) => (cloud[k] = loadKey(k, null)));
      }

      const merged = {};
      ALL_KEYS.forEach((k) => {
        merged[k] = cloud[k] !== undefined ? cloud[k] : loadKey(k, null);
        if (cloud[k] !== undefined) saveKey(k, cloud[k]);
      });
      setData(merged);
      setStatus("synced");
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ---- debounced push ----
  // Typing into a set field fires a write per keystroke; batching means one
  // request a second instead of thirty.
  const flush = async () => {
    if (!isConfigured || !userId || pending.current.size === 0) return;
    const batch = [...pending.current.entries()].map(([key, value]) => ({ user_id: userId, key, value }));
    pending.current.clear();
    setStatus("saving");
    const { error } = await supabase.from("user_data").upsert(batch, { onConflict: "user_id,key" });
    setStatus(error ? "offline" : "synced");
    if (error) console.error("cloud save failed", error);
  };

  const setKey = (key, value) => {
    setData((d) => ({ ...d, [key]: value }));
    saveKey(key, value);
    if (!isConfigured || !userId) return;
    pending.current.set(key, value);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 1200);
  };

  // Don't lose the last edit if the app is closed mid-debounce.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  });

  return <DataContext.Provider value={{ data, setKey, status, userId }}>{children}</DataContext.Provider>;
}
