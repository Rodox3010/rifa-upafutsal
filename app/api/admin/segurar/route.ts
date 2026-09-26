import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const number = Number(body.number);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 20) : "";

  if (!Number.isInteger(number) || number < 1 || number > 100) {
    return NextResponse.json({ ok: false, erro: "Número inválido" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("raffle_numbers")
    .update({
      status: "reserved",
      held_by_admin: true,
      name: name || "Reservado pelo admin",
      phone,
      email: null,
      reserved_at: new Date().toISOString(),
      expires_at: null, // segurado pelo admin não expira
      updated_at: new Date().toISOString(),
    })
    .eq("number", number);

  if (error) {
    return NextResponse.json({ ok: false, erro: "Erro ao segurar número" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
