-- =====================================================
-- SUPABASE.SQL — cria a tabela e as regras de segurança
-- Onde correr: Supabase → SQL Editor → New query → cola tudo → Run
-- ANTES de correr: troca "teu-email@exemplo.com" pelo teu email (em minúsculas)
-- =====================================================

-- 1) A TABELA: uma só linha (id = 1) com todo o portfólio em JSON
create table if not exists public.portfolio (
  id integer primary key default 1,                      -- número da linha (só existe a 1)
  dados jsonb not null default '{}'::jsonb,              -- todo o conteúdo do site
  atualizado_em timestamptz not null default now(),      -- quando foi guardado pela última vez
  constraint so_uma_linha check (id = 1)                 -- impede criar uma segunda linha
);

-- 2) SEGURANÇA: liga as regras por linha (RLS).
-- Sem isto, qualquer pessoa com a chave pública podia alterar ou apagar tudo.
alter table public.portfolio enable row level security;

-- 3) REGRA 1: qualquer visitante pode LER
drop policy if exists "Todos podem ler" on public.portfolio;
create policy "Todos podem ler"
  on public.portfolio
  for select
  using (true);                                          -- "true" = sem condições

-- 4) REGRA 2: só o TEU email (com sessão iniciada) pode CRIAR, ALTERAR e APAGAR
-- "for all" = insert + update + delete. "to authenticated" = só quem tem login.
drop policy if exists "So o dono pode alterar" on public.portfolio;
create policy "So o dono pode alterar"
  on public.portfolio
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'JOSEDALUZ024@GMAIL.COM')
  with check ((auth.jwt() ->> 'email') = 'JOSEDALUZ024@GMAIL.COM');

-- 5) Linha inicial vazia (o site mostra o exemplo até guardares alguma coisa)
insert into public.portfolio (id, dados)
values (1, '{}'::jsonb)
on conflict (id) do nothing;
