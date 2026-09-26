import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 401 });
  }

  const { number } = await req.json();
  if (!Number.isInteger(number) || number < 1 || number > 100) {
    return NextResponse.json({ ok: false, erro: "Número inválido" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("raffle_numbers")
    .update({
      status: "available",
      held_by_admin: false,
      name: null,
      phone: null,
      email: null,
      reserved_at: null,
      expires_at: null,
      paid_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("number", number);

  if (error) {
    return NextResponse.json({ ok: false, erro: "Erro ao liberar número" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
