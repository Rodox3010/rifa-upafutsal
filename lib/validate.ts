export type DadosReserva = {
  number: number;
  name: string;
  phone: string;
  email: string;
  honeypot?: string; // campo invisível — bots costumam preenchê-lo
};

export function validarReserva(body: unknown): { ok: true; dados: DadosReserva } | { ok: false; erro: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, erro: "Requisição inválida" };
  }

  const b = body as Record<string, unknown>;

  // Honeypot: campo que só um robô preencheria. Se vier preenchido,
  // fingimos sucesso mas não fazemos nada (não avisa o bot que foi barrado).
  if (typeof b.honeypot === "string" && b.honeypot.trim() !== "") {
    return { ok: false, erro: "honeypot" };
  }

  const number = Number(b.number);
  if (!Number.isInteger(number) || number < 1 || number > 100) {
    return { ok: false, erro: "Número inválido" };
  }

  const name = typeof b.name === "string" ? b.name.trim().slice(0, 100) : "";
  if (name.length < 3) {
    return { ok: false, erro: "Informe seu nome completo" };
  }

  const phone = typeof b.phone === "string" ? b.phone.replace(/\D/g, "") : "";
  if (phone.length < 10 || phone.length > 13) {
    return { ok: false, erro: "Informe um telefone válido com DDD" };
  }

  const email = typeof b.email === "string" ? b.email.trim().slice(0, 150) : "";
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValido) {
    return { ok: false, erro: "Informe um e-mail válido" };
  }

  return { ok: true, dados: { number, name, phone, email } };
}
