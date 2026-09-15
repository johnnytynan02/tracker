// Flatten the nested app state into tidy, one-row-per-observation tables.
//
// The app stores data shaped for the UI (a workout contains exercises which
// contain sets). That's awkward to query. These exports flatten it so each
// row is a single observation with its date attached — the shape you want in
// DuckDB or a spreadsheet without any unnesting.

import { loadKey } from "./storage";
import { KINDS, normaliseExercise } from "./schema";

const esc = (v) => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCSV = (rows, columns) => [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c])).join(","))].join("\n");

export function buildTables() {
  const tables = {};

  // --- sets: one row per set, per exercise, per workout ---
  const setRows = [];
  (loadKey("workouts", []) || []).forEach((w) => {
    w.exercises.forEach((exRaw) => {
      const ex = normaliseExercise(exRaw);
      (exRaw.sets || []).forEach((s, i) => {
        setRows.push({
          date: w.date,
          workout_id: w.id,
          routine: w.routineName || "",
          exercise: ex.name,
          kind: ex.kind,
          set_number: i + 1,
          weight_kg: s.weight ?? "",
          reps: s.reps ?? "",
          minutes: s.minutes ?? "",
          distance_km: s.distance ?? "",
          speed_kmh: s.speed ?? "",
          incline_pct: s.incline ?? "",
          rounds: s.rounds ?? "",
          volume_kg: ex.kind === "strength" && s.weight && s.reps ? Number(s.weight) * Number(s.reps) : "",
        });
      });
    });
  });
  tables.workout_sets = {
    rows: setRows,
    columns: ["date", "workout_id", "routine", "exercise", "kind", "set_number", "weight_kg", "reps", "minutes", "distance_km", "speed_kmh", "incline_pct", "rounds", "volume_kg"],
  };

  // --- food: one row per logged item ---
  tables.food_log = {
    rows: (loadKey("food-log", []) || []).map((l) => ({
      date: l.date,
      slot: l.slot || "",
      item: l.name,
      calories: l.calories,
      protein_g: l.protein,
      carbs_g: l.carbs,
      fat_g: l.fat,
    })),
    columns: ["date", "slot", "item", "calories", "protein_g", "carbs_g", "fat_g"],
  };

  // --- weight ---
  tables.weight_log = {
    rows: [...(loadKey("weight-log", []) || [])].sort((a, b) => (a.date > b.date ? 1 : -1)).map((e) => ({ date: e.date, weight_kg: e.weight })),
    columns: ["date", "weight_kg"],
  };

  // --- niggles: long format, one row per body area per day ---
  // Long rather than wide so adding a body area doesn't change the schema.
  const nigRows = [];
  (loadKey("niggle-log", []) || []).forEach((e) => {
    Object.entries(e.soreness || {}).forEach(([region, score]) => {
      nigRows.push({
        date: e.date,
        region,
        soreness: score,
        activities: (e.activity || []).join("; "),
        activity_detail: e.activityDetail || "",
        soreness_detail: e.sorenessDetail || "",
        notes: e.notes || "",
      });
    });
  });
  tables.niggle_log = { rows: nigRows, columns: ["date", "region", "soreness", "activities", "activity_detail", "soreness_detail", "notes"] };

  // --- niggle scale answers, also long ---
  const scaleRows = [];
  (loadKey("niggle-log", []) || []).forEach((e) => {
    Object.entries(e.scales || {}).forEach(([key, value]) => scaleRows.push({ date: e.date, question: key, value }));
    // pre-config entries stored these as top-level fields
    if (e.intensity != null) scaleRows.push({ date: e.date, question: "intensity", value: e.intensity });
    if (e.stiffness != null) scaleRows.push({ date: e.date, question: "stiffness", value: e.stiffness });
  });
  tables.niggle_scales = { rows: scaleRows, columns: ["date", "question", "value"] };

  // --- test metrics ---
  const metrics = loadKey("test-metrics", []) || [];
  tables.test_metrics = {
    rows: (loadKey("test-entries", []) || []).map((e) => {
      const m = metrics.find((x) => x.id === e.metricId);
      return { date: e.date, metric: m?.name || e.metricId, unit: m?.unit || "", value: e.value };
    }),
    columns: ["date", "metric", "unit", "value"],
  };

  return tables;
}

export function tableToCSV(name) {
  const t = buildTables()[name];
  return t ? toCSV(t.rows, t.columns) : "";
}

export function tableSummary() {
  const t = buildTables();
  return Object.entries(t).map(([name, v]) => ({ name, rows: v.rows.length }));
}

export function download(filename, text, mime = "text/csv") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
