/**
 * Cadastro inicial da jornada adulta (19/10/2026): as etapas do Kids, uma por nível, montadas com
 * os cursos adultos publicados do banco. Mostra o plano e NÃO grava, a menos que receba `--apply`.
 *
 *   bun run journey:seed-adult                     # só mostra o que faria
 *   bun run journey:seed-adult -- --apply          # grava, se ainda não houver jornada
 *   bun run journey:seed-adult -- --apply --force  # troca uma jornada já configurada
 *   bun run journey:seed-adult -- --milestone=complete  # só terminar, mesmo com o Mural no curso
 *   bun run journey:seed-adult -- --apply --allow-partial  # grava mesmo faltando etapas
 *
 * Faltando curso publicado em algum nível, o plano para antes dele e o `--apply` RECUSA gravar:
 * uma jornada pela metade faria a pessoa virar Lenda cedo e deixaria a Ponte, a IA e o Pro sem
 * como abrir. `--allow-partial` grava assim mesmo (a equipe completa depois no Admin).
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
import { DrizzleAdultJourneyRepository } from '../src/infrastructure/persistence/drizzle/adult-journey.repository'
import { DrizzleContentAdminRepository } from '../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from '../src/infrastructure/persistence/drizzle/course.repository'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const force = args.includes('--force')
const allowPartial = args.includes('--allow-partial')
// `--milestone=showcase` ou `--milestone showcase`; valor vazio ou desconhecido é erro.
const milestoneIndex = args.findIndex(
  (arg) => arg === '--milestone' || arg.startsWith('--milestone='),
)
const milestoneArg =
  milestoneIndex === -1
    ? 'auto'
    : args[milestoneIndex]?.includes('=')
      ? args[milestoneIndex]?.split('=')[1]
      : args[milestoneIndex + 1]
if (milestoneArg !== 'auto' && milestoneArg !== 'complete' && milestoneArg !== 'showcase')
  throw new Error('Use --milestone=auto, --milestone=complete ou --milestone=showcase')
const milestone = milestoneArg

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
  const published = await courses.listPublishedCourses('adult')
  const showcaseCourseIds = new Set(
    await new DrizzleContentAdminRepository(connection.db).listCourseIdsWithShowcaseBlock(
      published.map((course) => course.id),
    ),
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
  if (plan.stoppedAt)
    console.log(
      `\n  Parou antes de "${plan.stoppedAt.title}": nenhum curso adulto publicado no nível ${plan.stoppedAt.tier}.`,
    )
  console.log(
    `\n  Hoje no banco: versão ${current.version}, ${current.policy.stages.length} etapa(s).`,
  )

  const exists = current.policy.stages.length > 0
  const partial = plan.stoppedAt !== null
  if (plan.stages.length === 0) {
    console.log('\nNada a gravar: nenhum curso adulto publicado no primeiro nível.')
    process.exitCode = 1
  } else if (!apply) {
    console.log('\nNada foi gravado. Rode de novo com --apply para cadastrar.')
    if (partial) console.log('  Atenção: faltam etapas; o --apply vai recusar sem --allow-partial.')
    if (exists) console.log('  Atenção: já existe uma jornada; o --apply vai recusar sem --force.')
  } else if (partial && !allowPartial) {
    console.log(
      '\nO plano para antes do fim (faltam cursos publicados). Nada foi gravado; publique os cursos que faltam ou use --allow-partial.',
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
