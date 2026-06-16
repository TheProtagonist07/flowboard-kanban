import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// FlowBoard runs in one of two modes:
//   • LOCAL mode  — no Supabase env vars set. The board lives in localStorage,
//                   there is no login, and the app behaves exactly as the
//                   original single-user version.
//   • CLOUD mode  — VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set. The app
//                   requires sign-in and stores boards in Supabase with realtime
//                   multiplayer + team workspaces.
//
// This single flag is what every other module checks to decide which path to take.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const CLOUD = Boolean(url && anonKey);

// Only instantiate a client when configured; in local mode this stays null.
export const supabase: SupabaseClient | null = CLOUD
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Narrowing helper for the many call sites that only run in cloud mode.
export function db(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured (running in local mode).');
  return supabase;
}
