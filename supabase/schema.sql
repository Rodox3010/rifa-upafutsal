-- ============================================================
-- RIFA UPA FUTSAL — Schema completo do Supabase
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase
-- ============================================================

-- Extensões necessárias
create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- ------------------------------------------------------------
-- Tabela principal: 100 números da rifa
-- ------------------------------------------------------------
create table if not exists public.raffle_numbers (
  number        int primary key check (number between 1 and 100),
  status        text not null default 'available'
                  check (status in ('available', 'reserved', 'paid')),
  name          text,
  phone         text,
  email         text,
  held_by_admin boolean not null default false,
  reserved_at   timestamptz,
  expires_at    timestamptz,
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Popula os 100 números (idempotente)
insert into public.raffle_numbers (number)
select generate_series(1, 100)
on conflict (number) do nothing;

-- ------------------------------------------------------------
-- Tabela de administradores (liga um usuário do Supabase Auth
-- ao papel de admin — só quem estiver aqui pode gerenciar a rifa)
-- ------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tabela para limitar tentativas por IP (anti-abuso simples)
-- ------------------------------------------------------------
create table if not exists public.reservation_attempts (
  id         bigint generated always as identity primary key,
  ip         text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_attempts_ip_time
  on public.reservation_attempts (ip, created_at);

alter table public.reservation_attempts enable row level security;
-- Nenhuma policy criada de propósito: só a service role (backend) acessa.

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.raffle_numbers enable row level security;
alter table public.admins enable row level security;

-- Ninguém (nem anon, nem authenticated comum) lê ou escreve
-- diretamente na tabela raffle_numbers — toda leitura pública
-- passa pela view abaixo (sem dados pessoais) e toda escrita
-- passa pelas funções abaixo, chamadas com a service role a
-- partir do backend (rotas /api do Next.js), nunca do navegador.

create policy "admins podem ler tudo"
  on public.raffle_numbers for select
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy "admins podem atualizar"
  on public.raffle_numbers for update
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy "usuario ve seu proprio registro de admin"
  on public.admins for select
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- View pública: só o essencial para desenhar a grade de números.
-- Não expõe nome, telefone ou e-mail de ninguém.
-- ------------------------------------------------------------
create or replace view public.raffle_numbers_public as
select number, status, held_by_admin, expires_at
from public.raffle_numbers;

grant select on public.raffle_numbers_public to anon, authenticated;

-- ------------------------------------------------------------
-- Função: reservar um ou mais números de uma vez, atomicamente
-- (evita condição de corrida entre pessoas reservando os mesmos
-- números ao mesmo tempo, e permite a promoção "2 ou mais números
-- saem mais barato" sem risco de reservar só parte do pedido).
-- SECURITY DEFINER + revogada de anon/authenticated: só pode ser
-- chamada com a service role key, a partir do backend.
-- ------------------------------------------------------------
create or replace function public.reservar_numeros(
  p_numbers int[],
  p_name    text,
  p_phone   text,
  p_email   text
)
returns table(ok boolean, message text) as $$
declare
  v_indisponiveis int[];
begin
  perform 1 from public.raffle_numbers where number = any(p_numbers) for update;

  select array_agg(number) into v_indisponiveis
  from public.raffle_numbers
  where number = any(p_numbers)
    and (
      status = 'paid'
      or (status = 'reserved' and (held_by_admin or (expires_at is not null and expires_at > now())))
    );

  if v_indisponiveis is not null then
    return query select false, 'Os números ' || array_to_string(v_indisponiveis, ', ') || ' não estão mais disponíveis';
    return;
  end if;

  update public.raffle_numbers
    set status        = 'reserved',
        name          = p_name,
        phone         = p_phone,
        email         = p_email,
        held_by_admin = false,
        reserved_at   = now(),
        expires_at    = now() + interval '2 days',
        updated_at    = now()
    where number = any(p_numbers);

  return query select true, 'Reservado com sucesso';
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.reservar_numeros(int[], text, text, text) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Função: liberar reservas vencidas (roda sozinha via pg_cron)
-- Nunca libera números que o admin segurou manualmente.
-- ------------------------------------------------------------
create or replace function public.expirar_reservas()
returns void as $$
begin
  update public.raffle_numbers
    set status      = 'available',
        name        = null,
        phone       = null,
        email       = null,
        reserved_at = null,
        expires_at  = null,
        updated_at  = now()
    where status = 'reserved'
      and held_by_admin = false
      and expires_at is not null
      and expires_at < now();
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.expirar_reservas() from public, anon, authenticated;

-- Agenda a expiração para rodar a cada 15 minutos
select cron.schedule(
  'expirar-reservas-rifa',
  '*/15 * * * *',
  $$select public.expirar_reservas();$$
)
where not exists (
  select 1 from cron.job where jobname = 'expirar-reservas-rifa'
);

-- ============================================================
-- DEPOIS DE RODAR ESTE ARQUIVO:
-- 1. Crie seu usuário admin em Authentication > Users (e-mail/senha)
-- 2. Pegue o UUID desse usuário e rode:
--    insert into public.admins (user_id) values ('COLE-O-UUID-AQUI');
-- ============================================================
