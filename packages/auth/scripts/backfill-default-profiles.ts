import { DomainError } from '@sistemazero/core/errors'
import { createLogger } from '@sistemazero/core/logging'
import { CreateProfileService } from '../src/application/profiles/create-profile.service'
import { ProfileAdmissionService } from '../src/application/profiles/profile-admission.service'
import { loadEnv } from '../src/infrastructure/config/env'
import { createMembersAllowanceGateway } from '../src/infrastructure/gateways/members-allowance.gateway'
import { createMembersProfileJourneyGateway } from '../src/infrastructure/gateways/members-profile-journey.gateway'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleProfileRepository } from '../src/infrastructure/persistence/drizzle/profile.repository'
import { DrizzleProfileAdmissionRepository } from '../src/infrastructure/persistence/drizzle/profile-admission.repository'

/**
 * Migração de produção (perfis estilo Netflix) — cria o "perfil-padrão" por conta
 * com matrícula KIDS ativa. RODA UMA VEZ, manualmente, ANTES de habilitar a UI de
 * perfis (validar em staging primeiro). Idempotente por conta/requestId e re-executável.
 *
 *   bun run scripts/backfill-default-profiles.ts [--dry-run]
 *
 * Por que `id = id da conta`: o progresso/gamificação/comunidade histórico está
 * keyado no `user_id` da CONTA (não havia perfis). Reusar esse id como o id do
 * perfil-padrão ATRIBUI esse histórico ao perfil SEM re-keyar nenhuma linha em
 * members/hub — cria perfil/job Auth e materializa a jornada pelo initializer normal,
 * sem alterar a atribuição dos eventos históricos.
 * O responsável pode renomear/arquivar depois; perfis de irmãos nascem com uuid novo.
 *
 * O backfill de `gamification_profiles.account_id` (= user_id nas linhas legadas) já
 * é feito pela migration `0014` do members — não precisa aqui.
 *
 * A leitura histórica cross-schema de entitlements permanece específica desta ferramenta;
 * o runtime de admissão não depende de databases compartilhados. Escritas usam quota,
 * perfil+job atômicos e pending→Members→ready, sem INSERT direto nem bypass de admissão.
 * id=requestId=accountId preserva ownership histórico, não outro motor de jornada.
 * Não executar criadores/imports/backfills durante a captura inicial controlada da coorte.
 */
const dryRun = process.argv.includes('--dry-run')

const env = loadEnv()
const connection = createDbConnection(env.DATABASE_URL)
const sql = connection.sql

const logger = createLogger({ level: 'warn' })
const profiles = new DrizzleProfileRepository(connection.db)
const allowance = createMembersAllowanceGateway({
  baseUrl: env.MEMBERS_BASE_URL,
  internalToken: env.MEMBERS_INTERNAL_TOKEN,
  timeoutMs: env.MEMBERS_REQUEST_TIMEOUT_MS,
})
const admission = new ProfileAdmissionService(
  new DrizzleProfileAdmissionRepository(connection.db),
  createMembersProfileJourneyGateway({
    baseUrl: env.MEMBERS_BASE_URL,
    admissionToken: env.MEMBERS_PROFILE_ADMISSION_TOKEN,
    timeoutMs: env.MEMBERS_REQUEST_TIMEOUT_MS,
  }),
  () => new Date(),
  logger,
)
let examined = 0
let ready = 0
let pending = 0
let failed = 0
try {
  const [bound] = await sql<{ id: string }[]>`select id from auth.users order by id desc limit 1`
  let cursor: string | null = null
  while (bound) {
    const candidates: { id: string; name: string; avatar_url: string | null }[] = await sql<
      { id: string; name: string; avatar_url: string | null }[]
    >`
      select u.id, coalesce(nullif(trim(u.first_name), ''), 'Aluno') as name, u.avatar_url
      from auth.users u
      where (${cursor}::uuid is null or u.id > ${cursor}::uuid)
        and u.id <= ${bound.id}::uuid and u.status = 'active'
        and not exists (select 1 from auth.profiles p where p.id = u.id)
        and exists (
          select 1 from members.entitlements e
          join members.courses c on c.slug = e.course_ref and c.audience = 'kids'
          where e.user_id = u.id and e.status = 'active'
            and (e.expires_at is null or e.expires_at > now())
        )
      order by u.id limit 200
    `
    if (!candidates.length) break
    for (const candidate of candidates) {
      examined++
      if (dryRun) continue
      const create = new CreateProfileService(
        profiles,
        allowance,
        () => candidate.id,
        () => new Date(),
        admission,
      )
      try {
        const profile = await create.execute({
          requestId: candidate.id,
          accountUserId: candidate.id,
          name: candidate.name,
          avatarUrl: candidate.avatar_url,
        })
        if (profile.admissionState === 'ready') ready++
        else pending++
      } catch (error) {
        failed++
        logger.error('profile.backfill.failed', {
          profileId: candidate.id,
          code: error instanceof DomainError ? error.code : 'UNAVAILABLE',
        })
      }
    }
    cursor = candidates.at(-1)!.id
  }
  console.log(JSON.stringify({ dryRun, examined, ready, pending, failed }))
} finally {
  await connection.close()
}
if (failed) process.exitCode = 1
