"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

type NumeroCompleto = {
  number: number;
  status: "available" | "reserved" | "paid";
  name: string | null;
  phone: string | null;
  email: string | null;
  held_by_admin: boolean;
  reserved_at: string | null;
  expires_at: string | null;
  paid_at: string | null;
};

type Filtro = "todos" | "available" | "reserved" | "paid";

export default function PainelAdminCliente({ numerosIniciais }: { numerosIniciais: NumeroCompleto[] }) {
  const [numeros, setNumeros] = useState(numerosIniciais);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [carregandoAcao, setCarregandoAcao] = useState<number | null>(null);
  const router = useRouter();

  const listaFiltrada = useMemo(
    () => numeros.filter((n) => filtro === "todos" || n.status === filtro),
    [numeros, filtro]
  );

  async function chamarAcao(rota: string, number: number, extra?: Record<string, unknown>) {
    setCarregandoAcao(number);
    try {
      const resp = await fetch(rota, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, ...extra }),
      });
      const data = await resp.json();
      if (data.ok) {
        router.refresh();
        // Atualização otimista simples: recarrega a página inteira via refresh acima
      } else {
        alert(data.erro || "Falha na ação");
      }
    } finally {
      setCarregandoAcao(null);
    }
  }

  async function segurarNumero(number: number) {
    const nome = prompt("Nome de quem vai ficar com este número:");
    if (nome === null) return;
    const telefone = prompt("Telefone (opcional):") || "";
    await chamarAcao("/api/admin/segurar", number, { name: nome, phone: telefone });
  }

  async function sair() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const contagens = useMemo(() => {
    return {
      available: numeros.filter((n) => n.status === "available").length,
      reserved: numeros.filter((n) => n.status === "reserved").length,
      paid: numeros.filter((n) => n.status === "paid").length,
    };
  }, [numeros]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Painel Admin — Rifa Upa Futsal</h1>
        <button onClick={sair} className="text-sm text-slate-500 underline">
          Sair
        </button>
      </div>

      <div className="mb-4 flex gap-4 text-sm">
        <span>✅ Pagos: <strong>{contagens.paid}</strong></span>
        <span>🟡 Reservados: <strong>{contagens.reserved}</strong></span>
        <span>⬜ Disponíveis: <strong>{contagens.available}</strong></span>
      </div>

      <div className="mb-4 flex gap-2">
        {(["todos", "available", "reserved", "paid"] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filtro === f ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            {f === "todos" ? "Todos" : f === "available" ? "Disponíveis" : f === "reserved" ? "Reservados" : "Pagos"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Nº</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Telefone</th>
              <th className="px-3 py-2">E-mail</th>
              <th className="px-3 py-2">Expira em</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {listaFiltrada.map((n) => (
              <tr key={n.number} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold">{n.number}</td>
                <td className="px-3 py-2">
                  {n.status === "paid" && <span className="text-emerald-700">Pago</span>}
                  {n.status === "reserved" && (
                    <span className="text-amber-600">
                      Reservado {n.held_by_admin ? "(pelo admin)" : ""}
                    </span>
                  )}
                  {n.status === "available" && <span className="text-slate-500">Disponível</span>}
                </td>
                <td className="px-3 py-2">{n.name ?? "-"}</td>
                <td className="px-3 py-2">{n.phone ?? "-"}</td>
                <td className="px-3 py-2">{n.email ?? "-"}</td>
                <td className="px-3 py-2">
                  {n.expires_at ? new Date(n.expires_at).toLocaleString("pt-BR") : "-"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    {n.status === "reserved" && !n.held_by_admin && (
                      <button
                        disabled={carregandoAcao === n.number}
                        onClick={() => chamarAcao("/api/admin/confirmar", n.number)}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                      >
                        Confirmar pagamento
                      </button>
                    )}
                    {n.status !== "paid" && (
                      <button
                        disabled={carregandoAcao === n.number}
                        onClick={() => segurarNumero(n.number)}
                        className="rounded bg-slate-700 px-2 py-1 text-xs text-white disabled:opacity-50"
                      >
                        Segurar
                      </button>
                    )}
                    {n.status !== "available" && (
                      <button
                        disabled={carregandoAcao === n.number}
                        onClick={() => {
                          if (confirm(`Liberar o número ${n.number}?`)) chamarAcao("/api/admin/liberar", n.number);
                        }}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                      >
                        Liberar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
