import React, { useState, lazy, Suspense } from "react";
import { Trash2, X, Pencil, Search, ScanLine, Camera, Plus, Check, UtensilsCrossed, ChevronLeft, ChevronRight } from "lucide-react";
import { useStored } from "../lib/useStored";
import { C, MONO, Card, SectionTitle, Empty, Btn, NumInput, TextInput, ErrorNote, Hint, MacroRow, uid, today, fmtDate } from "../lib/ui";
import { lookupBarcode, searchFoods, scale } from "../lib/food";
import { MEAL_SLOTS, slotForNow, addDays } from "../lib/schema";

const Scanner = lazy(() => import("../lib/Scanner"));

const ZERO = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const sumMacros = (list) =>
  list.reduce((a, m) => ({ calories: a.calories + (+m.calories || 0), protein: a.protein + (+m.protein || 0), carbs: a.carbs + (+m.carbs || 0), fat: a.fat + (+m.fat || 0) }), ZERO);

// ============================================================
// Finding a food — shared by the day log and the meal builder.
// Extracted so a new food can be added from inside a meal without
// leaving it, and lands in the library either way.
// ============================================================
function FoodFinder({ onResolve, onCancel, primaryLabel, secondaryLabel }) {
  const [mode, setMode] = useState("scan");
  const [scanning, setScanning] = useState(false);
  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState(null);
  const [picked, setPicked] = useState(null);

  const MODES = [
    { id: "scan", label: "Scan", icon: ScanLine },
    { id: "search", label: "Search", icon: Search },
    { id: "manual", label: "Manual", icon: Pencil },
  ];

  const reset = () => { setResults(null); setPicked(null); setErr(""); };

  const handleBarcode = async (c) => {
    setScanning(false); setBusy(true); setErr(""); setResults(null);
    try {
      const r = await lookupBarcode(c);
      if (r.notFound) setErr(`Barcode ${c} isn't in Open Food Facts yet. Add it by hand below — and consider contributing it via the Open Food Facts app.`);
      else if (r.noNutrition) setErr("That product is in the database but has no nutrition data. Enter it off the packet below.");
      else setPicked({ name: r.product.name, per100: r.product.per100, grams: String(r.product.servingG || 100), servingLabel: r.product.servingLabel, source: "Open Food Facts" });
    } catch (e) { setErr(e.message || "Lookup failed."); }
    setBusy(false);
  };

  const runSearch = async () => {
    if (!q.trim()) return;
    setBusy(true); setErr(""); setResults(null); setPicked(null);
    try {
      const found = await searchFoods(q);
      setResults(found);
      if (found.length === 0) setErr("Nothing usable came back. Try fewer words, or scan the barcode.");
    } catch (e) { setErr(e.message || "Search failed."); }
    setBusy(false);
  };

  if (scanning)
    return (
      <Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#000", color: C.dim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>Starting camera…</div>}>
        <Scanner onDetected={handleBarcode} onClose={() => setScanning(false)} />
      </Suspense>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <Btn key={m.id} variant={mode === m.id ? "primary" : "ghost"} onClick={() => { setMode(m.id); reset(); }} style={{ flex: 1, padding: "10px 4px", fontSize: 12.5, gap: 5 }}>
              <Icon size={14} />{m.label}
            </Btn>
          );
        })}
        <Btn variant="ghost" onClick={onCancel} style={{ padding: "10px 12px" }}><X size={15} /></Btn>
      </div>

      {mode === "scan" && !picked && (
        <Card>
          <SectionTitle>Barcode</SectionTitle>
          <Btn onClick={() => setScanning(true)} style={{ width: "100%", padding: 13 }} disabled={busy}>
            <Camera size={17} />{busy ? "Looking up…" : "Open camera"}
          </Btn>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <TextInput inputMode="numeric" placeholder="…or type the number" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && code.trim() && handleBarcode(code.trim())} />
            <Btn variant="ghost" onClick={() => code.trim() && handleBarcode(code.trim())} disabled={busy}><Search size={15} /></Btn>
          </div>
          <ErrorNote>{err}</ErrorNote>
        </Card>
      )}

      {mode === "search" && !picked && (
        <Card>
          <SectionTitle>Search</SectionTitle>
          <div style={{ display: "flex", gap: 8 }}>
            <TextInput placeholder="e.g. Tesco chicken thigh" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()} />
            <Btn onClick={runSearch} disabled={busy}>{busy ? "…" : <Search size={15} />}</Btn>
          </div>
          <ErrorNote>{err}</ErrorNote>
          {results && results.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {results.map((r) => (
                <div key={r.code} onClick={() => setPicked({ name: r.name, per100: r.per100, grams: String(r.servingG || 100), servingLabel: r.servingLabel, source: "Open Food Facts" })} style={{ padding: "10px 0", borderTop: `1px solid ${C.line}`, cursor: "pointer" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.35 }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: C.dim, fontFamily: MONO, marginTop: 3 }}>
                    per 100g: {r.per100.calories} kcal · P{r.per100.protein} C{r.per100.carbs} F{r.per100.fat}{r.quantity ? ` · ${r.quantity}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Hint>Search is patchy — scan the barcode if a staple doesn't show.</Hint>
        </Card>
      )}

      {mode === "manual" && !picked && <ManualEntry onReady={(item) => setPicked({ ...item, source: "Manual" })} />}

      {picked && (
        <Card>
          <SectionTitle>Portion{picked.source ? ` · ${picked.source}` : ""}</SectionTitle>
          <TextInput value={picked.name} onChange={(e) => setPicked({ ...picked, name: e.target.value })} />
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
            <NumInput value={picked.grams} onChange={(e) => setPicked({ ...picked, grams: e.target.value })} style={{ width: 92 }} />
            <span style={{ fontSize: 13, color: C.dim }}>grams{picked.servingLabel ? ` · pack serving is ${picked.servingLabel}` : ""}</span>
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
            <MacroRow macros={scale(picked.per100, Number(picked.grams) || 0)} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn onClick={() => onResolve(picked, true)} style={{ flex: 1 }}>{primaryLabel}</Btn>
            <Btn variant="ghost" onClick={() => onResolve(picked, false)}>{secondaryLabel}</Btn>
            <Btn variant="ghost" onClick={() => setPicked(null)}><X size={15} /></Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

function ManualEntry({ onReady }) {
  const [f, setF] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", grams: "100" });
  return (
    <Card>
      <SectionTitle>Per 100g, off the label</SectionTitle>
      <TextInput placeholder="Name — e.g. Chicken thigh, butcher" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
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
      <Btn
        disabled={!f.name.trim()}
        onClick={() => onReady({ name: f.name.trim(), grams: f.grams, per100: { calories: +f.calories || 0, protein: +f.protein || 0, carbs: +f.carbs || 0, fat: +f.fat || 0 } })}
        style={{ width: "100%", marginTop: 13 }}
      >
        Continue
      </Btn>
    </Card>
  );
}

// ============================================================
export default function Eat() {
  const [library, setLibrary] = useStored("food-library", []);
  const [meals, setMeals] = useStored("meals", []);
  const [log, setLog] = useStored("food-log", []);

  const [date, setDate] = useState(today());
  const [slot, setSlot] = useState(slotForNow());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [mealDraft, setMealDraft] = useState(null);
  const [mealAdding, setMealAdding] = useState(false);

  const dayLog = log.filter((l) => l.date === date);
  const dayTotals = sumMacros(dayLog);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(date, -i));
  const loggedDays = weekDates.filter((d) => log.some((l) => l.date === d));
  const weekAvg = loggedDays.length
    ? (() => {
        const t = sumMacros(log.filter((l) => weekDates.includes(l.date)));
        const n = loggedDays.length;
        return { calories: t.calories / n, protein: t.protein / n, carbs: t.carbs / n, fat: t.fat / n };
      })()
    : null;

  const pushLog = (name, m) =>
    setLog([...log, { id: uid(), date, slot, name, calories: +m.calories || 0, protein: +m.protein || 0, carbs: +m.carbs || 0, fat: +m.fat || 0 }]);

  const logFood = (item) => pushLog(`${item.name} (${item.grams}g)`, scale(item.per100, item.grams));
  const mealMacros = (meal) => sumMacros(meal.items.map((it) => scale(it.per100, it.grams)));
  const logMeal = (meal) => pushLog(meal.name, mealMacros(meal));

  const saveToLibrary = (item) =>
    setLibrary([...library, { id: uid(), name: item.name, per100: item.per100, grams: Number(item.grams) || 100, source: item.source }]);

  // ---------- meal builder ----------
  if (mealDraft) {
    const m = mealMacros(mealDraft);
    const save = () => {
      if (!mealDraft.name.trim() || mealDraft.items.length === 0) return;
      const exists = meals.some((x) => x.id === mealDraft.id);
      setMeals(exists ? meals.map((x) => (x.id === mealDraft.id ? mealDraft : x)) : [...meals, mealDraft]);
      setMealDraft(null);
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Meal</span>
          <Btn variant="ghost" onClick={() => { setMealDraft(null); setMealAdding(false); }}><X size={15} />Cancel</Btn>
        </div>

        <TextInput placeholder="Name — e.g. Usual breakfast" value={mealDraft.name} onChange={(e) => setMealDraft({ ...mealDraft, name: e.target.value })} />

        <Card><MacroRow macros={m} size={19} /></Card>

        <Card>
          <SectionTitle>Items</SectionTitle>
          {mealDraft.items.length === 0 && <div style={{ color: C.faint, fontSize: 13, marginBottom: 8 }}>Nothing yet — add something below.</div>}
          {mealDraft.items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontSize: 13.5, flex: 1, minWidth: 0 }}>{it.name}</span>
              <NumInput value={it.grams} style={{ width: 72 }} onChange={(e) => setMealDraft({ ...mealDraft, items: mealDraft.items.map((x, j) => (j === i ? { ...x, grams: Number(e.target.value) || 0 } : x)) })} />
              <span style={{ fontSize: 12, color: C.dim }}>g</span>
              <Trash2 size={15} color={C.faint} style={{ cursor: "pointer" }} onClick={() => setMealDraft({ ...mealDraft, items: mealDraft.items.filter((_, j) => j !== i) })} />
            </div>
          ))}
        </Card>

        {library.length > 0 && (
          <Card>
            <SectionTitle>Your foods</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {library.map((f) => (
                <div key={f.id} onClick={() => setMealDraft({ ...mealDraft, items: [...mealDraft.items, { name: f.name, per100: f.per100, grams: f.grams }] })} style={{ padding: "7px 11px", borderRadius: 18, fontSize: 12.5, cursor: "pointer", background: C.input, color: "#C7CBD1", border: `1px solid ${C.line}` }}>
                  <Plus size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{f.name}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* New food without leaving the meal — it joins the meal AND the library. */}
        {mealAdding ? (
          <FoodFinder
            primaryLabel="Add & save food"
            secondaryLabel="This meal only"
            onCancel={() => setMealAdding(false)}
            onResolve={(item, alsoSave) => {
              setMealDraft({ ...mealDraft, items: [...mealDraft.items, { name: item.name, per100: item.per100, grams: Number(item.grams) || 100 }] });
              if (alsoSave) saveToLibrary(item);
              setMealAdding(false);
            }}
          />
        ) : (
          <Btn variant="ghost" onClick={() => setMealAdding(true)} style={{ padding: 12 }}>
            <Plus size={16} />Add a new food
          </Btn>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={save} disabled={!mealDraft.name.trim() || mealDraft.items.length === 0} style={{ flex: 1, padding: 12 }}>Save meal</Btn>
          {meals.some((x) => x.id === mealDraft.id) && (
            <Btn variant="danger" onClick={() => { setMeals(meals.filter((x) => x.id !== mealDraft.id)); setMealDraft(null); }}>Delete</Btn>
          )}
        </div>
      </div>
    );
  }

  const isToday = date === today();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
      <Card style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <ChevronLeft size={22} color={C.dim} style={{ cursor: "pointer" }} onClick={() => setDate(addDays(date, -1))} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{isToday ? "Today" : fmtDate(date)}</div>
            <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ background: "transparent", border: "none", color: C.faint, fontSize: 11.5, padding: 0, textAlign: "center", colorScheme: "dark" }} />
          </div>
          <ChevronRight size={22} color={isToday ? C.line : C.dim} style={{ cursor: isToday ? "default" : "pointer" }} onClick={() => !isToday && setDate(addDays(date, 1))} />
        </div>
      </Card>

      <Card><MacroRow macros={dayTotals} size={19} /></Card>

      {weekAvg && (
        <Card style={{ padding: "11px 14px" }}>
          <SectionTitle style={{ marginBottom: 7 }}>7-day average · {loggedDays.length} day{loggedDays.length === 1 ? "" : "s"}</SectionTitle>
          <MacroRow macros={weekAvg} size={15} />
        </Card>
      )}

      <div>
        <div style={{ display: "flex", gap: 6 }}>
          {MEAL_SLOTS.map((s) => (
            <div key={s} onClick={() => setSlot(s)} style={{ flex: 1, textAlign: "center", padding: "9px 4px", borderRadius: 8, fontSize: 12.5, cursor: "pointer", background: slot === s ? C.accent : C.input, color: slot === s ? "#0E1210" : C.dim, border: `1px solid ${slot === s ? C.accent : C.line}`, fontWeight: slot === s ? 600 : 400 }}>
              {s}
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Meals</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {meals.map((meal) => {
            const m = mealMacros(meal);
            return (
              <Card key={meal.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 13, gap: 10 }}>
                <div onClick={() => logMeal(meal)} style={{ cursor: "pointer", flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{meal.name}</div>
                  <div style={{ fontSize: 11.5, color: C.dim, fontFamily: MONO, marginTop: 3 }}>
                    {Math.round(m.calories)} kcal · P{Math.round(m.protein)} C{Math.round(m.carbs)} F{Math.round(m.fat)}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meal.items.map((i) => i.name).join(" · ")}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <Pencil size={15} color={C.faint} style={{ cursor: "pointer" }} onClick={() => setMealDraft({ ...meal, items: [...meal.items] })} />
                  <div onClick={() => logMeal(meal)} style={{ width: 36, height: 36, borderRadius: 8, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Check size={18} color="#0E1210" />
                  </div>
                </div>
              </Card>
            );
          })}
          <Btn variant="ghost" onClick={() => setMealDraft({ id: uid(), name: "", items: [] })} style={{ padding: 11 }}>
            <UtensilsCrossed size={15} />New meal
          </Btn>
        </div>
      </div>

      <div>
        <SectionTitle>Foods</SectionTitle>
        {library.length === 0 ? (
          <Empty text="Nothing saved yet. Add a food below and it lands here for one-tap logging." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {library.map((m) => {
              const macros = scale(m.per100, m.grams);
              return (
                <div key={m.id} onClick={() => logFood(m)} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, cursor: "pointer", position: "relative" }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4, paddingRight: 32, lineHeight: 1.3 }}>{m.name}</div>
                  <div style={{ fontSize: 11.5, color: C.dim, fontFamily: MONO }}>{m.grams}g · {Math.round(macros.calories)} kcal</div>
                  <div style={{ fontSize: 11.5, color: C.faint, fontFamily: MONO, marginTop: 2 }}>P{Math.round(macros.protein)} C{Math.round(macros.carbs)} F{Math.round(macros.fat)}</div>
                  <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 8 }}>
                    <Pencil size={12} color={C.faint} onClick={(e) => { e.stopPropagation(); setEditing({ ...m, grams: String(m.grams) }); }} />
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
          <SectionTitle>{editing.name}</SectionTitle>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <NumInput value={editing.grams} onChange={(e) => setEditing({ ...editing, grams: e.target.value })} style={{ width: 92 }} />
            <span style={{ color: C.dim, fontSize: 13 }}>grams · {Math.round(scale(editing.per100, Number(editing.grams) || 0).calories)} kcal</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn onClick={() => { setLibrary(library.map((x) => (x.id === editing.id ? { ...x, grams: Number(editing.grams) || 0 } : x))); setEditing(null); }}>Save</Btn>
            <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {adding ? (
        <FoodFinder
          primaryLabel="Log & save"
          secondaryLabel="Log once"
          onCancel={() => setAdding(false)}
          onResolve={(item, alsoSave) => {
            const grams = Number(item.grams) || 0;
            pushLog(`${item.name} (${grams}g)`, scale(item.per100, grams));
            if (alsoSave) saveToLibrary(item);
            setAdding(false);
          }}
        />
      ) : (
        <Btn variant="ghost" onClick={() => setAdding(true)} style={{ padding: 12 }}><Plus size={16} />Add a new food</Btn>
      )}

      <div>
        <SectionTitle>{isToday ? "Today" : fmtDate(date)}</SectionTitle>
        {dayLog.length === 0 && <Empty text="Nothing logged on this day." />}
        {MEAL_SLOTS.map((s) => {
          const items = dayLog.filter((l) => (l.slot || "Snack") === s);
          if (items.length === 0) return null;
          const t = sumMacros(items);
          return (
            <div key={s} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: 12.5, color: C.accent, fontWeight: 600 }}>{s}</span>
                <span style={{ fontSize: 11.5, color: C.faint, fontFamily: MONO }}>{Math.round(t.calories)} kcal</span>
              </div>
              {items.map((l) => (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.line}`, gap: 10 }}>
                  <span style={{ fontSize: 13.5, minWidth: 0 }}>{l.name}</span>
                  <span style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: C.dim, fontFamily: MONO }}>{Math.round(l.calories)} kcal</span>
                    <Trash2 size={14} color={C.faint} style={{ cursor: "pointer" }} onClick={() => setLog(log.filter((x) => x.id !== l.id))} />
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
