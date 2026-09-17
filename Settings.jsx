import React, { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { C, Card, SectionTitle, Btn, Hint, ErrorNote } from "../lib/ui";
import { exportAll, importAll } from "../lib/storage";

export default function Settings() {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const doExport = () => {
    setErr("");
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
        <SectionTitle>Your data</SectionTitle>
        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6, marginBottom: 14 }}>
          Everything lives in this browser on this device. Nothing is sent anywhere except the food lookups. That means it is private by default — and also that clearing your browser data, or switching phones, loses it all. Export every few weeks.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={doExport} style={{ flex: 1 }}>
            <Download size={15} />
            Export backup
          </Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()} style={{ flex: 1 }}>
            <Upload size={15} />
            Restore
          </Btn>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImport(f);
            e.target.value = "";
          }}
        />
        {msg && <div style={{ color: C.accent, fontSize: 12.5, marginTop: 10 }}>{msg}</div>}
        <ErrorNote>{err}</ErrorNote>
        <Hint>Restoring replaces whatever is currently stored, section by section.</Hint>
      </Card>

      <Card>
        <SectionTitle>Food data</SectionTitle>
        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>
          Barcode and search results come from Open Food Facts, a free, crowd-sourced database. Coverage is strong for UK supermarket products but any field can be missing on any item. If something you eat isn't there, the Open Food Facts app lets you add it — it'll then be in the database for everyone.
        </div>
      </Card>
    </div>
  );
}
