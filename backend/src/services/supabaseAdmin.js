import { createClient } from "@supabase/supabase-js";
import { ENV } from "../config/env.js";

let cachedClient = null;

export function getSupabaseAdmin() {
  if (cachedClient) {
    return cachedClient;
  }

  if (!ENV.SUPABASE_URL || !ENV.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  cachedClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
}
