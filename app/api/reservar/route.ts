import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validarReserva } from "@/lib/validate";
import { notificarAdminWhatsapp } from "@/lib/whatsapp";
import { valorTotal, precoPorNumero } from "@/lib/preco";

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
    if (validacao.erro === "honeypot") {
      return NextResponse.json({ ok: true, message: "Reservado com sucesso" });
    }
    return NextResponse.json({ ok: false, erro: validacao.erro }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const ip = obterIp(req);

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

  const { numbers, name, phone, email } = validacao.dados;

  const { data, error } = await supabase.rpc("reservar_numeros", {
    p_numbers: numbers,
    p_name: name,
    p_phone: phone,
    p_email: email,
  });

  if (error) {
    console.error("Erro no RPC reservar_numeros:", error);
    return NextResponse.json({ ok: false, erro: "Erro ao reservar número(s)" }, { status: 500 });
  }

  const resultado = data?.[0];
  if (!resultado?.ok) {
    return NextResponse.json({ ok: false, erro: resultado?.message ?? "Não foi possível reservar" }, { status: 409 });
  }

  const total = valorTotal(numbers.length);
  const unitario = precoPorNumero(numbers.length);

  await notificarAdminWhatsapp(
    `🎟️ Nova reserva na Rifa Upa Futsal!\n` +
      `Número(s): ${numbers.join(", ")}\n` +
      `Nome: ${name}\n` +
      `Telefone: ${phone}\n` +
      `E-mail: ${email}\n` +
      `Valor: R$ ${unitario.toFixed(2)} por número — total R$ ${total.toFixed(2)}\n` +
      `Prazo de pagamento: 2 dias. Confira e confirme no painel admin.`
  );

  return NextResponse.json({ ok: true, message: "Reservado com sucesso" });
}
