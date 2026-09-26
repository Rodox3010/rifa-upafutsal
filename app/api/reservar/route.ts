import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validarReserva } from "@/lib/validate";
import { notificarAdminWhatsapp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const LIMITE_TENTATIVAS = 8; // por IP, na janela abaixo
const JANELA_MINUTOS = 10;

function obterIp(req: NextRequest): string {
  const encaminhado = req.headers.get("x-forwarded-for");
  return encaminhado ? encaminhado.split(",")[0].trim() : "desconhecido";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }

  const validacao = validarReserva(body);
  if (!validacao.ok) {
    // Se foi o honeypot que pegou, respondemos como se tivesse dado certo,
    // sem revelar ao robô que ele foi identificado.
    if (validacao.erro === "honeypot") {
      return NextResponse.json({ ok: true, message: "Reservado com sucesso" });
    }
    return NextResponse.json({ ok: false, erro: validacao.erro }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const ip = obterIp(req);

  // --- Limite de tentativas por IP ---
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("reservation_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", desde);

  if ((count ?? 0) >= LIMITE_TENTATIVAS) {
    return NextResponse.json(
      { ok: false, erro: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429 }
    );
  }

  await supabase.from("reservation_attempts").insert({ ip });

  // --- Reserva atômica via função no banco ---
  const { number, name, phone, email } = validacao.dados;

  const { data, error } = await supabase.rpc("reservar_numero", {
    p_number: number,
    p_name: name,
    p_phone: phone,
    p_email: email,
  });

  if (error) {
    console.error("Erro no RPC reservar_numero:", error);
    return NextResponse.json({ ok: false, erro: "Erro ao reservar número" }, { status: 500 });
  }

  const resultado = data?.[0];
  if (!resultado?.ok) {
    return NextResponse.json({ ok: false, erro: resultado?.message ?? "Não foi possível reservar" }, { status: 409 });
  }

  // Notifica o admin — se falhar, não desfaz a reserva (o dado já está salvo)
  await notificarAdminWhatsapp(
    `🎟️ Nova reserva na Rifa Upa Futsal!\n` +
      `Número: ${number}\n` +
      `Nome: ${name}\n` +
      `Telefone: ${phone}\n` +
      `E-mail: ${email}\n` +
      `Prazo de pagamento: 2 dias. Confira e confirme no painel admin.`
  );

  return NextResponse.json({ ok: true, message: "Reservado com sucesso" });
}
