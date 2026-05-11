import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[SUPABASE] Variaveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorias.",
  );
}

function resolveStorage() {
  const rememberMe = localStorage.getItem("rememberMe") === "true";
  return rememberMe ? localStorage : sessionStorage;
}

const storage = {
  getItem: (key) => {
    const activeStorage = resolveStorage();
    const value = activeStorage.getItem(key);
    if (value) return value;
    const backupStorage = activeStorage === localStorage ? sessionStorage : localStorage;
    return backupStorage.getItem(key);
  },
  setItem: (key, value) => {
    const activeStorage = resolveStorage();
    const backupStorage = activeStorage === localStorage ? sessionStorage : localStorage;
    activeStorage.setItem(key, value);
    backupStorage.removeItem(key);
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage,
  },
});
