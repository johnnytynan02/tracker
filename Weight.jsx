import React, { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useStored } from "../lib/useStored";
import { C, MONO, Card, SectionTitle, Empty, Btn, NumInput, inputStyle, fmtDate, today } from "../lib/ui";

export default function Weight() {
  const [entries, setEntries] = useStored("weight-log", []);
  const [val, setVal] = useState("");
  const [entryDate, setEntryDate] = useState(today());
  const [range, setRange] = useState(90);
  const [showDate, setShowDate] = useState(false);

  const sorted = [...entries].sort((a, b) => (a.date > b.date ? 1 : -1));
  const last = sorted[sorted.length - 1];

  useEffect(() => {
    if (val === "" && last) setVal(String(last.weight));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.date]);

  const unchanged = last && val !== "" && Number(val) === last.weight;

  // One reading per day: logging the same date again replaces it rather than
  // creating a duplicate the chart would have to guess between.
  const add = () => {
    if (!val || !entryDate) return;
    setEntries([...entries.filter((e) => e.date !== entryDate), { date: entryDate, weight: Number(val) }]);
    setVal("");
    setEntryDate(today());
  };

  // Daily weight is noisy enough that the raw line alone invites reading
  // meaning into water weight. The rolling average is the signal.
  const withTrend = sorted.map((e, i) => {
    const win = sorted.slice(Math.max(0, i - 6), i + 1);
    return {
      date: e.date,
      label: fmtDate(e.date),
      weight: e.weight,
      trend: +(win.reduce((s, x) => s + x.weight, 0) / win.length).toFixed(2),
    };
  });

  const cutoff = new Date(Date.now() - range * 864e5).toISOString().slice(0, 10);
  const chartData = range === 0 ? withTrend : withTrend.filter((d) => d.date >= cutoff);

  const latest = last;
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
      <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600, color: v === null ? C.faint : v > 0 ? C.warn : v < 0 ? C.accent : C.text }}>
        {v === null ? "\u2013" : `${v > 0 ? "+" : ""}${v.toFixed(1)}`}
      </div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
      <Card>
        <div style={{ display: "flex", gap: 8 }}>
          <NumInput
            placeholder="Weight (kg)"
            value={val}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Btn onClick={add}>Log</Btn>
        </div>

        {/* Backdating is the exception, so it stays out of the way until asked
            for — but opens itself if a non-today date is already set. */}
        {showDate || entryDate !== today() ? (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
              <input
                type="date"
                value={entryDate}
                max={today()}
                onChange={(e) => e.target.value && setEntryDate(e.target.value)}
                style={{ ...inputStyle, width: "auto", flex: 1, fontSize: 14, colorScheme: "dark" }}
              />
              {entryDate !== today() && (
                <Btn variant="ghost" onClick={() => setEntryDate(today())} style={{ fontSize: 12.5, padding: "9px 11px" }}>
                  Today
                </Btn>
              )}
            </div>
            {entryDate !== today() && entries.some((e) => e.date === entryDate) && (
              <div style={{ fontSize: 11.5, color: C.warn, marginTop: 8 }}>Replaces the existing {fmtDate(entryDate)} reading</div>
            )}
          </>
        ) : (
          <div onClick={() => setShowDate(true)} style={{ fontSize: 12, color: C.faint, marginTop: 10, cursor: "pointer" }}>
            + Another day
          </div>
        )}

        {unchanged && entryDate === today() && (
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 8 }}>Same as {fmtDate(last.date)} — edit if you've changed</div>
        )}
      </Card>

      {latest && (
        <Card style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 25, fontWeight: 700 }}>{latest.weight}</div>
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
              <div
                key={l}
                onClick={() => setRange(d)}
                style={{
                  fontSize: 12,
                  padding: "5px 11px",
                  borderRadius: 14,
                  cursor: "pointer",
                  background: range === d ? C.accent : "transparent",
                  color: range === d ? "#0E1210" : C.dim,
                  border: `1px solid ${range === d ? C.accent : C.line}`,
                }}
              >
                {l}
              </div>
            ))}
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 14, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke={C.dim} fontSize={11} tickLine={false} minTickGap={26} />
                <YAxis stroke={C.dim} fontSize={11} tickLine={false} width={44} domain={["dataMin - 0.8", "dataMax + 0.8"]} tickFormatter={(v) => v.toFixed(1)} />
                <Tooltip
                  contentStyle={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13 }}
                  labelStyle={{ color: C.dim }}
                  formatter={(v, n) => [`${v} kg`, n === "trend" ? "7-day average" : "Logged"]}
                />
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
        <SectionTitle>History</SectionTitle>
        {[...sorted].reverse().map((e) => (
          <div key={e.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 14 }}>
            <span style={{ color: C.dim }}>{fmtDate(e.date)}</span>
            <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontFamily: MONO }}>{e.weight} kg</span>
              <Trash2 size={14} color={C.faint} style={{ cursor: "pointer" }} onClick={() => setEntries(entries.filter((x) => x.date !== e.date))} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
