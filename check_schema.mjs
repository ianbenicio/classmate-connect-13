import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pbzkbwkzexhtdfuyaqiv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiemtid2t6ZXhodGRmdXlhcWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNzExMTksImV4cCI6MjA5MjY0NzExOX0.tuoIsmWzCj7Yf__faCz_otfrO7fUoDXf2aPqMdNQ0XI";

const supabase = createClient(supabaseUrl, supabaseKey);

// Get table schema - test connection
const { data, error } = await supabase.from("notificacoes").select("*").limit(1);

console.log("Test query error:", error);
console.log("Test query data:", data ? "Success - table exists" : "No data");

// Try to get constraints info
const { data: constraints, error: constraintsError } = await supabase
  .from("information_schema.table_constraints")
  .select("constraint_name, constraint_type, table_name")
  .eq("table_name", "notificacoes");

console.log("Constraints error:", constraintsError);
console.log("Constraints:", constraints);
