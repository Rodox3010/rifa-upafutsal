import { createClient } from "@supabase/supabase-js";

// ATENÇÃO: este cliente usa a service role key, que ignora o RLS.
// Só pode ser importado em código que roda no servidor (rotas /api,
// server components). NUNCA importe este arquivo em um componente
// que rode no navegador.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Variáveis SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
