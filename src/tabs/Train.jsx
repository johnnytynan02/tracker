import React, { useState, useMemo } from "react";
import { Plus, Trash2, Check, X, Pencil, ChevronRight } from "lucide-react";
import { useStored } from "../lib/useStored";
import { C, Card, SectionTitle, Empty, Btn, NumInput, TextInput, NameAdder, uid, today, fmtDate } from "../lib/ui";

export default function Train() {
  const [workouts, setWorkouts] = useStored("workouts", []);
  const [routines, setRoutines] = useStored("routines", []);
  const [exNames, setExNames] = useStored("exercise-names", []);
  const [draft, setDraft] = useState(null);
  const [editRoutine, setEditRoutine] = useState(null);

  // Last performance is keyed on exercise NAME, not on routine, so an exercise
  // that appears in two routines carries its history across both.
  const lastPerf = useMemo(() => {
    const list = [...workouts].sort((a, b) => (a.date > b.date ? 1 : -1));
    return (name) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const ex = list[i].exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
        if (ex) return { date: list[i].date, sets: ex.sets };
      }
      return null;
    };
  }, [workouts]);

  const buildExercise = (name) => {
    const last = lastPerf(name);
    return {
      id: uid(),
      name,
      last,
      // Prefill with last session's numbers: the common case is repeating them,
      // so you only touch what actually changed.
      sets: last
        ? last.sets.map((s) => ({ id: uid(), weight: s.weight, reps: s.reps, done: false }))
        : [{ id: uid(), weight: "", reps: "", done: false }],
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
        .map((e) => ({
          id: e.id,
          name: e.name,
          sets: e.sets.filter((s) => s.weight !== "" || s.reps !== "").map(({ id, weight, reps }) => ({ id, weight, reps })),
        }))
        .filter((e) => e.sets.length > 0),
    };
    if (clean.exercises.length === 0) return setDraft(null);
    setWorkouts([...workouts, clean]);
    setDraft(null);
  };

  // ---------- routine editor ----------
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
          <Btn variant="ghost" onClick={() => setEditRoutine(null)}>
            <X size={15} />
            Cancel
          </Btn>
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
          <Btn onClick={saveRoutine} style={{ flex: 1, padding: 12 }}>
            Save routine
          </Btn>
          {routines.some((r) => r.id === editRoutine.id) && (
            <Btn
              variant="danger"
              onClick={() => {
                setRoutines(routines.filter((r) => r.id !== editRoutine.id));
                setEditRoutine(null);
              }}
            >
              Delete
            </Btn>
          )}
        </div>
      </div>
    );
  }

  // ---------- active workout ----------
  if (draft) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {draft.routineName && <div style={{ fontWeight: 700, fontSize: 16 }}>{draft.routineName}</div>}
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 13, padding: 0 }} />
          </div>
          <Btn variant="ghost" onClick={() => setDraft(null)}>
            <X size={15} />
            Cancel
          </Btn>
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
            <div style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 34px 26px", gap: 6, fontSize: 11, color: C.faint, marginBottom: 5 }}>
              <span>#</span>
              <span>kg</span>
              <span>reps</span>
              <span />
              <span />
            </div>
            {ex.sets.map((s, i) => (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 34px 26px", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: C.faint, fontSize: 13 }}>{i + 1}</span>
                <NumInput value={s.weight} placeholder="0" onChange={(e) => updSet(ex.id, s.id, { weight: e.target.value })} />
                <NumInput value={s.reps} placeholder="0" onChange={(e) => updSet(ex.id, s.id, { reps: e.target.value })} />
                <div
                  onClick={() => updSet(ex.id, s.id, { done: !s.done })}
                  style={{ height: 34, borderRadius: 6, background: s.done ? C.accent : C.input, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  {s.done && <Check size={15} color="#0E1210" />}
                </div>
                <Trash2 size={14} color={C.faint} style={{ cursor: "pointer" }} onClick={() => rmSet(ex.id, s.id)} />
              </div>
            ))}
            <Btn variant="ghost" onClick={() => addSet(ex.id)} style={{ width: "100%", marginTop: 4 }}>
              <Plus size={14} />
              Add set
            </Btn>
          </Card>
        ))}

        <Card>
          <NameAdder names={exNames} placeholder="Add exercise…" onAdd={addExercise} />
        </Card>
        <Btn onClick={finish} style={{ padding: 13 }}>
          Finish workout
        </Btn>
      </div>
    );
  }

  // ---------- home ----------
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
          <Btn variant="ghost" onClick={() => setEditRoutine({ id: uid(), name: "", exercises: [] })} style={{ padding: 11 }}>
            <Plus size={15} />
            New routine
          </Btn>
        </div>
      </div>

      <Btn onClick={startBlank} style={{ padding: 12 }}>
        <Plus size={16} />
        Empty workout
      </Btn>

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
