/**
 * Levantamento (SÓ LEITURA) das entregas de Estúdio/Pinta que SUMIRAM de `studio_submissions`.
 *
 * Contexto: entre 21/06 e 18/08/2026 (`shouldInvalidateBlockProgress`, revertida em `2a690495`)
 * salvar um bloco `studio`/`pinta`/`quiz` no admin apagava TODAS as entregas do bloco. Este
 * script cruza as EVIDÊNCIAS de que uma criança tinha entrega num bloco — ledger `xp_events`
 * (`studio_submitted`/`studio_passed`), conclusão da aula (o gate exigia a entrega) e a conversa
 * com o professor (`teacher_threads`) — com as linhas vivas de `studio_submissions`, e anexa as
 * FONTES de recuperação: posts do Mural (`hub.threads`, snapshot jogável no R2), entregas
 * sobreviventes da mesma cadeia (`chain`) e a identidade (auth) para a equipe agir.
 *
 * Uso (dentro do container do members, DATABASE_URL da produção):
 *   bun scripts/audit-lost-studio-submissions.ts
 * Imprime `__START__` e um JSON bruto (o cruzamento/tabela é feito fora, sem tocar em prod).
 * Não escreve nada no banco.
 */
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória')

type Row = Record<string, unknown>

const connection = createDbConnection(databaseUrl, { max: 1 })
const { sql } = connection

try {
  const blocks = (await sql`
    select b.id::text as block_id, b.kind::text as kind, b.sort_order as block_order,
           l.id::text as lesson_id, l.title as lesson_title, l.sort_order as lesson_order, l.is_published,
           m.id::text as module_id, m.title as module_title, m.sort_order as module_order,
           c.id::text as course_id, c.slug as course_slug, c.title as course_title, c.audience::text as audience,
           nullif(btrim(b.content->>'chain'), '') as chain,
           coalesce((b.content->'showcase'->>'enabled')::boolean, false) as showcase_enabled,
           nullif(btrim(b.content->'showcase'->>'title'), '') as showcase_title
    from members.lesson_blocks b
    join members.lessons l on l.id = b.lesson_id
    join members.modules m on m.id = l.module_id
    join members.courses c on c.id = l.course_id
    where b.kind in ('studio', 'pinta')
    order by c.created_at, m.sort_order, l.sort_order, b.sort_order`) as Row[]

  const live = (await sql`
    select user_id::text as user_id, block_id::text as block_id, submitted_at, passed_at, score, account_id::text as account_id
    from members.studio_submissions`) as Row[]

  const ledger = (await sql`
    select user_id::text as user_id, source_id::text as block_id, source_type::text as source_type,
           min(created_at) as first_at, max(created_at) as last_at
    from members.xp_events
    where source_type in ('studio_submitted', 'studio_passed')
    group by 1, 2, 3`) as Row[]

  const completions = (await sql`
    select lc.user_id::text as user_id, lc.lesson_id::text as lesson_id, lc.completed_at
    from members.lesson_completions lc
    where lc.lesson_id in (select lesson_id from members.lesson_blocks where kind in ('studio', 'pinta'))`) as Row[]

  const threads = (await sql`
    select user_id::text as user_id, context_ref as block_id, created_at, title
    from members.teacher_threads
    where context_type = 'studio_submission' and context_ref is not null`) as Row[]

  const showcased = (await sql`
    select user_id::text as user_id, source_id::text as course_id, min(created_at) as first_at
    from members.xp_events where source_type = 'course_showcased' group by 1, 2`) as Row[]

  const mural = (await sql`
    select t.id::text as thread_id, t.author_id::text as author_id, t.title, t.play_id, t.status::text as status,
           t.created_at, t.cover_image_url, t.author_display_name, t.showcase_idempotency_key
    from hub.threads t where t.is_showcase = true
    order by t.created_at`) as Row[]

  const quizLoss = (await sql`
    select x.user_id::text as user_id, x.source_id::text as block_id, x.created_at as passed_at,
           (select count(*)::int from members.quiz_attempts q where q.user_id = x.user_id and q.block_id = x.source_id) as attempts_live
    from members.xp_events x
    where x.source_type = 'quiz_passed'`) as Row[]

  const userIds = new Set<string>()
  for (const r of [...live, ...ledger, ...completions, ...threads, ...showcased])
    userIds.add(String(r.user_id))
  for (const r of mural) userIds.add(String(r.author_id))
  const ids = [...userIds]

  const profiles = ids.length
    ? ((await sql`
        select p.id::text as profile_id, p.name as profile_name, p.status::text as profile_status,
               p.account_user_id::text as account_id,
               u.first_name || ' ' || u.last_name as account_name, u.email as account_email, u.role::text as account_role
        from auth.profiles p join auth.users u on u.id = p.account_user_id
        where p.id in ${sql(ids)}`) as Row[])
    : []
  const accounts = ids.length
    ? ((await sql`
        select u.id::text as user_id, u.first_name || ' ' || u.last_name as name, u.email, u.role::text as role
        from auth.users u where u.id in ${sql(ids)}`) as Row[])
    : []

  const report = {
    generatedAt: new Date().toISOString(),
    blocks,
    live,
    ledger,
    completions,
    threads,
    showcased,
    mural,
    quizLoss,
    profiles,
    accounts,
  }
  console.log('__START__')
  console.log(JSON.stringify(report))
} finally {
  await connection.close()
}
