import React, { useMemo } from "react";
import { Plus } from "lucide-react";

// ============================================================
// Design tokens
// ============================================================
// Training-log, not wellness-app: near-black ground, warm off-white text,
// hairline borders, and a single amber accent doing all the work. The cool
// tone is reserved for secondary series in charts so the accent never has
// to compete with itself.
export const C = {
  bg: "#14161A",       // page ground — matches theme-color in index.html
  card: "#1A1D22",     // raised surface
  input: "#0F1115",    // recessed field, reads below the card
  line: "#262A31",     // hairline border
  text: "#F4F2EC",     // warm off-white
  dim: "#8A8D96",      // secondary text
  faint: "#5E6169",    // tertiary / disabled
  accent: "#FF7A33",   // primary — the only warm highlight
  ink: "#14161A",      // text on accent fills
  cool: "#4FD6C4",     // charts and secondary data ONLY, never actions
  warn: "#E3543E",     // deliberately distinct from accent
};

// Type. Archivo Black for headings and big figures; IBM Plex Mono for every
// number in the app so weights, reps, kcal and dates align in columns and
// read as data rather than prose.
export const DISPLAY = "'Archivo Black', system-ui, sans-serif";
export const BODY = "Archivo, system-ui, -apple-system, sans-serif";
export const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

// Flatter than before — sharp enough to read as a log, not a card deck.
export const R = { card: 4, control: 4, chip: 3 };

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const today = () => new Date().toISOString().slice(0, 10);
export const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// ============================================================
// Primitives
// ============================================================
export const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: R.card, padding: 14, ...style }}>
    {children}
  </div>
);

// Small caps section labels read as field names in a log rather than prose.
export const SectionTitle = ({ children, style }) => (
  <div
    style={{
      fontSize: 10.5,
      color: C.dim,
      marginBottom: 9,
      fontWeight: 600,
      letterSpacing: 0.9,
      textTransform: "uppercase",
      ...style,
    }}
  >
    {children}
  </div>
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
  borderRadius: R.control,
  color: C.text,
  fontFamily: BODY,
  fontSize: 16, // below 16 iOS zooms the page on focus
  padding: "9px 10px",
  boxSizing: "border-box",
};

export const NumInput = (p) => (
  <input {...p} type="number" inputMode="decimal" style={{ ...inputStyle, fontFamily: MONO, padding: "8px 9px", ...p.style }} />
);

export const TextInput = (p) => <input {...p} style={{ ...inputStyle, ...p.style }} />;

export function Btn({ children, onClick, variant = "primary", style, disabled, type }) {
  const v = {
    primary: { background: C.accent, color: C.ink },
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
        borderRadius: R.control,
        padding: "10px 14px",
        fontFamily: BODY,
        fontSize: 13.5,
        fontWeight: 600,
        letterSpacing: 0.2,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
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

// One-tap option row. Above ~8 options a row stops being tappable on a phone,
// so callers should fall back to a slider past that.
export function ChoiceRow({ options, value, onChange, labelFor, style }) {
  return (
    <div style={{ display: "flex", gap: 4, ...style }}>
      {options.map((o) => {
        const on = o === value;
        return (
          <div
            key={o}
            onClick={() => onChange(o)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "9px 3px",
              borderRadius: R.chip,
              fontFamily: MONO,
              fontSize: 12.5,
              cursor: "pointer",
              background: on ? C.accent : C.input,
              color: on ? C.ink : C.dim,
              border: `1px solid ${on ? C.accent : C.line}`,
              fontWeight: on ? 700 : 400,
            }}
          >
            {labelFor ? labelFor(o) : o}
          </div>
        );
      })}
    </div>
  );
}

export const Chip = ({ label, on, onClick, style }) => (
  <div
    onClick={onClick}
    style={{
      padding: "7px 11px",
      borderRadius: R.chip,
      fontSize: 12.5,
      cursor: "pointer",
      background: on ? C.accent : C.input,
      color: on ? C.ink : C.text,
      border: `1px solid ${on ? C.accent : C.line}`,
      ...style,
    }}
  />
);

// Collapsed-by-default affordance for optional detail fields.
export const AddDetail = ({ label = "+ Add detail", onClick, style }) => (
  <div onClick={onClick} style={{ fontSize: 12, color: C.faint, cursor: "pointer", marginTop: 9, ...style }}>
    {label}
  </div>
);

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

// Big figures get the display face; units stay small and quiet beneath.
export const MacroRow = ({ macros, size = 17 }) => (
  <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
    {[
      ["kcal", macros.calories],
      ["protein", macros.protein],
      ["carbs", macros.carbs],
      ["fat", macros.fat],
    ].map(([l, v]) => (
      <div key={l}>
        <div style={{ fontFamily: MONO, fontSize: size, fontWeight: 600, color: C.text }}>{Math.round(v)}</div>
        <div style={{ fontSize: 9.5, color: C.faint, marginTop: 4, letterSpacing: 0.7, textTransform: "uppercase" }}>{l}</div>
      </div>
    ))}
  </div>
);
