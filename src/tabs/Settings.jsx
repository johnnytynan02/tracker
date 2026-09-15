import React, { useRef, useState } from "react";
import { Download, Upload, Table } from "lucide-react";
import { C, MONO, Card, SectionTitle, Btn, Hint, ErrorNote } from "../lib/ui";
import { exportAll, importAll } from "../lib/storage";
import { tableToCSV, tableSummary, download } from "../lib/csv";

export default function Settings() {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const tables = tableSummary();
  const stamp = new Date().toISOString().slice(0, 10);

  const doExportJSON = () => {
    setErr("");
    download(`tracker-backup-${stamp}.json`, JSON.stringify(exportAll(), null, 2), "application/json");
    setMsg("Backup downloaded.");
  };

  const doImport = async (file) => {
    setErr("");
    setMsg("");
    try {
      const n = importAll(JSON.parse(await file.text()));
      setMsg(`Restored ${n} section${n === 1 ? "" : "s"}. Reloading…`);
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setErr(e.message || "Couldn't read that file.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
      <Card>
        <SectionTitle>Backup</SectionTitle>
        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6, marginBottom: 14 }}>
          Everything lives in this browser on this device. Nothing is sent anywhere except food lookups. Private by default — and lost if you clear your browser data or switch phones. Export every few weeks.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={doExportJSON} style={{ flex: 1 }}>
            <Download size={15} />Export JSON
          </Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()} style={{ flex: 1 }}>
            <Upload size={15} />Restore
          </Btn>
        </div>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ""; }} />
        {msg && <div style={{ color: C.accent, fontSize: 12.5, marginTop: 10 }}>{msg}</div>}
        <ErrorNote>{err}</ErrorNote>
        <Hint>JSON is the full backup — restore puts everything back exactly. Use this one for moving devices.</Hint>
      </Card>

      <Card>
        <SectionTitle>Export for analysis</SectionTitle>
        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6, marginBottom: 13 }}>
          Flattened to one row per observation, with dates attached — ready to query without unnesting anything.
        </div>
        {tables.map((t) => (
          <div key={t.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.line}`, gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontFamily: MONO }}>{t.name}</div>
              <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>{t.rows} row{t.rows === 1 ? "" : "s"}</div>
            </div>
            <Btn variant="ghost" disabled={t.rows === 0} onClick={() => download(`${t.name}-${stamp}.csv`, tableToCSV(t.name))} style={{ fontSize: 12.5, padding: "8px 12px", flexShrink: 0 }}>
              <Table size={14} />CSV
            </Btn>
          </div>
        ))}
        <Hint>
          In DuckDB: <span style={{ fontFamily: MONO, color: C.dim }}>SELECT * FROM 'workout_sets-{stamp}.csv'</span> — it reads the file directly, no import step.
        </Hint>
      </Card>

      <Card>
        <SectionTitle>Food data</SectionTitle>
        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>
          Barcode and search results come from Open Food Facts, a free crowd-sourced database. Coverage is strong for UK supermarket products but any field can be missing on any item. If something you eat isn't there, the Open Food Facts app lets you add it — it'll then be in the database for everyone.
        </div>
      </Card>
    </div>
  );
}
