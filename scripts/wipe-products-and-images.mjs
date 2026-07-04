import { createClient } from "@supabase/supabase-js";

if (process.env.CONFIRM_WIPE !== "yes") {
  throw new Error("Destructive wipe blocked. Run with CONFIRM_WIPE=yes.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
}

const supabase = createClient(url, serviceRoleKey);

const { data: objects, error: listError } = await supabase
  .schema("storage")
  .from("objects")
  .select("name")
  .eq("bucket_id", "product-images");

if (listError) throw listError;

const paths = (objects ?? []).map((object) => object.name);

for (let index = 0; index < paths.length; index += 100) {
  const batch = paths.slice(index, index + 100);
  const { error } = await supabase.storage.from("product-images").remove(batch);
  if (error) throw error;
}

const { error: deleteProductsError } = await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (deleteProductsError) throw deleteProductsError;

console.log(`Deleted ${paths.length} image(s).`);
console.log("Deleted all product rows.");
console.log("Customers/Auth users kept.");
