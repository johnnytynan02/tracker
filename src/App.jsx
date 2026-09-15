import React, { useState, lazy, Suspense } from "react";
import { Dumbbell, Utensils, Scale, Activity, Ruler, Settings as Cog } from "lucide-react";
import { C } from "./lib/ui";
// Tabs are split so the chart library only downloads when you open a tab
// that actually draws one.
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
  const [tab, setTab] = useState("train");
  const active = TABS.find((t) => t.id === tab);
  const Content = active.Component;

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100dvh",
        color: C.text,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "max(18px, env(safe-area-inset-top)) 16px 6px",
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: -0.3,
          maxWidth: 520,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {active.label}
      </div>

      <div style={{ flex: 1, padding: "8px 16px 100px", maxWidth: 520, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <Suspense fallback={<div style={{ color: C.faint, textAlign: "center", padding: 40, fontSize: 13 }}>Loading…</div>}>
          <Content />
        </Suspense>
      </div>

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#1A1D22",
          borderTop: `1px solid ${C.line}`,
          display: "flex",
          justifyContent: "space-around",
          padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
        }}
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <div
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", color: on ? C.accent : C.faint, padding: "2px 8px" }}
            >
              <Icon size={20} strokeWidth={on ? 2.4 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: on ? 600 : 400 }}>{t.label}</span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
