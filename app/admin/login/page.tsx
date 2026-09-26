"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function LoginAdmin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function entrar() {
    setCarregando(true);
    setErro(null);
    const supabase = supabaseBrowser();

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      setErro("E-mail ou senha inválidos");
      setCarregando(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-4 text-xl font-bold">Painel Admin — Rifa Upa Futsal</h1>
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-3 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        type="password"
        placeholder="Senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && entrar()}
        className="mb-3 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
      <button
        onClick={entrar}
        disabled={carregando}
        className="rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {carregando ? "Entrando..." : "Entrar"}
      </button>
    </main>
  );
}
