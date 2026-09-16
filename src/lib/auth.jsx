import React, { useEffect, useState } from "react";
import { C, Card, Btn, Hint } from "./ui";
import { supabase, isConfigured, signInWithGoogle } from "./supabase";

export function useSession() {
  const [session, setSession] = useState(undefined); // undefined = still checking

  useEffect(() => {
    if (!isConfigured) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return session;
}

export function SignIn({ onContinueLocal }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      await signInWithGoogle();
    } catch (e) {
      setErr(e.message || "Sign-in failed.");
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.text, letterSpacing: -0.5 }}>Tracker</div>
          <div style={{ fontSize: 13.5, color: C.dim, marginTop: 7, lineHeight: 1.5 }}>Training, food, weight and niggles in one place.</div>
        </div>

        <Card>
          {isConfigured ? (
            <>
              <Btn onClick={go} disabled={busy} style={{ width: "100%", padding: 13 }}>
                {busy ? "Opening Google…" : "Continue with Google"}
              </Btn>
              {err && <div style={{ color: C.warn, fontSize: 12.5, marginTop: 11, lineHeight: 1.5 }}>{err}</div>}
              <Hint>Signing in syncs your data across devices. Only you can see it.</Hint>
              {onContinueLocal && (
                <>
                  <div style={{ height: 1, background: C.line, margin: "16px 0" }} />
                  <Btn variant="ghost" onClick={onContinueLocal} style={{ width: "100%" }}>
                    Use without an account
                  </Btn>
                  <Hint>Data stays on this device only and is lost if you clear your browser.</Hint>
                </>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 13.5, color: C.dim, lineHeight: 1.6 }}>
                Cloud sync isn't configured on this deployment, so the app is running in local-only mode. Your data stays in this browser.
              </div>
              <Btn onClick={onContinueLocal} style={{ width: "100%", padding: 12, marginTop: 14 }}>
                Continue
              </Btn>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export function SyncBadge({ status }) {
  const map = {
    synced: { label: "Synced", color: C.accent },
    saving: { label: "Saving…", color: C.dim },
    loading: { label: "Loading…", color: C.dim },
    offline: { label: "Offline — saved on device", color: C.warn },
    local: { label: "On this device only", color: C.faint },
  };
  const s = map[status] || map.local;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: s.color }} />
      {s.label}
    </span>
  );
}
