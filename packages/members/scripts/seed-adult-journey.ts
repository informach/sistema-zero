/**
 * Cadastro inicial da jornada adulta (19/10/2026): as etapas do Kids, uma por nível, montadas com
 * os cursos adultos publicados do banco. Mostra o plano e NÃO grava, a menos que receba `--apply`.
 *
 *   bun run journey:seed-adult                     # só mostra o que faria
 *   bun run journey:seed-adult -- --apply          # grava, se ainda não houver jornada
 *   bun run journey:seed-adult -- --apply --force  # troca uma jornada já configurada
 *   bun run journey:seed-adult -- --milestone=complete  # só terminar, mesmo com o Mural no curso
 *   bun run journey:seed-adult -- --apply --allow-partial  # inclui etapas que aguardam cursos
 *   bun run journey:seed-adult -- --once           # o modo automático do boot (ver abaixo)
 *
 * `--once` (20/10/2026) é o MESMO caminho que o Members roda sozinho no boot
 * (`runAdultJourneySeedOnce`): grava só se ainda NÃO existe política, sob advisory lock, e nunca
 * sobrescreve (ignora `--force`); sem cursos, cadastra as sete etapas bloqueadas. Usa
 * sempre o marco por curso (como o boot): `--once` com `--milestone` é ERRO, nada roda.
 *
 * Cursos vendidos como produto avulso (`ADULT_JOURNEY_STANDALONE_COURSE_SLUGS`, hoje
 * `no-comando-da-ia`) nunca entram no plano e aparecem como "excluídos".
 *
 * Faltando curso publicado em algum nível, a etapa continua no plano mas fica bloqueada.
 * O apply manual pede `--allow-partial` para confirmar os vínculos ainda incompletos;
 * a equipe completa depois no Admin. Não há avanço a Lenda por etapas vazias.
 *
 * Como no Kids, cada curso pede terminar E publicar no Mural quando tem a atividade de publicar
 * (bloco do Estúdio com vitrine); sem ela, só terminar (`--milestone=showcase` força o Mural em
 * todos, e então um curso sem a atividade trava a etapa).
 *
 * A gravação passa pela MESMA validação do Admin (`AdultJourneyService.configure`): cursos
 * adultos e gravados, IA só depois de um curso avançado e a versão conferida (quem salvar no
 * Admin ao mesmo tempo não é sobrescrito). Depois, a jornada continua editável no Admin.
 */
import { createLogger } from '@sistemazero/core/logging'
import { AdultJourneyService } from '../src/application/adult-journey/adult-journey.service'
import { buildAdultJourneySeed } from '../src/application/adult-journey/adult-journey-seed'
import { parseAdultJourneySeedArgs } from '../src/application/adult-journey/adult-journey-seed-args'
import { runAdultJourneySeedOnce } from '../src/application/adult-journey/adult-journey-seed-once'
import { DrizzleAdultJourneyRepository } from '../src/infrastructure/persistence/drizzle/adult-journey.repository'
import { DrizzleContentAdminRepository } from '../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from '../src/infrastructure/persistence/drizzle/course.repository'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'

// Argumento inválido (inclusive `--once` com `--milestone`) lança antes de abrir o banco.
const { once, apply, force, allowPartial, milestone } = parseAdultJourneySeedArgs(
  process.argv.slice(2),
)

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória')

const logger = createLogger({ pretty: process.env.NODE_ENV !== 'production' })
const connection = createDbConnection(databaseUrl, {
  max: 1,
  ssl: ['true', '1'].includes(process.env.DATABASE_SSL?.toLowerCase() ?? ''),
})

try {
  const courses = new DrizzleCourseRepository(connection.db)
  const service = new AdultJourneyService(
    new DrizzleAdultJourneyRepository(connection.db),
    courses,
    () => new Date(),
  )
  const contentAdmin = new DrizzleContentAdminRepository(connection.db)
  if (once) {
    const outcome = await runAdultJourneySeedOnce({
      service,
      listCourses: () => courses.listPublishedCourses('adult'),
      listShowcaseCourseIds: (ids) => contentAdmin.listCourseIdsWithShowcaseBlock([...ids]),
      logger,
    })
    console.log(`\nSeed automático: ${JSON.stringify(outcome)}`)
    // Nunca derruba quem chamou: sai com 0 em qualquer resultado.
    await connection.close()
    process.exit(0)
  }
  const published = await courses.listPublishedCourses('adult')
  const showcaseCourseIds = new Set(
    await contentAdmin.listCourseIdsWithShowcaseBlock(published.map((course) => course.id)),
  )
  const plan = buildAdultJourneySeed(published, { milestone, showcaseCourseIds })
  const current = await service.policy()

  console.log(`\nJornada adulta: ${plan.stages.length} etapa(s) a partir dos cursos publicados`)
  for (const [index, stage] of plan.stages.entries()) {
    console.log(`\n  Etapa ${index + 1} · ${stage.title} (${stage.tier})`)
    for (const course of stage.courses)
      console.log(
        `    - ${course.title} (${course.slug}): ${
          course.milestone === 'showcase' ? 'terminar e publicar no Mural' : 'terminar'
        }`,
      )
    const libera = plan.policy.stages[index]?.capabilities ?? []
    if (libera.length) console.log(`    Ao concluir, libera: ${libera.join(', ')}`)
  }
  if (plan.pendingStages.length)
    console.log(
      `\n  Aguardando cursos (etapas bloqueadas): ${plan.pendingStages.map((stage) => stage.title).join(', ')}.`,
    )
  if (plan.excluded.length) {
    console.log('\n  Excluídos (produto avulso, nunca entram na jornada pelo seed):')
    for (const course of plan.excluded) console.log(`    - ${course.title} (${course.slug})`)
  }
  console.log(
    `\n  Hoje no banco: versão ${current.version}, ${current.policy.stages.length} etapa(s).`,
  )

  const exists = current.policy.stages.length > 0
  const partial = plan.pendingStages.length > 0
  if (!apply) {
    console.log('\nNada foi gravado. Rode de novo com --apply para cadastrar.')
    if (partial) console.log('  Há etapas que aguardam cursos; confirme com --allow-partial.')
    if (exists) console.log('  Atenção: já existe uma jornada; o --apply vai recusar sem --force.')
  } else if (partial && !allowPartial) {
    console.log(
      '\nHá etapas que aguardam cursos publicados. Nada foi gravado; use --allow-partial para cadastrá-las bloqueadas.',
    )
    process.exitCode = 1
  } else if (exists && !force) {
    console.log(
      '\nJá existe uma jornada configurada. Nada foi gravado; use --force para trocá-la por esta.',
    )
    process.exitCode = 1
  } else {
    const saved = await service.configure(plan.policy, current.version)
    logger.info('adult_journey_seed.saved', {
      version: saved.version,
      stages: plan.stages.length,
      milestone,
    })
    console.log(`\nJornada gravada (versão ${saved.version}).`)
  }
} finally {
  await connection.close()
}
