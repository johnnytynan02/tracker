import React, { useState, useEffect, useMemo } from "react";
import { Dumbbell, Utensils, Scale, Activity, Ruler, Plus, Trash2, Check, X, Sparkles, Pencil, ChevronRight, Search, Barcode } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const ACTIVITY_TYPES = ["Running", "Gym – lower body", "Gym – upper body", "Cycling", "Walking", "Stretching / mobility", "Physio exercises", "Rest day", "Long time sitting", "Other"];
const SORENESS_LABELS = ["None", "Slight niggle", "Noticeable", "Sore", "Very sore"];

const C = { bg: "#14161A", card: "#1E2126", line: "#2A2E35", input: "#101317", text: "#EDEEF0", dim: "#8B909A", faint: "#5B5F66", accent: "#5EA8A0", warn: "#D9895A" };

function useStored(key, fallback) {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(key);
        setData(r ? JSON.parse(r.value) : fallback);
      } catch {
        setData(fallback);
      }
    })();
  }, [key]);
  const save = async (next) => {
    setData(next);
    try {
      await window.storage.set(key, JSON.stringify(next));
    } catch (e) {
      console.error("storage set failed", key, e);
    }
  };
  return [data, save];
}

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, ...style }}>{children}</div>
);
const SectionTitle = ({ children, style }) => <div style={{ fontSize: 13, color: C.dim, marginBottom: 8, fontWeight: 500, ...style }}>{children}</div>;
const Empty = ({ text }) => <div style={{ color: C.faint, textAlign: "center", padding: "24px 0", fontSize: 13, lineHeight: 1.5 }}>{text}</div>;
const Loading = () => <div style={{ color: C.faint, textAlign: "center", padding: 40, fontSize: 13 }}>Loading…</div>;

const inputStyle = { width: "100%", background: C.input, border: `1px solid ${C.line}`, borderRadius: 7, color: C.text, fontSize: 15, padding: "9px 10px", boxSizing: "border-box" };
const NumInput = (p) => <input {...p} type="number" inputMode="decimal" style={{ ...inputStyle, fontFamily: "ui-monospace, Menlo, monospace", padding: "8px 9px", ...p.style }} />;
const TextInput = (p) => <input {...p} style={{ ...inputStyle, ...p.style }} />;

function Btn({ children, onClick, variant = "primary", style, disabled }) {
  const v = {
    primary: { background: C.accent, color: "#0E1210" },
    ghost: { background: "transparent", color: C.dim, border: `1px solid ${C.line}` },
    danger: { background: "transparent", color: C.warn, border: `1px solid ${C.line}` },
  }[variant];
  return (
    <button disabled={disabled} onClick={onClick} style={{ border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 14, fontWeight: 600, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, ...v, ...style }}>
      {children}
    </button>
  );
}

const sorenessColor = (v) => ["#3A3F47", C.accent, "#D2B65B", C.warn, "#C25B4D"][v] || "#3A3F47";

function NameAdder({ names, onAdd, placeholder }) {
  const [val, setVal] = useState("");
  const listId = useMemo(() => "dl-" + uid(), []);
  const submit = () => { if (val.trim()) { onAdd(val.trim()); setVal(""); } };
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <TextInput list={listId} value={val} placeholder={placeholder} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      <datalist id={listId}>{names.map((n) => <option key={n} value={n} />)}</datalist>
      <Btn onClick={submit}><Plus size={15} /></Btn>
    </div>
  );
}

// ================= TRAIN =================
function TrainTab() {
  const [workouts, setWorkouts] = useStored("workouts", []);
  const [routines, setRoutines] = useStored("routines", []);
  const [exNames, setExNames] = useStored("exercise-names", []);
  const [draft, setDraft] = useState(null);
  const [editRoutine, setEditRoutine] = useState(null);

  const lastPerf = useMemo(() => {
    const list = [...(workouts || [])].sort((a, b) => (a.date > b.date ? 1 : -1));
    return (name) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const ex = list[i].exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
        if (ex) return { date: list[i].date, sets: ex.sets };
      }
      return null;
    };
  }, [workouts]);

  if (!workouts || !routines || !exNames) return <Loading />;

  const buildExercise = (name) => {
    const last = lastPerf(name);
    return {
      id: uid(),
      name,
      last,
      sets: last ? last.sets.map((s) => ({ id: uid(), weight: s.weight, reps: s.reps, done: false })) : [{ id: uid(), weight: "", reps: "", done: false }],
    };
  };

  const startFromRoutine = (r) => setDraft({ id: uid(), date: today(), routineName: r.name, exercises: r.exercises.map(buildExercise) });
  const startBlank = () => setDraft({ id: uid(), date: today(), routineName: "", exercises: [] });

  const addExercise = (name) => {
    const n = name.trim();
    if (!n) return;
    setDraft({ ...draft, exercises: [...draft.exercises, buildExercise(n)] });
    if (!exNames.includes(n)) setExNames([...exNames, n]);
  };

  const updEx = (exId, patch) => setDraft({ ...draft, exercises: draft.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) });
  const updSet = (exId, setId, patch) => {
    const ex = draft.exercises.find((e) => e.id === exId);
    updEx(exId, { sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) });
  };
  const addSet = (exId) => {
    const ex = draft.exercises.find((e) => e.id === exId);
    const l = ex.sets[ex.sets.length - 1];
    updEx(exId, { sets: [...ex.sets, { id: uid(), weight: l?.weight ?? "", reps: l?.reps ?? "", done: false }] });
  };
  const rmSet = (exId, setId) => {
    const ex = draft.exercises.find((e) => e.id === exId);
    updEx(exId, { sets: ex.sets.filter((s) => s.id !== setId) });
  };

  const finish = () => {
    const clean = {
      id: draft.id,
      date: draft.date,
      routineName: draft.routineName,
      exercises: draft.exercises
        .map((e) => ({ id: e.id, name: e.name, sets: e.sets.filter((s) => s.weight !== "" || s.reps !== "").map(({ id, weight, reps }) => ({ id, weight, reps })) }))
        .filter((e) => e.sets.length > 0),
    };
    if (clean.exercises.length === 0) return setDraft(null);
    setWorkouts([...workouts, clean]);
    setDraft(null);
  };

  if (editRoutine) {
    const saveRoutine = () => {
      if (!editRoutine.name.trim()) return;
      const exists = routines.some((r) => r.id === editRoutine.id);
      setRoutines(exists ? routines.map((r) => (r.id === editRoutine.id ? editRoutine : r)) : [...routines, editRoutine]);
      const missing = editRoutine.exercises.filter((n) => !exNames.includes(n));
      if (missing.length) setExNames([...exNames, ...missing]);
      setEditRoutine(null);
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Routine</span>
          <Btn variant="ghost" onClick={() => setEditRoutine(null)}><X size={15} />Cancel</Btn>
        </div>
        <TextInput placeholder="Name — e.g. Upper body day" value={editRoutine.name} onChange={(e) => setEditRoutine({ ...editRoutine, name: e.target.value })} />
        <Card>
          <SectionTitle>Exercises</SectionTitle>
          {editRoutine.exercises.length === 0 && <div style={{ color: C.faint, fontSize: 13, marginBottom: 10 }}>None yet.</div>}
          {editRoutine.exercises.map((n, i) => (
            <div key={n + i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontSize: 14 }}>{n}</span>
              <Trash2 size={15} color={C.faint} style={{ cursor: "pointer" }} onClick={() => setEditRoutine({ ...editRoutine, exercises: editRoutine.exercises.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <NameAdder names={exNames} placeholder="Add exercise…" onAdd={(n) => setEditRoutine({ ...editRoutine, exercises: [...editRoutine.exercises, n] })} />
          </div>
        </Card>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={saveRoutine} style={{ flex: 1, padding: 12 }}>Save routine</Btn>
          {routines.some((r) => r.id === editRoutine.id) && (
            <Btn variant="danger" onClick={() => { setRoutines(routines.filter((r) => r.id !== editRoutine.id)); setEditRoutine(null); }}>Delete</Btn>
          )}
        </div>
      </div>
    );
  }

  if (draft) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {draft.routineName && <div style={{ fontWeight: 700, fontSize: 16 }}>{draft.routineName}</div>}
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 13, padding: 0 }} />
          </div>
          <Btn variant="ghost" onClick={() => setDraft(null)}><X size={15} />Cancel</Btn>
        </div>

        {draft.exercises.map((ex) => (
          <Card key={ex.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontWeight: 600 }}>{ex.name}</div>
              <Trash2 size={15} color={C.faint} style={{ cursor: "pointer" }} onClick={() => setDraft({ ...draft, exercises: draft.exercises.filter((e) => e.id !== ex.id) })} />
            </div>
            <div style={{ fontSize: 12, color: ex.last ? C.dim : C.faint, marginBottom: 10 }}>
              {ex.last ? `Last (${fmtDate(ex.last.date)}): ${ex.last.sets.map((s) => `${s.weight || "–"}×${s.reps || "–"}`).join(", ")}` : "First time — no previous data"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 32px 26px", gap: 6, fontSize: 11, color: C.faint, marginBottom: 5 }}>
              <span>#</span><span>kg</span><span>reps</span><span /><span />
            </div>
            {ex.sets.map((s, i) => (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 32px 26px", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: C.faint, fontSize: 13 }}>{i + 1}</span>
                <NumInput value={s.weight} placeholder="0" onChange={(e) => updSet(ex.id, s.id, { weight: e.target.value })} />
                <NumInput value={s.reps} placeholder="0" onChange={(e) => updSet(ex.id, s.id, { reps: e.target.value })} />
                <div onClick={() => updSet(ex.id, s.id, { done: !s.done })} style={{ height: 32, borderRadius: 6, background: s.done ? C.accent : C.input, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {s.done && <Check size={15} color="#0E1210" />}
                </div>
                <Trash2 size={14} color={C.faint} style={{ cursor: "pointer" }} onClick={() => rmSet(ex.id, s.id)} />
              </div>
            ))}
            <Btn variant="ghost" onClick={() => addSet(ex.id)} style={{ width: "100%", marginTop: 4 }}><Plus size={14} />Add set</Btn>
          </Card>
        ))}

        <Card><NameAdder names={exNames} placeholder="Add exercise…" onAdd={addExercise} /></Card>
        <Btn onClick={finish} style={{ padding: 13 }}>Finish workout</Btn>
      </div>
    );
  }

  const history = [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <SectionTitle>Routines — tap to start</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {routines.map((r) => (
            <Card key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 13 }}>
              <div onClick={() => startFromRoutine(r)} style={{ cursor: "pointer", flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.exercises.join(" · ") || "No exercises yet"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingLeft: 10 }}>
                <Pencil size={15} color={C.faint} style={{ cursor: "pointer" }} onClick={() => setEditRoutine({ ...r })} />
                <ChevronRight size={19} color={C.accent} style={{ cursor: "pointer" }} onClick={() => startFromRoutine(r)} />
              </div>
            </Card>
          ))}
          <Btn variant="ghost" onClick={() => setEditRoutine({ id: uid(), name: "", exercises: [] })} style={{ padding: 11 }}><Plus size={15} />New routine</Btn>
        </div>
      </div>

      <Btn onClick={startBlank} style={{ padding: 12 }}><Plus size={16} />Empty workout</Btn>

      <div>
        <SectionTitle>History</SectionTitle>
        {history.length === 0 && <Empty text="No workouts logged yet." />}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {history.map((w) => (
            <Card key={w.id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontWeight: 600 }}>{w.routineName || "Workout"}</span>
                <span style={{ fontSize: 12, color: C.dim }}>{fmtDate(w.date)}</span>
              </div>
              {w.exercises.map((ex) => (
                <div key={ex.id} style={{ fontSize: 13, color: "#C7CBD1", marginBottom: 3 }}>
                  <span style={{ color: C.dim }}>{ex.name}: </span>
                  {ex.sets.map((s) => `${s.weight || "–"}×${s.reps || "–"}`).join(", ")}
                </div>
              ))}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================= FOOD DATA SOURCES =================
const OFF_SEARCH = (q) =>
  `https://uk.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=25&fields=code,product_name,brands,quantity,serving_size,serving_quantity,nutriments`;
const OFF_BARCODE = (code) =>
  `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,brands,quantity,serving_size,serving_quantity,nutriments`;

// Map an OFF product record into our per-100g shape. Returns null if macros are missing.
function mapOffProduct(p) {
  const n = p?.nutriments || {};
  const kcal = n["energy-kcal_100g"] ?? (n["energy_100g"] != null ? n["energy_100g"] / 4.184 : null);
  if (kcal == null || !p.product_name) return null;
  return {
    code: p.code,
    name: [p.brands?.split(",")[0]?.trim(), p.product_name].filter(Boolean).join(" ").slice(0, 60),
    quantity: p.quantity || "",
    servingG: Number(p.serving_quantity) || null,
    servingLabel: p.serving_size || "",
    per100: {
      calories: Math.round(kcal * 10) / 10,
      protein: Math.round((n.proteins_100g ?? 0) * 10) / 10,
      carbs: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
      fat: Math.round((n.fat_100g ?? 0) * 10) / 10,
    },
  };
}

const scale = (per100, grams) => ({
  calories: (per100.calories * grams) / 100,
  protein: (per100.protein * grams) / 100,
  carbs: (per100.carbs * grams) / 100,
  fat: (per100.fat * grams) / 100,
});

// ================= EAT =================
function EatTab() {
  const [library, setLibrary] = useStored("food-library", []);
  const [log, setLog] = useStored("food-log", []);
  const [mode, setMode] = useState("search");
  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState(null);
  const [picked, setPicked] = useState(null); // {name, per100, grams} or {name, fixed:{...}}
  const [editing, setEditing] = useState(null);

  if (!library || !log) return <Loading />;

  const todayLog = log.filter((l) => l.date === today());
  const totals = todayLog.reduce(
    (a, l) => ({ calories: a.calories + (+l.calories || 0), protein: a.protein + (+l.protein || 0), carbs: a.carbs + (+l.carbs || 0), fat: a.fat + (+l.fat || 0) }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const pushLog = (name, m) => setLog([...log, { id: uid(), date: today(), name, calories: +m.calories || 0, protein: +m.protein || 0, carbs: +m.carbs || 0, fat: +m.fat || 0 }]);

  const logFromLibrary = (item) => {
    if (item.per100) pushLog(`${item.name} (${item.grams}g)`, scale(item.per100, item.grams));
    else pushLog(item.name, item.fixed);
  };

  const reset = () => { setResults(null); setPicked(null); setErr(""); };

  // --- Open Food Facts text search ---
  const runSearch = async () => {
    if (!q.trim()) return;
    setBusy(true); setErr(""); setResults(null); setPicked(null);
    try {
      const res = await fetch(OFF_SEARCH(q));
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const mapped = (data.products || []).map(mapOffProduct).filter(Boolean).slice(0, 12);
      setResults(mapped);
      if (mapped.length === 0) setErr("Nothing usable came back. Try fewer words, or scan the barcode instead.");
    } catch (e) {
      console.error(e);
      setErr("Couldn't reach Open Food Facts. If this keeps happening it's the sandbox blocking the request, not your search — use Describe or Manual below.");
    }
    setBusy(false);
  };

  // --- Open Food Facts barcode lookup ---
  const runBarcode = async () => {
    const c = code.trim();
    if (!c) return;
    setBusy(true); setErr(""); setResults(null); setPicked(null);
    try {
      const res = await fetch(OFF_BARCODE(c));
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (data.status !== 1) { setErr(`Barcode ${c} isn't in Open Food Facts yet. Enter it manually below — and consider adding it via the Open Food Facts app so it's there next time.`); }
      else {
        const m = mapOffProduct(data.product);
        if (!m) setErr("That product is in the database but has no nutrition data. Enter it off the packet below.");
        else setPicked({ name: m.name, per100: m.per100, grams: String(m.servingG || 100), servingLabel: m.servingLabel, source: "Open Food Facts" });
      }
    } catch (e) {
      console.error(e);
      setErr("Couldn't reach Open Food Facts. If this keeps happening it's the sandbox blocking the request — use Describe or Manual below.");
    }
    setBusy(false);
  };

  // --- Claude estimate fallback ---
  const runEstimate = async () => {
    if (!q.trim()) return;
    setBusy(true); setErr(""); setResults(null); setPicked(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Estimate macros per 100g for this food as eaten in the UK.\n\nFood: "${q}"\n\nRespond with ONLY a JSON object, no markdown fences and no preamble:\n{"name":"short label under 40 chars","calories":number,"protein":number,"carbs":number,"fat":number,"grams":number,"note":"one short sentence on what you assumed"}\nThe calories/protein/carbs/fat values are PER 100g. "grams" is a sensible default portion size in grams for this food.`,
          }],
        }),
      });
      const data = await res.json();
      const text = data.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
      const p = JSON.parse(text.replace(/```json|```/g, "").trim());
      setPicked({ name: p.name, per100: { calories: p.calories, protein: p.protein, carbs: p.carbs, fat: p.fat }, grams: String(p.grams || 100), note: p.note, source: "Estimate" });
    } catch (e) {
      console.error(e);
      setErr("Couldn't estimate that. Try rephrasing, or enter it off the packet.");
    }
    setBusy(false);
  };

  const commitPicked = (alsoSave) => {
    const grams = Number(picked.grams) || 0;
    pushLog(`${picked.name} (${grams}g)`, scale(picked.per100, grams));
    if (alsoSave) setLibrary([...library, { id: uid(), name: picked.name, per100: picked.per100, grams, source: picked.source }]);
    setPicked(null); setResults(null); setQ(""); setCode("");
  };

  const MODES = [
    { id: "search", label: "Search", icon: Search },
    { id: "barcode", label: "Barcode", icon: Barcode },
    { id: "estimate", label: "Describe", icon: Sparkles },
    { id: "manual", label: "Manual", icon: Pencil },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
      <Card style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        {[["kcal", totals.calories], ["protein", totals.protein], ["carbs", totals.carbs], ["fat", totals.fat]].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 19, fontWeight: 600 }}>{Math.round(v)}</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </Card>

      <div>
        <SectionTitle>Your foods — tap to log</SectionTitle>
        {library.length === 0 ? (
          <Empty text="Nothing saved yet. Find something below and it lands here for one-tap logging next time." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {library.map((m) => {
              const macros = m.per100 ? scale(m.per100, m.grams) : m.fixed;
              return (
                <div key={m.id} onClick={() => logFromLibrary(m)} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, cursor: "pointer", position: "relative" }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4, paddingRight: 30, lineHeight: 1.3 }}>{m.name}</div>
                  <div style={{ fontSize: 11.5, color: C.dim, fontFamily: "ui-monospace, Menlo, monospace" }}>
                    {m.per100 ? `${m.grams}g · ` : ""}{Math.round(macros.calories)} kcal
                  </div>
                  <div style={{ fontSize: 11.5, color: C.faint, fontFamily: "ui-monospace, Menlo, monospace", marginTop: 2 }}>
                    P{Math.round(macros.protein)} C{Math.round(macros.carbs)} F{Math.round(macros.fat)}
                  </div>
                  <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 7 }}>
                    {m.per100 && <Pencil size={12} color={C.faint} onClick={(e) => { e.stopPropagation(); setEditing({ ...m }); }} />}
                    <X size={13} color={C.faint} onClick={(e) => { e.stopPropagation(); setLibrary(library.filter((x) => x.id !== m.id)); }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <Card>
          <SectionTitle>Default portion for {editing.name}</SectionTitle>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <NumInput value={editing.grams} onChange={(e) => setEditing({ ...editing, grams: e.target.value })} style={{ width: 90 }} />
            <span style={{ color: C.dim, fontSize: 13 }}>grams · {Math.round(scale(editing.per100, Number(editing.grams) || 0).calories)} kcal</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn onClick={() => { setLibrary(library.map((x) => (x.id === editing.id ? { ...x, grams: Number(editing.grams) || 0 } : x))); setEditing(null); }}>Save</Btn>
            <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <Btn key={m.id} variant={mode === m.id ? "primary" : "ghost"} onClick={() => { setMode(m.id); reset(); }} style={{ flex: 1, padding: "9px 4px", fontSize: 12.5, gap: 4 }}>
              <Icon size={14} />{m.label}
            </Btn>
          );
        })}
      </div>

      {mode === "search" && !picked && (
        <Card>
          <SectionTitle>Search Open Food Facts (UK)</SectionTitle>
          <div style={{ display: "flex", gap: 8 }}>
            <TextInput placeholder="e.g. Tesco chicken thigh" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()} />
            <Btn onClick={runSearch} disabled={busy}>{busy ? "…" : <Search size={15} />}</Btn>
          </div>
          {err && <div style={{ color: C.warn, fontSize: 12.5, marginTop: 10, lineHeight: 1.5 }}>{err}</div>}
          {results && results.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {results.map((r) => (
                <div key={r.code} onClick={() => setPicked({ name: r.name, per100: r.per100, grams: String(r.servingG || 100), servingLabel: r.servingLabel, source: "Open Food Facts" })} style={{ padding: "10px 0", borderTop: `1px solid ${C.line}`, cursor: "pointer" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.35 }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: C.dim, fontFamily: "ui-monospace, Menlo, monospace", marginTop: 3 }}>
                    per 100g: {r.per100.calories} kcal · P{r.per100.protein} C{r.per100.carbs} F{r.per100.fat}
                    {r.quantity ? ` · ${r.quantity}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {mode === "barcode" && !picked && (
        <Card>
          <SectionTitle>Barcode lookup</SectionTitle>
          <div style={{ display: "flex", gap: 8 }}>
            <TextInput inputMode="numeric" placeholder="Type the EAN, e.g. 5000119410054" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runBarcode()} />
            <Btn onClick={runBarcode} disabled={busy}>{busy ? "…" : <Search size={15} />}</Btn>
          </div>
          {err && <div style={{ color: C.warn, fontSize: 12.5, marginTop: 10, lineHeight: 1.5 }}>{err}</div>}
          <div style={{ fontSize: 11.5, color: C.faint, marginTop: 10, lineHeight: 1.5 }}>Barcode lookup is the most reliable path — type it for now; a real phone build would use the camera.</div>
        </Card>
      )}

      {mode === "estimate" && !picked && (
        <Card>
          <SectionTitle>Describe it — for anything without a barcode</SectionTitle>
          <div style={{ display: "flex", gap: 8 }}>
            <TextInput placeholder='e.g. "grilled chicken thigh, skin off"' value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runEstimate()} />
            <Btn onClick={runEstimate} disabled={busy}>{busy ? "…" : <Sparkles size={15} />}</Btn>
          </div>
          {err && <div style={{ color: C.warn, fontSize: 12.5, marginTop: 10, lineHeight: 1.5 }}>{err}</div>}
          <div style={{ fontSize: 11.5, color: C.faint, marginTop: 10, lineHeight: 1.5 }}>Estimates, not label data. For anything you eat often, check it against the packet.</div>
        </Card>
      )}

      {mode === "manual" && !picked && (
        <ManualEntry
          onDone={(item, save) => {
            const grams = Number(item.grams) || 100;
            pushLog(`${item.name} (${grams}g)`, scale(item.per100, grams));
            if (save) setLibrary([...library, { id: uid(), name: item.name, per100: item.per100, grams, source: "Manual" }]);
          }}
        />
      )}

      {picked && (
        <Card>
          <SectionTitle>Check the portion{picked.source ? ` · ${picked.source}` : ""}</SectionTitle>
          <TextInput value={picked.name} onChange={(e) => setPicked({ ...picked, name: e.target.value })} />
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
            <NumInput value={picked.grams} onChange={(e) => setPicked({ ...picked, grams: e.target.value })} style={{ width: 92 }} />
            <span style={{ fontSize: 13, color: C.dim }}>grams{picked.servingLabel ? ` · pack serving is ${picked.servingLabel}` : ""}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
            {(() => {
              const m = scale(picked.per100, Number(picked.grams) || 0);
              return [["kcal", m.calories], ["protein", m.protein], ["carbs", m.carbs], ["fat", m.fat]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 17, fontWeight: 600 }}>{Math.round(v)}</div>
                  <div style={{ fontSize: 10.5, color: C.dim, marginTop: 2 }}>{l}</div>
                </div>
              ));
            })()}
          </div>
          {picked.note && <div style={{ fontSize: 12, color: C.dim, marginTop: 12, lineHeight: 1.5 }}>{picked.note}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn onClick={() => commitPicked(true)} style={{ flex: 1 }}>Log &amp; save</Btn>
            <Btn variant="ghost" onClick={() => commitPicked(false)}>Log once</Btn>
            <Btn variant="ghost" onClick={() => setPicked(null)}><X size={15} /></Btn>
          </div>
        </Card>
      )}

      <div>
        <SectionTitle>Today</SectionTitle>
        {todayLog.length === 0 && <Empty text="Nothing logged today." />}
        {[...todayLog].reverse().map((l) => (
          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.line}`, gap: 10 }}>
            <span style={{ fontSize: 13.5, minWidth: 0 }}>{l.name}</span>
            <span style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: C.dim, fontFamily: "ui-monospace, Menlo, monospace" }}>{Math.round(l.calories)} kcal</span>
              <Trash2 size={14} color={C.faint} style={{ cursor: "pointer" }} onClick={() => setLog(log.filter((x) => x.id !== l.id))} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManualEntry({ onDone }) {
  const [f, setF] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", grams: "100" });
  const pack = (save) => {
    onDone({ name: f.name.trim(), grams: f.grams, per100: { calories: +f.calories || 0, protein: +f.protein || 0, carbs: +f.carbs || 0, fat: +f.fat || 0 } }, save);
    setF({ name: "", calories: "", protein: "", carbs: "", fat: "", grams: "100" });
  };
  return (
    <Card>
      <SectionTitle>Type it off the label — per 100g</SectionTitle>
      <TextInput placeholder="Name — e.g. Tesco chicken thigh fillets" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: 9 }}>
        {[["calories", "kcal"], ["protein", "protein"], ["carbs", "carbs"], ["fat", "fat"]].map(([k, l]) => (
          <div key={k}>
            <div style={{ fontSize: 10.5, color: C.faint, marginBottom: 4 }}>{l}</div>
            <NumInput value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
        <NumInput value={f.grams} onChange={(e) => setF({ ...f, grams: e.target.value })} style={{ width: 92 }} />
        <span style={{ fontSize: 13, color: C.dim }}>grams you normally eat</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 13 }}>
        <Btn disabled={!f.name.trim()} onClick={() => pack(true)} style={{ flex: 1 }}>Log &amp; save</Btn>
        <Btn variant="ghost" disabled={!f.name.trim()} onClick={() => pack(false)}>Log once</Btn>
      </div>
    </Card>
  );
}

// ================= WEIGHT =================
function WeightTab() {
  const [entries, setEntries] = useStored("weight-log", []);
  const [val, setVal] = useState("");
  const [range, setRange] = useState(90);

  if (!entries) return <Loading />;

  const sorted = [...entries].sort((a, b) => (a.date > b.date ? 1 : -1));

  const add = () => {
    if (!val) return;
    setEntries([...entries.filter((e) => e.date !== today()), { date: today(), weight: Number(val) }]);
    setVal("");
  };

  const withTrend = sorted.map((e, i) => {
    const win = sorted.slice(Math.max(0, i - 6), i + 1);
    return { date: e.date, label: fmtDate(e.date), weight: e.weight, trend: +(win.reduce((s, x) => s + x.weight, 0) / win.length).toFixed(2) };
  });

  const cutoff = new Date(Date.now() - range * 864e5).toISOString().slice(0, 10);
  const chartData = range === 0 ? withTrend : withTrend.filter((d) => d.date >= cutoff);

  const latest = sorted[sorted.length - 1];
  const delta = (days) => {
    if (!latest) return null;
    const c = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    const earlier = sorted.filter((e) => e.date <= c);
    const past = earlier.length ? earlier[earlier.length - 1] : null;
    if (!past || past.date === latest.date) return null;
    return latest.weight - past.weight;
  };

  const Delta = ({ v, label }) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 16, fontWeight: 600, color: v === null ? C.faint : v > 0 ? C.warn : v < 0 ? C.accent : C.text }}>
        {v === null ? "–" : `${v > 0 ? "+" : ""}${v.toFixed(1)}`}
      </div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
      <Card>
        <div style={{ display: "flex", gap: 8 }}>
          <NumInput placeholder="Weight today (kg)" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <Btn onClick={add}>Log</Btn>
        </div>
      </Card>

      {latest && (
        <Card style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 25, fontWeight: 700 }}>{latest.weight}</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>kg · {fmtDate(latest.date)}</div>
          </div>
          <Delta v={delta(7)} label="7 days" />
          <Delta v={delta(30)} label="30 days" />
          <Delta v={delta(90)} label="90 days" />
        </Card>
      )}

      {chartData.length >= 2 ? (
        <Card style={{ padding: "14px 6px 8px 0" }}>
          <div style={{ display: "flex", gap: 6, padding: "0 10px 12px 14px" }}>
            {[[30, "30d"], [90, "90d"], [365, "1y"], [0, "All"]].map(([d, l]) => (
              <div key={l} onClick={() => setRange(d)} style={{ fontSize: 12, padding: "4px 11px", borderRadius: 14, cursor: "pointer", background: range === d ? C.accent : "transparent", color: range === d ? "#0E1210" : C.dim, border: `1px solid ${range === d ? C.accent : C.line}` }}>{l}</div>
            ))}
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 14, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke={C.dim} fontSize={11} tickLine={false} minTickGap={26} />
                <YAxis stroke={C.dim} fontSize={11} tickLine={false} width={44} domain={["dataMin - 0.8", "dataMax + 0.8"]} tickFormatter={(v) => v.toFixed(1)} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13 }} labelStyle={{ color: C.dim }} formatter={(v, n) => [`${v} kg`, n === "trend" ? "7-day average" : "Logged"]} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => <span style={{ color: C.dim }}>{v === "trend" ? "7-day average" : "Logged"}</span>} />
                <Line type="monotone" dataKey="weight" stroke={C.faint} strokeWidth={1} dot={{ r: 2, fill: C.faint }} />
                <Line type="monotone" dataKey="trend" stroke={C.accent} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : (
        <Empty text="Log on two days to see the trend." />
      )}

      <div>
        <SectionTitle>All entries</SectionTitle>
        {[...sorted].reverse().map((e) => (
          <div key={e.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 14 }}>
            <span style={{ color: C.dim }}>{fmtDate(e.date)}</span>
            <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{e.weight} kg</span>
              <Trash2 size={14} color={C.faint} style={{ cursor: "pointer" }} onClick={() => setEntries(entries.filter((x) => x.date !== e.date))} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================= NIGGLES =================
function NigglesTab() {
  const [log, setLog] = useStored("niggle-log", []);
  const [regions, setRegions] = useStored("niggle-regions", ["Right Hip", "Right Lower back", "Right Groin", "Left Knee"]);
  const [form, setForm] = useState(null);

  if (!log || !regions) return <Loading />;

  const start = () => setForm({ id: uid(), date: today(), activity: [], activityDetail: "", intensity: 3, soreness: Object.fromEntries(regions.map((r) => [r, 0])), sorenessDetail: "", stiffness: 0, notes: "" });

  if (form) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ background: "transparent", border: "none", color: C.text, fontSize: 16, fontWeight: 600, padding: 0 }} />
          <Btn variant="ghost" onClick={() => setForm(null)}><X size={15} />Cancel</Btn>
        </div>

        <Card>
          <SectionTitle>What did you do today?</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ACTIVITY_TYPES.map((a) => {
              const on = form.activity.includes(a);
              return <div key={a} onClick={() => setForm({ ...form, activity: on ? form.activity.filter((x) => x !== a) : [...form.activity, a] })} style={{ padding: "6px 11px", borderRadius: 20, fontSize: 12.5, cursor: "pointer", background: on ? C.accent : C.input, color: on ? "#0E1210" : "#C7CBD1", border: `1px solid ${on ? C.accent : C.line}` }}>{a}</div>;
            })}
          </div>
          <TextInput placeholder='Detail — e.g. "Walk 1hr, football 90 mins"' value={form.activityDetail} onChange={(e) => setForm({ ...form, activityDetail: e.target.value })} style={{ marginTop: 10 }} />
        </Card>

        <Card>
          <SectionTitle>Overall intensity — {form.intensity}/5</SectionTitle>
          <input type="range" min={1} max={5} value={form.intensity} onChange={(e) => setForm({ ...form, intensity: +e.target.value })} style={{ width: "100%", accentColor: C.accent }} />
        </Card>

        <Card>
          <SectionTitle>Soreness today — worst it felt</SectionTitle>
          {regions.map((r) => (
            <div key={r} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <span style={{ fontSize: 13.5 }}>{r}</span>
              <div style={{ display: "flex", gap: 5 }}>
                {[0, 1, 2, 3, 4].map((v) => {
                  const on = form.soreness[r] === v;
                  return <div key={v} title={SORENESS_LABELS[v]} onClick={() => setForm({ ...form, soreness: { ...form.soreness, [r]: v } })} style={{ width: 27, height: 27, borderRadius: 6, background: on ? sorenessColor(v) : C.input, border: `1px solid ${C.line}`, cursor: "pointer", fontSize: 11.5, display: "flex", alignItems: "center", justifyContent: "center", color: on ? "#0E1210" : C.faint, fontWeight: on ? 700 : 400 }}>{v}</div>;
                })}
              </div>
            </div>
          ))}
          <AddRegion onAdd={(r) => { setRegions([...regions, r]); setForm({ ...form, soreness: { ...form.soreness, [r]: 0 } }); }} />
          <TextInput placeholder='e.g. "hip only when I sat down after"' value={form.sorenessDetail} onChange={(e) => setForm({ ...form, sorenessDetail: e.target.value })} style={{ marginTop: 10 }} />
        </Card>

        <Card>
          <SectionTitle>Stiffness on waking — {form.stiffness}/4</SectionTitle>
          <input type="range" min={0} max={4} value={form.stiffness} onChange={(e) => setForm({ ...form, stiffness: +e.target.value })} style={{ width: "100%", accentColor: C.accent }} />
        </Card>

        <Card>
          <SectionTitle>Notes</SectionTitle>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }} />
        </Card>

        <Btn onClick={() => { setLog([...log, form]); setForm(null); }} style={{ padding: 13 }}>Save entry</Btn>
      </div>
    );
  }

  const sorted = [...log].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Btn onClick={start} style={{ padding: 13 }}><Plus size={16} />Log today</Btn>
      {sorted.length === 0 && <Empty text="No entries yet." />}
      {sorted.map((e) => {
        const vals = Object.values(e.soreness || {});
        const max = vals.length ? Math.max(...vals) : 0;
        const worst = Object.entries(e.soreness || {}).filter(([, v]) => v === max && v > 0).map(([k]) => k);
        return (
          <Card key={e.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontWeight: 600 }}>{fmtDate(e.date)}</span>
              <span style={{ width: 25, height: 25, borderRadius: 6, background: sorenessColor(max), fontSize: 11.5, display: "flex", alignItems: "center", justifyContent: "center", color: "#0E1210", fontWeight: 700 }}>{max}</span>
            </div>
            <div style={{ fontSize: 13, color: C.dim }}>{e.activity.join(", ") || "—"}</div>
            {worst.length > 0 && <div style={{ fontSize: 12.5, color: C.warn, marginTop: 3 }}>{worst.join(", ")}</div>}
            {e.notes && <div style={{ fontSize: 12.5, color: C.dim, marginTop: 5, lineHeight: 1.5 }}>{e.notes}</div>}
          </Card>
        );
      })}
    </div>
  );
}

function AddRegion({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const commit = () => { if (val.trim()) { onAdd(val.trim()); setVal(""); setOpen(false); } };
  if (!open) return <Btn variant="ghost" onClick={() => setOpen(true)} style={{ marginTop: 2 }}><Plus size={13} />Add body area</Btn>;
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
      <TextInput autoFocus value={val} placeholder="e.g. Right Achilles" onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commit()} />
      <Btn onClick={commit}>Add</Btn>
    </div>
  );
}

// ================= TESTS =================
function TestsTab() {
  const [metrics, setMetrics] = useStored("test-metrics", []);
  const [entries, setEntries] = useStored("test-entries", []);
  const [nm, setNm] = useState({ name: "", unit: "" });
  const [logging, setLogging] = useState(null);
  const [tmp, setTmp] = useState("");

  if (!metrics || !entries) return <Loading />;

  const commit = (m) => {
    if (tmp === "") return;
    setEntries([...entries, { id: uid(), metricId: m.id, date: today(), value: +tmp }]);
    setTmp(""); setLogging(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {metrics.length === 0 && <Empty text="No test metrics yet — add one below, e.g. Ankle mobility in cm." />}
      {metrics.map((m) => {
        const mine = entries.filter((e) => e.metricId === m.id).sort((a, b) => (a.date > b.date ? 1 : -1));
        const latest = mine[mine.length - 1];
        const first = mine[0];
        const data = mine.map((e) => ({ label: fmtDate(e.date), value: e.value }));
        return (
          <Card key={m.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>
                  {latest ? `${latest.value} ${m.unit} · ${fmtDate(latest.date)}` : "No entries yet"}
                  {first && latest && first.date !== latest.date && (
                    <span style={{ color: latest.value > first.value ? C.accent : C.warn }}>{` (${latest.value > first.value ? "+" : ""}${(latest.value - first.value).toFixed(1)} since ${fmtDate(first.date)})`}</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                {logging === m.id ? (
                  <>
                    <NumInput autoFocus value={tmp} style={{ width: 66 }} onChange={(e) => setTmp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commit(m)} />
                    <Btn onClick={() => commit(m)}><Check size={14} /></Btn>
                  </>
                ) : (
                  <Btn variant="ghost" onClick={() => { setLogging(m.id); setTmp(""); }}><Plus size={14} />Log</Btn>
                )}
                <Trash2 size={15} color={C.faint} style={{ cursor: "pointer" }} onClick={() => { setMetrics(metrics.filter((x) => x.id !== m.id)); setEntries(entries.filter((e) => e.metricId !== m.id)); }} />
              </div>
            </div>
            {data.length >= 2 && (
              <div style={{ height: 120, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" stroke={C.dim} fontSize={10} tickLine={false} minTickGap={20} />
                    <YAxis stroke={C.dim} fontSize={10} tickLine={false} width={34} />
                    <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13 }} formatter={(v) => [`${v} ${m.unit}`, m.name]} />
                    <Line type="monotone" dataKey="value" stroke={C.accent} strokeWidth={2.5} dot={{ r: 2.5, fill: C.accent }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        );
      })}

      <Card>
        <SectionTitle>New test metric</SectionTitle>
        <div style={{ display: "flex", gap: 8 }}>
          <TextInput placeholder="Name — e.g. Ankle mobility" value={nm.name} onChange={(e) => setNm({ ...nm, name: e.target.value })} />
          <TextInput placeholder="Unit" style={{ width: 76, flexShrink: 0 }} value={nm.unit} onChange={(e) => setNm({ ...nm, unit: e.target.value })} />
          <Btn onClick={() => { if (nm.name.trim()) { setMetrics([...metrics, { id: uid(), name: nm.name.trim(), unit: nm.unit.trim() }]); setNm({ name: "", unit: "" }); } }}><Plus size={15} /></Btn>
        </div>
      </Card>
    </div>
  );
}

// ================= APP =================
const TABS = [
  { id: "train", label: "Train", icon: Dumbbell },
  { id: "eat", label: "Eat", icon: Utensils },
  { id: "weight", label: "Weight", icon: Scale },
  { id: "niggles", label: "Niggles", icon: Activity },
  { id: "tests", label: "Tests", icon: Ruler },
];

export default function App() {
  const [tab, setTab] = useState("eat");
  const Content = { train: TrainTab, eat: EatTab, weight: WeightTab, niggles: NigglesTab, tests: TestsTab }[tab];
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 16px 6px", fontSize: 19, fontWeight: 700, letterSpacing: -0.3, maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        {TABS.find((t) => t.id === tab).label}
      </div>
      <div style={{ flex: 1, padding: "8px 16px 96px", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <Content />
      </div>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#1A1D22", borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "space-around", padding: "8px 0 max(8px, env(safe-area-inset-bottom))" }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <div key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", color: on ? C.accent : C.faint, padding: "2px 10px" }}>
              <Icon size={20} strokeWidth={on ? 2.4 : 1.8} />
              <span style={{ fontSize: 10.5, fontWeight: on ? 600 : 400 }}>{t.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
