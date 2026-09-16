import { createClient } from "@supabase/supabase-js";

// Both values come from environment variables and are injected at build time.
// Never hardcode them here.
//
// The anon key is designed to be public — it identifies the project, it does
// not grant access. Row Level Security is what actually protects the data, so
// the policies in supabase/schema.sql are not optional. Without them the anon
// key would let anyone read everything.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function signInWithGoogle() {
  if (!supabase) throw new Error("Supabase isn't configured");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
