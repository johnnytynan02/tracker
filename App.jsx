import React, { useState, lazy, Suspense } from "react";
import { Dumbbell, Utensils, Scale, Activity, Ruler, Settings as Cog } from "lucide-react";
import { C, DISPLAY, R } from "./lib/ui";
import { useSession, SignIn, SyncBadge } from "./lib/auth";
import { DataProvider, useData } from "./lib/DataProvider";
import { isConfigured } from "./lib/supabase";

const Train = lazy(() => import("./tabs/Train"));
const Eat = lazy(() => import("./tabs/Eat"));
const Weight = lazy(() => import("./tabs/Weight"));
const Niggles = lazy(() => import("./tabs/Niggles"));
const Tests = lazy(() => import("./tabs/Tests"));
const SettingsTab = lazy(() => import("./tabs/Settings"));

const TABS = [
  { id: "train", label: "Train", icon: Dumbbell, Component: Train },
  { id: "eat", label: "Eat", icon: Utensils, Component: Eat },
  { id: "weight", label: "Weight", icon: Scale, Component: Weight },
  { id: "niggles", label: "Niggles", icon: Activity, Component: Niggles },
  { id: "tests", label: "Tests", icon: Ruler, Component: Tests },
  { id: "settings", label: "Data", icon: Cog, Component: SettingsTab },
];

export default function App() {
  const session = useSession();
  const [localOnly, setLocalOnly] = useState(false);

  // undefined means we're still checking for an existing session — showing the
  // sign-in screen here would flash it at already-signed-in users on every load.
  if (session === undefined && isConfigured) {
    return <div style={{ minHeight: "100dvh", background: C.bg, color: C.faint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>Loading…</div>;
  }

  if (!session && !localOnly) return <SignIn onContinueLocal={() => setLocalOnly(true)} />;

  return (
    <DataProvider userId={session?.user?.id || null}>
      <Shell session={session} />
    </DataProvider>
  );
}

function Shell({ session }) {
  const [tab, setTab] = useState("train");
  const { status } = useData();
  const active = TABS.find((t) => t.id === tab);
  const Content = active.Component;

  return (
    <div style={{ background: C.bg, minHeight: "100dvh", color: C.text, fontFamily: "Archivo, system-ui, -apple-system, sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "max(18px, env(safe-area-inset-top)) 16px 6px", maxWidth: 520, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 19, letterSpacing: 0.3, textTransform: "uppercase" }}>{active.label}</span>
          <SyncBadge status={status} />
        </div>
      </div>

      <div style={{ flex: 1, padding: "8px 16px 100px", maxWidth: 520, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <Suspense fallback={<div style={{ color: C.faint, textAlign: "center", padding: 40, fontSize: 13 }}>Loading…</div>}>
          <Content session={session} />
        </Suspense>
      </div>

      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.card, borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "space-around", padding: "8px 0 max(8px, env(safe-area-inset-bottom))" }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <div key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", color: on ? C.accent : C.faint, padding: "2px 8px" }}>
              <Icon size={20} strokeWidth={on ? 2.4 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: on ? 600 : 400 }}>{t.label}</span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
