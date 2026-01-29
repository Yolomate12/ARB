import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://heahkxgngnnhugdsurfl.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlYWhreGduZ25uaHVnZHN1cmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MDE2MzAsImV4cCI6MjA3NjE3NzYzMH0.j8Fq998AwsJ_pTfVirUVBjQqtJnESovekfuNf_viTmc";

// drž sa jedného storageKey (ak si ho menil, tak raz vyčisti staré kľúče v dev)
export const AUTH_STORAGE_KEY = "sb-heahkxgngnnhugdsurfl-auth-token";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    storageKey: AUTH_STORAGE_KEY,
    autoRefreshToken: true, // ✅ nech to refreshuje
    persistSession: true,
    detectSessionInUrl: false,
  },
});
