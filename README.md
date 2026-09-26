# Rifa Upa Futsal 🎟️

App de rifa com 100 números, feito em Next.js + Supabase, pronto para publicar na Vercel.

## Como funciona

- A pessoa escolhe um número disponível, preenche nome/telefone/e-mail e recebe na hora
  o QR Code / código Pix (copia e cola) para pagar.
- Você recebe um aviso no seu WhatsApp a cada número reservado, com os dados da pessoa.
- Se a pessoa não pagar em **2 dias**, o número volta a ficar disponível automaticamente.
- No painel `/admin` você pode: confirmar pagamento, segurar um número para alguém
  (sem prazo de expiração) ou liberar um número manualmente.

---

## Passo 1 — Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) com a mesma conta que você já usa e clique em **New project**.
2. Escolha um nome (ex: `rifa-upa-futsal`) e uma senha forte para o banco (guarde-a).
3. Depois que o projeto for criado, vá em **SQL Editor** → **New query**, cole todo o
   conteúdo do arquivo [`supabase/schema.sql`](./supabase/schema.sql) deste projeto e clique em **Run**.
4. Vá em **Authentication → Users → Add user** e crie o seu usuário admin (e-mail e senha
   que você vai usar para entrar em `/admin`).
5. Copie o **UUID** desse usuário (aparece na lista de usuários) e volte ao SQL Editor
   para rodar:
   ```sql
   insert into public.admins (user_id) values ('COLE-O-UUID-AQUI');
   ```
6. Vá em **Project Settings → API** e anote:
   - `Project URL` → vai virar `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_URL`
   - `anon public key` → vai virar `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → vai virar `SUPABASE_SERVICE_ROLE_KEY` (⚠️ **nunca** exponha essa chave no navegador ou no GitHub)

## Passo 2 — Ativar o WhatsApp (CallMeBot, gratuito)

No **celular que vai receber os avisos**:

1. Abra [callmebot.com/blog/free-api-whatsapp-messages](https://www.callmebot.com/blog/free-api-whatsapp-messages/)
   e siga as instruções para adicionar o número do bot aos seus contatos.
2. Envie para esse contato, pelo WhatsApp, a mensagem: `I allow callmebot to send me messages`
3. Em alguns segundos/minutos você recebe de volta uma mensagem com sua **API Key**. Guarde-a.
4. Anote também o seu número de telefone com DDI (ex: `5511999999999`).

> É um serviço gratuito mantido por um voluntário — funciona muito bem para o volume
> de uma rifa (até 100 avisos), mas pode ocasionalmente ficar fora do ar por alguns
> minutos. Se um aviso não chegar, você sempre pode conferir tudo direto no painel `/admin`.

## Passo 3 — Configurar as variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com os valores dos passos 1 e 2:

```bash
cp .env.example .env.local
```

## Passo 4 — Testar localmente (opcional)

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` (rifa pública) e `http://localhost:3000/admin` (painel).

## Passo 5 — Publicar na Vercel

1. Suba este projeto para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e importe o repositório.
3. Em **Environment Variables**, adicione todas as variáveis do seu `.env.local`.
4. Clique em **Deploy**.

Pronto — seu app estará em uma URL tipo `https://rifa-upa-futsal.vercel.app`.

---

## Segurança — o que já está implementado

- **RLS (Row Level Security)** ativado em todas as tabelas: ninguém lê ou escreve
  diretamente no banco além do que as regras permitem.
- A grade pública de números usa uma **view sem dados pessoais** (`raffle_numbers_public`) —
  quem visita o site nunca vê nome, telefone ou e-mail de outras pessoas.
- A reserva de número roda dentro de uma **função no banco com trava de linha
  (`for update`)**, então duas pessoas não conseguem "roubar" o mesmo número ao
  mesmo tempo, mesmo clicando juntas.
- A **service role key** (que tem acesso total ao banco) só é usada no servidor
  (rotas `/api/...`), nunca é enviada ao navegador.
- As rotas `/api/admin/*` conferem, a cada chamada, se quem está logado realmente
  está na tabela `admins` — copiar a URL não é suficiente para agir como admin.
- O middleware bloqueia o acesso a `/admin` para quem não estiver logado como admin.
- Formulário público tem **campo honeypot** (invisível) e **limite de tentativas
  por IP** (contra robôs tentando reservar todos os números).
- Dados enviados pelo formulário são validados e limitados em tamanho no servidor
  antes de irem para o banco.

### Cuidados que ficam por sua conta
- Nunca commite o arquivo `.env.local` no Git (ele já está no `.gitignore`).
- Troque a senha do seu usuário admin se desconfiar de qualquer acesso indevido.
- Se quiser mais de um admin, repita o passo 1.4/1.5 para cada novo usuário.

---

## Ajustes comuns

- **Preço fixo do bilhete**: preencha `NEXT_PUBLIC_PIX_VALOR` (ex: `10.00`). Deixe
  em branco para a pessoa digitar o valor no app do banco dela.
- **Prazo de pagamento**: hoje é 2 dias. Para mudar, edite `interval '2 days'` na
  função `reservar_numero` dentro de `supabase/schema.sql` e rode o novo SQL no
  Supabase.
- **Frequência da checagem de expiração**: hoje roda a cada 15 minutos (`*/15 * * * *`
  no `cron.schedule`). Pode deixar mais frequente se quiser.
