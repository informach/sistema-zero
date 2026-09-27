import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePensaRepository } from '../../src/infrastructure/persistence/drizzle/pensa.repository'
import { prepareTestDatabase } from './test-database'

const TEST_DB_NAME = 'sistemazero_pensa_team_test'

const testDatabaseUrl = await prepareTestDatabase(TEST_DB_NAME)
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — teste da equipe do Pensa PULADO.')
}

/**
 * O SQL que decide TODA a autorização da equipe do Pensa (`accessibleProject`: dono OU membro
 * de plano ativo; `accessColumns`: `isOwner` e a contagem de convidados), mais a gravação
 * trancada do `addMember` e a colisão do código, rodando no Postgres REAL. Até aqui só o fake
 * in-memory exercitava essa régua; o subselect correlacionado e os casts `::uuid` são os pontos
 * em que o fake não prova nada.
 *
 * ⚠️ Como no teste do Como fazer: nada de `expect(...).rejects` com o driver `postgres` (trava a
 * conexão no bun test); erro esperado vai num try/catch.
 */
describe.skipIf(!testDatabaseUrl)('Drizzle da equipe do Pensa no Postgres real', () => {
  let conn: DbConnection
  let repo: DrizzlePensaRepository
  const now = new Date('2026-09-26T12:00:00.000Z')

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    // ⚠️ Banco COMPARTILHADO entre os arquivos de tests/db (o `user-data-purge` cria uma
    // `pensa_projects` enxuta): toda coluna aparece no `create` E no `add column if not exists`.
    await conn.sql.unsafe(`
      create table if not exists members.pensa_projects (
        id uuid primary key,
        user_id uuid not null,
        account_id uuid not null,
        audience text not null default 'kids',
        kind text not null default 'game',
        name varchar(120) not null default '',
        status text not null default 'active',
        share_code varchar(8),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`)
    for (const column of [
      'account_id uuid',
      "audience text not null default 'kids'",
      "kind text not null default 'game'",
      "name varchar(120) not null default ''",
      "status text not null default 'active'",
      'share_code varchar(8)',
      'created_at timestamptz not null default now()',
      'updated_at timestamptz not null default now()',
    ]) {
      await conn.sql.unsafe(`alter table members.pensa_projects add column if not exists ${column}`)
    }
    await conn.sql.unsafe(
      `create unique index if not exists pensa_projects_share_code_uq on members.pensa_projects (share_code) where share_code is not null`,
    )
    await conn.sql.unsafe(`
      create table if not exists members.pensa_project_members (
        project_id uuid not null references members.pensa_projects(id) on delete cascade,
        profile_id uuid not null,
        account_id uuid not null,
        invited_by uuid not null,
        joined_at timestamptz not null,
        primary key (project_id, profile_id)
      )`)
    await conn.sql.unsafe(`
      create table if not exists members.pensa_cycles (
        id uuid primary key,
        project_id uuid not null references members.pensa_projects(id) on delete cascade,
        number integer not null,
        goal text,
        stage text not null default 'z',
        z_completed_at timestamptz,
        e_completed_at timestamptz,
        r_completed_at timestamptz,
        o_completed_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`)
    repo = new DrizzlePensaRepository(conn.db)
  })

  afterAll(async () => {
    await conn?.close()
  })

  async function plan(owner: string, name = 'Nave Zero') {
    const id = randomUUID()
    const cycleId = randomUUID()
    await repo.createProject(
      { id, userId: owner, accountId: randomUUID(), audience: 'kids', kind: 'game', name },
      { id: cycleId, projectId: id, number: 1, goal: null },
      now,
    )
    return { id, cycleId }
  }

  async function enableShare(projectId: string): Promise<string> {
    const code = randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()
    expect(await repo.setShareCode(projectId, code, now)).toBe(true)
    return code
  }

  test('dono, membro e estranho: findProject, findCycleWithProject e listActiveProjects', async () => {
    const owner = randomUUID()
    const member = randomUUID()
    const stranger = randomUUID()
    const { id, cycleId } = await plan(owner)
    const code = await enableShare(id)

    // Antes do convite: só o dono vê.
    expect((await repo.findProject(id, owner, 'kids'))?.role).toBe('owner')
    expect(await repo.findProject(id, member, 'kids')).toBeNull()

    expect(
      await repo.addMember(
        { projectId: id, profileId: member, accountId: randomUUID(), invitedBy: owner },
        now,
        5,
        code,
      ),
    ).toBe('added')

    const asOwner = await repo.findProject(id, owner, 'kids')
    expect(asOwner).toMatchObject({ role: 'owner', memberCount: 1 })
    const asMember = await repo.findProject(id, member, 'kids')
    expect(asMember).toMatchObject({ role: 'member', memberCount: 1 })
    expect(await repo.findProject(id, stranger, 'kids')).toBeNull()
    // Outra vitrine não alcança, mesmo sendo o dono.
    expect(await repo.findProject(id, owner, 'adult')).toBeNull()

    expect((await repo.findCycleWithProject(cycleId, member, 'kids'))?.project.role).toBe('member')
    expect(await repo.findCycleWithProject(cycleId, stranger, 'kids')).toBeNull()

    const listedForMember = await repo.listActiveProjects(member, 'kids')
    expect(listedForMember.map((row) => row.project.id)).toContain(id)
    expect(listedForMember.find((row) => row.project.id === id)?.project.role).toBe('member')
    expect(
      (await repo.listActiveProjects(stranger, 'kids')).map((r) => r.project.id),
    ).not.toContain(id)
    // A cota de criar é do dono: o plano não conta para o membro.
    expect(await repo.countActiveProjects(member, 'kids')).toBe(0)
    expect(await repo.countMemberships(member, 'kids')).toBe(1)
  })

  test('plano ARQUIVADO some para o membro e segue com o dono', async () => {
    const owner = randomUUID()
    const member = randomUUID()
    const { id } = await plan(owner)
    const code = await enableShare(id)
    await repo.addMember(
      { projectId: id, profileId: member, accountId: randomUUID(), invitedBy: owner },
      now,
      5,
      code,
    )
    await repo.updateProject(id, { status: 'archived' }, now)
    expect(await repo.findProject(id, member, 'kids')).toBeNull()
    expect((await repo.findProject(id, owner, 'kids'))?.status).toBe('archived')
    expect(await repo.countMemberships(member, 'kids')).toBe(0)
  })

  test('addMember: duplicidade volta "duplicate", teto volta "full", e removeMember diz se tirou', async () => {
    const owner = randomUUID()
    const { id } = await plan(owner)
    const code = await enableShare(id)
    const first = randomUUID()
    const join = (profileId: string, max = 2) =>
      repo.addMember(
        { projectId: id, profileId, accountId: randomUUID(), invitedBy: owner },
        now,
        max,
        code,
      )
    expect(await join(first)).toBe('added')
    expect(await join(first)).toBe('duplicate')
    expect(await join(randomUUID())).toBe('added')
    expect(await join(randomUUID())).toBe('full')
    expect((await repo.listMembers(id)).length).toBe(2)
    expect(await repo.removeMember(id, first, now)).toBe(true)
    expect(await repo.removeMember(id, first, now)).toBe(false)
    expect((await repo.findProject(id, owner, 'kids'))?.memberCount).toBe(1)
  })

  test('um convite revogado ou um plano arquivado não aceita ingresso após a leitura inicial', async () => {
    const owner = randomUUID()
    const { id } = await plan(owner)
    const code = randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()
    expect(await repo.setShareCode(id, code, now)).toBe(true)

    await repo.setShareCode(id, null, now)
    expect(
      await repo.addMember(
        { projectId: id, profileId: randomUUID(), accountId: randomUUID(), invitedBy: owner },
        now,
        5,
        code,
      ),
    ).toBe('invite_invalid')

    await repo.setShareCode(id, code, now)
    await repo.updateProject(id, { status: 'archived' }, now)
    expect(
      await repo.addMember(
        { projectId: id, profileId: randomUUID(), accountId: randomUUID(), invitedBy: owner },
        now,
        5,
        code,
      ),
    ).toBe('invite_invalid')
    expect(await repo.listMembers(id)).toEqual([])
  })

  test('setShareCode: o código de OUTRO plano volta false (índice único parcial), null sempre grava', async () => {
    const a = await plan(randomUUID())
    const b = await plan(randomUUID())
    const code = `Q${randomUUID()
      .replaceAll(/[^A-Z0-9]/gi, '')
      .slice(0, 5)
      .toUpperCase()}`
    expect(await repo.setShareCode(a.id, code, now)).toBe(true)
    expect(await repo.setShareCode(b.id, code, now)).toBe(false)
    expect((await repo.findProjectByShareCode(code))?.id).toBe(a.id)
    // Dois planos sem código convivem.
    expect(await repo.setShareCode(a.id, null, now)).toBe(true)
    expect(await repo.setShareCode(b.id, null, now)).toBe(true)
    expect(await repo.findProjectByShareCode(code)).toBeNull()
  })

  test('apagar o plano leva a equipe pela cascata', async () => {
    const owner = randomUUID()
    const member = randomUUID()
    const { id } = await plan(owner)
    const code = await enableShare(id)
    await repo.addMember(
      { projectId: id, profileId: member, accountId: randomUUID(), invitedBy: owner },
      now,
      5,
      code,
    )
    await repo.deleteProject(id, owner, 'kids')
    expect(await repo.listMembers(id)).toEqual([])
    expect(await repo.countMemberships(member, 'kids')).toBe(0)
  })
})
