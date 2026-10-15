import { sql } from 'drizzle-orm'
import type { PensaFunnelCounts, PensaFunnelReader } from '../../../domain/ports/pensa-funnel.port'
import type { Database } from './db'

/** A frase do "Tanto faz" que a tela põe no campo (`ANY_ANSWER` do `JourneyApp`). */
export const PENSA_ANY_ANSWER = 'Tanto faz, escolhe você.'

/**
 * Uma consulta só: a primeira versão (`pensa_cycles.number = 1`) dos jogos v2 criados desde
 * `since`. As perguntas são as mensagens com `choices`; a resposta é a mensagem SEGUINTE, se for
 * da criança, comparada (sem o texto sair do banco) com os rótulos das respostas prontas.
 */
export class DrizzlePensaFunnelRepository implements PensaFunnelReader {
  constructor(private readonly db: Database) {}

  async funnel(since: Date, until: Date): Promise<PensaFunnelCounts> {
    const rows = await this.db.execute<Record<keyof PensaFunnelCounts, string | number>>(sql`
      with g as (
        select j.cycle_id, j.data
        from members.pensa_projects p
        join members.pensa_cycles c on c.project_id = p.id and c.number = 1
        join members.pensa_journeys j on j.cycle_id = c.id
        where p.created_at >= ${since.toISOString()}::timestamptz
          and p.created_at <= ${until.toISOString()}::timestamptz
      ),
      q as (
        select g.cycle_id, m.value as question,
          (select n.value from jsonb_array_elements(g.data->'messages') with ordinality n(value, k)
            where n.k = m.i + 1) as next
        from g
        cross join lateral jsonb_array_elements(coalesce(g.data->'messages', '[]'::jsonb))
          with ordinality m(value, i)
        where m.value ? 'choices'
      ),
      a as (
        select q.*,
          case when q.next->>'role' = 'user' then btrim(q.next->>'text') end as reply
        from q
      ),
      -- Até onde cada jogo CHEGOU: a etapa mais adiantada (0 = só começou). Contar cada etapa
      -- "chegou aqui ou além" mantém o funil encaixado: testar não exige missão concluída, e
      -- guardar a versão não exige nenhuma das duas. Contadas soltas, uma etapa podia ter mais
      -- jogos que a anterior e "quantos ficaram" saía trocado entre as duas.
      s as (
        select g.cycle_id,
          case
            when g.data->>'stage' = 'closed' and g.data->>'closedReason' = 'met' then 6
            when jsonb_array_length(coalesce(g.data->'tests', '[]'::jsonb)) > 0 then 5
            when exists (
              select 1 from members.pensa_tasks t
              where t.cycle_id = g.cycle_id and t.progress_status = 'completed') then 4
            when g.data->>'acceptedProposalId' is not null
              or jsonb_array_length(coalesce(g.data->'missionIds', '[]'::jsonb)) > 0 then 3
            when jsonb_typeof(g.data->'proposal') = 'object' then 2
            when coalesce(g.data->>'intent', '') <> '' then 1
            else 0
          end as reached
        from g
      )
      select
        (select count(*) from g) as "games",
        (select count(*) from s where reached >= 1) as "told",
        (select count(distinct cycle_id) from a) as "asked",
        (select count(*) from a) as "questions",
        (select count(*) from a where reply = ${PENSA_ANY_ANSWER}) as "answeredAny",
        (select count(*) from a where reply is not null and reply <> ${PENSA_ANY_ANSWER} and exists (
          select 1 from jsonb_array_elements(a.question->'choices'->'options') o
          where btrim(o->>'label') = a.reply)) as "answeredByChoice",
        (select count(*) from a where a.next is null) as "waitingOnQuestion",
        (select count(*) from s where reached >= 2) as "proposal",
        (select count(*) from s where reached >= 3) as "accepted",
        (select count(*) from s where reached >= 4) as "firstMission",
        (select count(*) from s where reached >= 5) as "tested",
        (select count(*) from s where reached >= 6) as "versionDone"
    `)
    const row = (rows as unknown as Array<Record<string, string | number>>)[0] ?? {}
    const n = (key: keyof PensaFunnelCounts) => Number(row[key] ?? 0)
    return {
      games: n('games'),
      told: n('told'),
      asked: n('asked'),
      questions: n('questions'),
      answeredByChoice: n('answeredByChoice'),
      answeredAny: n('answeredAny'),
      waitingOnQuestion: n('waitingOnQuestion'),
      proposal: n('proposal'),
      accepted: n('accepted'),
      firstMission: n('firstMission'),
      tested: n('tested'),
      versionDone: n('versionDone'),
    }
  }
}
