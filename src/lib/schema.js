// Shared vocabulary + migrations.
//
// Exercise kinds exist because "3 sets of 60kg x 8" and "30 min treadmill at
// 8% incline" are not the same shape of data. Forcing cardio into weight/reps
// columns is what makes most gym apps bad at anything that isn't lifting.

export const KINDS = {
  strength: {
    label: "Strength",
    fields: [
      { key: "weight", label: "kg", width: 1 },
      { key: "reps", label: "reps", width: 1 },
    ],
    multiSet: true,
    summarise: (sets) => sets.map((s) => `${s.weight || "–"}×${s.reps || "–"}`).join(", "),
  },
  cardio: {
    label: "Cardio",
    fields: [
      { key: "minutes", label: "mins", width: 1 },
      { key: "speed", label: "km/h", width: 1 },
      { key: "incline", label: "incline %", width: 1 },
      { key: "distance", label: "km", width: 1 },
    ],
    multiSet: true, // intervals
    summarise: (sets) =>
      sets
        .map((s) => {
          const bits = [];
          if (s.minutes) bits.push(`${s.minutes} min`);
          if (s.speed) bits.push(`${s.speed} km/h`);
          if (s.incline) bits.push(`${s.incline}%`);
          if (s.distance) bits.push(`${s.distance} km`);
          return bits.join(" · ") || "–";
        })
        .join(" | "),
  },
  mobility: {
    label: "Mobility",
    fields: [
      { key: "minutes", label: "mins", width: 1 },
      { key: "rounds", label: "rounds", width: 1 },
    ],
    multiSet: false,
    summarise: (sets) =>
      sets
        .map((s) => [s.minutes ? `${s.minutes} min` : null, s.rounds ? `${s.rounds} rounds` : null].filter(Boolean).join(" · ") || "done")
        .join(", "),
  },
};

export const KIND_IDS = Object.keys(KINDS);

export const emptySet = (kind) => {
  const o = { id: Math.random().toString(36).slice(2, 10) };
  KINDS[kind].fields.forEach((f) => (o[f.key] = ""));
  return o;
};

export const setHasData = (kind, s) => KINDS[kind].fields.some((f) => s[f.key] !== "" && s[f.key] != null);

// Early versions stored exercises as bare strings and assumed everything was
// a lift. Upgrade them in place on read.
export const normaliseExercise = (e) => (typeof e === "string" ? { name: e, kind: "strength" } : { kind: "strength", ...e });

export const MEAL_SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"];

export const slotForNow = () => {
  const h = new Date().getHours();
  if (h < 11) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 21) return "Dinner";
  return "Snack";
};

export const addDays = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
