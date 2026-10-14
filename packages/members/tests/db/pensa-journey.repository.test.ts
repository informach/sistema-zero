import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { PensaJourneyActor, PensaProposal } from '@sistemazero/core/pensa'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import { PensaJourneyService } from '../../src/application/pensa/journey.service'
import { UpdatePensaTaskProgressService } from '../../src/application/pensa/update-task-progress.service'
import { DrizzleAiUsageRepository } from '../../src/infrastructure/persistence/drizzle/ai-usage.repository'
import { DrizzleCreationCleanupRepository } from '../../src/infrastructure/persistence/drizzle/creation-cleanup.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePensaRepository } from '../../src/infrastructure/persistence/drizzle/pensa.repository'
import { DrizzlePensaJourneyRepository } from '../../src/infrastructure/persistence/drizzle/pensa-journey.repository'
import {
  creations,
  pensaJourneys,
  pensaTasks,
} from '../../src/infrastructure/persistence/drizzle/schema'

// Banco próprio: os fixtures legados são propositalmente esparsos e não suportam os FKs novos.
const base =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgres://postgres:postgres@localhost:5433/sistemazero'
const target = new URL(base)
target.pathname = '/sistemazero_pensa_v2_test'
const admin = postgres(base, { max: 1, connect_timeout: 2, onnotice: () => {} })
let available = false
try {
  await admin`select 1`
  try {
    await admin.unsafe('create database sistemazero_pensa_v2_test')
  } catch (cause) {
    if ((cause as { code?: string }).code !== '42P04') throw cause
  }
  available = true
} catch (cause) {
  if (process.env.TEST_DATABASE_URL) throw cause
} finally {
  await admin.end({ timeout: 1 })
}

describe.skipIf(!available)('Pensa v2: concorrência e publicação no Postgres', () => {
  let conn: DbConnection
  let repo: DrizzlePensaJourneyRepository
  const now = new Date('2026-10-14T12:00:00Z')
  const actors: PensaJourneyActor[] = []
  const actor = () => {
    const result = { profileId: randomUUID(), accountId: randomUUID(), privileged: false }
    actors.push(result)
    return result
  }
  const proposal = (who: PensaJourneyActor): PensaProposal => ({
    id: randomUUID(),
    title: 'Gato na lua',
    summary: 'Seu gato explora a lua.',
    firstResult: 'Andar com o gato',
    essentials: ['Gato na lua'],
    suggestions: ['Começar com um lugar'],
    later: [],
    dimension: '2d',
    capabilities: {
      profileId: who.profileId,
      rank: 'hacker',
      studio: true,
      pinta: true,
      molda: false,
      dimensions: ['2d'],
      blockIds: ['move'],
      extensionIds: ['game-2d'],
      moldaTools: [],
      tutor: false,
      fingerprint: 'v1',
    },
    missions: [
      {
        key: 'walk',
        title: 'Mover o gato',
        destination: 'studio',
        result: 'O gato anda',
        dependencies: [],
        blockIds: ['move'],
        extensionIds: ['game-2d'],
        mechanicIds: ['game-2d'],
        toolIds: [],
        asset: null,
      },
    ],
    test: { action: 'Aperte uma seta', expected: 'O gato anda' },
    references: [],
  })

  /** Uma missão do Estúdio que corresponde à única missão de `proposal()`. */
  const studioTask = () => ({
    id: randomUUID(),
    title: 'Mover o gato',
    summary: 'O gato anda',
    destination: 'studio' as const,
    category: 'gameplay' as const,
    estimatedMinutes: 10,
    position: 0,
    dependencies: [],
    guide: {
      contractVersion: 2 as const,
      steps: [{ id: 'a', text: 'Use o bloco Mover', required: false }],
      criteria: [{ id: 'r', text: 'Aperte a seta', required: true }],
    },
    context: {
      kind: 'studio' as const,
      dimension: '2d' as const,
      visualAssetIds: [],
      blockIds: ['move'],
      blocks: [
        {
          id: 'move',
          label: 'Mover',
          category: 'Jogo',
          subcategory: 'Mover',
          area: 'events' as const,
          extension: 'game-2d',
        },
      ],
      mechanicDocumentIds: ['game-2d'],
      extensionIds: ['game-2d'],
    },
  })

  beforeAll(async () => {
    conn = createDbConnection(target.toString(), { max: 12 })
    repo = new DrizzlePensaJourneyRepository(conn.db, { dailyLimit: 2, monthlyLimit: 20 })
    await conn.sql`create schema if not exists members`
    await conn.sql.unsafe(
      `do $$ begin create type members.course_audience as enum ('kids','adult'); exception when duplicate_object then null; end $$`,
    )
    const files = [
      '0060_pensa_planner_v2.sql',
      '0067_creations.sql',
      '0068_account_deletion_cleanup.sql',
      '0070_creation_parts.sql',
      '0075_creation-format-version.sql',
      '0077_pensa_molda_destination.sql',
      '0098_pensa_project_members.sql',
      '0108_pensa_journey_v2.sql',
      '0109_private_zappy_narrations.sql',
      '0110_pensa_lifecycle_cleanup.sql',
      '0111_pensa_provider_budget.sql',
    ]
    for (const file of files) {
      const ddl = await readFile(
        new URL(`../../src/infrastructure/persistence/drizzle/migrations/${file}`, import.meta.url),
        'utf8',
      )
      for (const raw of ddl.split('--> statement-breakpoint')) {
        const statement = raw.replace(/^--.*$/gm, '').trim()
        // O fixture aproveita apenas a criação do contrato de 0060, jamais sua troca destrutiva.
        if (!statement || /^DROP /i.test(statement)) continue
        try {
          await conn.sql.unsafe(statement)
        } catch (cause) {
          if (!['42P07', '42710', '42701'].includes((cause as { code: string }).code)) throw cause
        }
      }
    }
    await conn.sql.unsafe(
      'alter table members.creations add column if not exists content_fingerprint varchar(70), add column if not exists pending_content_fingerprint varchar(70)',
    )
    await conn.sql.unsafe(
      "alter table members.creation_cleanup_jobs add column if not exists user_ids jsonb not null default '[]'::jsonb",
    )
    await conn.sql.unsafe(
      `create table if not exists members.ai_usage_daily (account_id uuid not null, day date not null, feature varchar(40) not null, used integer not null default 0, privileged boolean not null default false, updated_at timestamptz not null default now(), primary key(account_id, day, feature))`,
    )
  }, 30000)
  afterAll(async () => {
    for (const who of actors) {
      await conn.sql`delete from members.pensa_projects where user_id = ${who.profileId}`
      await conn.sql`delete from members.private_narrations where profile_id = ${who.profileId}`
      await conn.sql`delete from members.ai_usage_daily where account_id = ${who.accountId}`
      await conn.sql`delete from members.creations where user_id = ${who.profileId}`
      await conn.sql`delete from members.pensa_deletion_jobs where profile_id = ${who.profileId}`
      await conn.sql`delete from members.pensa_provider_usage where account_id = ${who.accountId}`
    }
    await conn?.close()
  })
  test('dois envios iguais criam uma mensagem, uma reserva e um único lease', async () => {
    const who = actor(),
      id = randomUUID()
    const project = await repo.create(who, randomUUID(), now)
    const input = {
      id,
      expectedRevision: 0,
      message: 'Gato na lua',
      kind: 'planning' as const,
      context: {},
    }
    await Promise.all([
      repo.start(who, project.project.id, input, now),
      repo.start(who, project.project.id, input, now),
    ])
    const view = await repo.get(who, project.project.id)
    expect(view.journey.messages).toHaveLength(1)
    const leases = await Promise.all(
      Array.from({ length: 8 }, () => repo.claim(who, project.project.id, id, randomUUID(), now)),
    )
    expect(leases.filter(Boolean)).toHaveLength(1)
    await expect(
      repo.start(who, project.project.id, { ...input, message: 'Outra ideia' }, now),
    ).rejects.toThrow()
    const [count] =
      await conn.sql`select count(*)::int as n from members.ai_usage_reservations where project_id = ${project.project.id}`
    expect(count?.n).toBe(1)
  })
  test('reserva do Pensa participa do mesmo teto que o consumo dos outros apps', async () => {
    const who = actor(),
      project = await repo.create(who, randomUUID(), now)
    await repo.start(
      who,
      project.project.id,
      { id: randomUUID(), expectedRevision: 0, message: 'Um gato', kind: 'planning', context: {} },
      now,
    )
    const quota = new DrizzleAiUsageRepository(conn.db)
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        quota.consume({
          accountId: who.accountId,
          day: '2026-10-14',
          month: '2026-10',
          now,
          feature: 'describe',
          privileged: false,
          dailyLimit: 2,
          monthlyLimit: 20,
        }),
      ),
    )
    expect(results.filter((r) => r.allowed)).toHaveLength(1)
    await repo.cancel(who, project.project.id, now)
    expect(
      (
        await quota.consume({
          accountId: who.accountId,
          day: '2026-10-14',
          month: '2026-10',
          now,
          feature: 'describe',
          privileged: false,
          dailyLimit: 2,
          monthlyLimit: 20,
        })
      ).allowed,
    ).toBe(true)
  })
  test('saída tardia depois de cancelar não publica proposta nem debita', async () => {
    const who = actor(),
      id = randomUUID(),
      lease = randomUUID(),
      project = await repo.create(who, randomUUID(), now)
    await repo.start(
      who,
      project.project.id,
      { id, expectedRevision: 0, message: 'Gato', kind: 'planning', context: {} },
      now,
    )
    await repo.claim(who, project.project.id, id, lease, now)
    await repo.cancel(who, project.project.id, now)
    await expect(
      repo.publish(
        who,
        project.project.id,
        id,
        lease,
        { type: 'step', step: 'review', output: {} },
        now,
      ),
    ).rejects.toThrow()
    expect((await repo.get(who, project.project.id)).journey.proposal).toBeNull()
    const [usage] =
      await conn.sql`select count(*)::int as n from members.ai_usage_daily where account_id = ${who.accountId}`
    expect(usage?.n).toBe(0)
  })
  test('cartão não debita; plano e tarefas publicam juntos e debitam uma vez', async () => {
    const who = actor(),
      project = await repo.create(who, randomUUID(), now),
      op = randomUUID()
    const service = new PensaJourneyService(repo, () => now)
    await repo.start(
      who,
      project.project.id,
      { id: op, expectedRevision: 0, message: 'Gato', kind: 'planning', context: {} },
      now,
    )
    let lease = randomUUID()
    await repo.claim(who, project.project.id, op, lease, now)
    await repo.publish(
      who,
      project.project.id,
      op,
      lease,
      { type: 'step', step: 'review', output: {} },
      now,
    )
    lease = randomUUID()
    await repo.claim(who, project.project.id, op, lease, now)
    const card = proposal(who)
    await service.publish(who, project.project.id, op, lease, { type: 'proposal', proposal: card })
    let view = await repo.get(who, project.project.id)
    const [before] =
      await conn.sql`select count(*)::int as n from members.ai_usage_daily where account_id = ${who.accountId}`
    expect(before?.n).toBe(0)
    view = await repo.command(
      who,
      project.project.id,
      view.journey.revision,
      { type: 'accept', proposalId: card.id },
      now,
    )
    lease = randomUUID()
    await repo.claim(who, project.project.id, op, lease, now)
    const task = {
      id: randomUUID(),
      title: 'Mover o gato',
      summary: 'O gato anda',
      destination: 'studio' as const,
      category: 'gameplay' as const,
      estimatedMinutes: 10,
      position: 0,
      dependencies: [],
      guide: {
        contractVersion: 2 as const,
        steps: [{ id: 'a', text: 'Use o bloco Mover', required: false }],
        criteria: [{ id: 'r', text: 'Aperte a seta', required: true }],
      },
      context: {
        kind: 'studio' as const,
        dimension: '2d' as const,
        visualAssetIds: [],
        blockIds: ['move'],
        blocks: [
          {
            id: 'move',
            label: 'Mover',
            category: 'Jogo',
            subcategory: 'Mover',
            area: 'events' as const,
            extension: 'game-2d',
          },
        ],
        mechanicDocumentIds: ['game-2d'],
        extensionIds: ['game-2d'],
      },
    }
    await service.publish(who, project.project.id, op, lease, { type: 'plan', tasks: [task] })
    await expect(
      service.publish(who, project.project.id, op, lease, { type: 'plan', tasks: [task] }),
    ).rejects.toThrow()
    const [usage] =
      await conn.sql`select sum(used)::int as n from members.ai_usage_daily where account_id = ${who.accountId}`
    expect(usage?.n).toBe(1)
    expect((await repo.get(who, project.project.id)).journey.missionIds).toEqual([task.id])
  })
  test('outro perfil não abre o projeto e síntese concorrente só ganha um lease', async () => {
    const who = actor(),
      sibling = { ...who, profileId: randomUUID() },
      project = await repo.create(who, randomUUID(), now)
    await expect(repo.get(sibling, project.project.id)).rejects.toThrow()
    const id = randomUUID().replaceAll('-', '').repeat(2)
    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        repo.voice(who, { type: 'claim', id, chars: 100, leaseId: randomUUID() }, now),
      ),
    )
    expect(responses.filter((r) => r.status === 'generate')).toHaveLength(1)
  })

  test('síntese antiga não compartilha o arquivo nem confirma o lease da nova tentativa', async () => {
    const who = actor(),
      id = randomUUID().replaceAll('-', '').repeat(2),
      firstLease = randomUUID(),
      secondLease = randomUUID()
    const first = await repo.voice(who, { type: 'claim', id, chars: 100, leaseId: firstLease }, now)
    const later = new Date(now.getTime() + 121_000)
    const second = await repo.voice(
      who,
      { type: 'claim', id, chars: 100, leaseId: secondLease },
      later,
    )
    expect(first.status).toBe('generate')
    expect(second.status).toBe('generate')
    expect(first.key).not.toBe(second.key)
    await repo.voice(who, { type: 'commit', id, chars: 100, leaseId: secondLease }, later)
    await expect(
      repo.voice(who, { type: 'commit', id, chars: 100, leaseId: firstLease }, later),
    ).rejects.toThrow()
    await expect(
      repo.voice(who, { type: 'fail', id, chars: 100, leaseId: firstLease }, later),
    ).rejects.toThrow()
    expect(
      await repo.voice(who, { type: 'claim', id, chars: 100, leaseId: randomUUID() }, later),
    ).toEqual({ status: 'ready', key: second.key })
  })

  async function playable() {
    const who = actor(),
      view = await repo.create(who, randomUUID(), now),
      taskId = randomUUID()
    const itemId = `pensa-${view.project.id.replaceAll('-', '')}`
    const card = proposal(who)
    const state = {
      ...view.journey,
      stage: 'building' as const,
      proposal: card,
      acceptedProposalId: card.id,
      missionIds: [taskId],
    }
    await conn.db
      .update(pensaJourneys)
      .set({ data: state })
      .where(eq(pensaJourneys.cycleId, state.cycleId))
    await conn.db.insert(pensaTasks).values({
      id: taskId,
      cycleId: state.cycleId,
      title: 'Mover o gato',
      summary: 'O gato anda',
      destination: 'studio',
      category: 'gameplay',
      estimatedMinutes: 10,
      position: 0,
      dependencies: [],
      guide: {
        contractVersion: 2,
        steps: [{ id: 'move', text: 'Encaixe o bloco Mover no evento da seta.', required: false }],
        criteria: [{ id: 'test', text: 'Aperte a seta. O gato anda.', required: true }],
      },
      context: {
        kind: 'studio',
        dimension: '2d',
        blockIds: ['move'],
        blocks: [],
        extensionIds: ['game-2d'],
        mechanicDocumentIds: [],
        visualAssetIds: [],
      },
      progressStatus: 'completed',
      completedCriteriaIds: ['test'],
      outputRef: { kind: 'studio_project', projectId: itemId, saveRevision: '1' },
      createdAt: now,
      updatedAt: now,
    })
    await conn.db.insert(creations).values({
      id: randomUUID(),
      userId: who.profileId,
      accountId: who.accountId,
      tool: 'studio',
      itemId,
      name: 'Gato',
      kind: 'classic',
      itemUpdatedAt: now,
      revision: 1,
      lastReservedRevision: 1,
      bytes: 100,
      storageRef: `creations/${who.profileId}/studio/${itemId}/1.json.gz`,
      parts: [{ hash: 'a'.repeat(64), bytes: 20, rev: 1 } as never],
      formatVersion: 1,
      createdAt: now,
      syncedAt: now,
    })
    return { who, view: await repo.get(who, view.project.id), taskId, itemId }
  }
  test('cópia só fica pronta após commit; restauração troca criação, ciclo, guia e progresso juntos', async () => {
    const { who, view: first, taskId, itemId } = await playable()
    const id = first.project.id,
      checkpointId = randomUUID()
    const prepared = await repo.protect(
      who,
      id,
      { type: 'prepare', id: checkpointId, expectedRevision: first.journey.revision },
      now,
    )
    expect('files' in prepared && prepared.files.length).toBe(2)
    expect((await repo.get(who, id)).journey.checkpoint).toBeNull()
    await repo.protect(who, id, { type: 'commit', id: checkpointId }, now)
    let view = await repo.get(who, id)
    view = await repo.command(who, id, view.journey.revision, { type: 'observe' }, now)
    view = await repo.command(
      who,
      id,
      view.journey.revision,
      {
        type: 'record_test',
        test: {
          id: randomUUID(),
          result: 'met',
          source: 'child',
          note: 'Andou!',
          creationId: itemId,
          saveRevision: '1',
          at: now.toISOString(),
        },
      },
      now,
    )
    view = await repo.command(who, id, view.journey.revision, { type: 'close', reason: 'met' }, now)
    await repo.protect(who, id, { type: 'increment', expectedRevision: view.journey.revision }, now)
    view = await repo.get(who, id)
    expect(view.cycles).toHaveLength(2)
    await conn.db
      .update(creations)
      .set({
        revision: 2,
        lastReservedRevision: 2,
        storageRef: `creations/${who.profileId}/studio/${itemId}/2.json.gz`,
      })
      .where(eq(creations.itemId, itemId))
    const backup = randomUUID()
    await repo.protect(
      who,
      id,
      { type: 'prepare', id: backup, expectedRevision: view.journey.revision },
      now,
    )
    await repo.protect(who, id, { type: 'commit', id: backup }, now)
    view = await repo.get(who, id)
    const restore = {
      type: 'restore_prepare' as const,
      id: randomUUID(),
      expectedRevision: view.journey.revision,
      checkpointId,
    }
    const ticket = await repo.protect(who, id, restore, now)
    expect(await repo.protect(who, id, restore, now)).toEqual(ticket)
    await repo.protect(who, id, { type: 'restore_commit', id: restore.id }, now)
    await repo.protect(who, id, { type: 'restore_commit', id: restore.id }, now)
    view = await repo.get(who, id)
    expect(view.journey).toMatchObject({
      cycleId: first.journey.cycleId,
      paused: true,
      stage: 'building',
    })
    expect(view.checkpoints).toHaveLength(2)
    const [game] = await conn.db.select().from(creations).where(eq(creations.itemId, itemId))
    const [task] = await conn.db.select().from(pensaTasks).where(eq(pensaTasks.id, taskId))
    expect(game?.revision).toBe(3)
    expect(task?.outputRef).toMatchObject({ saveRevision: '3' })
    expect(task?.revision).toBe(2)
  })
  test('autosave entre cópia e commit impede proteção ou restauração obsoleta', async () => {
    const { who, view, itemId } = await playable(),
      checkpointId = randomUUID()
    await repo.protect(
      who,
      view.project.id,
      { type: 'prepare', id: checkpointId, expectedRevision: 0 },
      now,
    )
    await conn.db
      .update(creations)
      .set({ revision: 2, lastReservedRevision: 2 })
      .where(eq(creations.itemId, itemId))
    await expect(
      repo.protect(who, view.project.id, { type: 'commit', id: checkpointId }, now),
    ).rejects.toThrow()
    expect((await repo.get(who, view.project.id)).journey.checkpoint).toBeNull()
  })
  test('teste negativo cria missão de ajuste e conserva conclusão e relato anteriores', async () => {
    const { who, view: original, taskId, itemId } = await playable(),
      id = original.project.id
    let view = await repo.command(who, id, 0, { type: 'observe' }, now)
    view = await repo.command(
      who,
      id,
      view.journey.revision,
      {
        type: 'record_test',
        test: {
          id: randomUUID(),
          result: 'needs_adjustment',
          source: 'child',
          note: 'O gato atravessa a parede',
          creationId: itemId,
          saveRevision: '1',
          at: now.toISOString(),
        },
      },
      now,
    )
    view = await repo.command(who, id, view.journey.revision, { type: 'repair' }, now)
    expect(view.journey.missionIds).toHaveLength(2)
    expect(view.journey.tests[0]?.result).toBe('needs_adjustment')
    const tasks = await conn.db
      .select()
      .from(pensaTasks)
      .where(eq(pensaTasks.cycleId, view.journey.cycleId))
    expect(tasks.find((t) => t.id === taskId)?.progressStatus).toBe('completed')
    expect(tasks.find((t) => t.id !== taskId)).toMatchObject({
      progressStatus: 'planned',
      supersedesTaskId: taskId,
    })
    // Um segundo ajuste não deve duplicar o passo de observação do primeiro.
    await conn.db
      .update(pensaTasks)
      .set({ progressStatus: 'completed' })
      .where(eq(pensaTasks.cycleId, view.journey.cycleId))
    view = await repo.command(who, id, view.journey.revision, { type: 'observe' }, now)
    view = await repo.command(who, id, view.journey.revision, { type: 'repair' }, now)
    const [latest] = await conn.db
      .select()
      .from(pensaTasks)
      .where(eq(pensaTasks.id, view.journey.missionIds.at(-1)!))
    const guideIds = latest!.guide.steps.map((step) => step.id)
    expect(new Set(guideIds).size).toBe(guideIds.length)
  })
  test('concluir exige revisão confirmada; evidência v2 permite finalizar sem marcar passos', async () => {
    const { who, view, taskId, itemId } = await playable()
    await conn.db
      .update(pensaTasks)
      .set({ progressStatus: 'planned', completedCriteriaIds: [], outputRef: null })
      .where(eq(pensaTasks.id, taskId))
    const service = new UpdatePensaTaskProgressService(
      new DrizzlePensaRepository(conn.db),
      () => now,
    )
    await expect(
      service.execute(who.profileId, 'kids', taskId, {
        status: 'completed',
        completedCriteriaIds: ['test'],
        outputRef: { kind: 'studio_project', projectId: itemId, saveRevision: '0' },
      }),
    ).rejects.toThrow('Seu jogo mudou')
    const result = await service.execute(who.profileId, 'kids', taskId, {
      status: 'completed',
      completedCriteriaIds: ['test'],
      outputRef: { kind: 'studio_project', projectId: itemId, saveRevision: '1' },
    })
    expect(result.progress.status).toBe('completed')
    expect(result.progress.completedStepIds).toEqual([])
    expect((await repo.get(who, view.project.id)).journey.revision).toBe(1)
  })
  test('apagar plano cerca saídas tardias e mantém jogo; limpeza não finaliza a conta', async () => {
    const { who, view, itemId } = await playable(),
      id = view.project.id,
      voiceId = 'c'.repeat(64),
      leaseId = randomUUID()
    await repo.voice(who, { type: 'claim', id: voiceId, projectId: id, chars: 80, leaseId }, now)
    await repo.delete(who, id, now)
    await expect(repo.get(who, id)).rejects.toThrow()
    await expect(repo.create(who, id, now)).rejects.toThrow()
    await expect(
      repo.voice(who, { type: 'commit', id: voiceId, projectId: id, chars: 80, leaseId }, now),
    ).rejects.toThrow()
    expect(await conn.db.select().from(creations).where(eq(creations.itemId, itemId))).toHaveLength(
      1,
    )
    const cleanup = new DrizzleCreationCleanupRepository(conn.db)
    expect(await cleanup.claimDue(now, now, ['pensa'])).toBeNull()
    const later = new Date(now.getTime() + 600001)
    // Worker que não declarou o escopo (o antigo) nunca recebe a limpeza de um plano.
    expect(await cleanup.claimDue(later, now, [])).toBeNull()
    const job = await cleanup.claimDue(later, now, ['pensa'])
    expect(job).toMatchObject({
      id,
      scope: 'pensa',
      prefixes: [`creations/${who.profileId}/pensa/${id}/`],
    })
    expect(await cleanup.complete(id, now)).toBe(true)
  })
  test('limite de tentativas externas é compartilhado e sobrevive a cancelamento e exclusão', async () => {
    const who = actor(),
      a = await repo.create(who, randomUUID(), now),
      b = await repo.create(who, randomUUID(), now)
    await conn.sql`insert into members.pensa_provider_usage (account_id,day,calls,updated_at) values (${who.accountId},'2026-10-14',59,${now.toISOString()})`
    const ops = [randomUUID(), randomUUID()]
    for (const [i, project] of [a, b].entries())
      await repo.start(
        who,
        project.project.id,
        { id: ops[i]!, kind: 'planning', message: 'Gato', expectedRevision: 0, context: {} },
        now,
      )
    const claims = await Promise.all(
      [a, b].map((project, i) => repo.claim(who, project.project.id, ops[i]!, randomUUID(), now)),
    )
    expect(claims.filter(Boolean)).toHaveLength(1)
    await repo.delete(who, a.project.id, now)
    const [used] =
      await conn.sql`select calls from members.pensa_provider_usage where account_id=${who.accountId}`
    expect(used?.calls).toBe(60)
  })

  test('aceitar perto do fim da janela renova a reserva: o plano publica depois dos 30 min e debita uma vez', async () => {
    const who = actor(),
      project = await repo.create(who, randomUUID(), now),
      id = project.project.id,
      op = randomUUID()
    const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000)
    const expiresAt = async () => {
      const [row] = await conn.sql<Array<{ expires_at: Date }>>`
        select expires_at from members.ai_usage_reservations where id = ${op}`
      return new Date(row?.expires_at ?? 0).toISOString()
    }
    await repo.start(
      who,
      id,
      { id: op, expectedRevision: 0, message: 'Gato', kind: 'planning', context: {} },
      now,
    )
    let lease = randomUUID()
    await repo.claim(who, id, op, lease, now)
    await repo.publish(who, id, op, lease, { type: 'step', step: 'review', output: {} }, now)
    lease = randomUUID()
    await repo.claim(who, id, op, lease, at(1))
    const card = proposal(who)
    await repo.publish(who, id, op, lease, { type: 'proposal', proposal: card }, at(1))
    // A criança lê o cartão com calma e aceita aos 25 min da primeira mensagem.
    const view = await repo.get(who, id)
    await repo.command(
      who,
      id,
      view.journey.revision,
      { type: 'accept', proposalId: card.id },
      at(25),
    )
    expect(await expiresAt()).toBe(at(55).toISOString())
    // Os guias começam aos 29 min e chegam aos 31: com o prazo fixo, vencia aos 30.
    lease = randomUUID()
    expect(await repo.claim(who, id, op, lease, at(29))).not.toBeNull()
    expect(await expiresAt()).toBe(at(59).toISOString())
    const task = studioTask()
    await repo.publish(who, id, op, lease, { type: 'plan', tasks: [task] }, at(31))
    const [usage] =
      await conn.sql`select sum(used)::int as n from members.ai_usage_daily where account_id = ${who.accountId}`
    expect(usage?.n).toBe(1)
    expect((await repo.get(who, id)).journey.missionIds).toEqual([task.id])
  })

  test('pergunta na ajuda: a resposta retoma a mesma operação e reserva; ir planejar solta a reserva', async () => {
    const who = actor(),
      project = await repo.create(who, randomUUID(), now),
      id = project.project.id,
      help = randomUUID()
    const reserved = async () =>
      (
        await conn.sql<Array<{ id: string }>>`
          select id from members.ai_usage_reservations
          where project_id = ${id} and status = 'reserved' and expires_at > ${now.toISOString()}`
      ).map((row) => row.id)
    await repo.start(
      who,
      id,
      { id: help, expectedRevision: 0, message: 'Como o gato pula?', kind: 'help', context: {} },
      now,
    )
    let lease = randomUUID()
    await repo.claim(who, id, help, lease, now)
    await repo.publish(who, id, help, lease, { type: 'question', text: 'Com qual tecla?' }, now)
    let view = await repo.get(who, id)
    expect(view.operation).toMatchObject({ id: help, status: 'waiting' })
    // A criança responde: a mesma ajuda continua, sem uma segunda unidade presa.
    await repo.start(
      who,
      id,
      {
        id: randomUUID(),
        expectedRevision: view.journey.revision,
        message: 'Com o espaço',
        kind: 'help',
        context: {},
      },
      now,
    )
    view = await repo.get(who, id)
    expect(view.journey.operationId).toBe(help)
    expect(await reserved()).toEqual([help])
    // O Zappy pergunta de novo e ela muda de assunto: a ajuda fica para trás, encerrada.
    lease = randomUUID()
    await repo.claim(who, id, help, lease, now)
    await repo.publish(who, id, help, lease, { type: 'question', text: 'E depois?' }, now)
    view = await repo.get(who, id)
    const plan = randomUUID()
    await repo.start(
      who,
      id,
      {
        id: plan,
        expectedRevision: view.journey.revision,
        message: 'Quero um gato na lua',
        kind: 'planning',
        context: {},
      },
      now,
    )
    expect(await reserved()).toEqual([plan])
    const [old] = await conn.sql`select status from members.pensa_operations where id = ${help}`
    expect(old?.status).toBe('cancelled')
  })
})
