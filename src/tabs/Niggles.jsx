import React, { useState } from "react";
import { Plus, X, Settings2, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useStored } from "../lib/useStored";
import { C, Card, SectionTitle, Empty, Btn, TextInput, NumInput, inputStyle, Hint, uid, today, fmtDate } from "../lib/ui";

// The whole tracker is config-driven: body areas, activity chips and extra
// scale questions all live in editable lists rather than being hardcoded.
// Change what you track without touching code.
const DEFAULT_CONFIG = {
  regions: ["Right Hip", "Right Lower back", "Right Groin", "Left Knee"],
  activities: [
    "Running",
    "Gym – lower body",
    "Gym – upper body",
    "Cycling",
    "Walking",
    "Stretching / mobility",
    "Physio exercises",
    "Rest day",
    "Long time sitting",
    "Other",
  ],
  scales: [
    { id: "intensity", label: "Overall intensity", min: 1, max: 5 },
    { id: "stiffness", label: "Stiffness on waking", min: 0, max: 4 },
  ],
  sorenessMax: 4,
};

const SORENESS_LABELS = ["None", "Slight niggle", "Noticeable", "Sore", "Very sore"];
const sorenessColor = (v, max) => {
  const ramp = ["#3A3F47", C.accent, "#D2B65B", C.warn, "#C25B4D"];
  if (v === 0) return ramp[0];
  const idx = Math.min(ramp.length - 1, Math.max(1, Math.round((v / max) * (ramp.length - 1))));
  return ramp[idx];
};
const SERIES = [C.accent, "#D2B65B", C.warn, "#7FA7D9", "#B48ED9", "#C25B4D", "#8FBF8A"];

export default function Niggles() {
  const [log, setLog] = useStored("niggle-log", []);
  const [configRaw, setConfig] = useStored("niggle-config", null);
  const [legacyRegions] = useStored("niggle-regions", null);
  const [form, setForm] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  // Carry over regions from the pre-config version rather than resetting them.
  const config = configRaw || { ...DEFAULT_CONFIG, regions: legacyRegions?.length ? legacyRegions : DEFAULT_CONFIG.regions };

  const start = () => {
    const existing = log.find((e) => e.date === today());
    setForm(
      existing
        ? { ...existing, soreness: { ...existing.soreness }, scales: { ...existing.scales }, activity: [...existing.activity] }
        : {
            id: uid(),
            date: today(),
            activity: [],
            activityDetail: "",
            soreness: Object.fromEntries(config.regions.map((r) => [r, 0])),
            sorenessDetail: "",
            scales: Object.fromEntries(config.scales.map((s) => [s.id, s.min])),
            notes: "",
          }
    );
  };

  const editEntry = (e) =>
    setForm({ ...e, soreness: { ...e.soreness }, scales: { ...(e.scales || {}) }, activity: [...(e.activity || [])] });

  // ---------- config editor ----------
  if (showConfig) {
    return <ConfigEditor config={config} onSave={(c) => { setConfig(c); setShowConfig(false); }} onCancel={() => setShowConfig(false)} />;
  }

  // ---------- entry form ----------
  if (form) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <input type="date" value={form.date} max={today()} onChange={(e) => e.target.value && setForm({ ...form, date: e.target.value })} style={{ background: "transparent", border: "none", color: C.text, fontSize: 16, fontWeight: 600, padding: 0, colorScheme: "dark" }} />
          <Btn variant="ghost" onClick={() => setForm(null)}><X size={15} />Cancel</Btn>
        </div>

        {config.activities.length > 0 && (
          <Card>
            <SectionTitle>What did you do?</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {config.activities.map((a) => {
                const on = form.activity.includes(a);
                return (
                  <div key={a} onClick={() => setForm({ ...form, activity: on ? form.activity.filter((x) => x !== a) : [...form.activity, a] })} style={{ padding: "7px 11px", borderRadius: 20, fontSize: 12.5, cursor: "pointer", background: on ? C.accent : C.input, color: on ? "#0E1210" : "#C7CBD1", border: `1px solid ${on ? C.accent : C.line}` }}>
                    {a}
                  </div>
                );
              })}
            </div>
            <TextInput placeholder='Detail — e.g. "Walk 1hr, football 90 mins"' value={form.activityDetail} onChange={(e) => setForm({ ...form, activityDetail: e.target.value })} style={{ marginTop: 10 }} />
          </Card>
        )}

        {config.scales.map((s) => (
          <Card key={s.id}>
            <SectionTitle>{s.label} — {form.scales?.[s.id] ?? s.min}/{s.max}</SectionTitle>
            <input type="range" min={s.min} max={s.max} value={form.scales?.[s.id] ?? s.min} onChange={(e) => setForm({ ...form, scales: { ...form.scales, [s.id]: +e.target.value } })} style={{ width: "100%", accentColor: C.accent }} />
          </Card>
        ))}

        {config.regions.length > 0 && (
          <Card>
            <SectionTitle>Soreness — worst it felt</SectionTitle>
            {config.regions.map((r) => (
              <div key={r} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
                <span style={{ fontSize: 13.5, minWidth: 0 }}>{r}</span>
                <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                  {Array.from({ length: config.sorenessMax + 1 }, (_, v) => {
                    const on = (form.soreness[r] ?? 0) === v;
                    return (
                      <div key={v} title={config.sorenessMax === 4 ? SORENESS_LABELS[v] : String(v)} onClick={() => setForm({ ...form, soreness: { ...form.soreness, [r]: v } })} style={{ width: 29, height: 29, borderRadius: 6, background: on ? sorenessColor(v, config.sorenessMax) : C.input, border: `1px solid ${C.line}`, cursor: "pointer", fontSize: 11.5, display: "flex", alignItems: "center", justifyContent: "center", color: on ? "#0E1210" : C.faint, fontWeight: on ? 700 : 400 }}>
                        {v}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <TextInput placeholder='e.g. "hip only when I sat down after"' value={form.sorenessDetail} onChange={(e) => setForm({ ...form, sorenessDetail: e.target.value })} style={{ marginTop: 10 }} />
          </Card>
        )}

        <Card>
          <SectionTitle>Notes</SectionTitle>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }} />
        </Card>

        <Btn onClick={() => { setLog([...log.filter((e) => e.id !== form.id && e.date !== form.date), form]); setForm(null); }} style={{ padding: 13 }}>
          Save entry
        </Btn>
      </div>
    );
  }

  // ---------- list ----------
  const chronological = [...log].sort((a, b) => (a.date > b.date ? 1 : -1));
  const chartData = chronological.slice(-60).map((e) => ({ label: fmtDate(e.date), ...(e.soreness || {}) }));
  const newest = [...log].sort((a, b) => (a.date < b.date ? 1 : -1));
  const loggedToday = log.some((e) => e.date === today());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={start} style={{ flex: 1, padding: 13 }}>
          <Plus size={16} />{loggedToday ? "Edit today" : "Log today"}
        </Btn>
        <Btn variant="ghost" onClick={() => setShowConfig(true)} style={{ padding: "13px 15px" }}>
          <Settings2 size={16} />
        </Btn>
      </div>

      {chartData.length >= 2 && config.regions.length > 0 && (
        <Card style={{ padding: "14px 6px 8px 0" }}>
          <SectionTitle style={{ padding: "0 14px" }}>Soreness over time</SectionTitle>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 14, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke={C.dim} fontSize={10} tickLine={false} minTickGap={26} />
                <YAxis stroke={C.dim} fontSize={10} tickLine={false} width={26} domain={[0, config.sorenessMax]} allowDecimals={false} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13 }} labelStyle={{ color: C.dim }} />
                <Legend wrapperStyle={{ fontSize: 10.5 }} formatter={(v) => <span style={{ color: C.dim }}>{v}</span>} />
                {config.regions.map((r, i) => (
                  <Line key={r} type="monotone" dataKey={r} stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {newest.length === 0 && <Empty text="No entries yet. Tap the gear icon to set up what you want to track." />}
      {newest.map((e) => {
        const vals = Object.values(e.soreness || {});
        const max = vals.length ? Math.max(...vals) : 0;
        const worst = Object.entries(e.soreness || {}).filter(([, v]) => v === max && v > 0).map(([k]) => k);
        return (
          <Card key={e.id} onClick={() => editEntry(e)} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontWeight: 600 }}>{fmtDate(e.date)}</span>
              <span style={{ width: 25, height: 25, borderRadius: 6, background: sorenessColor(max, config.sorenessMax), fontSize: 11.5, display: "flex", alignItems: "center", justifyContent: "center", color: "#0E1210", fontWeight: 700 }}>{max}</span>
            </div>
            <div style={{ fontSize: 13, color: C.dim }}>{(e.activity || []).join(", ") || "—"}</div>
            {worst.length > 0 && <div style={{ fontSize: 12.5, color: C.warn, marginTop: 3 }}>{worst.join(", ")}</div>}
            {e.notes && <div style={{ fontSize: 12.5, color: C.dim, marginTop: 5, lineHeight: 1.5 }}>{e.notes}</div>}
          </Card>
        );
      })}
    </div>
  );
}

// ---------- config editor ----------
function ConfigEditor({ config, onSave, onCancel }) {
  const [c, setC] = useState(JSON.parse(JSON.stringify(config)));

  const ListEditor = ({ field, title, placeholder, hint }) => (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      {c[field].length === 0 && <div style={{ color: C.faint, fontSize: 13, marginBottom: 8 }}>None — this section will be hidden.</div>}
      {c[field].map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
          <TextInput value={item} onChange={(e) => setC({ ...c, [field]: c[field].map((x, j) => (j === i ? e.target.value : x)) })} style={{ flex: 1, fontSize: 14, padding: "7px 9px" }} />
          <ChevronUp size={16} color={i === 0 ? C.line : C.faint} style={{ cursor: i === 0 ? "default" : "pointer", flexShrink: 0 }} onClick={() => { if (i === 0) return; const n = [...c[field]]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setC({ ...c, [field]: n }); }} />
          <ChevronDown size={16} color={i === c[field].length - 1 ? C.line : C.faint} style={{ cursor: i === c[field].length - 1 ? "default" : "pointer", flexShrink: 0 }} onClick={() => { if (i === c[field].length - 1) return; const n = [...c[field]]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setC({ ...c, [field]: n }); }} />
          <Trash2 size={16} color={C.faint} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setC({ ...c, [field]: c[field].filter((_, j) => j !== i) })} />
        </div>
      ))}
      <Btn variant="ghost" onClick={() => setC({ ...c, [field]: [...c[field], placeholder] })} style={{ marginTop: 10, width: "100%" }}>
        <Plus size={14} />Add
      </Btn>
      {hint && <Hint>{hint}</Hint>}
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>What to track</span>
        <Btn variant="ghost" onClick={onCancel}><X size={15} />Cancel</Btn>
      </div>

      <ListEditor field="regions" title="Body areas" placeholder="New area" hint="Renaming an area starts a fresh line on the chart — past entries keep the old name." />

      <ListEditor field="activities" title="Activity options" placeholder="New activity" />

      <Card>
        <SectionTitle>Daily scale questions</SectionTitle>
        {c.scales.length === 0 && <div style={{ color: C.faint, fontSize: 13, marginBottom: 8 }}>None.</div>}
        {c.scales.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
            <TextInput value={s.label} onChange={(e) => setC({ ...c, scales: c.scales.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} style={{ flex: 1, fontSize: 14, padding: "7px 9px" }} />
            <NumInput value={s.min} onChange={(e) => setC({ ...c, scales: c.scales.map((x, j) => (j === i ? { ...x, min: +e.target.value || 0 } : x)) })} style={{ width: 52, padding: "7px 6px" }} />
            <span style={{ color: C.faint, fontSize: 12 }}>to</span>
            <NumInput value={s.max} onChange={(e) => setC({ ...c, scales: c.scales.map((x, j) => (j === i ? { ...x, max: +e.target.value || 1 } : x)) })} style={{ width: 52, padding: "7px 6px" }} />
            <Trash2 size={16} color={C.faint} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setC({ ...c, scales: c.scales.filter((_, j) => j !== i) })} />
          </div>
        ))}
        <Btn variant="ghost" onClick={() => setC({ ...c, scales: [...c.scales, { id: uid(), label: "New question", min: 0, max: 5 }] })} style={{ marginTop: 10, width: "100%" }}>
          <Plus size={14} />Add question
        </Btn>
        <Hint>Sliders shown on every entry — e.g. sleep quality, energy, mood.</Hint>
      </Card>

      <Card>
        <SectionTitle>Soreness scale</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13.5, color: C.dim }}>0 to</span>
          <NumInput value={c.sorenessMax} onChange={(e) => setC({ ...c, sorenessMax: Math.min(10, Math.max(1, +e.target.value || 4)) })} style={{ width: 70 }} />
        </div>
        <Hint>Changing this doesn't rescale past entries, so the chart will have a step in it. Best set once at the start.</Hint>
      </Card>

      <Btn onClick={() => onSave(c)} style={{ padding: 13 }}>Save setup</Btn>
    </div>
  );
}
