/**
 * "Guardado na sua conta" — o ÍNDICE das criações (Estúdio Completo/Pinta):
 * reservar → confirmar → listar → baixar → apagar, o gate de posse, a quota, a
 * revisão vencida, o isolamento por dono — e as regras que a revisão de 18/08
 * fixou: nada do que a lista mostra muda antes do commit, reservas concorrentes
 * nunca dividem chave, os bytes do commit são os da reserva, o commit é
 * idempotente, e as respostas nunca vazam o registro interno.
 */
import { describe, expect, test } from 'bun:test'
import { CREATION_LIMITS } from '../../src/domain/creations/creation'
import {
  PALETTE_LIBRARY_ITEM_ID,
  PALETTE_LIBRARY_KIND,
} from '../../src/domain/creations/palette-library'
import { buildApp, grantCommunity, grantLifetime } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const ACCOUNT = '33333333-3333-3333-3333-333333333333'
const OTHER = '22222222-2222-2222-2222-222222222222'
type Ctx = ReturnType<typeof buildApp>

/** Sessão de PERFIL kids: o perfil é o dono dos dados, a conta é quem tem a posse. */
const kidHeaders = {
  'x-auth-user-id': USER,
  'x-auth-account-id': ACCOUNT,
  'content-type': 'application/json',
}
const otherHeaders = { 'x-auth-user-id': OTHER, 'content-type': 'application/json' }

const req = (
  app: Ctx['app'],
  method: string,
  path: string,
  body?: unknown,
  customHeaders: Record<string, string> = kidHeaders,
) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: customHeaders,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  )

const json = (response: Response): Promise<any> => response.json()

/** Conta com o Estúdio Completo (via a Comunidade dos Criadores) e o Pinta (compra avulsa). */
function buildWithTools(opts: Parameters<typeof buildApp>[0] = {}) {
  const ctx = buildApp(opts)
  grantCommunity(ctx.entitlements, { userId: ACCOUNT, communityKey: 'estudio-completo' })
  grantLifetime(ctx.entitlements, { userId: ACCOUNT, courseRef: 'pinta' })
  return ctx
}

const uploadBody = (over: Partial<Record<string, unknown>> = {}) => ({
  name: 'Nave Zero',
  kind: 'classic',
  itemUpdatedAt: '2026-08-18T12:00:00.000Z',
  bytes: 1234,
  ...over,
})

const reserve = (ctx: Ctx, tool: string, itemId: string, over = {}) =>
  req(ctx.app, 'POST', `/members/creations/${tool}/${itemId}/upload`, uploadBody(over))

const commit = (ctx: Ctx, tool: string, itemId: string, revision: number, extra = {}) =>
  req(ctx.app, 'POST', `/members/creations/${tool}/${itemId}/commit`, { revision, ...extra })

/** Hash de conteúdo fictício (64 hex), estável e ÚNICO por rótulo (sem colisão `p1`/`p10`). */
const hashOf = (label: string) => {
  let h = 0
  for (const ch of label) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return `${h.toString(16).padStart(8, '0')}${label.length.toString(16).padStart(2, '0')}`
    .padEnd(64, 'a')
    .slice(0, 64)
}

const listOf = async (ctx: Ctx, tool: string) =>
  (await json(await req(ctx.app, 'GET', `/members/creations/${tool}`))).items as any[]

async function saveItem(ctx: Ctx, tool: string, itemId: string, over = {}) {
  const reserved = await reserve(ctx, tool, itemId, over)
  expect(reserved.status).toBe(200)
  const ticket = await json(reserved)
  const committed = await commit(ctx, tool, itemId, ticket.revision)
  expect(committed.status).toBe(200)
  const body = await json(committed)
  return { ticket, item: body.item, previousStorageKey: body.previousStorageKey }
}

/** Só os campos públicos — o contrato que o BFF repassa ao navegador. */
const PUBLIC_FIELDS = [
  'tool',
  'itemId',
  'name',
  'kind',
  'itemUpdatedAt',
  'revision',
  'bytes',
  'thumb',
  'syncedAt',
].sort()

describe('criações guardadas na conta — HTTP', () => {
  test('JWT antigo da conta excluída não consegue recriar dados', async () => {
    const ctx = buildWithTools({ deletedAccountIds: [ACCOUNT] })

    const response = await reserve(ctx, 'studio', 'projeto-fantasma')

    expect(response.status).toBe(403)
    expect((await json(response)).error).toMatchObject({
      code: 'FORBIDDEN',
      message: 'Esta conta está em processo de exclusão.',
    })
    expect(await listOf(ctx, 'studio')).toHaveLength(0)
  })

  test('reservar → confirmar → listar → baixar: a chave do R2 leva perfil, ferramenta, item e revisão', async () => {
    const ctx = buildWithTools()
    const { ticket, item, previousStorageKey } = await saveItem(
      ctx,
      'studio',
      '01J0000000000000000000ABCD',
    )
    expect(ticket.revision).toBe(1)
    expect(ticket.storageKey).toBe(`creations/${USER}/studio/01J0000000000000000000ABCD/1.json.gz`)
    expect(item.revision).toBe(1)
    expect(item.name).toBe('Nave Zero')
    expect(previousStorageKey).toBeNull()

    const list = await req(ctx.app, 'GET', '/members/creations/studio')
    expect(list.status).toBe(200)
    const items = (await json(list)).items
    expect(items).toHaveLength(1)
    expect(items[0].itemId).toBe('01J0000000000000000000ABCD')
    expect(items[0].bytes).toBe(1234)

    const download = await req(
      ctx.app,
      'GET',
      '/members/creations/studio/01J0000000000000000000ABCD/download',
    )
    expect(download.status).toBe(200)
    expect((await json(download)).storageKey).toBe(ticket.storageKey)

    // A outra ferramenta continua vazia: o índice é por ferramenta.
    const pinta = await req(ctx.app, 'GET', '/members/creations/pinta')
    expect((await json(pinta)).items).toHaveLength(0)
  })

  test('as respostas de commit e download só levam os campos públicos (nada de userId, accountId, storageRef)', async () => {
    const ctx = buildWithTools()
    const { item } = await saveItem(ctx, 'studio', 'proj-1')
    expect(Object.keys(item).sort()).toEqual(PUBLIC_FIELDS)
    const download = await json(
      await req(ctx.app, 'GET', '/members/creations/studio/proj-1/download'),
    )
    expect(Object.keys(download.summary).sort()).toEqual(PUBLIC_FIELDS)
    const list = await listOf(ctx, 'studio')
    expect(Object.keys(list[0]).sort()).toEqual(PUBLIC_FIELDS)
  })

  test('reenviar o mesmo item sobe a revisão e troca a chave; a lista mostra a corrente; o commit devolve a chave anterior', async () => {
    const ctx = buildWithTools()
    const first = await saveItem(ctx, 'pinta', 'a1b2c3d4-0000-4000-8000-000000000001')
    const second = await saveItem(ctx, 'pinta', 'a1b2c3d4-0000-4000-8000-000000000001', {
      name: 'nave-2',
      kind: 'pixel-sprite',
      bytes: 999,
    })
    expect(second.ticket.revision).toBe(2)
    expect(second.ticket.storageKey.endsWith('/2.json.gz')).toBe(true)
    // O BFF apaga a revisão anterior no R2 com esta chave.
    expect(second.previousStorageKey).toBe(first.ticket.storageKey)
    const items = await listOf(ctx, 'pinta')
    expect(items).toHaveLength(1)
    expect(items[0].revision).toBe(2)
    expect(items[0].name).toBe('nave-2')
    expect(items[0].bytes).toBe(999)
  })

  test('a RESERVA não muda nada do que a lista mostra: nome, updatedAt e bytes só trocam no commit', async () => {
    const ctx = buildWithTools()
    await saveItem(ctx, 'studio', 'proj-1', {
      name: 'Versão 1',
      itemUpdatedAt: '2026-08-18T10:00:00.000Z',
      bytes: 100,
    })
    // Reserva a versão 2 (o PUT "não terminou": sem commit).
    const reserved = await reserve(ctx, 'studio', 'proj-1', {
      name: 'Versão 2',
      itemUpdatedAt: '2026-08-18T11:00:00.000Z',
      bytes: 200,
    })
    expect(reserved.status).toBe(200)
    const [item] = await listOf(ctx, 'studio')
    expect(item.name).toBe('Versão 1')
    expect(item.itemUpdatedAt).toBe('2026-08-18T10:00:00.000Z')
    expect(item.bytes).toBe(100)
    expect(item.revision).toBe(1)
    const download = await json(
      await req(ctx.app, 'GET', '/members/creations/studio/proj-1/download'),
    )
    expect(download.storageKey.endsWith('/1.json.gz')).toBe(true)
    expect(download.summary.itemUpdatedAt).toBe('2026-08-18T10:00:00.000Z')

    // Agora o commit chega: tudo promovido de uma vez.
    const committed = await commit(ctx, 'studio', 'proj-1', (await json(reserved)).revision)
    expect(committed.status).toBe(200)
    const [after] = await listOf(ctx, 'studio')
    expect(after.name).toBe('Versão 2')
    expect(after.itemUpdatedAt).toBe('2026-08-18T11:00:00.000Z')
    expect(after.bytes).toBe(200)
    expect(after.revision).toBe(2)
  })

  test('reserva SEM confirmar não aparece na lista; confirmar uma revisão que não é a reservada é 409', async () => {
    const ctx = buildWithTools()
    const reserved = await reserve(ctx, 'studio', 'proj-1')
    expect(reserved.status).toBe(200)
    expect(await listOf(ctx, 'studio')).toHaveLength(0)

    // Um commit velho (revisão 7) não vira corrente.
    const stale = await commit(ctx, 'studio', 'proj-1', 7)
    expect(stale.status).toBe(409)
    expect((await json(stale)).error.code).toBe('CREATION_REVISION_MISMATCH')

    // Baixar o que nunca confirmou é 404.
    const download = await req(ctx.app, 'GET', '/members/creations/studio/proj-1/download')
    expect(download.status).toBe(404)
  })

  test('duas reservas sem commit entre elas recebem revisões (e chaves) DIFERENTES; só a última confirma', async () => {
    const ctx = buildWithTools()
    await saveItem(ctx, 'studio', 'proj-1')
    // Navegador A reserva; navegador B reserva antes de A commitar.
    const a = await json(await reserve(ctx, 'studio', 'proj-1', { name: 'de A' }))
    const b = await json(await reserve(ctx, 'studio', 'proj-1', { name: 'de B' }))
    expect(a.revision).toBe(2)
    expect(b.revision).toBe(3)
    expect(a.storageKey).not.toBe(b.storageKey)
    // O commit de A perdeu a vez (B reservou depois): 409, e A reenvia.
    expect((await commit(ctx, 'studio', 'proj-1', a.revision)).status).toBe(409)
    expect((await commit(ctx, 'studio', 'proj-1', b.revision)).status).toBe(200)
    const [item] = await listOf(ctx, 'studio')
    expect(item.revision).toBe(3)
    expect(item.name).toBe('de B')
    // A próxima reserva continua contando a partir do MAIOR já reservado.
    const c = await json(await reserve(ctx, 'studio', 'proj-1'))
    expect(c.revision).toBe(4)
  })

  test('PARTES: a reserva devolve só as que FALTAM (com PUT a assinar); parte faltante sem bytes é 409 CREATION_PARTS_NEED_BYTES sem reservar nada; bytes de hash conhecido são os do servidor', async () => {
    const ctx = buildWithTools()
    const A = hashOf('a')
    const B = hashOf('b')
    // 1ª revisão: manifesto + duas partes novas (com bytes). O ticket assina as DUAS.
    const first = await reserve(ctx, 'studio', 'jogo', {
      bytes: 100,
      parts: [
        { hash: A, bytes: 1000 },
        { hash: B, bytes: 2000 },
      ],
    })
    expect(first.status).toBe(200)
    const ticket1 = await json(first)
    expect(ticket1.parts.map((p: { hash: string }) => p.hash).sort()).toEqual([A, B].sort())
    // A chave leva a REVISÃO em que a parte subiu (`<hash>.<rev>.gz`): nunca é reutilizada.
    expect(ticket1.parts[0].storageKey).toMatch(
      /^creations\/.+\/studio\/jogo\/parts\/[a-f0-9]{64}\.1\.gz$/,
    )
    // Commit SEM confirmar as partes enviadas: 409 CREATION_PART_MISSING, e a reserva fica viva.
    const incomplete = await commit(ctx, 'studio', 'jogo', ticket1.revision)
    expect(incomplete.status).toBe(409)
    const incompleteBody = await json(incomplete)
    expect(incompleteBody.error.code).toBe('CREATION_PART_MISSING')
    expect([...incompleteBody.details.hashes].sort()).toEqual([A, B].sort())
    const committed1 = await commit(ctx, 'studio', 'jogo', ticket1.revision, {
      uploadedParts: [A, B],
    })
    expect(committed1.status).toBe(200)
    const body1 = await json(committed1)
    // `bytes` do item = TOTAL (manifesto + partes).
    expect(body1.item.bytes).toBe(3100)
    expect(body1.releasedStorageKeys).toEqual([])
    // 2ª revisão: só o programa mudou — as partes conhecidas vêm SEM bytes e nada falta.
    const second = await reserve(ctx, 'studio', 'jogo', {
      bytes: 120,
      parts: [{ hash: A }, { hash: B }],
    })
    expect(second.status).toBe(200)
    const ticket2 = await json(second)
    expect(ticket2.parts).toEqual([])
    const committed2 = await commit(ctx, 'studio', 'jogo', ticket2.revision)
    expect(committed2.status).toBe(200)
    const body2 = await json(committed2)
    expect(body2.item.bytes).toBe(3120)
    // Soltou só o manifesto anterior (as partes continuam referenciadas).
    expect(body2.releasedStorageKeys).toEqual([ticket1.storageKey])
    // 3ª revisão: trocou um desenho — B sai, C entra. Faltante SEM bytes → 409 e nada reservado.
    const C = hashOf('c')
    const needBytes = await reserve(ctx, 'studio', 'jogo', {
      bytes: 130,
      parts: [{ hash: A }, { hash: C }],
    })
    expect(needBytes.status).toBe(409)
    const needBody = await json(needBytes)
    expect(needBody.error.code).toBe('CREATION_PARTS_NEED_BYTES')
    expect(needBody.details.hashes).toEqual([C])
    // …nada reservado: um commit da "revisão 3" é mismatch.
    expect((await commit(ctx, 'studio', 'jogo', 3)).status).toBe(409)
    const third = await reserve(ctx, 'studio', 'jogo', {
      bytes: 130,
      // Bytes declarados para A (conhecida) são IGNORADOS: valem os do servidor (1000).
      parts: [
        { hash: A, bytes: 999_999 },
        { hash: C, bytes: 300 },
      ],
    })
    expect(third.status).toBe(200)
    const ticket3 = await json(third)
    expect(ticket3.parts.map((p: { hash: string }) => p.hash)).toEqual([C])
    const committed3 = await commit(ctx, 'studio', 'jogo', ticket3.revision, {
      uploadedParts: [C],
    })
    expect(committed3.status).toBe(200)
    const body3 = await json(committed3)
    expect(body3.item.bytes).toBe(130 + 1000 + 300)
    // Soltou o manifesto anterior E a parte B (não referenciada mais; B subiu na revisão 1).
    expect([...body3.releasedStorageKeys].sort()).toEqual(
      [ticket2.storageKey, `creations/${USER}/studio/jogo/parts/${B}.1.gz`].sort(),
    )
    // Download lista as partes correntes (A da revisão 1, C da revisão 3) com as chaves.
    const download = await json(
      await req(ctx.app, 'GET', '/members/creations/studio/jogo/download'),
    )
    expect(download.parts.map((p: { hash: string }) => p.hash)).toEqual([A, C])
    expect(download.parts[0].storageKey).toBe(`creations/${USER}/studio/jogo/parts/${A}.1.gz`)
    expect(download.parts[1].storageKey).toBe(`creations/${USER}/studio/jogo/parts/${C}.3.gz`)
    // Cliente ANTIGO (sem partes) sobe o projeto inteiro: o commit solta TODAS as partes.
    const legacy = await json(await reserve(ctx, 'studio', 'jogo', { bytes: 5000 }))
    const legacyCommit = await json(await commit(ctx, 'studio', 'jogo', legacy.revision))
    expect([...legacyCommit.releasedStorageKeys].sort()).toEqual(
      [
        ticket3.storageKey,
        `creations/${USER}/studio/jogo/parts/${A}.1.gz`,
        `creations/${USER}/studio/jogo/parts/${C}.3.gz`,
      ].sort(),
    )
    expect(legacyCommit.item.bytes).toBe(5000)
    // B volta ao item: como foi SOLTA, sobe de novo com chave NOVA (revisão 5) — o apagar
    // atrasado da antiga (`.1.gz`) nunca alcança a cópia nova.
    const back = await json(
      await reserve(ctx, 'studio', 'jogo', { bytes: 10, parts: [{ hash: B, bytes: 2000 }] }),
    )
    expect(back.parts[0].storageKey).toBe(`creations/${USER}/studio/jogo/parts/${B}.5.gz`)
    await commit(ctx, 'studio', 'jogo', back.revision, { uploadedParts: [B] })
    // A lixeira devolve tudo o que soltou (manifesto + partes correntes).
    const withParts = await json(
      await reserve(ctx, 'studio', 'jogo2', { bytes: 10, parts: [{ hash: A, bytes: 5 }] }),
    )
    await commit(ctx, 'studio', 'jogo2', withParts.revision, { uploadedParts: [A] })
    const del = await json(
      await req(ctx.app, 'DELETE', '/members/creations/studio/jogo2', {
        baseRevision: withParts.revision,
      }),
    )
    expect(del.deleted).toBe(true)
    expect([...del.storageKeys].sort()).toEqual(
      [withParts.storageKey, `creations/${USER}/studio/jogo2/parts/${A}.1.gz`].sort(),
    )
  })

  test('PARTES: validações (129 partes, hash inválido, hash repetido) são 400; total manifesto + partes acima de 40 MB é 409 de quota', async () => {
    const ctx = buildWithTools()
    const many = Array.from({ length: 129 }, (_, i) => ({ hash: hashOf(`p${i}`), bytes: 1 }))
    expect((await reserve(ctx, 'studio', 'x', { bytes: 1, parts: many })).status).toBe(400)
    expect(
      (await reserve(ctx, 'studio', 'x', { bytes: 1, parts: [{ hash: 'zz', bytes: 1 }] })).status,
    ).toBe(400)
    expect(
      (
        await reserve(ctx, 'studio', 'x', {
          bytes: 1,
          parts: [
            { hash: hashOf('d'), bytes: 1 },
            { hash: hashOf('d'), bytes: 1 },
          ],
        })
      ).status,
    ).toBe(400)
    const tooBig = await reserve(ctx, 'studio', 'x', {
      bytes: 1,
      parts: [
        { hash: hashOf('e'), bytes: 30 * 1024 * 1024 },
        { hash: hashOf('f'), bytes: 11 * 1024 * 1024 },
      ],
    })
    expect(tooBig.status).toBe(409)
    expect((await json(tooBig)).error.code).toBe('CREATION_QUOTA_EXCEEDED')
  })

  test('revisão-base: um aparelho atrasado NÃO passa por cima do que outro subiu depois (409 CREATION_STALE_BASE)', async () => {
    const ctx = buildWithTools()
    // Item novo com base 0 (nunca visto): passa.
    const first = await reserve(ctx, 'studio', 'proj-1', { baseRevision: 0 })
    expect(first.status).toBe(200)
    expect((await commit(ctx, 'studio', 'proj-1', (await json(first)).revision)).status).toBe(200)
    // Aparelho B baixou a revisão 1 e edita: base 1 → passa e vira a revisão 2.
    const b = await reserve(ctx, 'studio', 'proj-1', { baseRevision: 1 })
    expect(b.status).toBe(200)
    expect((await commit(ctx, 'studio', 'proj-1', (await json(b)).revision)).status).toBe(200)
    // Aparelho A ainda acha que a corrente é a 1 → 409 (a versão de B não é sobrescrita).
    const stale = await reserve(ctx, 'studio', 'proj-1', { baseRevision: 1 })
    expect(stale.status).toBe(409)
    expect((await json(stale)).error.code).toBe('CREATION_STALE_BASE')
    // Aparelho que nunca viu o item (base 0) mas o item já existe: também 409 — vira conflito
    // do lado dele (guarda a versão da nuvem como cópia), nunca sobrescrita.
    const fresh = await reserve(ctx, 'studio', 'proj-1', { baseRevision: 0 })
    expect(fresh.status).toBe(409)
    // Uma linha só RESERVADA (nunca confirmada) é a revisão 0: base 0 passa.
    expect((await reserve(ctx, 'studio', 'proj-3', { baseRevision: 0 })).status).toBe(200)
    expect((await reserve(ctx, 'studio', 'proj-3', { baseRevision: 0 })).status).toBe(200)
    // Sem `baseRevision` (cliente antigo) não há conferência.
    const legacy = await reserve(ctx, 'studio', 'proj-1')
    expect(legacy.status).toBe(200)
    // A linha apagada também exige a base corrente: uma edição velha não a ressuscita.
    await req(ctx.app, 'DELETE', '/members/creations/studio/proj-1', { baseRevision: 2 })
    expect((await reserve(ctx, 'studio', 'proj-1', { baseRevision: 1 })).status).toBe(409)
    const revived = await reserve(ctx, 'studio', 'proj-1', { baseRevision: 2 })
    expect(revived.status).toBe(200)
    // Base inválida é 400.
    expect((await reserve(ctx, 'studio', 'proj-2', { baseRevision: -1 })).status).toBe(400)
  })

  test('revisão-base: um DELETE atrasado não apaga uma revisão mais nova nem um item já compactado', async () => {
    const ctx = buildWithTools()
    await saveItem(ctx, 'studio', 'proj-1', { baseRevision: 0 })
    await saveItem(ctx, 'studio', 'proj-1', { baseRevision: 1 })

    const stale = await req(ctx.app, 'DELETE', '/members/creations/studio/proj-1', {
      baseRevision: 1,
    })
    const staleBody = await json(stale)
    expect({ status: stale.status, body: staleBody }).toMatchObject({
      status: 409,
      body: { error: { code: 'CREATION_STALE_BASE' } },
    })
    expect((await listOf(ctx, 'studio')).find((item) => item.itemId === 'proj-1')?.revision).toBe(2)

    const missing = await req(ctx.app, 'DELETE', '/members/creations/studio/compactado', {
      baseRevision: 4,
    })
    expect(missing.status).toBe(409)
    expect((await json(missing)).error.code).toBe('CREATION_STALE_BASE')

    const current = await req(ctx.app, 'DELETE', '/members/creations/studio/proj-1', {
      baseRevision: 2,
    })
    expect(current.status).toBe(200)
    expect(await json(current)).toMatchObject({ deleted: true, revision: 2 })
  })

  test('apagar não faz o contador voltar: depois de apagar e ressuscitar, a chave nova nunca repete a antiga', async () => {
    const ctx = buildWithTools()
    await saveItem(ctx, 'studio', 'proj-1') // rev 1
    const orphan = await json(await reserve(ctx, 'studio', 'proj-1')) // rev 2, PUT em voo
    expect(orphan.revision).toBe(2)
    await req(ctx.app, 'DELETE', '/members/creations/studio/proj-1', { baseRevision: 1 }) // cancela a reserva
    expect((await commit(ctx, 'studio', 'proj-1', orphan.revision)).status).toBe(409)
    // Ressuscita: nunca `1 + 1 = 2` de novo (o PUT órfão pode ter caído em .../2.json.gz).
    const back = await saveItem(ctx, 'studio', 'proj-1')
    expect(back.ticket.revision).toBe(3)
  })

  test('o commit é idempotente: confirmar de novo a revisão corrente é 200 (retry de um 200 perdido), MESMO com outra reserva em voo', async () => {
    const ctx = buildWithTools()
    const { ticket } = await saveItem(ctx, 'studio', 'proj-1')
    const again = await commit(ctx, 'studio', 'proj-1', ticket.revision)
    expect(again.status).toBe(200)
    const body = await json(again)
    expect(body.item.revision).toBe(1)
    expect(body.previousStorageKey).toBeNull()
    // Outra aba reservou a revisão 2 (PUT em voo). Um commit(1) repetido continua 200:
    // dizer 409 faria o BFF tratar a revisão CORRENTE como recusada e apagar o blob vivo.
    const reserved = await json(await reserve(ctx, 'studio', 'proj-1'))
    expect(reserved.revision).toBe(2)
    const repeated = await commit(ctx, 'studio', 'proj-1', 1)
    expect(repeated.status).toBe(200)
    expect((await json(repeated)).previousStorageKey).toBeNull()
    // E a reserva 2 continua válida.
    expect((await commit(ctx, 'studio', 'proj-1', 2)).status).toBe(200)
  })

  test('quota recusada no COMMIT mata a reserva: um commit(N) posterior é 409 de revisão (o cliente reserva de novo)', async () => {
    const ctx = buildWithTools()
    const perItem = CREATION_LIMITS.maxItemBytes
    const fits = Math.floor(CREATION_LIMITS.maxTotalBytes / perItem)
    // Reserva fits+1 itens ANTES de qualquer commit (cada reserva cabe sozinha).
    const tickets: number[] = []
    for (let i = 0; i <= fits; i += 1) {
      tickets.push(
        (await json(await reserve(ctx, 'studio', `lote-${i}`, { bytes: perItem }))).revision,
      )
    }
    for (let i = 0; i < fits; i += 1) {
      expect((await commit(ctx, 'studio', `lote-${i}`, tickets[i] ?? 0)).status).toBe(200)
    }
    const rejected = await commit(ctx, 'studio', `lote-${fits}`, tickets[fits] ?? 0)
    expect(rejected.status).toBe(409)
    expect((await json(rejected)).error.code).toBe('CREATION_QUOTA_EXCEEDED')
    // A criança abre espaço…
    await req(ctx.app, 'DELETE', '/members/creations/studio/lote-0', { baseRevision: 1 })
    // …mas o commit da reserva recusada NÃO promove uma chave que o BFF já apagou: 409 de revisão.
    const late = await commit(ctx, 'studio', `lote-${fits}`, tickets[fits] ?? 0)
    expect(late.status).toBe(409)
    expect((await json(late)).error.code).toBe('CREATION_REVISION_MISMATCH')
    // Reservar de novo dá revisão nova e o commit passa.
    const again = await json(await reserve(ctx, 'studio', `lote-${fits}`, { bytes: perItem }))
    expect(again.revision).toBe((tickets[fits] ?? 0) + 1)
    expect((await commit(ctx, 'studio', `lote-${fits}`, again.revision)).status).toBe(200)
  })

  test('os bytes contados na quota são os da RESERVA (o commit não recebe bytes)', async () => {
    const ctx = buildWithTools()
    const reserved = await json(await reserve(ctx, 'studio', 'proj-1', { bytes: 5000 }))
    // Um cliente malicioso tenta commitar "bytes: 1": o campo é ignorado (corpo estrito).
    const committed = await req(ctx.app, 'POST', '/members/creations/studio/proj-1/commit', {
      revision: reserved.revision,
      bytes: 1,
    })
    expect(committed.status).toBe(200)
    const [item] = await listOf(ctx, 'studio')
    expect(item.bytes).toBe(5000)
    // Bytes absurdos na reserva caem na validação, nunca em 500.
    const absurd = await reserve(ctx, 'studio', 'proj-2', { bytes: 3_000_000_000 })
    expect(absurd.status).toBeGreaterThanOrEqual(400)
    expect(absurd.status).toBeLessThan(500)
  })

  test('reservar vários itens antes dos commits não permite ultrapassar a quota', async () => {
    const ctx = buildWithTools()
    const perItem = CREATION_LIMITS.maxItemBytes
    const fits = Math.floor(CREATION_LIMITS.maxTotalBytes / perItem)
    const tickets: Array<{ itemId: string; revision: number }> = []

    // Um cliente pode obter todas as URLs antes de confirmar qualquer upload. A
    // reserva é só um ticket; a garantia final precisa existir também no commit.
    for (let index = 0; index <= fits; index += 1) {
      const itemId = `lote-${index}`
      const response = await reserve(ctx, 'studio', itemId, { bytes: perItem })
      expect(response.status).toBe(200)
      const ticket = await json(response)
      tickets.push({ itemId, revision: ticket.revision })
    }

    for (const ticket of tickets.slice(0, fits)) {
      expect((await commit(ctx, 'studio', ticket.itemId, ticket.revision)).status).toBe(200)
    }
    const rejected = await commit(
      ctx,
      'studio',
      tickets[fits]?.itemId ?? 'ausente',
      tickets[fits]?.revision ?? 0,
    )
    expect(rejected.status).toBe(409)
    expect((await json(rejected)).error.code).toBe('CREATION_QUOTA_EXCEEDED')
  })

  test('sem posse da ferramenta a reserva é 403 (listar continua livre); equipe pula o gate', async () => {
    const ctx = buildApp()
    const denied = await reserve(ctx, 'pinta', 'd-1')
    expect(denied.status).toBe(403)
    const list = await req(ctx.app, 'GET', '/members/creations/pinta')
    expect(list.status).toBe(200)

    const staff = await req(ctx.app, 'POST', '/members/creations/pinta/d-1/upload', uploadBody(), {
      ...kidHeaders,
      'x-auth-user-role': 'admin',
      'x-auth-user-status': 'active',
    })
    expect(staff.status).toBe(200)
  })

  test('molda: sem o produto a reserva é 403; com `molda` reserva e confirma um `model` (a chave leva a ferramenta)', async () => {
    const ctx = buildApp()
    // Comunidade (Estúdio) e Pinta NÃO dão o Molda: é produto vendido à parte.
    grantCommunity(ctx.entitlements, { userId: ACCOUNT, communityKey: 'estudio-completo' })
    grantLifetime(ctx.entitlements, { userId: ACCOUNT, courseRef: 'pinta' })
    const denied = await reserve(ctx, 'molda', 'm-1', { kind: 'model', name: 'casa' })
    expect(denied.status).toBe(403)
    expect((await json(denied)).error.message).toContain('Molda')
    expect(await listOf(ctx, 'molda')).toEqual([])

    // A recusa não fica no cache de posse: a compra vale na reserva seguinte.
    grantLifetime(ctx.entitlements, { userId: ACCOUNT, courseRef: 'molda' })
    const saved = await saveItem(ctx, 'molda', 'm-1', { kind: 'model', name: 'casa' })
    expect(saved.ticket.storageKey).toBe(`creations/${USER}/molda/m-1/1.json.gz`)
    expect(saved.item.tool).toBe('molda')
    expect(saved.item.kind).toBe('model')
    expect((await listOf(ctx, 'molda')).map((item) => item.itemId)).toEqual(['m-1'])
    // Cada ferramenta lista só o que é dela.
    expect(await listOf(ctx, 'pinta')).toEqual([])

    // Ferramenta que o enum não conhece não passa da borda.
    expect((await reserve(ctx, 'blender', 'm-1')).status).not.toBe(200)
  })

  test('a posse é CONSULTADA uma vez por minuto por (conta, ferramenta): reservas seguidas não batem nos entitlements; recusa não é guardada', async () => {
    const ctx = buildWithTools()
    const original = ctx.entitlements.listActiveByUser.bind(ctx.entitlements)
    let lookups = 0
    ctx.entitlements.listActiveByUser = async (userId, now) => {
      lookups += 1
      return original(userId, now)
    }
    expect((await reserve(ctx, 'pinta', 'd-1')).status).toBe(200)
    expect((await reserve(ctx, 'pinta', 'd-2')).status).toBe(200)
    expect((await reserve(ctx, 'pinta', 'd-3')).status).toBe(200)
    // Ferramenta DIFERENTE = outra chave de cache (uma consulta a mais).
    expect((await reserve(ctx, 'studio', 'p-1')).status).toBe(200)
    expect(lookups).toBe(2)
    // Sem posse: cada tentativa consulta de novo (a criança acabou de comprar e tenta outra vez).
    const denied = buildApp()
    const originalDenied = denied.entitlements.listActiveByUser.bind(denied.entitlements)
    let deniedLookups = 0
    denied.entitlements.listActiveByUser = async (userId, now) => {
      deniedLookups += 1
      return originalDenied(userId, now)
    }
    expect((await reserve(denied, 'pinta', 'd-1')).status).toBe(403)
    expect((await reserve(denied, 'pinta', 'd-1')).status).toBe(403)
    expect(deniedLookups).toBe(2)
  })

  test('matrícula REVOGADA (webhook de assinatura ou admin) invalida o cache de posse na hora: a reserva seguinte é 403, sem esperar o minuto', async () => {
    const ctx = buildApp()
    grantLifetime(ctx.entitlements, {
      userId: ACCOUNT,
      courseRef: 'pinta',
      subscriptionId: 'sub-1',
    })
    expect((await reserve(ctx, 'pinta', 'd-1')).status).toBe(200)
    // Posse em cache: mesmo que os entitlements mudem por fora, a reserva passaria por 60 s…
    const { RevokeEntitlementService } = await import(
      '../../src/application/revoke-entitlement/revoke-entitlement.service'
    )
    const revoke = new RevokeEntitlementService({
      entitlements: ctx.entitlements,
      clock: () => new Date(),
    })
    // …mas quem rebaixa a matrícula invalida o cache: 403 já na próxima reserva.
    const result = await revoke.cancel('sub-1')
    expect(result.affected).toBe(1)
    expect((await reserve(ctx, 'pinta', 'd-2')).status).toBe(403)
    // O caminho do admin (revogar/expirar uma matrícula específica) idem.
    const again = buildApp()
    const seeded = grantLifetime(again.entitlements, { userId: ACCOUNT, courseRef: 'pinta' })
    expect((await reserve(again, 'pinta', 'd-1')).status).toBe(200)
    const { ManageEntitlementService } = await import(
      '../../src/application/manage-entitlement/manage-entitlement.service'
    )
    await new ManageEntitlementService(again.entitlements, () => new Date()).execute({
      id: seeded.id,
      action: 'revoke',
    })
    expect((await reserve(again, 'pinta', 'd-2')).status).toBe(403)
  })

  test('outro dono não vê, não baixa e não apaga o item (404 / lista vazia)', async () => {
    const ctx = buildWithTools()
    await saveItem(ctx, 'studio', 'proj-1')
    const list = await req(ctx.app, 'GET', '/members/creations/studio', undefined, otherHeaders)
    expect((await json(list)).items).toHaveLength(0)
    const download = await req(
      ctx.app,
      'GET',
      '/members/creations/studio/proj-1/download',
      undefined,
      otherHeaders,
    )
    expect(download.status).toBe(404)
    const del = await req(
      ctx.app,
      'DELETE',
      '/members/creations/studio/proj-1',
      { baseRevision: 0 },
      otherHeaders,
    )
    expect((await json(del)).deleted).toBe(false)
    // O dono continua com o item.
    expect(await listOf(ctx, 'studio')).toHaveLength(1)
  })

  test('apagar publica uma lápide no índice, dá 404 no download; só o COMMIT ressuscita', async () => {
    const ctx = buildWithTools()
    await saveItem(ctx, 'studio', 'proj-1')
    const del = await req(ctx.app, 'DELETE', '/members/creations/studio/proj-1', {
      baseRevision: 1,
    })
    expect(await json(del)).toMatchObject({ deleted: true, revision: 1 })
    const tombstones = await listOf(ctx, 'studio')
    expect(tombstones).toHaveLength(1)
    expect(tombstones[0]).toMatchObject({ itemId: 'proj-1', revision: 1 })
    expect(typeof tombstones[0]?.deletedAt).toBe('string')
    expect((await req(ctx.app, 'GET', '/members/creations/studio/proj-1/download')).status).toBe(
      404,
    )
    // Idempotente.
    expect(
      (
        await json(
          await req(ctx.app, 'DELETE', '/members/creations/studio/proj-1', { baseRevision: 1 }),
        )
      ).deleted,
    ).toBe(false)
    // Uma reserva SEM commit não ressuscita (o blob ainda não existe).
    const reserved = await json(await reserve(ctx, 'studio', 'proj-1'))
    expect(await listOf(ctx, 'studio')).toHaveLength(1)
    // O commit ressuscita.
    expect((await commit(ctx, 'studio', 'proj-1', reserved.revision)).status).toBe(200)
    expect(reserved.revision).toBe(2)
    const restored = await listOf(ctx, 'studio')
    expect(restored).toHaveLength(1)
    expect(restored[0]).not.toHaveProperty('deletedAt')
  })

  test('índice pagina por cursor e lápide viaja só com id, revisão e data', async () => {
    const ctx = buildWithTools()
    await saveItem(ctx, 'studio', 'apagado', {
      baseRevision: 0,
      itemUpdatedAt: '2026-08-18T10:00:00.000Z',
    })
    await req(ctx.app, 'DELETE', '/members/creations/studio/apagado', { baseRevision: 1 })
    await saveItem(ctx, 'studio', 'vivo', {
      baseRevision: 0,
      itemUpdatedAt: '2026-08-18T11:00:00.000Z',
    })

    const first = await json(await req(ctx.app, 'GET', '/members/creations/studio?limit=1'))
    expect(first.items).toHaveLength(1)
    expect(first.items[0].itemId).toBe('vivo')
    expect(typeof first.nextCursor).toBe('string')
    const second = await json(
      await req(
        ctx.app,
        'GET',
        `/members/creations/studio?limit=1&cursor=${encodeURIComponent(first.nextCursor)}`,
      ),
    )
    expect(second.nextCursor).toBeNull()
    expect(second.items[0]).toEqual({
      itemId: 'apagado',
      revision: 1,
      deletedAt: '2026-06-02T12:00:00.000Z',
    })
    expect((await req(ctx.app, 'GET', '/members/creations/studio?cursor=invalido')).status).toBe(
      400,
    )
  })

  test('compactação remove só um lote de lápides fora da retenção', async () => {
    const ctx = buildWithTools()
    for (const itemId of ['antiga', 'recente']) {
      await saveItem(ctx, 'studio', itemId)
      await req(ctx.app, 'DELETE', `/members/creations/studio/${itemId}`, { baseRevision: 1 })
    }
    const old = [...ctx.creations.rows.values()].find((row) => row.itemId === 'antiga')
    if (old) old.deletedAt = new Date('2025-01-01T00:00:00.000Z')

    const compacted = await req(ctx.app, 'POST', '/members/creations/tombstones/compact')
    expect(compacted.status).toBe(200)
    expect(await json(compacted)).toEqual({ compacted: 1 })
    expect([...ctx.creations.rows.values()].map((row) => row.itemId)).toEqual(['recente'])
  })

  test('quota: item acima do teto e total acima do teto são 409; reenviar TROCA os bytes, não soma; reserva sem commit não ocupa vaga', async () => {
    const ctx = buildWithTools()
    const tooBig = await reserve(ctx, 'studio', 'big', { bytes: CREATION_LIMITS.maxItemBytes + 1 })
    expect(tooBig.status).toBe(409)
    expect((await json(tooBig)).error.code).toBe('CREATION_QUOTA_EXCEEDED')

    // Enche a conta com itens no teto por item, até passar do total.
    const perItem = CREATION_LIMITS.maxItemBytes
    const fits = Math.floor(CREATION_LIMITS.maxTotalBytes / perItem)
    for (let i = 0; i < fits; i += 1) await saveItem(ctx, 'studio', `p-${i}`, { bytes: perItem })
    const over = await reserve(ctx, 'studio', 'p-extra', { bytes: perItem })
    expect(over.status).toBe(409)
    // Reenviar um item existente com o MESMO tamanho não estoura (troca, não soma).
    const resend = await reserve(ctx, 'studio', 'p-0', { bytes: perItem })
    expect(resend.status).toBe(200)
    // Uma reserva que nunca commitou não conta bytes nem vaga: outra reserva pequena passa.
    // (Cada item vale `perItem`, o total está cheio; um item de 1 byte novo tem que caber
    // se um dos itens for apagado.)
    await req(ctx.app, 'DELETE', '/members/creations/studio/p-1', { baseRevision: 1 })
    expect((await reserve(ctx, 'studio', 'p-novo', { bytes: 1 })).status).toBe(200)
  })

  test('teto de itens por ferramenta: só itens vivos e confirmados contam', async () => {
    const ctx = buildWithTools()
    // Reservas sem commit não ocupam vaga.
    for (let i = 0; i < 3; i += 1) await reserve(ctx, 'pinta', `fantasma-${i}`, { bytes: 1 })
    // Enche o teto direto no repositório (o teto é alto de propósito; via HTTP levaria minutos).
    const now = new Date('2026-08-18T12:00:00.000Z')
    for (let i = 0; i < CREATION_LIMITS.maxItemsPerTool; i += 1) {
      const reserved = await ctx.creations.reserveUpload({
        userId: USER,
        accountId: ACCOUNT,
        tool: 'pinta',
        itemId: `d-${i}`,
        name: `d-${i}`,
        kind: 'pixel-sprite',
        itemUpdatedAt: now,
        bytes: 1,
        thumb: null,
        now,
        limits: {
          maxItemBytes: CREATION_LIMITS.maxItemBytes,
          maxTotalBytes: CREATION_LIMITS.maxTotalBytes,
          maxItemsPerTool: 1_000_000,
        },
      })
      if (!reserved.ok) throw new Error('reserva esperada')
      await ctx.creations.commit({
        userId: USER,
        tool: 'pinta',
        itemId: `d-${i}`,
        revision: reserved.revision,
        storageRef: `k/d-${i}/${reserved.revision}`,
        now,
        limits: {
          maxItemBytes: CREATION_LIMITS.maxItemBytes,
          maxTotalBytes: CREATION_LIMITS.maxTotalBytes,
          maxItemsPerTool: 1_000_000,
        },
      })
    }
    const over = await reserve(ctx, 'pinta', 'd-extra', { bytes: 1 })
    expect(over.status).toBe(409)
    // Reenviar um item vivo não conta como novo.
    expect((await reserve(ctx, 'pinta', 'd-0', { bytes: 1 })).status).toBe(200)
    // Apagar abre vaga.
    await req(ctx.app, 'DELETE', '/members/creations/pinta/d-1', { baseRevision: 1 })
    expect((await reserve(ctx, 'pinta', 'd-extra', { bytes: 1 })).status).toBe(200)
  })

  test('a biblioteca de paletas nem ocupa vaga nem é recusada pelo teto de itens', async () => {
    // Direto no repositório com um teto PEQUENO (a regra vive lá; o SQL real é
    // provado em tests/db). Cap 3 por ferramenta em todas as chamadas.
    const ctx = buildWithTools()
    const now = new Date('2026-08-26T12:00:00.000Z')
    const limits = {
      maxItemBytes: CREATION_LIMITS.maxItemBytes,
      maxTotalBytes: CREATION_LIMITS.maxTotalBytes,
      maxItemsPerTool: 3,
    }
    const save = async (itemId: string, kind: string) => {
      const reserved = await ctx.creations.reserveUpload({
        userId: USER,
        accountId: ACCOUNT,
        tool: 'pinta',
        itemId,
        name: itemId,
        kind,
        itemUpdatedAt: now,
        bytes: 1,
        thumb: null,
        now,
        limits,
      })
      if (!reserved.ok) return reserved
      return ctx.creations.commit({
        userId: USER,
        tool: 'pinta',
        itemId,
        revision: reserved.revision,
        storageRef: `k/${itemId}/${reserved.revision}`,
        now,
        limits,
      })
    }

    // (a) Com o teto de desenhos CHEIO, a biblioteca ainda reserva E commita.
    for (let i = 0; i < 3; i += 1) expect((await save(`d-${i}`, 'pixel-sprite')).ok).toBe(true)
    expect((await save('d-cheio', 'pixel-sprite')).ok).toBe(false)
    expect((await save('desenho-falso', PALETTE_LIBRARY_KIND)).ok).toBe(false)
    expect((await save(PALETTE_LIBRARY_ITEM_ID, PALETTE_LIBRARY_KIND)).ok).toBe(true)

    // (b) E a biblioteca commitada NÃO ocupa vaga: os 3 slots de desenho
    // continuam livres (sem o filtro, o 3º desenho contaria como 4º item).
    await ctx.creations.softDelete(USER, 'pinta', 'd-0', 1, now)
    await ctx.creations.softDelete(USER, 'pinta', 'd-1', 1, now)
    await ctx.creations.softDelete(USER, 'pinta', 'd-2', 1, now)
    expect((await save('d-a', 'pixel-sprite')).ok).toBe(true)
    expect((await save('d-b', 'pixel-sprite')).ok).toBe(true)
    expect((await save('d-c', 'pixel-sprite')).ok).toBe(true)
    expect((await save('d-d', 'pixel-sprite')).ok).toBe(false)
  })

  test('marcadores parciais da biblioteca são 400 e o item especial não muda de tipo', async () => {
    const ctx = buildWithTools()
    const attempts = [
      await reserve(ctx, 'pinta', 'desenho-falso', { kind: PALETTE_LIBRARY_KIND }),
      await reserve(ctx, 'pinta', PALETTE_LIBRARY_ITEM_ID, { kind: 'pixel-sprite' }),
      await reserve(ctx, 'studio', PALETTE_LIBRARY_ITEM_ID, { kind: PALETTE_LIBRARY_KIND }),
    ]
    for (const response of attempts) {
      expect(response.status).toBe(400)
      expect((await json(response)).error.code).toBe('VALIDATION_ERROR')
    }

    await saveItem(ctx, 'pinta', PALETTE_LIBRARY_ITEM_ID, {
      name: 'Minhas paletas',
      kind: PALETTE_LIBRARY_KIND,
    })
    const transition = await reserve(ctx, 'pinta', PALETTE_LIBRARY_ITEM_ID, {
      kind: 'pixel-sprite',
    })
    expect(transition.status).toBe(400)
    expect((await json(transition)).error.code).toBe('VALIDATION_ERROR')
  })

  test('validação de borda: ferramenta desconhecida, itemId com ":", corpo sem bytes e nome só de espaços são 4xx', async () => {
    const ctx = buildWithTools()
    expect((await req(ctx.app, 'GET', '/members/creations/pensa')).status).toBeGreaterThanOrEqual(
      400,
    )
    expect(
      (await req(ctx.app, 'POST', '/members/creations/pinta/a:b/upload', uploadBody())).status,
    ).toBeGreaterThanOrEqual(400)
    expect(
      (await req(ctx.app, 'POST', '/members/creations/pinta/ok-1/upload', { name: 'x', kind: 'y' }))
        .status,
    ).toBeGreaterThanOrEqual(400)
    const blank = await reserve(ctx, 'pinta', 'ok-2', { name: '   ' })
    expect(blank.status).toBeGreaterThanOrEqual(400)
    expect(blank.status).toBeLessThan(500)
  })

  test('miniatura acima do teto do serviço é descartada (o commit sai com thumb null), nunca recusada', async () => {
    const ctx = buildWithTools()
    const big = `data:image/png;base64,${'A'.repeat(CREATION_LIMITS.maxThumbChars + 10)}`
    const { item } = await saveItem(ctx, 'pinta', 'd-1', { thumb: big })
    expect(item.thumb).toBeNull()
    const small = 'data:image/png;base64,QUJD'
    const kept = await saveItem(ctx, 'pinta', 'd-1', { thumb: small })
    expect(kept.item.thumb).toBe(small)
  })
})
