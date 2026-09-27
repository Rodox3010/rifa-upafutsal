export type DadosReserva = {
  numbers: number[];
  name: string;
  phone: string;
  email: string;
  honeypot?: string; // campo invisível — bots costumam preenchê-lo
};

const MAX_NUMEROS_POR_RESERVA = 10;

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

  const numerosBrutos = Array.isArray(b.numbers) ? b.numbers : [];
  const numbers = Array.from(new Set(numerosBrutos.map((n) => Number(n))));

  if (numbers.length === 0 || numbers.length > MAX_NUMEROS_POR_RESERVA) {
    return { ok: false, erro: "Escolha entre 1 e 10 números" };
  }

  for (const n of numbers) {
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return { ok: false, erro: "Número inválido" };
    }
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

  return { ok: true, dados: { numbers, name, phone, email } };
}
