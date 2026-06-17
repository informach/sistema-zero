import { loadEnv } from '../src/infrastructure/config/env'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'

/**
 * Migração de produção (perfis estilo Netflix) — cria o "perfil-padrão" por conta
 * com matrícula KIDS ativa. RODA UMA VEZ, manualmente, ANTES de habilitar a UI de
 * perfis (validar em staging primeiro). Idempotente (ON CONFLICT no PK) e
 * re-executável.
 *
 *   bun run scripts/backfill-default-profiles.ts [--dry-run]
 *
 * Por que `id = id da conta`: o progresso/gamificação/comunidade histórico está
 * keyado no `user_id` da CONTA (não havia perfis). Reusar esse id como o id do
 * perfil-padrão ATRIBUI esse histórico ao perfil SEM re-keyar nenhuma linha em
 * members/hub — a migração é puramente ADITIVA (só cria linhas em `auth.profiles`).
 * O responsável pode renomear/arquivar depois; perfis de irmãos nascem com uuid novo.
 *
 * O backfill de `gamification_profiles.account_id` (= user_id nas linhas legadas) já
 * é feito pela migration `0014` do members — não precisa aqui.
 *
 * Cross-schema: lê `members.entitlements`/`members.courses` e escreve `auth.profiles`
 * (mesmo Postgres compartilhado) via SQL cru — o `db` do Drizzle é escopado ao schema
 * `auth`. KIDS = matrícula específica de curso `audience='kids'` (a chave-mestra
 * `all_courses` é só adulta, então `all_courses` nunca conta como kids).
 */
const dryRun = process.argv.includes('--dry-run')

const env = loadEnv()
const connection = createDbConnection(env.DATABASE_URL)
const sql = connection.sql

const KIDS_ACCOUNT_FILTER = sql`
  EXISTS (
    SELECT 1
    FROM members.entitlements e
    JOIN members.courses c ON c.slug = e.course_ref AND c.audience = 'kids'
    WHERE e.user_id = u.id
      AND e.status = 'active'
      AND (e.expires_at IS NULL OR e.expires_at > now())
  )
`

const candidates = await sql`
  SELECT u.id, COALESCE(NULLIF(TRIM(u.first_name), ''), 'Aluno') AS name
  FROM auth.users u
  WHERE ${KIDS_ACCOUNT_FILTER}
    AND NOT EXISTS (SELECT 1 FROM auth.profiles p WHERE p.id = u.id)
`

console.log(`Contas kids sem perfil-padrão: ${candidates.length}`)

if (dryRun) {
  for (const c of candidates) console.log(`  - ${c.id} → "${c.name}"`)
  console.log('(dry-run — nada foi gravado)')
  await connection.close()
  process.exit(0)
}

// INSERT idempotente: o id do perfil = id da conta (ON CONFLICT no PK pula o que já existe).
const inserted = await sql`
  INSERT INTO auth.profiles
    (id, account_user_id, name, avatar_url, whatsapp, status, sort_order, created_at, updated_at)
  SELECT
    u.id, u.id, COALESCE(NULLIF(TRIM(u.first_name), ''), 'Aluno'),
    u.avatar_url, NULL, 'active', 0, now(), now()
  FROM auth.users u
  WHERE ${KIDS_ACCOUNT_FILTER}
  ON CONFLICT (id) DO NOTHING
  RETURNING id
`

console.log(`✓ Perfis-padrão criados: ${inserted.length}`)
await connection.close()
