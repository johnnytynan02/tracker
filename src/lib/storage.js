// Storage adapter.
//
// Right now: localStorage. Fast, no backend, works offline.
// Trade-off: data lives in ONE browser on ONE device, and clearing site data wipes it.
// Use Settings > Export regularly until you swap in a real backend.
//
// To move to Supabase/Postgres later, reimplement loadKey/saveKey here.
// Nothing else in the app touches storage directly.

const PREFIX = "tracker:";

export function loadKey(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    console.error("storage read failed", key, e);
    return fallback;
  }
}

export function saveKey(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("storage write failed", key, e);
    return false;
  }
}

export const ALL_KEYS = [
  "workouts",
  "routines",
  "exercise-names",
  "food-library",
  "meals",
  "food-log",
  "weight-log",
  "niggle-log",
  "niggle-regions",
  "niggle-config",
  "test-metrics",
  "test-entries",
];

export function exportAll() {
  const out = { exportedAt: new Date().toISOString(), version: 1, data: {} };
  ALL_KEYS.forEach((k) => {
    out.data[k] = loadKey(k, null);
  });
  return out;
}

export function importAll(parsed) {
  if (!parsed || typeof parsed !== "object" || !parsed.data) throw new Error("Not a tracker backup file");
  let n = 0;
  Object.entries(parsed.data).forEach(([k, v]) => {
    if (ALL_KEYS.includes(k) && v !== null) {
      saveKey(k, v);
      n++;
    }
  });
  return n;
}
