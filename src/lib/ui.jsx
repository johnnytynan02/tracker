import React, { useMemo } from "react";
import { Plus } from "lucide-react";

export const C = {
  bg: "#14161A",
  card: "#1E2126",
  line: "#2A2E35",
  input: "#101317",
  text: "#EDEEF0",
  dim: "#8B909A",
  faint: "#5B5F66",
  accent: "#5EA8A0",
  warn: "#D9895A",
};

export const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const today = () => new Date().toISOString().slice(0, 10);
export const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, ...style }}>
    {children}
  </div>
);

export const SectionTitle = ({ children, style }) => (
  <div style={{ fontSize: 13, color: C.dim, marginBottom: 8, fontWeight: 500, ...style }}>{children}</div>
);

export const Empty = ({ text }) => (
  <div style={{ color: C.faint, textAlign: "center", padding: "24px 0", fontSize: 13, lineHeight: 1.5 }}>{text}</div>
);

export const ErrorNote = ({ children }) =>
  children ? <div style={{ color: C.warn, fontSize: 12.5, marginTop: 10, lineHeight: 1.5 }}>{children}</div> : null;

export const Hint = ({ children }) => (
  <div style={{ fontSize: 11.5, color: C.faint, marginTop: 10, lineHeight: 1.5 }}>{children}</div>
);

export const inputStyle = {
  width: "100%",
  background: C.input,
  border: `1px solid ${C.line}`,
  borderRadius: 7,
  color: C.text,
  fontSize: 16,
  padding: "9px 10px",
  boxSizing: "border-box",
};

export const NumInput = (p) => (
  <input {...p} type="number" inputMode="decimal" style={{ ...inputStyle, fontFamily: MONO, padding: "8px 9px", ...p.style }} />
);

export const TextInput = (p) => <input {...p} style={{ ...inputStyle, ...p.style }} />;

export function Btn({ children, onClick, variant = "primary", style, disabled, type }) {
  const v = {
    primary: { background: C.accent, color: "#0E1210" },
    ghost: { background: "transparent", color: C.dim, border: `1px solid ${C.line}` },
    danger: { background: "transparent", color: C.warn, border: `1px solid ${C.line}` },
  }[variant];
  return (
    <button
      type={type || "button"}
      disabled={disabled}
      onClick={onClick}
      style={{
        border: "none",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        ...v,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function NameAdder({ names, onAdd, placeholder }) {
  const [val, setVal] = React.useState("");
  const listId = useMemo(() => "dl-" + uid(), []);
  const submit = () => {
    if (val.trim()) {
      onAdd(val.trim());
      setVal("");
    }
  };
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <TextInput list={listId} value={val} placeholder={placeholder} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      <datalist id={listId}>
        {names.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <Btn onClick={submit}>
        <Plus size={15} />
      </Btn>
    </div>
  );
}

export const MacroRow = ({ macros, size = 17 }) => (
  <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
    {[
      ["kcal", macros.calories],
      ["protein", macros.protein],
      ["carbs", macros.carbs],
      ["fat", macros.fat],
    ].map(([l, v]) => (
      <div key={l}>
        <div style={{ fontFamily: MONO, fontSize: size, fontWeight: 600 }}>{Math.round(v)}</div>
        <div style={{ fontSize: 10.5, color: C.dim, marginTop: 3 }}>{l}</div>
      </div>
    ))}
  </div>
);
