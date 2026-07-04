import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
}

const supabase = createClient(url, serviceRoleKey);

const { data, error } = await supabase
  .from("products")
  .select("*, customers(email, name)")
  .eq("status", "new")
  .order("created_at", { ascending: true });

if (error) throw error;

console.log(JSON.stringify(data, null, 2));
