import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useStored } from "../lib/useStored";
import { C, Card, SectionTitle, Empty, Btn, TextInput, inputStyle, uid, today, fmtDate } from "../lib/ui";

const ACTIVITY_TYPES = [
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
];

const SORENESS_LABELS = ["None", "Slight niggle", "Noticeable", "Sore", "Very sore"];
const sorenessColor = (v) => ["#3A3F47", C.accent, "#D2B65B", C.warn, "#C25B4D"][v] || "#3A3F47";
const SERIES = [C.accent, "#D2B65B", C.warn, "#7FA7D9", "#B48ED9", "#C25B4D"];

export default function Niggles() {
  const [log, setLog] = useStored("niggle-log", []);
  const [regions, setRegions] = useStored("niggle-regions", ["Right Hip", "Right Lower back", "Right Groin", "Left Knee"]);
  const [form, setForm] = useState(null);

  const start = () =>
    setForm({
      id: uid(),
      date: today(),
      activity: [],
      activityDetail: "",
      intensity: 3,
      soreness: Object.fromEntries(regions.map((r) => [r, 0])),
      sorenessDetail: "",
      stiffness: 0,
      notes: "",
    });

  if (form) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ background: "transparent", border: "none", color: C.text, fontSize: 16, fontWeight: 600, padding: 0 }} />
          <Btn variant="ghost" onClick={() => setForm(null)}>
            <X size={15} />
            Cancel
          </Btn>
        </div>

        <Card>
          <SectionTitle>What did you do today?</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ACTIVITY_TYPES.map((a) => {
              const on = form.activity.includes(a);
              return (
                <div
                  key={a}
                  onClick={() => setForm({ ...form, activity: on ? form.activity.filter((x) => x !== a) : [...form.activity, a] })}
                  style={{ padding: "7px 11px", borderRadius: 20, fontSize: 12.5, cursor: "pointer", background: on ? C.accent : C.input, color: on ? "#0E1210" : "#C7CBD1", border: `1px solid ${on ? C.accent : C.line}` }}
                >
                  {a}
                </div>
              );
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
            <div key={r} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13.5 }}>{r}</span>
              <div style={{ display: "flex", gap: 5 }}>
                {[0, 1, 2, 3, 4].map((v) => {
                  const on = form.soreness[r] === v;
                  return (
                    <div
                      key={v}
                      title={SORENESS_LABELS[v]}
                      onClick={() => setForm({ ...form, soreness: { ...form.soreness, [r]: v } })}
                      style={{
                        width: 29,
                        height: 29,
                        borderRadius: 6,
                        background: on ? sorenessColor(v) : C.input,
                        border: `1px solid ${C.line}`,
                        cursor: "pointer",
                        fontSize: 11.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: on ? "#0E1210" : C.faint,
                        fontWeight: on ? 700 : 400,
                      }}
                    >
                      {v}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <AddRegion
            onAdd={(r) => {
              setRegions([...regions, r]);
              setForm({ ...form, soreness: { ...form.soreness, [r]: 0 } });
            }}
          />
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

        <Btn
          onClick={() => {
            setLog([...log.filter((e) => e.date !== form.date), form]);
            setForm(null);
          }}
          style={{ padding: 13 }}
        >
          Save entry
        </Btn>
      </div>
    );
  }

  const chronological = [...log].sort((a, b) => (a.date > b.date ? 1 : -1));
  const recent = chronological.slice(-60);
  const chartData = recent.map((e) => ({ label: fmtDate(e.date), ...(e.soreness || {}) }));
  const newest = [...log].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Btn onClick={start} style={{ padding: 13 }}>
        <Plus size={16} />
        Log today
      </Btn>

      {chartData.length >= 2 && (
        <Card style={{ padding: "14px 6px 8px 0" }}>
          <SectionTitle style={{ padding: "0 14px" }}>Soreness over time</SectionTitle>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 14, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke={C.dim} fontSize={10} tickLine={false} minTickGap={26} />
                <YAxis stroke={C.dim} fontSize={10} tickLine={false} width={26} domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13 }} labelStyle={{ color: C.dim }} />
                <Legend wrapperStyle={{ fontSize: 10.5 }} formatter={(v) => <span style={{ color: C.dim }}>{v}</span>} />
                {regions.map((r, i) => (
                  <Line key={r} type="monotone" dataKey={r} stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {newest.length === 0 && <Empty text="No entries yet." />}
      {newest.map((e) => {
        const vals = Object.values(e.soreness || {});
        const max = vals.length ? Math.max(...vals) : 0;
        const worst = Object.entries(e.soreness || {})
          .filter(([, v]) => v === max && v > 0)
          .map(([k]) => k);
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
  const commit = () => {
    if (val.trim()) {
      onAdd(val.trim());
      setVal("");
      setOpen(false);
    }
  };
  if (!open)
    return (
      <Btn variant="ghost" onClick={() => setOpen(true)} style={{ marginTop: 2 }}>
        <Plus size={13} />
        Add body area
      </Btn>
    );
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
      <TextInput autoFocus value={val} placeholder="e.g. Right Achilles" onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commit()} />
      <Btn onClick={commit}>Add</Btn>
    </div>
  );
}
