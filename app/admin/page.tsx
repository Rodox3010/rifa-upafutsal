import { supabaseServer } from "@/lib/supabaseServer";
import PainelAdminCliente from "./PainelAdminCliente";

export const dynamic = "force-dynamic";

export default async function PainelAdmin() {
  const supabase = await supabaseServer();

  const { data: numeros } = await supabase
    .from("raffle_numbers")
    .select("number, status, name, phone, email, held_by_admin, reserved_at, expires_at, paid_at")
    .order("number", { ascending: true });

  return <PainelAdminCliente numerosIniciais={numeros ?? []} />;
}
