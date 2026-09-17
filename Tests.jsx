import React, { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useStored } from "../lib/useStored";
import { C, Card, SectionTitle, Empty, Btn, NumInput, TextInput, uid, today, fmtDate } from "../lib/ui";

export default function Tests() {
  const [metrics, setMetrics] = useStored("test-metrics", []);
  const [entries, setEntries] = useStored("test-entries", []);
  const [nm, setNm] = useState({ name: "", unit: "" });
  const [logging, setLogging] = useState(null);
  const [tmp, setTmp] = useState("");
  const [showNew, setShowNew] = useState(false);

  const entriesFor = (id) => entries.filter((e) => e.metricId === id).sort((a, b) => (a.date > b.date ? 1 : -1));

  // Mobility and similar tests move in small increments, so start from the
  // last value and let the person adjust rather than retyping it.
  const startLogging = (m) => {
    const mine = entriesFor(m.id);
    setTmp(mine.length ? String(mine[mine.length - 1].value) : "");
    setLogging(m.id);
  };

  const commit = (m) => {
    if (tmp === "") return;
    setEntries([...entries, { id: uid(), metricId: m.id, date: today(), value: +tmp }]);
    setTmp("");
    setLogging(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {metrics.length === 0 && <Empty text="No test metrics yet — add one below, e.g. Ankle mobility in cm." />}

      {metrics.map((m) => {
        const mine = entriesFor(m.id);
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
                    <span style={{ color: latest.value > first.value ? C.accent : C.warn }}>
                      {` (${latest.value > first.value ? "+" : ""}${(latest.value - first.value).toFixed(1)} since ${fmtDate(first.date)})`}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                {logging === m.id ? (
                  <>
                    <NumInput autoFocus value={tmp} style={{ width: 70 }} onFocus={(e) => e.target.select()} onChange={(e) => setTmp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commit(m)} />
                    <Btn onClick={() => commit(m)}>
                      <Check size={14} />
                    </Btn>
                  </>
                ) : (
                  <Btn variant="ghost" onClick={() => startLogging(m)}>
                    <Plus size={14} />
                    Log
                  </Btn>
                )}
                <Trash2
                  size={15}
                  color={C.faint}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setMetrics(metrics.filter((x) => x.id !== m.id));
                    setEntries(entries.filter((e) => e.metricId !== m.id));
                  }}
                />
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

      {!showNew && metrics.length > 0 ? (
        <div onClick={() => setShowNew(true)} style={{ fontSize: 12.5, color: C.faint, cursor: "pointer", padding: "2px 0" }}>
          + New metric
        </div>
      ) : (
      <Card>
        <SectionTitle>New metric</SectionTitle>
        <div style={{ display: "flex", gap: 8 }}>
          <TextInput placeholder="Name — e.g. Ankle mobility" value={nm.name} onChange={(e) => setNm({ ...nm, name: e.target.value })} />
          <TextInput placeholder="Unit" style={{ width: 76, flexShrink: 0 }} value={nm.unit} onChange={(e) => setNm({ ...nm, unit: e.target.value })} />
          <Btn
            onClick={() => {
              if (nm.name.trim()) {
                setMetrics([...metrics, { id: uid(), name: nm.name.trim(), unit: nm.unit.trim() }]);
                setNm({ name: "", unit: "" });
                setShowNew(false);
              }
            }}
          >
            <Plus size={15} />
          </Btn>
        </div>
      </Card>
      )}
    </div>
  );
}
