import React, { useState, useMemo } from "react";
import { Plus, Trash2, Check, X, Pencil, ChevronRight } from "lucide-react";
import { useStored } from "../lib/useStored";
import { C, Card, SectionTitle, Empty, Btn, NumInput, TextInput, uid, today, fmtDate } from "../lib/ui";
import { KINDS, KIND_IDS, emptySet, setHasData, normaliseExercise } from "../lib/schema";

export default function Train() {
  const [workoutsRaw, setWorkouts] = useStored("workouts", []);
  const [routinesRaw, setRoutines] = useStored("routines", []);
  const [exNamesRaw, setExNames] = useStored("exercise-names", []);
  const [draft, setDraft] = useState(null);
  const [editRoutine, setEditRoutine] = useState(null);

  const workouts = workoutsRaw.map((w) => ({ ...w, exercises: w.exercises.map((e) => ({ ...normaliseExercise(e), sets: e.sets || [] })) }));
  const routines = routinesRaw.map((r) => ({ ...r, exercises: r.exercises.map(normaliseExercise) }));
  const exNames = exNamesRaw.map(normaliseExercise);

  // Keyed on exercise NAME so history follows an exercise across routines.
  const lastPerf = useMemo(() => {
    const list = [...workouts].sort((a, b) => (a.date > b.date ? 1 : -1));
    return (name) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const ex = list[i].exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
        if (ex) return { date: list[i].date, sets: ex.sets, kind: ex.kind };
      }
      return null;
    };
  }, [workoutsRaw]);

  const buildExercise = ({ name, kind }) => {
    const last = lastPerf(name);
    const k = last?.kind || kind || "strength";
    return {
      id: uid(),
      name,
      kind: k,
      last,
      // Prefill with last session so the common case (repeat it) is zero typing.
      sets: last && last.sets.length ? last.sets.map((s) => ({ ...s, id: uid(), done: false })) : [emptySet(k)],
    };
  };

  const rememberName = (name, kind) => {
    if (!exNames.some((e) => e.name.toLowerCase() === name.toLowerCase())) setExNames([...exNames, { name, kind }]);
  };

  const startFromRoutine = (r) => setDraft({ id: uid(), date: today(), routineName: r.name, exercises: r.exercises.map(buildExercise) });
  const startBlank = () => setDraft({ id: uid(), date: today(), routineName: "", exercises: [] });

  const updEx = (exId, patch) => setDraft({ ...draft, exercises: draft.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) });
  const updSet = (exId, setId, patch) => {
    const ex = draft.exercises.find((e) => e.id === exId);
    updEx(exId, { sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) });
  };
  const addSet = (exId) => {
    const ex = draft.exercises.find((e) => e.id === exId);
    const l = ex.sets[ex.sets.length - 1];
    updEx(exId, { sets: [...ex.sets, { ...(l || emptySet(ex.kind)), id: uid(), done: false }] });
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
        .map((e) => ({ id: e.id, name: e.name, kind: e.kind, sets: e.sets.filter((s) => setHasData(e.kind, s)).map((s) => ({ ...s, done: undefined })) }))
        .filter((e) => e.sets.length > 0),
    };
    if (clean.exercises.length === 0) return setDraft(null);
    setWorkouts([...workoutsRaw, clean]);
    setDraft(null);
  };

  // ---------- routine editor ----------
  if (editRoutine) {
    const saveRoutine = () => {
      if (!editRoutine.name.trim()) return;
      const exists = routines.some((r) => r.id === editRoutine.id);
      setRoutines(exists ? routinesRaw.map((r) => (r.id === editRoutine.id ? editRoutine : r)) : [...routinesRaw, editRoutine]);
      const missing = editRoutine.exercises.filter((e) => !exNames.some((x) => x.name.toLowerCase() === e.name.toLowerCase()));
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
          {editRoutine.exercises.map((ex, i) => (
            <div key={ex.name + i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontSize: 14 }}>
                {ex.name}
                <span style={{ color: C.faint, fontSize: 11.5, marginLeft: 7 }}>{KINDS[ex.kind].label}</span>
              </span>
              <Trash2 size={15} color={C.faint} style={{ cursor: "pointer" }} onClick={() => setEditRoutine({ ...editRoutine, exercises: editRoutine.exercises.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <ExercisePicker known={exNames} onAdd={(ex) => setEditRoutine({ ...editRoutine, exercises: [...editRoutine.exercises, ex] })} />
          </div>
        </Card>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={saveRoutine} style={{ flex: 1, padding: 12 }}>Save routine</Btn>
          {routines.some((r) => r.id === editRoutine.id) && (
            <Btn variant="danger" onClick={() => { setRoutines(routinesRaw.filter((r) => r.id !== editRoutine.id)); setEditRoutine(null); }}>Delete</Btn>
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
          <Btn variant="ghost" onClick={() => setDraft(null)}><X size={15} />Cancel</Btn>
        </div>

        {draft.exercises.map((ex) => {
          const spec = KINDS[ex.kind];
          const cols = `22px ${spec.fields.map(() => "1fr").join(" ")} 34px 26px`;
          return (
            <Card key={ex.id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontWeight: 600 }}>
                  {ex.name}
                  <span style={{ color: C.faint, fontSize: 11.5, marginLeft: 7, fontWeight: 400 }}>{spec.label}</span>
                </div>
                <Trash2 size={15} color={C.faint} style={{ cursor: "pointer" }} onClick={() => setDraft({ ...draft, exercises: draft.exercises.filter((e) => e.id !== ex.id) })} />
              </div>
              <div style={{ fontSize: 12, color: ex.last ? C.dim : C.faint, marginBottom: 10, lineHeight: 1.45 }}>
                {ex.last ? `Last (${fmtDate(ex.last.date)}): ${KINDS[ex.last.kind || ex.kind].summarise(ex.last.sets)}` : "First time — no previous data"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: cols, gap: 6, fontSize: 10.5, color: C.faint, marginBottom: 5 }}>
                <span>#</span>
                {spec.fields.map((f) => <span key={f.key}>{f.label}</span>)}
                <span /><span />
              </div>
              {ex.sets.map((s, i) => (
                <div key={s.id} style={{ display: "grid", gridTemplateColumns: cols, gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: C.faint, fontSize: 13 }}>{i + 1}</span>
                  {spec.fields.map((f) => (
                    <NumInput key={f.key} value={s[f.key] ?? ""} placeholder="0" onChange={(e) => updSet(ex.id, s.id, { [f.key]: e.target.value })} />
                  ))}
                  <div onClick={() => updSet(ex.id, s.id, { done: !s.done })} style={{ height: 34, borderRadius: 6, background: s.done ? C.accent : C.input, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    {s.done && <Check size={15} color="#0E1210" />}
                  </div>
                  <Trash2 size={14} color={C.faint} style={{ cursor: "pointer" }} onClick={() => rmSet(ex.id, s.id)} />
                </div>
              ))}
              {spec.multiSet && (
                <Btn variant="ghost" onClick={() => addSet(ex.id)} style={{ width: "100%", marginTop: 4 }}>
                  <Plus size={14} />{ex.kind === "cardio" ? "Add interval" : "Add set"}
                </Btn>
              )}
            </Card>
          );
        })}

        <Card>
          <ExercisePicker
            known={exNames}
            onAdd={(ex) => {
              setDraft({ ...draft, exercises: [...draft.exercises, buildExercise(ex)] });
              rememberName(ex.name, ex.kind);
            }}
          />
        </Card>
        <Btn onClick={finish} style={{ padding: 13 }}>Finish workout</Btn>
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
                <div style={{ fontSize: 12, color: C.dim, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.exercises.map((e) => e.name).join(" · ") || "No exercises yet"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingLeft: 10 }}>
                <Pencil size={15} color={C.faint} style={{ cursor: "pointer" }} onClick={() => setEditRoutine({ ...r, exercises: [...r.exercises] })} />
                <ChevronRight size={19} color={C.accent} style={{ cursor: "pointer" }} onClick={() => startFromRoutine(r)} />
              </div>
            </Card>
          ))}
          <Btn variant="ghost" onClick={() => setEditRoutine({ id: uid(), name: "", exercises: [] })} style={{ padding: 11 }}>
            <Plus size={15} />New routine
          </Btn>
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
                <div key={ex.id} style={{ fontSize: 13, color: "#C7CBD1", marginBottom: 3, lineHeight: 1.45 }}>
                  <span style={{ color: C.dim }}>{ex.name}: </span>
                  {KINDS[ex.kind].summarise(ex.sets)}
                </div>
              ))}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// Picking an exercise means picking its TYPE too, since that decides which
// fields you get. Known exercises remember their type so you only choose once.
function ExercisePicker({ known, onAdd }) {
  const [val, setVal] = useState("");
  const [kind, setKind] = useState("strength");
  const listId = useMemo(() => "ex-" + uid(), []);

  const match = known.find((k) => k.name.toLowerCase() === val.trim().toLowerCase());
  const effectiveKind = match ? match.kind : kind;

  const submit = () => {
    if (!val.trim()) return;
    onAdd({ name: val.trim(), kind: effectiveKind });
    setVal("");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <TextInput list={listId} value={val} placeholder="Add exercise…" onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <datalist id={listId}>{known.map((k) => <option key={k.name} value={k.name} />)}</datalist>
        <Btn onClick={submit}><Plus size={15} /></Btn>
      </div>
      {!match && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {KIND_IDS.map((k) => (
            <div
              key={k}
              onClick={() => setKind(k)}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "7px 4px",
                borderRadius: 7,
                fontSize: 12,
                cursor: "pointer",
                background: kind === k ? C.accent : C.input,
                color: kind === k ? "#0E1210" : C.dim,
                border: `1px solid ${kind === k ? C.accent : C.line}`,
                fontWeight: kind === k ? 600 : 400,
              }}
            >
              {KINDS[k].label}
            </div>
          ))}
        </div>
      )}
      {match && <div style={{ fontSize: 11.5, color: C.faint, marginTop: 7 }}>Known exercise — logging as {KINDS[match.kind].label.toLowerCase()}.</div>}
    </div>
  );
}
