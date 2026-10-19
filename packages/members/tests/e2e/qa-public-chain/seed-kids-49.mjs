// Optional synthetic curriculum fixture. This never writes policy, earned, grants or readiness directly.
import { randomUUID } from 'node:crypto'
import { canonicalJson } from '@sistemazero/core/creations'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import postgres from 'postgres'
import { SERVER_BLOCK_CATALOG } from '../../../../studio/src/blockly/blockCatalog'
import { EntitlementAggregate } from '../../../src/domain/entitlement/entitlement.aggregate'
import { createDbConnection } from '../../../src/infrastructure/persistence/drizzle/db'
import { DrizzleEntitlementRepository } from '../../../src/infrastructure/persistence/drizzle/entitlement.repository'
import { DrizzleGamificationRepository } from '../../../src/infrastructure/persistence/drizzle/gamification.repository'
import { DrizzleKidsJourneyRepository } from '../../../src/infrastructure/persistence/drizzle/kids-journey.repository'
import { qaDatabaseUrl, readQaPublicManifest } from './read-manifest.mjs'

/** Close every owned connection before returning or propagating the original failure. */
export async function withQaConnections(work, closeConnections) {
  let value
  let primary
  let failed = false
  try {
    value = await work()
  } catch (error) {
    primary = error
    failed = true
  }
  const cleanup = await Promise.allSettled(
    closeConnections.map((close) => Promise.resolve().then(close)),
  )
  const errors = cleanup.filter((item) => item.status === 'rejected').map((item) => item.reason)
  if (errors.length)
    throw new AggregateError(
      [...(failed ? [primary] : []), ...errors],
      'QA49 fixture cleanup failed',
    )
  if (failed) throw primary
  return value
}

export async function seedKidsPublicQa49({ database, userId, accountId }) {
  if (process.env.STUDIO_QA_SEED_KIDS_49 !== '1')
    throw new Error('Explicit STUDIO_QA_SEED_KIDS_49=1 opt-in required')
  const target = new URL(database)
  if (database !== qaDatabaseUrl(target.pathname.slice(1)))
    throw new Error('Only the exact owned loopback QA database is allowed')
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
  if (
    !uuid.test(userId) ||
    accountId !== '11111111-aaaa-4111-8111-111111111111' ||
    userId === accountId
  )
    throw new Error('Real child/account identities required')
  const sql = postgres(database, { max: 2, onnotice: () => {} })
  const connection = createDbConnection(database, { max: 2 })
  return withQaConnections(async () => {
    const [profile] =
      await sql`select p.account_user_id,p.name,p.status,p.admission_state,u.email,u.status as account_status from auth.profiles p join auth.users u on u.id=p.account_user_id where p.id=${userId}`
    if (
      profile?.account_user_id !== accountId ||
      profile.email !== 'qa-adult@example.invalid' ||
      profile.account_status !== 'active' ||
      profile.name !== 'Criador QA' ||
      profile.status !== 'active' ||
      profile.admission_state !== 'ready'
    )
      throw new Error('Seed requires the real Auth ready receipt, never a fabricated profile')
    const journey = new DrizzleKidsJourneyRepository(connection.db)
    const beforeSnapshot = await journey.readSnapshot([{ userId, accountId }])
    if (canonicalJson(beforeSnapshot.policy.policy) !== canonicalJson(initialKidsJourneyPolicy()))
      throw new Error(
        'Optional QA49 seed requires the reviewed canonical policy; never replace a configured policy',
      )
    const before = beforeSnapshot.profiles.get(userId)
    if (!before?.registered || before.accountId !== accountId)
      throw new Error('Canonical admission must precede QA milestones')
    const slots = initialKidsJourneyPolicy().steps.flatMap((step) => step.requirements)
    if (
      slots.length !== 49 ||
      slots.some((slot) => slot.kind !== 'slot') ||
      new Set(slots.map((slot) => `${slot.tier}:${slot.slot}`)).size !== 49
    )
      throw new Error(
        'Canonical seed no longer has the reviewed49 distinct slots; review this fixture',
      )
    const block = SERVER_BLOCK_CATALOG.find((item) => item.extension === 'game-2d')?.type
    if (!block) throw new Error('JavaScript palette fixture unavailable')
    const now = new Date(),
      courses = []
    await sql.begin(async (tx) => {
      // This is authored QA curriculum, not a learner-state backfill.
      for (const slot of slots) {
        const track = slot.tier.endsWith('-3d') ? '3d' : '2d',
          level = slot.tier.slice(0, -3)
        const slug = `qa-kids-${level}-${track}-${slot.slot}`
        let [course] =
          await tx`select id,title,audience,status,modality,level,track,career_slot,journey_role from members.courses where slug=${slug}`
        if (
          course &&
          (!course.title.startsWith('QA ') ||
            course.audience !== 'kids' ||
            course.status !== 'published' ||
            course.modality !== 'recorded' ||
            course.level !== level ||
            course.track !== track ||
            course.career_slot !== slot.slot ||
            course.journey_role !== 'positioned')
        )
          throw new Error(`Existing QA course differs from the reviewed fixture: ${slug}`)
        if (!course) {
          const id = randomUUID()
          await tx`insert into members.courses(id,slug,title,status,audience,modality,level,track,career_slot,journey_role,metadata,created_at,updated_at)
            values(${id},${slug},${`QA ${slot.tier} ${slot.slot}`},'published','kids','recorded',${level},${track},${slot.slot},'positioned',${tx.json({ studioUnlockBlocks: [block] })},${now},${now})`
          course = { id }
        }
        // A real published showcase-capable catalog entry, needed by canonical readiness.
        const lessonSlug = `qa-journey-${course.id}`
        let [lesson] =
          await tx`select id from members.lessons where course_id=${course.id} and slug=${lessonSlug}`
        if (!lesson) {
          const moduleId = randomUUID(),
            lessonId = randomUUID(),
            blockId = randomUUID()
          await tx`insert into members.modules(id,course_id,title,created_at,updated_at) values(${moduleId},${course.id},'QA Parte',${now},${now})`
          await tx`insert into members.lessons(id,course_id,module_id,slug,title,is_published,created_at,updated_at)
            values(${lessonId},${course.id},${moduleId},${lessonSlug},'QA Aula de catálogo',true,${now},${now})`
          await tx`insert into members.lesson_blocks(id,lesson_id,kind,sort_order,content)
            values(${blockId},${lessonId},'studio',0,${tx.json({ kind: 'studio', purpose: 'experiment', showcase: { enabled: true } })})`
          lesson = { id: lessonId }
        }
        courses.push(course.id)
      }
      const wallId = '66666666-aaaa-4666-8666-666666666666',
        channelId = '77777777-aaaa-4777-8777-777777777777'
      await tx`insert into hub.spaces(id,slug,name,audience,access_config,created_at,updated_at)
        values(${wallId},'mural-dos-criadores','Mural dos Criadores','kids',${tx.json({ visibility: 'public', courses: [], roles: [] })},${now},${now}) on conflict(id) do nothing`
      const [wall] = await tx`select slug,audience from hub.spaces where id=${wallId}`
      if (wall?.slug !== 'mural-dos-criadores' || wall.audience !== 'kids')
        throw new Error('Owned QA mural identity collided')
      await tx`insert into hub.channels(id,space_id,slug,name,posting_policy,created_at,updated_at)
        values(${channelId},${wallId},'parede','Parede','staff_only',${now},${now}) on conflict(id) do nothing`
      const [channel] = await tx`select space_id,slug from hub.channels where id=${channelId}`
      if (channel?.space_id !== wallId || channel.slug !== 'parede')
        throw new Error('Owned QA channel identity collided')
    })
    const entitlements = new DrizzleEntitlementRepository(connection.db)
    for (const ref of ['mural-dos-criadores', 'clube-dos-criadores']) {
      const offerId = randomUUID(),
        productId = randomUUID()
      await entitlements.save(
        EntitlementAggregate.grant({
          id: randomUUID(),
          userId: accountId,
          productId,
          productKind: 'community',
          accessType: 'community',
          courseRef: ref,
          offerId,
          snapshot: {
            offerId,
            offerSlug: 'local-kids-qa',
            productId,
            sku: ref,
            name: ref,
            kind: 'community',
            accessType: 'community',
            courseRef: ref,
            fulfillment: { accessType: 'community', courseRef: ref },
            resolvedAt: now.toISOString(),
          },
          sourceKind: 'manual',
          sourceId: `local-kids-qa-${ref}`,
          subscriptionId: null,
          grantedAt: now,
          expiresAt: null,
          idempotencyKey: `local-kids-qa-${ref}`,
        }),
      )
    }
    const activeEntitlements = await entitlements.listActiveByUser(accountId, now)
    if (
      !['mural-dos-criadores', 'clube-dos-criadores'].every((ref) =>
        activeEntitlements.some((item) => item.courseRef === ref),
      )
    )
      throw new Error(
        'QA community entitlements are inactive; use a fresh attempt instead of reactivating rows',
      )
    const authored = await journey.readSnapshot([{ userId, accountId }])
    const reviewedCourses = new Map(authored.catalog.map((course) => [course.id, course]))
    if (courses.some((id) => reviewedCourses.get(id)?.hasShowcaseBlock !== true))
      throw new Error(
        'The real catalog reader did not observe all49 published showcase-capable lessons',
      )
    if (authored.policy.version !== beforeSnapshot.policy.version)
      throw new Error('QA policy changed during curriculum preparation; preserve this attempt')
    // Production award owns owner/account→gamification→policy locking and derives grants/earned atomically.
    const result = await new DrizzleGamificationRepository(connection.db).award({
      userId,
      accountId,
      audience: 'kids',
      events: courses.flatMap((sourceId) =>
        ['course_complete', 'course_showcased'].map((sourceType) => ({
          sourceType,
          sourceId,
          amount: 0,
        })),
      ),
      today: now.toISOString().slice(0, 10),
      now,
      privileged: false,
    })
    const afterSnapshot = await journey.readSnapshot([{ userId, accountId }])
    if (afterSnapshot.policy.version !== beforeSnapshot.policy.version)
      throw new Error('QA policy changed concurrently; preserve this attempt for inspection')
    const after = afterSnapshot.profiles.get(userId)
    if (
      !after?.registered ||
      after.earned.level !== 'god' ||
      !['studio', 'bridge', 'pro'].every((cap) => after.earned.capabilities.includes(cap))
    )
      throw new Error(
        'Canonical production award did not derive the required QA access; no state was fabricated',
      )
    const [ledger] =
      await sql`select count(*)::int as count from members.xp_events where user_id=${userId} and audience='kids' and source_id=any(${courses}::uuid[]) and source_type in ('course_complete','course_showcased')`
    if (ledger?.count !== 98) throw new Error('The49-slot QA milestone ledger is incomplete')
    const [grants] =
      await sql`select count(*)::int as count from members.studio_block_grants where user_id=${userId} and audience='kids' and course_id=any(${courses}::uuid[])`
    if (grants?.count !== 49)
      throw new Error('Production award did not persist all49 curriculum palette grants')
    return {
      slotCount: 49,
      milestoneCount: ledger.count,
      studioGrantCount: grants.count,
      newEvents: result.newEvents.length,
      level: after.earned.level,
      capabilities: after.earned.capabilities,
      scope:
        'synthetic authored curriculum + trusted production award; not an end-to-end completion of49 lessons',
    }
  }, [() => connection.close(), () => sql.end()])
}
if (import.meta.main) {
  const manifest = await readQaPublicManifest(process.argv[2], { requireReady: false })
  console.log(
    JSON.stringify(
      await seedKidsPublicQa49({
        database: qaDatabaseUrl(manifest.database),
        userId: manifest.childId,
        accountId: manifest.userId,
      }),
    ),
  )
}
