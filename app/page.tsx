"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { gerarPayloadPix } from "@/lib/pix";
import { PRECO_UNITARIO, PRECO_PROMOCIONAL, QTD_MINIMA_PROMOCAO, precoPorNumero, valorTotal } from "@/lib/preco";

type NumeroInfo = {
  number: number;
  status: "available" | "reserved" | "paid";
  held_by_admin: boolean;
  expires_at: string | null;
};

const CHAVE_PIX = process.env.NEXT_PUBLIC_PIX_CHAVE || "upafutsal@gmail.com";
const NOME_PIX = process.env.NEXT_PUBLIC_PIX_NOME || "Upa Futsal";
const CIDADE_PIX = process.env.NEXT_PUBLIC_PIX_CIDADE || "Sao Paulo";

function corDoNumero(info: NumeroInfo, selecionado: boolean) {
  if (info.status === "paid") return "bg-emerald-600 text-white cursor-not-allowed";
  if (info.status === "reserved") return "bg-amber-400 text-white cursor-not-allowed";
  if (selecionado) return "bg-emerald-600 text-white border-2 border-emerald-700 cursor-pointer";
  return "bg-white hover:bg-emerald-50 border-2 border-emerald-500 text-emerald-700 cursor-pointer";
}

export default function PaginaRifa() {
  const [numeros, setNumeros] = useState<NumeroInfo[] | null>(null);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [kitAberto, setKitAberto] = useState(false);
  const [reservadoInfo, setReservadoInfo] = useState<{ numeros: number[]; valor: number } | null>(null);
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

  function alternarSelecao(numero: number) {
    setErro(null);
    setSelecionados((atual) =>
      atual.includes(numero) ? atual.filter((n) => n !== numero) : [...atual, numero]
    );
  }

  const precoUnitarioAtual = precoPorNumero(selecionados.length);
  const totalAtual = valorTotal(selecionados.length);
  const faltaUmParaPromo = selecionados.length > 0 && selecionados.length < QTD_MINIMA_PROMOCAO;

  async function confirmarReserva() {
    if (selecionados.length === 0) return;
    setEnviando(true);
    setErro(null);

    try {
      const resp = await fetch("/api/reservar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: selecionados, name: nome, phone: telefone, email, honeypot }),
      });
      const data = await resp.json();

      if (!data.ok) {
        setErro(data.erro || "Não foi possível reservar. Tente novamente.");
        await carregarNumeros();
        setEnviando(false);
        return;
      }

      setReservadoInfo({ numeros: [...selecionados].sort((a, b) => a - b), valor: totalAtual });
      setModalAberto(false);
      setSelecionados([]);
      setNome("");
      setTelefone("");
      setEmail("");
      await carregarNumeros();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const payloadPix = useMemo(() => {
    if (!reservadoInfo) return null;
    return gerarPayloadPix({
      chave: CHAVE_PIX,
      nomeRecebedor: NOME_PIX,
      cidade: CIDADE_PIX,
      valor: reservadoInfo.valor,
      txid: `RIFA${reservadoInfo.numeros.slice(0, 5).join("")}`,
    });
  }, [reservadoInfo]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-emerald-700">🎟️ Rifa Upa Futsal</h1>
        <p className="mt-1 text-sm text-slate-600">
          Escolha um ou mais números disponíveis, preencha seus dados e pague via Pix.
          Você tem <strong>2 dias</strong> para pagar — depois disso o número volta a ficar disponível.
        </p>

        <div className="mx-auto mt-3 max-w-md rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p>
            Cada número custa <strong>R$ {PRECO_UNITARIO.toFixed(2)}</strong>. Levando{" "}
            <strong>{QTD_MINIMA_PROMOCAO} números ou mais</strong>, cada um sai por apenas{" "}
            <strong>R$ {PRECO_PROMOCIONAL.toFixed(2)}</strong>!
          </p>
        </div>

        <button
          onClick={() => setKitAberto(true)}
          className="mt-3 rounded-full border-2 border-amber-400 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
        >
          🎁 Ver o kit do prêmio
        </button>
      </header>

      <div className="mb-4 flex justify-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-emerald-500 bg-white" /> Disponível</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-400" /> Reservado</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-600" /> Pago</span>
      </div>

      {!numeros && <p className="text-center text-slate-500">Carregando números...</p>}

      {numeros && (
        <div className="grid grid-cols-10 gap-2 pb-24">
          {numeros.map((n) => (
            <button
              key={n.number}
              disabled={n.status !== "available"}
              onClick={() => alternarSelecao(n.number)}
              className={`aspect-square rounded-lg text-sm font-semibold transition ${corDoNumero(n, selecionados.includes(n.number))}`}
              title={n.status === "available" ? "Clique para escolher" : "Indisponível"}
            >
              {n.number}
            </button>
          ))}
        </div>
      )}

      {/* Barra flutuante quando há números selecionados */}
      {selecionados.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-semibold">
                {selecionados.length} número{selecionados.length > 1 ? "s" : ""} selecionado{selecionados.length > 1 ? "s" : ""} — R$ {totalAtual.toFixed(2)}
              </p>
              {faltaUmParaPromo && (
                <p className="text-amber-700">
                  Escolha mais {QTD_MINIMA_PROMOCAO - selecionados.length} número{QTD_MINIMA_PROMOCAO - selecionados.length > 1 ? "s" : ""} e pague só R$ {PRECO_PROMOCIONAL.toFixed(2)} em cada! 🎉
                </p>
              )}
              {!faltaUmParaPromo && selecionados.length >= QTD_MINIMA_PROMOCAO && (
                <p className="text-emerald-700">Preço promocional aplicado! 🎉</p>
              )}
            </div>
            <button
              onClick={() => setModalAberto(true)}
              className="whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Modal do kit */}
      {kitAberto && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4" onClick={() => setKitAberto(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-lg font-bold text-emerald-700">🎁 O prêmio</h2>

            {/* Espaço reservado para a foto real do kit — troque esta div por
                <img src="/kit.jpg" alt="Kit do prêmio" className="w-full rounded-lg" />
                depois de colocar o arquivo kit.jpg dentro da pasta /public */}
            <img src="/kit.jpg" alt="Kit do prêmio" className="w-full rounded-lg" />

            <ul className="mt-4 space-y-1 text-left text-sm text-slate-700">
              <li>🎧 Fone de ouvido bluetooth</li>
              <li>👕 Camisa regata do Upa Futsal — tamanho GG (tamanho único)</li>
              <li>🧢 Boné do patrocinador DCM Sports Wear</li>
            </ul>

            <button
              onClick={() => setKitAberto(false)}
              className="mt-5 w-full rounded-lg border border-slate-300 py-2 text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal de reserva */}
      {modalAberto && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-bold">
              Número{selecionados.length > 1 ? "s" : ""}: {[...selecionados].sort((a, b) => a - b).join(", ")}
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Total: <strong>R$ {totalAtual.toFixed(2)}</strong> (R$ {precoUnitarioAtual.toFixed(2)} por número). Preencha seus dados para reservar.
            </p>

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
                onClick={() => setModalAberto(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium"
              >
                Voltar
              </button>
              <button
                onClick={confirmarReserva}
                disabled={enviando}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {enviando ? "Reservando..." : "Reservar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tela de pagamento após reservar */}
      {reservadoInfo && payloadPix && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
            <h2 className="mb-1 text-lg font-bold text-emerald-700">
              Número{reservadoInfo.numeros.length > 1 ? "s" : ""} {reservadoInfo.numeros.join(", ")} reservado{reservadoInfo.numeros.length > 1 ? "s" : ""}! 🎉
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Pague <strong>R$ {reservadoInfo.valor.toFixed(2)}</strong> via Pix em até <strong>2 dias</strong> para garantir seu(s) número(s).
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
              onClick={() => setReservadoInfo(null)}
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
