-- ============================================================
-- ATUALIZAÇÃO: permite reservar vários números de uma vez
-- (para a promoção de 2+ números com desconto)
--
-- Rode este arquivo no SQL Editor do Supabase (Create a new
-- snippet). Ele só ADICIONA uma função nova — não mexe em nada
-- que você já criou, então pode rodar sem medo de dar erro de
-- "já existe".
-- ============================================================

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
  -- Trava todas as linhas envolvidas de uma vez, para duas pessoas
  -- não conseguirem reservar os mesmos números ao mesmo tempo.
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
