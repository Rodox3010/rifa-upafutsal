import { createBrowserClient } from "@supabase/ssr";

// Cliente para o navegador — usa a chave anon (pública), que só
// tem permissão de leitura na view raffle_numbers_public (sem
// dados pessoais). Toda escrita passa pelas rotas /api.
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
