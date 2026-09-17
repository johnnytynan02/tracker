import React, { useRef, useState } from "react";
import { Download, Upload, Table, LogOut, ClipboardPaste } from "lucide-react";
import { C, MONO, Card, SectionTitle, Btn, Hint, ErrorNote, inputStyle } from "../lib/ui";
import { exportAll, importAll } from "../lib/storage";
import { tableToCSV, tableSummary, download } from "../lib/csv";
import { signOut, isConfigured } from "../lib/supabase";
import { useData } from "../lib/DataProvider";
import { useStored } from "../lib/useStored";
import { uid } from "../lib/ui";

export default function Settings({ session }) {
  const { status } = useData();
  const [library, setLibrary] = useStored("food-library", []);
  const fileRef = useRef(null);
  const [paste, setPaste] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [importErr, setImportErr] = useState("");
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
        <SectionTitle>Account</SectionTitle>
        {session ? (
          <>
            <div style={{ fontSize: 13.5, color: C.text }}>{session.user.email}</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 4, lineHeight: 1.5 }}>
              {status === "offline"
                ? "Can't reach the server right now. Changes are saved on this device and will go up next time you're online."
                : "Synced to your account. Sign in on any device to pick up where you left off."}
            </div>
            <Btn variant="ghost" onClick={() => signOut()} style={{ marginTop: 13 }}>
              <LogOut size={15} />Sign out
            </Btn>
          </>
        ) : (
          <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>
            {isConfigured
              ? "Not signed in — data is on this device only. Reload the page to sign in with Google and sync it."
              : "Cloud sync isn't configured on this deployment. Data stays on this device."}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Backup</SectionTitle>
        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6, marginBottom: 14 }}>
          A full snapshot you can restore from. Worth taking occasionally even with sync on — it protects against mistakes on your side, which sync will faithfully replicate.
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
        <Hint>Restoring overwrites whatever is currently stored, section by section.</Hint>
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
        <SectionTitle>Import foods</SectionTitle>
        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6, marginBottom: 11 }}>
          Paste a list of foods to add to your library. This only ever adds — nothing existing is changed or removed, and anything whose name you already have is skipped.
        </div>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={4}
          placeholder='[{"name":"Olive oil","per100":{"calories":899,"protein":0,"carbs":0,"fat":100},"grams":10}]'
          style={{ ...inputStyle, fontFamily: MONO, fontSize: 12, resize: "vertical" }}
        />
        <Btn
          disabled={!paste.trim()}
          style={{ width: "100%", marginTop: 10 }}
          onClick={() => {
            setImportErr("");
            setImportMsg("");
            try {
              const parsed = JSON.parse(paste);
              const list = Array.isArray(parsed) ? parsed : parsed.foods;
              if (!Array.isArray(list)) throw new Error("Expected a list of foods.");
              const have = new Set(library.map((f) => f.name.toLowerCase().trim()));
              const clean = [];
              let skipped = 0;
              list.forEach((f) => {
                const name = String(f?.name || "").trim();
                const p = f?.per100;
                if (!name || !p) return;
                if (have.has(name.toLowerCase())) { skipped++; return; }
                have.add(name.toLowerCase());
                clean.push({
                  id: uid(),
                  name,
                  per100: {
                    calories: Number(p.calories) || 0,
                    protein: Number(p.protein) || 0,
                    carbs: Number(p.carbs) || 0,
                    fat: Number(p.fat) || 0,
                  },
                  grams: Number(f.grams) || 100,
                  source: f.source || "Imported",
                });
              });
              if (clean.length === 0 && skipped === 0) throw new Error("Nothing usable in there — each food needs a name and per100 values.");
              setLibrary([...library, ...clean]);
              setPaste("");
              setImportMsg(`Added ${clean.length} food${clean.length === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} you already had` : ""}.`);
            } catch (e) {
              setImportErr(e.message || "Couldn't read that.");
            }
          }}
        >
          <ClipboardPaste size={15} />Add to my foods
        </Btn>
        {importMsg && <div style={{ color: C.accent, fontSize: 12.5, marginTop: 10 }}>{importMsg}</div>}
        <ErrorNote>{importErr}</ErrorNote>
        <Hint>Every imported food keeps per-100g values, so changing the portion later still gives correct macros.</Hint>
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
