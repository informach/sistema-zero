import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { PensaJourneyActor, PensaProposal } from '@sistemazero/core/pensa'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import { PensaJourneyService } from '../../src/application/pensa/journey.service'
import { UpdatePensaTaskProgressService } from '../../src/application/pensa/update-task-progress.service'
import { PensaNotOwnerError } from '../../src/domain/pensa/pensa.errors'
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
import { applyPensaV2Schema } from './pensa-v2-schema'

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
    // As migrations da jornada + o DDL à mão da equipe (14/10/2026), num banco próprio.
    await applyPensaV2Schema(conn.sql)
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
  async function join(projectId: string, owner: PensaJourneyActor, member: PensaJourneyActor) {
    const teams = new DrizzlePensaRepository(conn.db)
    const code = randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()
    await teams.setShareCode(projectId, code, now)
    expect(
      await teams.addMember(
        {
          projectId,
          profileId: member.profileId,
          accountId: member.accountId,
          invitedBy: owner.profileId,
        },
        now,
        5,
        code,
      ),
    ).toBe('added')
  }

  test('renomear: só a dona, e a proposta seguinte não troca o nome que a criança deu (15/10/2026)', async () => {
    const owner = actor(),
      member = actor()
    const project = await repo.create(owner, randomUUID(), now)
    const id = project.project.id
    await join(id, owner, member)
    // Quem entrou não renomeia.
    let refused: unknown = null
    try {
      await repo.rename(member, id, 'Nome da colega', now)
    } catch (cause) {
      refused = cause
    }
    expect(refused).toBeInstanceOf(PensaNotOwnerError)
    // Sem nome dado pela criança, a primeira proposta dá o nome.
    const publishProposal = async (title: string) => {
      const view = await repo.get(owner, id)
      const op = randomUUID()
      await repo.start(
        owner,
        id,
        {
          id: op,
          expectedRevision: view.journey.revision,
          message: 'Gato',
          kind: 'planning',
          context: {},
        },
        now,
      )
      // A operação que espera a escolha é retomada pelo pedido seguinte: vale o id dela.
      const opened = (await repo.get(owner, id)).operation?.id ?? op
      let lease = randomUUID()
      await repo.claim(owner, id, opened, lease, now)
      await repo.publish(
        owner,
        id,
        opened,
        lease,
        { type: 'step', step: 'review', output: {} },
        now,
      )
      lease = randomUUID()
      await repo.claim(owner, id, opened, lease, now)
      await repo.publish(
        owner,
        id,
        opened,
        lease,
        { type: 'proposal', proposal: { ...proposal(owner), title } },
        now,
      )
    }
    await publishProposal('Gato na lua')
    expect((await repo.get(owner, id)).project.name).toBe('Gato na lua')
    // Uma proposta nova troca o nome que veio da proposta anterior.
    await publishProposal('Gato nas estrelas')
    expect((await repo.get(owner, id)).project.name).toBe('Gato nas estrelas')
    // Renomeado pela criança, o nome é dela e a próxima proposta não o troca.
    const renamed = await repo.rename(owner, id, '  Meu   gatinho  ', now)
    expect(renamed.project.name).toBe('Meu gatinho')
    await publishProposal('Gato espacial')
    expect((await repo.get(owner, id)).project.name).toBe('Meu gatinho')
  })

  test('pergunta com escolhas: guarda as respostas, conta o teto e dá um nome provisório que a proposta troca (15/10/2026)', async () => {
    const who = actor()
    const id = (await repo.create(who, randomUUID(), now)).project.id
    const op = randomUUID()
    await repo.start(
      who,
      id,
      {
        id: op,
        expectedRevision: 0,
        message: 'Quero um jogo de dragão',
        kind: 'planning',
        context: {},
      },
      now,
    )
    let lease = randomUUID()
    await repo.claim(who, id, op, lease, now)
    const choices = {
      about: 'action' as const,
      options: [
        { label: 'Voa desviando das pedras', description: 'O jogo é não bater em nada.' },
        { label: 'Pega ovos pelo caminho', description: 'Cada ovo vale um ponto.' },
      ],
    }
    await repo.publish(
      who,
      id,
      op,
      lease,
      {
        type: 'question',
        text: 'O que o seu dragão faz?',
        choices,
        workingTitle: 'O voo do dragão',
      },
      now,
    )
    let view = await repo.get(who, id)
    expect(view.journey.messages.at(-1)).toMatchObject({ role: 'assistant', choices })
    expect(view.journey.questionsAsked).toBe(1)
    // A lista deixa de mostrar "Meu novo jogo" antes mesmo da proposta.
    expect(view.project.name).toBe('O voo do dragão')
    await repo.start(
      who,
      id,
      {
        id: randomUUID(),
        expectedRevision: view.journey.revision,
        message: 'Pega ovos pelo caminho',
        kind: 'planning',
        context: {},
      },
      now,
    )
    lease = randomUUID()
    await repo.claim(who, id, op, lease, now)
    await repo.publish(who, id, op, lease, { type: 'step', step: 'review', output: {} }, now)
    lease = randomUUID()
    await repo.claim(who, id, op, lease, now)
    await repo.publish(
      who,
      id,
      op,
      lease,
      { type: 'proposal', proposal: { ...proposal(who), title: 'Dragão dos ovos' } },
      now,
    )
    view = await repo.get(who, id)
    // O nome provisório era do sistema: a proposta o troca, e o teto volta a zero.
    expect(view.project.name).toBe('Dragão dos ovos')
    expect(view.journey.questionsAsked).toBe(0)
    expect(view.journey.workingTitle).toBeNull()
    // "Quero mudar uma coisa" virou pergunta: com uma proposta, o nome provisório dela não
    // renomeia o jogo (antes ele virava "A nave veloz" com o plano ainda sendo o dos ovos).
    await repo.start(
      who,
      id,
      {
        id: randomUUID(),
        expectedRevision: view.journey.revision,
        message: 'Quero que seja uma nave',
        kind: 'planning',
        context: {},
      },
      now,
    )
    lease = randomUUID()
    await repo.claim(who, id, op, lease, now)
    await repo.publish(
      who,
      id,
      op,
      lease,
      { type: 'question', text: 'A nave atira?', choices, workingTitle: 'A nave veloz' },
      now,
    )
    view = await repo.get(who, id)
    expect(view.project.name).toBe('Dragão dos ovos')
    expect(view.journey.questionsAsked).toBe(1)
    expect(view.journey.workingTitle ?? null).toBeNull()
  })

  test('cota por rodada: várias mudanças na proposta não esgotam o guia (15/10/2026)', async () => {
    const who = actor()
    const id = (await repo.create(who, randomUUID(), now)).project.id
    const op = randomUUID()
    let revision = 0
    const round = async (message: string) => {
      await repo.start(
        who,
        id,
        { id: randomUUID(), expectedRevision: revision, message, kind: 'planning', context: {} },
        now,
      )
      let lease = randomUUID()
      expect(await repo.claim(who, id, op, lease, now)).not.toBeNull()
      await repo.publish(who, id, op, lease, { type: 'step', step: 'review', output: {} }, now)
      lease = randomUUID()
      expect(await repo.claim(who, id, op, lease, now)).not.toBeNull()
      await repo.publish(who, id, op, lease, { type: 'proposal', proposal: proposal(who) }, now)
      revision = (await repo.get(who, id)).journey.revision
    }
    // A primeira mensagem abre o pedido com o id dele; as outras o retomam.
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
    await repo.claim(who, id, op, lease, now)
    const card = proposal(who)
    await repo.publish(who, id, op, lease, { type: 'proposal', proposal: card }, now)
    revision = (await repo.get(who, id)).journey.revision
    // Cinco "Quero mudar uma coisa": 12 chamadas no pedido (o teto antigo era 10 no total).
    for (const message of ['Mais rápido', 'Com pedras', 'De noite', 'Com moedas', 'Quero desenhar'])
      await round(message)
    const [stored] = await conn.sql<Array<{ calls: number }>>`
      select calls from members.pensa_operations where id = ${op}`
    expect(stored?.calls).toBe(12)
    // Mesmo com a conversa no teto do pedido e no fim da cota da rodada, escolher o começo abre a
    // rodada dos guias, e o teto do pedido não barra os guias.
    await conn.sql`update members.pensa_operations
      set calls = 24, input = jsonb_set(input, '{roundStartCalls}', '18'::jsonb) where id = ${op}`
    let view = await repo.get(who, id)
    await repo.command(
      who,
      id,
      view.journey.revision,
      { type: 'accept', proposalId: view.journey.proposal!.id },
      now,
    )
    lease = randomUUID()
    expect(await repo.claim(who, id, op, lease, now)).not.toBeNull()
    // A rede caiu no guia: o "Tentar de novo" vale com o pedido acima das 10 de antes.
    await repo.fail(who, id, op, lease, 'tente de novo', now)
    view = await repo.get(who, id)
    await repo.command(who, id, view.journey.revision, { type: 'retry' }, now)
    lease = randomUUID()
    expect(await repo.claim(who, id, op, lease, now)).not.toBeNull()
    const task = studioTask()
    await repo.publish(who, id, op, lease, { type: 'plan', tasks: [task] }, now)
    expect((await repo.get(who, id)).journey.missionIds).toEqual([task.id])
  }, 30000)

  test('cota por rodada: a conversa para no teto do pedido, e o pedido sem a marca não fica nas 10 de antes', async () => {
    const who = actor()
    const id = (await repo.create(who, randomUUID(), now)).project.id
    const op = randomUUID()
    await repo.start(
      who,
      id,
      { id: op, expectedRevision: 0, message: 'Gato', kind: 'planning', context: {} },
      now,
    )
    // Pedido que começou antes da marca da rodada: sem rodada para contar, vale só o teto.
    await conn.sql`update members.pensa_operations set calls = 10, input = input - 'roundStartCalls' where id = ${op}`
    const lease = randomUUID()
    expect(await repo.claim(who, id, op, lease, now)).not.toBeNull()
    await repo.fail(who, id, op, lease, 'tente de novo', now)
    // Com a marca: a rodada nova tem cota, mas a conversa para em 24 no pedido.
    await conn.sql`update members.pensa_operations
      set status = 'queued', attempts = 0, error = null, calls = 24,
        input = jsonb_set(input, '{roundStartCalls}', '20'::jsonb)
      where id = ${op}`
    expect(await repo.claim(who, id, op, randomUUID(), now)).toBeNull()
    const [row] = await conn.sql<Array<{ status: string }>>`
      select status from members.pensa_operations where id = ${op}`
    expect(row?.status).toBe('failed')
  })

  test('o nome provisório não troca um nome que a criança já deu', async () => {
    const who = actor()
    const id = (await repo.create(who, randomUUID(), now)).project.id
    await repo.rename(who, id, 'Meu dragão', now)
    const op = randomUUID()
    const view = await repo.get(who, id)
    await repo.start(
      who,
      id,
      {
        id: op,
        expectedRevision: view.journey.revision,
        message: 'Dragão',
        kind: 'planning',
        context: {},
      },
      now,
    )
    const lease = randomUUID()
    await repo.claim(who, id, op, lease, now)
    await repo.publish(
      who,
      id,
      op,
      lease,
      { type: 'question', text: 'O que ele faz?', workingTitle: 'O voo do dragão' },
      now,
    )
    expect((await repo.get(who, id)).project.name).toBe('Meu dragão')
  })

  test('uma colega retoma e publica a ajuda usando a reserva e o teto de quem pediu', async () => {
    const owner = actor(),
      member = actor(),
      op = randomUUID(),
      lease = randomUUID()
    const project = await repo.create(owner, randomUUID(), now)
    await join(project.project.id, owner, member)
    await repo.start(
      owner,
      project.project.id,
      { id: op, expectedRevision: 0, message: 'Como começo?', kind: 'help', context: {} },
      now,
    )
    expect(await repo.claim(member, project.project.id, op, lease, now)).toMatchObject({
      input: { requesterProfileId: owner.profileId },
    })
    await repo.publish(
      member,
      project.project.id,
      op,
      lease,
      { type: 'answer', text: 'Abra o Estúdio.' },
      now,
    )
    const usage =
      await conn.sql`select account_id, used from members.ai_usage_daily where account_id in (${owner.accountId}, ${member.accountId})`
    expect(usage.map((row) => ({ accountId: row.account_id, used: row.used }))).toEqual([
      { accountId: owner.accountId, used: 1 },
    ])
    const calls =
      await conn.sql`select account_id, calls from members.pensa_provider_usage where account_id in (${owner.accountId}, ${member.accountId})`
    expect(calls.map((row) => ({ accountId: row.account_id, calls: row.calls }))).toEqual([
      { accountId: owner.accountId, calls: 1 },
    ])
  })

  test('uma colega responde à pergunta e aceita a proposta iniciada pela dona, até após a reserva vencer', async () => {
    const owner = actor(),
      member = actor(),
      op = randomUUID()
    const project = await repo.create(owner, randomUUID(), now)
    const id = project.project.id
    await join(id, owner, member)
    await repo.start(
      owner,
      id,
      { id: op, expectedRevision: 0, message: 'Gato', kind: 'planning', context: {} },
      now,
    )
    let lease = randomUUID()
    await repo.claim(owner, id, op, lease, now)
    await repo.publish(owner, id, op, lease, { type: 'question', text: 'O gato vai andar?' }, now)
    let view = await repo.get(member, id)
    const later = new Date(now.getTime() + 31 * 60_000)
    await repo.start(
      member,
      id,
      {
        id: randomUUID(),
        expectedRevision: view.journey.revision,
        message: 'Sim',
        kind: 'planning',
        context: {},
      },
      later,
    )
    lease = randomUUID()
    expect(await repo.claim(member, id, op, lease, later)).toMatchObject({
      input: { requesterProfileId: member.profileId },
    })
    await repo.publish(member, id, op, lease, { type: 'step', step: 'review', output: {} }, later)
    lease = randomUUID()
    await repo.claim(member, id, op, lease, later)
    const card = proposal(member)
    await repo.publish(member, id, op, lease, { type: 'proposal', proposal: card }, later)
    view = await repo.get(member, id)
    await repo.command(
      member,
      id,
      view.journey.revision,
      { type: 'accept', proposalId: card.id },
      later,
    )
    lease = randomUUID()
    await repo.claim(member, id, op, lease, later)
    await repo.publish(member, id, op, lease, { type: 'plan', tasks: [studioTask()] }, later)
    expect((await repo.get(owner, id)).journey.stage).toBe('building')
    const [reservation] =
      await conn.sql`select account_id, profile_id, status from members.ai_usage_reservations where id = ${op}`
    expect(reservation).toMatchObject({
      account_id: owner.accountId,
      profile_id: owner.profileId,
      status: 'committed',
    })
  })

  test('retomar pela equipe respeita o teto de chamadas da conta original', async () => {
    const owner = actor(),
      member = actor(),
      op = randomUUID()
    const project = await repo.create(owner, randomUUID(), now)
    await join(project.project.id, owner, member)
    await repo.start(
      owner,
      project.project.id,
      { id: op, expectedRevision: 0, message: 'Ajude', kind: 'help', context: {} },
      now,
    )
    await conn.sql`insert into members.pensa_provider_usage (account_id,day,calls,updated_at) values (${owner.accountId},'2026-10-14',60,${now.toISOString()})`
    expect(await repo.claim(member, project.project.id, op, randomUUID(), now)).toBeNull()
    expect((await repo.get(member, project.project.id)).operation?.status).toBe('failed')
  })

  test('privilégio de quem retoma não aumenta a cota de uma reserva vencida da criança', async () => {
    const owner = actor(),
      member = { ...actor(), privileged: true },
      op = randomUUID()
    const project = await repo.create(owner, randomUUID(), now)
    await join(project.project.id, owner, member)
    await repo.start(
      owner,
      project.project.id,
      { id: op, expectedRevision: 0, message: 'Ajude', kind: 'help', context: {} },
      now,
    )
    await conn.sql`insert into members.ai_usage_daily (account_id, day, feature, used, privileged, updated_at) values (${owner.accountId}, '2026-10-14', 'describe', 2, false, ${now.toISOString()})`
    const later = new Date(now.getTime() + 31 * 60_000)
    expect(await repo.claim(member, project.project.id, op, randomUUID(), later)).toBeNull()
    expect((await repo.get(member, project.project.id)).operation?.error).toContain(
      'limite de ajuda',
    )
  })

  test('duas contas retomam os pedidos uma da outra sem inverter a ordem das travas', async () => {
    const a = actor(),
      b = actor()
    const pa = await repo.create(a, randomUUID(), now),
      pb = await repo.create(b, randomUUID(), now)
    await join(pa.project.id, a, b)
    await join(pb.project.id, b, a)
    const oa = randomUUID(),
      ob = randomUUID()
    await repo.start(
      a,
      pa.project.id,
      { id: oa, expectedRevision: 0, message: 'A', kind: 'help', context: {} },
      now,
    )
    await repo.start(
      b,
      pb.project.id,
      { id: ob, expectedRevision: 0, message: 'B', kind: 'help', context: {} },
      now,
    )
    const claimed = await Promise.all([
      repo.claim(b, pa.project.id, oa, randomUUID(), now),
      repo.claim(a, pb.project.id, ob, randomUUID(), now),
    ])
    expect(claimed.filter(Boolean)).toHaveLength(2)
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
  /** Testa a versão guardada, conclui e começa a próxima (o `increment`). */
  async function nextVersion(who: PensaJourneyActor, id: string, itemId: string) {
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
    return repo.get(who, id)
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
    let view = await nextVersion(who, id, itemId)
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
  test('versão nova: a proposta nova não apaga o jogo construído (15/10/2026)', async () => {
    const { who, view: first, itemId } = await playable()
    const id = first.project.id,
      checkpointId = randomUUID()
    await repo.protect(
      who,
      id,
      { type: 'prepare', id: checkpointId, expectedRevision: first.journey.revision },
      now,
    )
    await repo.protect(who, id, { type: 'commit', id: checkpointId }, now)
    let view = await nextVersion(who, id, itemId)
    const built = { proposal: { title: 'Gato na lua' }, extensionIds: ['game-2d'] }
    expect(view.journey.built).toMatchObject(built)
    // Só o que diz o que o jogo tem: o retrato dos recursos não fica duas vezes na jornada.
    expect(view.journey.built?.proposal).not.toHaveProperty('capabilities')
    const op = randomUUID()
    await repo.start(
      who,
      id,
      {
        id: op,
        expectedRevision: view.journey.revision,
        message: 'Um chapéu',
        kind: 'planning',
        context: {},
      },
      now,
    )
    let lease = randomUUID()
    await repo.claim(who, id, op, lease, now)
    await repo.publish(who, id, op, lease, { type: 'step', step: 'review', output: {} }, now)
    lease = randomUUID()
    await repo.claim(who, id, op, lease, now)
    const next = { ...proposal(who), title: 'Gato de chapéu' }
    await repo.publish(who, id, op, lease, { type: 'proposal', proposal: next }, now)
    view = await repo.get(who, id)
    expect(view.journey.proposal?.title).toBe('Gato de chapéu')
    expect(view.journey.built).toMatchObject(built)
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
      service.execute(who, 'kids', taskId, {
        status: 'completed',
        completedCriteriaIds: ['test'],
        outputRef: { kind: 'studio_project', projectId: itemId, saveRevision: '0' },
      }),
    ).rejects.toThrow('Seu jogo mudou')
    const result = await service.execute(who, 'kids', taskId, {
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
