/** Explicit, resumable editorial seed. No boot hook and no DATABASE_URL fallback. */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { AdultJourneyService } from '../src/application/adult-journey/adult-journey.service'
import { creatorJourneyEditorialReviews } from '../src/application/creator-journey/creator-journey-editorial-review'
import {
  buildCreatorJourneySeed,
  type CreatorEditorialSpec,
} from '../src/application/creator-journey/creator-journey-seed'
import {
  prepareCreatorKidsSeed,
  publishCreatorAdultSeed,
} from '../src/application/creator-journey/creator-journey-seed-policy'
import { KidsJourneyConfigurationService } from '../src/application/kids-journey/kids-journey-configuration.service'
import type { Course } from '../src/domain/course/course'
import { DrizzleAdultJourneyRepository } from '../src/infrastructure/persistence/drizzle/adult-journey.repository'
import { DrizzleContentAdminRepository } from '../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from '../src/infrastructure/persistence/drizzle/course.repository'
import { DrizzleCreatorJourneySeedRepository } from '../src/infrastructure/persistence/drizzle/creator-journey-seed.repository'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleKidsJourneyRepository } from '../src/infrastructure/persistence/drizzle/kids-journey.repository'

const args = process.argv.slice(2)
const command = args.shift() ?? 'plan'
if (
  !['plan', 'apply', 'prepare-kids', 'advance-kids', 'publish-kids', 'publish-adult'].includes(
    command,
  )
)
  throw new Error('Use plan | apply | prepare-kids | advance-kids | publish-kids | publish-adult.')
const options = new Map<string, string>()
while (args.length) {
  const name = args.shift()!
  if (
    !['--expect-database', '--actor', '--preparation', '--offline'].includes(name) ||
    options.has(name)
  )
    throw new Error(`Argumento inválido: ${name}`)
  if (name === '--offline') options.set(name, 'true')
  else {
    const value = args.shift()
    if (!value || value.startsWith('--')) throw new Error(`Falta o valor de ${name}`)
    options.set(name, value)
  }
}
const offline = options.has('--offline')
if (offline && command !== 'plan') throw new Error('--offline só é válido para plan.')
const spec = JSON.parse(
  await readFile(
    fileURLToPath(
      new URL('../src/infrastructure/config/creator-journey-curriculum.json', import.meta.url),
    ),
    'utf8',
  ),
) as CreatorEditorialSpec
const report = (plan: ReturnType<typeof buildCreatorJourneySeed>) => ({
  editorialVersion: plan.version,
  offline,
  note: offline
    ? 'Simulação sem catálogo: IDs não confirmam os cursos já existentes.'
    : 'Novos cursos e aulas serão rascunhos. Cursos existentes e progresso não serão alterados.',
  totals: {
    courses: plan.courses.length,
    create: plan.courses.filter((course) => course.action === 'create').length,
    preserve: plan.preservedCourseIds.length,
    newDraftLessons: plan.courses
      .filter((course) => course.action === 'create')
      .reduce((sum, course) => sum + course.outline.length, 0),
  },
  courses: plan.courses.map(({ id, slug, title, audience, action, outline }) => ({
    id,
    slug,
    title,
    audience,
    action,
    lessons: outline.length,
  })),
  curricula: plan.curricula,
  editorialReviews: creatorJourneyEditorialReviews(
    plan.courses.flatMap((course) =>
      course.version === null
        ? []
        : [{ id: course.id, slug: course.slug, version: course.version }],
    ),
  ),
})
if (offline) {
  console.log(JSON.stringify(report(buildCreatorJourneySeed(spec, [])), null, 2))
} else {
  const databaseUrl = process.env.CREATOR_JOURNEY_DATABASE_URL?.trim()
  if (!databaseUrl)
    throw new Error('Defina CREATOR_JOURNEY_DATABASE_URL explicitamente, ou use plan --offline.')
  const target = new URL(databaseUrl)
  if (!['postgres:', 'postgresql:'].includes(target.protocol))
    throw new Error('A URL deve ser PostgreSQL.')
  const databaseName = decodeURIComponent(target.pathname.slice(1))
  if (command !== 'plan' && options.get('--expect-database') !== databaseName)
    throw new Error(
      'Confirme o nome exato do banco no comando com --expect-database. Nenhuma escrita foi feita.',
    )
  const actorId = ['prepare-kids', 'publish-kids'].includes(command)
    ? IdentityUuidSchema.parse(options.get('--actor'))
    : undefined
  const preparationId = ['advance-kids', 'publish-kids'].includes(command)
    ? IdentityUuidSchema.parse(options.get('--preparation'))
    : undefined
  const connection = createDbConnection(databaseUrl, {
    max: 2,
    ssl: process.env.DATABASE_SSL === 'true',
  })
  try {
    const kids = new KidsJourneyConfigurationService(
      new DrizzleKidsJourneyRepository(connection.db),
    )
    if (command === 'advance-kids') {
      console.log(JSON.stringify(await kids.advance(preparationId!)))
    } else if (command === 'publish-kids') {
      const prepared = await kids.preparation(preparationId!)
      if (prepared.status !== 'ready' || !prepared.cohortHash)
        throw new Error(
          'A preparação ainda não está pronta. Avance os lotes; não pule a captura de direitos.',
        )
      const saved = await kids.publish({
        preparationId,
        expectedVersion: prepared.expectedVersion,
        draftHash: prepared.draftHash,
        catalogHash: prepared.catalogHash,
        cohortHash: prepared.cohortHash,
        actorId,
      })
      console.log(JSON.stringify({ status: 'published', version: saved.version }))
    } else {
      const content = new DrizzleContentAdminRepository(connection.db)
      const catalog: Course[] = []
      for (let offset = 0; ; offset += 500) {
        const page = await content.listCoursesAdmin({ limit: 500, offset })
        catalog.push(...page.items)
        if (catalog.length >= page.total) break
      }
      const plan = buildCreatorJourneySeed(spec, catalog)
      if (command === 'plan') console.log(JSON.stringify(report(plan), null, 2))
      else if (command === 'apply')
        console.log(
          JSON.stringify({
            ...(await new DrizzleCreatorJourneySeedRepository(connection.db).apply(plan)),
            editorialReviews: creatorJourneyEditorialReviews(catalog),
          }),
        )
      else {
        if (plan.courses.some((course) => course.action === 'create'))
          throw new Error('Cadastre os rascunhos com apply antes de preparar a política.')
        if (command === 'prepare-kids')
          console.log(
            JSON.stringify(await prepareCreatorKidsSeed(kids, plan.curricula.kids, actorId!)),
          )
        else {
          const adult = new AdultJourneyService(
            new DrizzleAdultJourneyRepository(connection.db),
            new DrizzleCourseRepository(connection.db),
            () => new Date(),
          )
          console.log(JSON.stringify(await publishCreatorAdultSeed(adult, plan.curricula.adult)))
        }
      }
    }
  } finally {
    await connection.close()
  }
}
