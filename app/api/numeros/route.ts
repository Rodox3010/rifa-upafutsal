import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Usa a chave anon (não a service role): esta rota só lê a view
// pública, que já não tem dados pessoais — princípio do menor
// privilégio possível também no backend.
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("raffle_numbers_public")
    .select("number, status, held_by_admin, expires_at")
    .order("number", { ascending: true });

  if (error) {
    return NextResponse.json({ erro: "Erro ao carregar números" }, { status: 500 });
  }

  return NextResponse.json({ numeros: data });
}
