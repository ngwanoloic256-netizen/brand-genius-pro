-- BRAND GENIUS — abonnements payés avec SasPay
--
-- Les utilisateurs peuvent LIRE leurs paiements et leur abonnement, jamais les
-- écrire : seules les routes serveur, avec la clé service_role, enregistrent un
-- paiement ou activent une offre. Sans cette règle, n'importe qui pourrait se
-- passer en « studio » depuis la console du navigateur.

/* -------------------------------------------------------------------------- */
/*  Paiements                                                                 */
/* -------------------------------------------------------------------------- */

create table if not exists public.payments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  plan               text not null check (plan in ('pro', 'studio')),
  cycle              text not null check (cycle in ('monthly', 'annual')),
  amount             integer not null check (amount > 0),
  currency           text not null default 'XAF',
  provider           text not null default 'saspay',
  -- Identifiant de la session de paiement SasPay.
  provider_session_id text unique,
  status             text not null default 'pending'
                     check (status in ('pending', 'paid', 'failed')),
  paid_at            timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists payments_user_idx
  on public.payments (user_id, created_at desc);

/* -------------------------------------------------------------------------- */
/*  Abonnements : une ligne par utilisateur                                   */
/* -------------------------------------------------------------------------- */

create table if not exists public.subscriptions (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  plan               text not null check (plan in ('pro', 'studio')),
  current_period_end timestamptz not null,
  last_payment_id    uuid references public.payments(id) on delete set null,
  updated_at         timestamptz not null default now()
);

/* -------------------------------------------------------------------------- */
/*  Journal des webhooks (audit, rejouable à la main)                         */
/* -------------------------------------------------------------------------- */

create table if not exists public.billing_events (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null default 'saspay',
  event       text not null,
  payload     jsonb not null,
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);

/* -------------------------------------------------------------------------- */
/*  Sécurité                                                                  */
/* -------------------------------------------------------------------------- */

alter table public.payments       enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid());

-- Aucune politique d'écriture : insert/update/delete sont refusés à tous les
-- rôles sauf service_role, qui contourne la RLS. billing_events n'a même pas de
-- politique de lecture.

/*
 * Passage en payé, atomique et idempotent.
 *
 * Le webhook et la page de retour peuvent arriver en même temps. Le `where
 * status = 'pending'` garantit qu'un seul des deux allonge la période ; le
 * second ne trouve plus de ligne en attente et ne fait rien.
 */
create or replace function public.activate_payment(payment uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  p        public.payments%rowtype;
  days     integer;
  base     timestamptz;
  new_end  timestamptz;
begin
  update public.payments
     set status = 'paid', paid_at = now()
   where id = payment and status = 'pending'
  returning * into p;

  if not found then
    return null;
  end if;

  days := case p.cycle when 'annual' then 365 else 30 end;

  select greatest(coalesce(s.current_period_end, now()), now())
    into base
    from public.subscriptions s
   where s.user_id = p.user_id;

  new_end := coalesce(base, now()) + make_interval(days => days);

  insert into public.subscriptions (user_id, plan, current_period_end, last_payment_id, updated_at)
  values (p.user_id, p.plan, new_end, p.id, now())
  on conflict (user_id) do update
     set plan = excluded.plan,
         current_period_end = excluded.current_period_end,
         last_payment_id = excluded.last_payment_id,
         updated_at = now();

  return new_end;
end;
$$;

revoke all on function public.activate_payment(uuid) from public, anon, authenticated;
grant execute on function public.activate_payment(uuid) to service_role;
