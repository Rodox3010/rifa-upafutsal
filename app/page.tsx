"use client";

import { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { gerarPayloadPix } from "@/lib/pix";

type NumeroInfo = {
  number: number;
  status: "available" | "reserved" | "paid";
  held_by_admin: boolean;
  expires_at: string | null;
};

const CHAVE_PIX = process.env.NEXT_PUBLIC_PIX_CHAVE || "upafutsal@gmail.com";
const NOME_PIX = process.env.NEXT_PUBLIC_PIX_NOME || "Upa Futsal";
const CIDADE_PIX = process.env.NEXT_PUBLIC_PIX_CIDADE || "Sao Paulo";
const VALOR_PIX = process.env.NEXT_PUBLIC_PIX_VALOR
  ? Number(process.env.NEXT_PUBLIC_PIX_VALOR)
  : undefined;

function corDoNumero(info: NumeroInfo) {
  if (info.status === "paid") return "bg-emerald-600 text-white cursor-not-allowed";
  if (info.status === "reserved") return "bg-amber-400 text-white cursor-not-allowed";
  return "bg-white hover:bg-emerald-50 border-2 border-emerald-500 text-emerald-700 cursor-pointer";
}

export default function PaginaRifa() {
  const [numeros, setNumeros] = useState<NumeroInfo[] | null>(null);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [reservado, setReservado] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarNumeros = useCallback(async () => {
    const resp = await fetch("/api/numeros", { cache: "no-store" });
    const data = await resp.json();
    if (data.numeros) setNumeros(data.numeros);
  }, []);

  useEffect(() => {
    carregarNumeros();
    const intervalo = setInterval(carregarNumeros, 15000);
    return () => clearInterval(intervalo);
  }, [carregarNumeros]);

  async function confirmarReserva() {
    if (selecionado === null) return;
    setEnviando(true);
    setErro(null);

    try {
      const resp = await fetch("/api/reservar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: selecionado, name: nome, phone: telefone, email, honeypot }),
      });
      const data = await resp.json();

      if (!data.ok) {
        setErro(data.erro || "Não foi possível reservar este número.");
        await carregarNumeros();
        setEnviando(false);
        return;
      }

      setReservado(selecionado);
      setSelecionado(null);
      await carregarNumeros();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const payloadPix = reservado
    ? gerarPayloadPix({
        chave: CHAVE_PIX,
        nomeRecebedor: NOME_PIX,
        cidade: CIDADE_PIX,
        valor: VALOR_PIX,
        txid: `RIFA${String(reservado).padStart(3, "0")}`,
      })
    : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-emerald-700">🎟️ Rifa Upa Futsal</h1>
        <p className="mt-1 text-sm text-slate-600">
          Escolha um número disponível, preencha seus dados e pague via Pix.
          Você tem <strong>2 dias</strong> para pagar — depois disso o número volta a ficar disponível.
        </p>
      </header>

      <div className="mb-4 flex justify-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-emerald-500 bg-white" /> Disponível</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-400" /> Reservado</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-600" /> Pago</span>
      </div>

      {!numeros && <p className="text-center text-slate-500">Carregando números...</p>}

      {numeros && (
        <div className="grid grid-cols-10 gap-2">
          {numeros.map((n) => (
            <button
              key={n.number}
              disabled={n.status !== "available"}
              onClick={() => {
                setSelecionado(n.number);
                setErro(null);
              }}
              className={`aspect-square rounded-lg text-sm font-semibold transition ${corDoNumero(n)}`}
              title={n.status === "available" ? "Clique para reservar" : "Indisponível"}
            >
              {n.number}
            </button>
          ))}
        </div>
      )}

      {/* Modal de reserva */}
      {selecionado !== null && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-bold">Número {selecionado}</h2>
            <p className="mb-4 text-sm text-slate-600">Preencha seus dados para reservar este número.</p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="tel"
                placeholder="WhatsApp com DDD"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {/* honeypot: invisível para pessoas, tentador para robôs */}
              <input
                type="text"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setSelecionado(null)}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarReserva}
                disabled={enviando}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {enviando ? "Reservando..." : "Reservar número"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tela de pagamento após reservar */}
      {reservado !== null && payloadPix && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
            <h2 className="mb-1 text-lg font-bold text-emerald-700">Número {reservado} reservado! 🎉</h2>
            <p className="mb-4 text-sm text-slate-600">
              Pague via Pix em até <strong>2 dias</strong> para garantir seu número.
            </p>

            <div className="flex justify-center">
              <QRCodeSVG value={payloadPix} size={200} />
            </div>

            <p className="mt-3 text-xs text-slate-500">Chave Pix: {CHAVE_PIX}</p>

            <button
              onClick={() => navigator.clipboard.writeText(payloadPix)}
              className="mt-3 w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-white"
            >
              Copiar código Pix (copia e cola)
            </button>

            <button
              onClick={() => setReservado(null)}
              className="mt-2 w-full rounded-lg border border-slate-300 py-2 text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
