-- F3: RPCs de pendências derivadas (computadas no Postgres, sem persistência).
-- Espelha src/lib/pendencias.ts. Ver docs/design/notificacoes-arquitetura.md.
--
-- ADITIVO: nada consome estas funções ainda (F2 fará a UI usar). Não altera
-- comportamento existente — o scanner client-side segue como está até a F2.
--
-- Premissas (documentadas para revisão):
--  * Escopo: professor vê as SUAS pendências (professor_user_id = auth.uid());
--    admin/coordenacao veem o projeto inteiro. RLS multi-tenant aplica
--    (SECURITY INVOKER → current_project_id() do caller).
--  * Fuso: BRT -03:00 (sem DST) nos limites de slot/dia — determinístico,
--    independente do TZ do runtime.
--  * Mapa de severidade:
--      plano_pendente, dia da aula já chegou  -> urgent
--      plano_pendente, ainda antes do dia     -> warning
--      relatório atrasado (dentro de 24h)     -> urgent
--      relatório expirado (passou 24h)        -> critical
--  * Pendências de aluno ("avalie a aula") ficam fora desta v1 (foco no
--    painel do staff). Tratar em iteração futura se necessário.

create or replace function public.get_pendencias()
returns table (
  agendamento_id uuid,
  kind text,
  severidade text,
  data date,
  inicio text,
  fim text,
  professor text,
  professor_user_id uuid,
  slot_end timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select a.id, a.data, a.inicio, a.fim, a.professor, a.professor_user_id,
           (a.data::text || 'T' || a.fim || ':00-03:00')::timestamptz as slot_end,
           (a.data::text || 'T00:00:00-03:00')::timestamptz as dia_aula
    from public.agendamentos a
    where a.status <> 'concluido'
      and not (
        coalesce(a.meta->>'origem', '') = 'coordenacao'
        and coalesce((a.meta->>'requisitosDispensados')::boolean, false)
      )
      and (
        public.has_role(auth.uid(), 'admin')
        or public.has_role(auth.uid(), 'coordenacao')
        or a.professor_user_id = auth.uid()
      )
  ),
  pend as (
    select b.*,
      not exists (
        select 1 from public.aula_evidencias e
        where e.agendamento_id = b.id
          and e.tipo = 'plano_aula'
          and e.status in ('valido', 'aprovado_manual')
      ) as plano_pendente,
      (now() > b.slot_end and now() <= b.slot_end + interval '24 hours') as atrasado,
      (now() > b.slot_end + interval '24 hours') as expirado
    from base b
  )
  select id, 'plano_pendente',
         case when now() >= dia_aula then 'urgent' else 'warning' end,
         data, inicio, fim, professor, professor_user_id, slot_end
  from pend where plano_pendente
  union all
  select id, 'atrasado', 'urgent', data, inicio, fim, professor, professor_user_id, slot_end
  from pend where atrasado
  union all
  select id, 'expirado', 'critical', data, inicio, fim, professor, professor_user_id, slot_end
  from pend where expirado;
$$;

revoke execute on function public.get_pendencias() from public;
grant execute on function public.get_pendencias() to authenticated;

create or replace function public.get_pendencias_resumo()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'critical', count(*) filter (where severidade = 'critical'),
    'urgent',   count(*) filter (where severidade = 'urgent'),
    'warning',  count(*) filter (where severidade = 'warning'),
    'info',     count(*) filter (where severidade = 'info')
  )
  from public.get_pendencias();
$$;

revoke execute on function public.get_pendencias_resumo() from public;
grant execute on function public.get_pendencias_resumo() to authenticated;
