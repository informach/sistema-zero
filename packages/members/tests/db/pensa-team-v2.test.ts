import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { PensaJourneyActor } from '@sistemazero/core/pensa'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import { UpdatePensaTaskProgressService } from '../../src/application/pensa/update-task-progress.service'
import {
  PensaMissionTakenError,
  PensaNotFoundError,
  PensaNotOwnerError,
  PensaNotProgrammerError,
  PensaNotYourMissionError,
  PensaTaskProgressConflictError,
} from '../../src/domain/pensa/pensa.errors'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePensaRepository } from '../../src/infrastructure/persistence/drizzle/pensa.repository'
import { DrizzlePensaJourneyRepository } from '../../src/infrastructure/persistence/drizzle/pensa-journey.repository'
import {
  creations,
  pensaJourneys,
  pensaProjectRoles,
  pensaTasks,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { applyPensaV2Schema } from './pensa-v2-schema'

/**
 * Equipe no Pensa v2 (14/10/2026) contra o Postgres REAL: o SQL que o fake não alcança. O
 * `accessible` da jornada (dona ou quem entrou, perfil E conta), as travas de dona e de quem
 * programa, o `for update` e a regra 5 das funções, a evidência conferida na conta do ATOR, as
 * artes da equipe e a limpeza do R2 de todos os perfis do plano.
 *
 * Banco próprio (como `pensa-journey.repository.test.ts`): as FKs da jornada não cabem nos
 * fixtures esparsos do banco compartilhado. Erro esperado vai em `failure()` (try/catch).
 */
const base =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgres://postgres:postgres@localhost:5433/sistemazero'
const target = new URL(base)
target.pathname = '/sistemazero_pensa_team_v2_test'
const admin = postgres(base, { max: 1, connect_timeout: 2, onnotice: () => {} })
let available = false
try {
  await admin`select 1`
  try {
    await admin.unsafe('create database sistemazero_pensa_team_v2_test')
  } catch (cause) {
    if ((cause as { code?: string }).code !== '42P04') throw cause
  }
  available = true
} catch (cause) {
  if (process.env.TEST_DATABASE_URL) throw cause
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — equipe do Pensa v2 PULADA.')
} finally {
  await admin.end({ timeout: 1 })
}

async function failure(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
    return null
  } catch (error) {
    return error
  }
}

describe.skipIf(!available)('Pensa v2 em equipe no Postgres', () => {
  let conn: DbConnection
  let journeys: DrizzlePensaJourneyRepository
  let pensa: DrizzlePensaRepository
  const now = new Date('2026-10-14T12:00:00Z')
  const actors: PensaJourneyActor[] = []
  const person = (): PensaJourneyActor => {
    const result = { profileId: randomUUID(), accountId: randomUUID(), privileged: false }
    actors.push(result)
    return result
  }

  beforeAll(async () => {
    conn = createDbConnection(target.toString(), { max: 12 })
    journeys = new DrizzlePensaJourneyRepository(conn.db, { dailyLimit: 5, monthlyLimit: 50 })
    pensa = new DrizzlePensaRepository(conn.db)
    await applyPensaV2Schema(conn.sql)
  }, 30000)

  afterAll(async () => {
    for (const who of actors) {
      await conn.sql`delete from members.pensa_projects where user_id = ${who.profileId}`
      await conn.sql`delete from members.creations where user_id = ${who.profileId}`
      await conn.sql`delete from members.private_narrations where profile_id = ${who.profileId}`
      await conn.sql`delete from members.pensa_deletion_jobs where profile_id = ${who.profileId}`
    }
    await conn?.close()
  })

  /** Um plano v2 da dona, com quem entrou pelo código. */
  async function team(...members: PensaJourneyActor[]) {
    const owner = person()
    const view = await journeys.create(owner, randomUUID(), now)
    const id = view.project.id
    const code = randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()
    expect(await pensa.setShareCode(id, code, now)).toBe(true)
    for (const member of members)
      expect(
        await pensa.addMember(
          {
            projectId: id,
            profileId: member.profileId,
            accountId: member.accountId,
            invitedBy: owner.profileId,
          },
          now,
          5,
          code,
        ),
      ).toBe('added')
    return { owner, id, cycleId: view.journey.cycleId }
  }

  /** Põe a jornada em construção com uma missão do Estúdio e uma do Pinta. */
  async function building(id: string, cycleId: string) {
    const studio = randomUUID()
    const art = randomUUID()
    const [row] = await conn.db
      .select()
      .from(pensaJourneys)
      .where(eq(pensaJourneys.cycleId, cycleId))
    await conn.db
      .update(pensaJourneys)
      .set({ data: { ...row!.data, stage: 'building', missionIds: [art, studio] } })
      .where(eq(pensaJourneys.cycleId, cycleId))
    const common = {
      cycleId,
      summary: null,
      estimatedMinutes: 10,
      dependencies: [],
      createdAt: now,
      updatedAt: now,
    }
    await conn.db.insert(pensaTasks).values([
      {
        ...common,
        id: art,
        title: 'Desenhar o gato',
        destination: 'pinta',
        category: 'art',
        position: 0,
        guide: {
          contractVersion: 2,
          steps: [{ id: 'draw', text: 'Desenhe', required: false }],
          criteria: [{ id: 'ok', text: 'Pronto', required: false }],
        },
        context: {
          kind: 'pinta',
          assetId: 'gato',
          artKind: 'sprite',
          style: 'pixel',
          palette: [],
          appearance: 'Um gato',
          animations: [],
          states: [],
          usage: 'Personagem',
          requiresStudioUse: false,
        },
      },
      {
        ...common,
        id: studio,
        title: 'Mover o gato',
        destination: 'studio',
        category: 'gameplay',
        position: 1,
        guide: { contractVersion: 2, steps: [], criteria: [] },
        context: {
          kind: 'studio',
          dimension: '2d',
          visualAssetIds: [],
          blockIds: [],
          blocks: [],
          mechanicDocumentIds: [],
          extensionIds: [],
        },
      },
    ])
    return { studio, art, itemId: `pensa-${id.replaceAll('-', '')}` }
  }

  async function savedCreation(
    who: PensaJourneyActor,
    tool: 'pinta' | 'molda' | 'studio',
    itemId: string,
    kind: string,
  ) {
    await conn.db.insert(creations).values({
      id: randomUUID(),
      userId: who.profileId,
      accountId: who.accountId,
      tool,
      itemId,
      name: `Criação ${itemId}`,
      kind,
      itemUpdatedAt: now,
      revision: 3,
      lastReservedRevision: 3,
      bytes: 100,
      storageRef: `creations/${who.profileId}/${tool}/${itemId}/3.json.gz`,
      parts: [],
      formatVersion: 1,
      createdAt: now,
      syncedAt: now,
    })
  }

  test('accessible: dona e quem entrou abrem com papel e equipe; de fora e conta trocada, 404', async () => {
    const bia = person()
    const { owner, id } = await team(bia)
    const mine = await journeys.get(owner, id)
    expect(mine.role).toBe('owner')
    expect(mine.team).toEqual({
      viewerProfileId: owner.profileId,
      ownerProfileId: owner.profileId,
      memberCount: 1,
      shareEnabled: true,
      roles: { code: owner.profileId, art: [owner.profileId] },
    })
    const theirs = await journeys.get(bia, id)
    expect(theirs).toMatchObject({ role: 'member', team: { viewerProfileId: bia.profileId } })
    const listed = await journeys.list(bia, 'active')
    expect(listed.find((item) => item.id === id)).toMatchObject({
      role: 'member',
      team: { memberCount: 1, ownerFirstName: null },
      ownerProfileId: owner.profileId,
    })
    expect(await failure(journeys.get(person(), id))).toBeInstanceOf(PensaNotFoundError)
    // O MESMO perfil com outra conta não abre (o perfil e a conta conferem nos dois ramos).
    expect(await failure(journeys.get({ ...bia, accountId: randomUUID() }, id))).toBeInstanceOf(
      PensaNotFoundError,
    )
  })

  test('só a dona arquiva e apaga; arquivado some para a equipe e segue com a dona', async () => {
    const bia = person()
    const { owner, id } = await team(bia)
    expect(await failure(journeys.archive(bia, id, 'archived', now))).toBeInstanceOf(
      PensaNotOwnerError,
    )
    expect(await failure(journeys.delete(bia, id, now))).toBeInstanceOf(PensaNotOwnerError)
    await journeys.archive(owner, id, 'archived', now)
    expect(await failure(journeys.get(bia, id))).toBeInstanceOf(PensaNotFoundError)
    expect((await journeys.get(owner, id)).project.status).toBe('archived')
    expect((await journeys.list(owner, 'archived')).map((item) => item.id)).toContain(id)
    expect((await journeys.list(bia, 'archived')).map((item) => item.id)).not.toContain(id)
  })

  test('a equipe conversa e pausa; só quem programa testa e guarda; checkpoints são os dela', async () => {
    const bia = person()
    const { owner, id, cycleId } = await team(bia)
    await building(id, cycleId)
    let view = await journeys.get(bia, id)
    view = await journeys.command(bia, id, view.journey.revision, { type: 'pause' }, now)
    expect(view.journey.paused).toBe(true)
    expect(
      await failure(journeys.command(bia, id, view.journey.revision, { type: 'observe' }, now)),
    ).toBeInstanceOf(PensaNotProgrammerError)
    expect(
      await failure(
        journeys.protect(
          bia,
          id,
          { type: 'prepare', id: randomUUID(), expectedRevision: view.journey.revision },
          now,
        ),
      ),
    ).toBeInstanceOf(PensaNotProgrammerError)
    // A dona passa a programação para a Bia (o jogo ainda não começou no Estúdio).
    expect(await pensa.setRoles(id, { code: bia.profileId, art: [] }, owner.profileId, now)).toBe(
      'updated',
    )
    view = await journeys.get(owner, id)
    expect(view.team?.roles).toEqual({ code: bia.profileId, art: [bia.profileId] })
    expect(
      await failure(journeys.command(owner, id, view.journey.revision, { type: 'observe' }, now)),
    ).toBeInstanceOf(PensaNotProgrammerError)
    view = await journeys.command(bia, id, view.journey.revision, { type: 'observe' }, now)
    expect(view.journey.stage).toBe('observing')
    // As versões guardadas que a tela mostra são as de quem programa, para a dona também.
    const checkpointOf = async (who: PensaJourneyActor) => {
      const checkpointId = randomUUID()
      await conn.sql`insert into members.pensa_checkpoints (id, project_id, cycle_id, profile_id, account_id, creation_id, save_revision, journey, manifest, status, created_at)
        values (${checkpointId}, ${id}, ${cycleId}, ${who.profileId}, ${who.accountId}, 'x', '1', ${JSON.stringify(view.journey)}::jsonb, '{}'::jsonb, 'ready', ${now.toISOString()})`
      return checkpointId
    }
    const biaCheckpoint = await checkpointOf(bia)
    await checkpointOf(owner)
    const seen = await journeys.get(owner, id)
    expect(seen.checkpoints?.map((item) => item.id)).toEqual([biaCheckpoint])
  })

  test('funções: for update, regra 5 (estúdio começado ou versão guardada), fora da equipe e plano clássico', async () => {
    const bia = person()
    const leo = person()
    const { owner, id, cycleId } = await team(bia, leo)
    const { studio } = await building(id, cycleId)
    const before = (await journeys.get(owner, id)).journey.revision
    // Duas abas da dona trocando ao mesmo tempo: a trava do projeto serializa, e sobra UMA
    // linha `code` (o índice parcial garante).
    const outcomes = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        pensa.setRoles(
          id,
          { code: i % 2 ? bia.profileId : leo.profileId, art: [bia.profileId, leo.profileId] },
          owner.profileId,
          now,
        ),
      ),
    )
    expect(outcomes.every((outcome) => outcome === 'updated')).toBe(true)
    const rows = await conn.db
      .select()
      .from(pensaProjectRoles)
      .where(eq(pensaProjectRoles.projectId, id))
    expect(rows.filter((row) => row.role === 'code')).toHaveLength(1)
    expect(rows.filter((row) => row.role === 'art')).toHaveLength(2)
    expect((await journeys.get(owner, id)).journey.revision).toBe(before + 6)
    // Duas linhas `code` direto no banco: o índice parcial recusa.
    expect(
      await failure(
        conn.sql`insert into members.pensa_project_roles (project_id, profile_id, role, assigned_by) values (${id}, ${owner.profileId}, 'code', ${owner.profileId})`,
      ),
    ).not.toBeNull()
    expect(
      await pensa.setRoles(id, { code: person().profileId, art: [] }, owner.profileId, now),
    ).toBe('not_in_team')
    // O jogo começou no Estúdio: quem programa não muda mais; as artes mudam.
    await conn.db
      .update(pensaTasks)
      .set({ progressStatus: 'in_progress' })
      .where(eq(pensaTasks.id, studio))
    expect(await pensa.isCodeLocked(id)).toBe(true)
    const current = (await journeys.get(owner, id)).team!.roles.code
    const other = current === bia.profileId ? leo.profileId : bia.profileId
    expect(await pensa.setRoles(id, { code: other, art: [] }, owner.profileId, now)).toBe(
      'code_locked',
    )
    expect(
      await pensa.setRoles(id, { code: current, art: [leo.profileId] }, owner.profileId, now),
    ).toBe('updated')
    // Versão guardada também tranca (outro plano, sem missão começada).
    const second = await team(bia)
    expect(await pensa.isCodeLocked(second.id)).toBe(false)
    await conn.sql`insert into members.pensa_checkpoints (id, project_id, cycle_id, profile_id, account_id, creation_id, save_revision, journey, manifest, status, created_at)
      values (${randomUUID()}, ${second.id}, ${second.cycleId}, ${second.owner.profileId}, ${second.owner.accountId}, 'x', '1', '{"revision":0}'::jsonb, '{}'::jsonb, 'copying', ${now.toISOString()})`
    expect(
      await pensa.setRoles(
        second.id,
        { code: bia.profileId, art: [] },
        second.owner.profileId,
        now,
      ),
    ).toBe('code_locked')
    // Plano clássico (sem jornada) não tem funções.
    const classic = randomUUID()
    const owner2 = person()
    await pensa.createProject(
      {
        id: classic,
        userId: owner2.profileId,
        accountId: owner2.accountId,
        audience: 'kids',
        kind: 'game',
        name: 'Clássico',
      },
      { id: randomUUID(), projectId: classic, number: 1, goal: null },
      now,
    )
    expect(
      await pensa.setRoles(classic, { code: owner2.profileId, art: [] }, owner2.profileId, now),
    ).toBe('legacy')
  })

  test('missões: a função, a missão pega por outra artista e a evidência na conta de quem conclui', async () => {
    const bia = person()
    const leo = person()
    const { owner, id, cycleId } = await team(bia, leo)
    const { art, studio, itemId } = await building(id, cycleId)
    expect(
      await pensa.setRoles(
        id,
        { code: owner.profileId, art: [bia.profileId, leo.profileId] },
        owner.profileId,
        now,
      ),
    ).toBe('updated')
    const service = new UpdatePensaTaskProgressService(pensa, () => now)
    expect(
      await failure(service.execute(owner, 'kids', art, { status: 'in_progress' })),
    ).toBeInstanceOf(PensaNotYourMissionError)
    expect(
      await failure(service.execute(bia, 'kids', studio, { status: 'in_progress' })),
    ).toBeInstanceOf(PensaNotYourMissionError)
    // O repositório confere de novo, sob a trava (mesmo sem passar pelo serviço).
    expect(
      await failure(
        pensa.updateTaskProgress(
          id,
          studio,
          {
            status: 'in_progress',
            completedStepIds: [],
            completedCriteriaIds: [],
            outputRef: null,
            startedAt: now,
            completedAt: null,
            updatedAt: now,
          },
          null,
          now,
          bia,
        ),
      ),
    ).toBeInstanceOf(PensaNotYourMissionError)
    const started = await service.execute(bia, 'kids', art, { status: 'in_progress' })
    expect(started.assigneeProfileId).toBe(bia.profileId)
    expect(
      await failure(service.execute(leo, 'kids', art, { status: 'completed' })),
    ).toBeInstanceOf(PensaMissionTakenError)
    const done = {
      status: 'completed' as const,
      outputRef: { kind: 'pinta_asset' as const, assetId: 'gato-da-bia' },
    }
    // A arte guardada na conta da DONA não conclui a missão da Bia.
    await savedCreation(owner, 'pinta', 'gato-da-bia', 'sprite')
    expect(await failure(service.execute(bia, 'kids', art, done))).toBeInstanceOf(
      PensaTaskProgressConflictError,
    )
    await savedCreation(bia, 'pinta', 'gato-da-bia', 'sprite')
    const completed = await service.execute(bia, 'kids', art, done)
    expect(completed).toMatchObject({
      assigneeProfileId: bia.profileId,
      completedByProfileId: bia.profileId,
      progress: { status: 'completed' },
    })
    // O Estúdio é de quem programa (a dona): a evidência é o jogo no Estúdio DELA.
    await savedCreation(bia, 'studio', itemId, 'classic')
    const studioDone = {
      status: 'completed' as const,
      outputRef: { kind: 'studio_project' as const, projectId: itemId, saveRevision: '3' },
    }
    expect(await failure(service.execute(owner, 'kids', studio, studioDone))).toBeInstanceOf(
      PensaTaskProgressConflictError,
    )
    await savedCreation(owner, 'studio', itemId, 'classic')
    expect((await service.execute(owner, 'kids', studio, studioDone)).completedByProfileId).toBe(
      owner.profileId,
    )
  })

  test('artes da equipe: só as entregues por OUTRA pessoa, com a criação viva; o download aponta para quem concluiu', async () => {
    const bia = person()
    const { owner, id, cycleId } = await team(bia)
    const { art, studio } = await building(id, cycleId)
    expect(
      await pensa.setRoles(
        id,
        { code: owner.profileId, art: [bia.profileId] },
        owner.profileId,
        now,
      ),
    ).toBe('updated')
    await savedCreation(bia, 'pinta', 'gato-da-bia', 'pixel-sprite')
    await conn.db
      .update(pensaTasks)
      .set({
        progressStatus: 'completed',
        completedAt: now,
        outputRef: { kind: 'pinta_asset', assetId: 'gato-da-bia', assetName: 'Gato antigo' },
        assigneeProfileId: bia.profileId,
        completedByProfileId: bia.profileId,
      })
      .where(eq(pensaTasks.id, art))
    const items = await pensa.listTeamArt(id, owner.profileId, 100)
    expect(items).toEqual([
      {
        taskId: art,
        title: 'Desenhar o gato',
        tool: 'pinta',
        assetId: 'gato-da-bia',
        assetName: 'Criação gato-da-bia',
        assetKind: 'pixel-sprite',
        byProfileId: bia.profileId,
        completedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        revision: 3,
      },
    ])
    // Quem desenhou não "traz da equipe" a própria arte.
    expect(await pensa.listTeamArt(id, bia.profileId, 100)).toEqual([])
    expect(await pensa.findTeamArtTask(id, art)).toEqual({
      completedByProfileId: bia.profileId,
      tool: 'pinta',
      assetId: 'gato-da-bia',
    })
    // Missão não concluída, de outro plano ou sem arte: nada.
    expect(await pensa.findTeamArtTask(id, studio)).toBeNull()
    expect(await pensa.findTeamArtTask((await team()).id, art)).toBeNull()
    // A criação apagada na conta da artista some da lista.
    await conn.db
      .update(creations)
      .set({ deletedAt: now })
      .where(eq(creations.userId, bia.profileId))
    expect(await pensa.listTeamArt(id, owner.profileId, 100)).toEqual([])
  })

  test('sair solta a função: quem programava devolve o Estúdio à dona', async () => {
    const bia = person()
    const { owner, id } = await team(bia)
    expect(await pensa.setRoles(id, { code: bia.profileId, art: [] }, owner.profileId, now)).toBe(
      'updated',
    )
    expect((await journeys.get(owner, id)).team?.roles.code).toBe(bia.profileId)
    expect(await pensa.removeMember(id, bia.profileId, now)).toBe(true)
    expect(await pensa.listRoles(id)).toEqual([])
    expect((await journeys.get(owner, id)).team?.roles).toEqual({
      code: owner.profileId,
      art: [owner.profileId],
    })
  })

  test('apagar o plano agenda a limpeza do R2 de todos os perfis com dado dele', async () => {
    const bia = person()
    const leo = person()
    const { owner, id, cycleId } = await team(bia)
    // Leo saiu, mas deixou uma versão guardada; Bia ouviu uma fala do Zappy no plano.
    await conn.sql`insert into members.pensa_checkpoints (id, project_id, cycle_id, profile_id, account_id, creation_id, save_revision, journey, manifest, status, created_at)
      values (${randomUUID()}, ${id}, ${cycleId}, ${leo.profileId}, ${leo.accountId}, 'x', '1', '{"revision":0}'::jsonb, '{}'::jsonb, 'ready', ${now.toISOString()})`
    await journeys.voice(
      bia,
      { type: 'claim', id: 'd'.repeat(64), projectId: id, chars: 40, leaseId: randomUUID() },
      now,
    )
    await journeys.delete(owner, id, now)
    const [job] = await conn.sql<Array<{ prefixes: string[] }>>`
      select prefixes from members.pensa_deletion_jobs where id = ${id}`
    expect(job?.prefixes[0]).toBe(`creations/${owner.profileId}/pensa/${id}/`)
    expect(new Set(job?.prefixes)).toEqual(
      new Set([
        `creations/${owner.profileId}/pensa/${id}/`,
        `creations/${bia.profileId}/pensa/${id}/`,
        `creations/${leo.profileId}/pensa/${id}/`,
      ]),
    )
  })
})
