import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  type PintaCausalEntry,
  type PintaCausalIntent,
  type PintaCausalManifest,
  type PintaCausalMember,
  pintaCausalIntentHash,
} from '@sistemazero/core/creations/pinta-causal'
import {
  PintaPaletteTicketSchema,
  PINTA_PALETTE_WRITE_PROTOCOL as protocol,
} from '@sistemazero/core/creations/pinta-palette-writer'
import { createApplication } from '../../src/composition-root'
import { CREATION_LIMITS } from '../../src/domain/creations/creation'
import { loadEnv } from '../../src/infrastructure/config/env'
import { DrizzleCreationsRepository } from '../../src/infrastructure/persistence/drizzle/creations.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { openKidsJourneyTestDatabase, optInKidsJourneyDatabase } from './kids-journey-database'

// O fim das flags do Pinta (23/11/2026): a composição real, SEM nenhuma variável do Pinta, liga a
// nuvem causal para todo perfil. Esta prova pega um perfil grande e antigo (desenhos, folhas, mapas
// que usam as folhas, uma lápide, uma reserva em voo de uma aba antiga e a biblioteca de paletas,
// tudo do escritor antigo) e o adota como o cliente novo faz (`syncPintaCausalAccount`): lê o
// inventário inteiro, confere desenho por desenho (backfill), cai no meio, o serviço reinicia, e a
// adoção continua de onde parou. Nada se perde; a cerca do escritor antigo só fecha na primeira
// unidade causal, e a paleta passa ao protocolo negociado.
const target = optInKidsJourneyDatabase('PINTA_CAUSAL_ADOPTION_TEST_DATABASE_URL')
const token = 'owned-causal-adoption-test-token'
const gateway = { 'x-internal-token': token, 'x-consumer-id': 'member-shell' }
const READER = 7
const SPRITES = 150
const SHEETS = 10
const sha = (n: number) => n.toString(16).padStart(64, '0')
const slots = (v: number) => v.toString(16).padStart(2, '0') + '00'.repeat(31)
const pad = (n: number) => String(n).padStart(3, '0')

async function serving() {
  const socket = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response(null) })
  const port = socket.port!
  await socket.stop(true)
  const app = await createApplication(
    loadEnv({
      NODE_ENV: 'test',
      DATABASE_URL: target,
      HOST: '127.0.0.1',
      PORT: String(port),
      GATEWAY_HMAC_SECRET: 'owned-adoption-gateway-secret',
      INTERNAL_API_TOKEN: token,
    }),
  )
  await app.start()
  return { base: `http://127.0.0.1:${port}`, stop: () => app.stop() }
}

type Drawing = { itemId: string; kind: 'pixel-sprite' | 'tileset' | 'tilemap'; n: number }

describe.skipIf(!target)('Pinta: a adoção de um perfil grande e antigo, sem flag', () => {
  let conn: DbConnection
  beforeAll(async () => {
    conn = await openKidsJourneyTestDatabase(target!)
  }, 90_000)
  afterAll(() => conn?.close())

  test('adota tudo sem perda, retoma depois de cair no meio e fecha o escritor antigo só na adoção', async () => {
    const actor = { userId: randomUUID(), accountId: randomUUID(), audience: 'kids' as const }
    const drawings: Drawing[] = [
      ...Array.from({ length: SPRITES }, (_, i) => ({
        itemId: `s-${pad(i)}`,
        kind: 'pixel-sprite' as const,
        n: 1000 + i,
      })),
      ...Array.from({ length: SHEETS }, (_, i) => ({
        itemId: `t-${pad(i)}`,
        kind: 'tileset' as const,
        n: 2000 + i,
      })),
      ...Array.from({ length: SHEETS }, (_, i) => ({
        itemId: `m-${pad(i)}`,
        kind: 'tilemap' as const,
        n: 3000 + i,
      })),
    ]
    const byId = new Map(drawings.map((d) => [d.itemId, d]))
    const manifest = (d: Drawing): PintaCausalManifest => ({
      version: 1,
      itemId: d.itemId,
      name: d.itemId,
      kind: d.kind,
      nativeSchema: 7,
      requiredNativeSchema: 1,
      backupVersion: 7,
      doorSelectors: [],
      // Cada mapa usa a peça 1 da sua folha: a ligação tem de sobreviver à adoção.
      refs:
        d.kind === 'tilemap'
          ? [{ id: `t-${d.itemId.slice(2)}`, roles: ['default-sheet'], indices: slots(2) }]
          : [],
      ...(d.kind === 'tileset' ? { sheet: { tileSize: 16, count: 3 } } : {}),
    })
    const legacyHeaders = {
      ...gateway,
      'content-type': 'application/json',
      'x-auth-user-id': actor.userId,
      'x-auth-account-id': actor.accountId,
      'x-auth-user-status': 'active',
      'x-auth-user-role': 'staff',
    }

    let service = await serving()
    const internal = (path: string, payload: unknown, privileged = false) =>
      fetch(`${service.base}/members/internal/creations/pinta/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...gateway },
        body: JSON.stringify({ ...actor, ...(privileged ? { privileged } : {}), payload }),
      })
    const legacy = (path: string, init: { method?: string; body?: unknown } = {}) =>
      fetch(`${service.base}/members/creations/pinta${path}`, {
        method: init.method ?? 'GET',
        headers: legacyHeaders,
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      })
    const reserve = (itemId: string, kind: string, baseRevision: number, formatVersion = 6) =>
      legacy(`/${itemId}/upload`, {
        method: 'POST',
        body: {
          baseRevision,
          name: itemId,
          kind,
          formatVersion,
          maxReadFormatVersion: 6,
          itemUpdatedAt: new Date().toISOString(),
          bytes: 120,
        },
      })
    const write = async (itemId: string, kind: string, formatVersion = 6) => {
      const reserved = await reserve(itemId, kind, 0, formatVersion)
      expect(reserved.status).toBe(200)
      const { revision } = await reserved.json()
      const committed = await legacy(`/${itemId}/commit`, {
        method: 'POST',
        body: { revision, verifiedPartHashes: [], verifiedFormatVersion: formatVersion },
      })
      expect(committed.status).toBe(200)
    }
    /** O inventário inteiro numa época só, como `discoverPintaCausalSnapshot`. */
    const snapshot = async () => {
      for (;;) {
        const entries: PintaCausalEntry[] = []
        let epoch: string | undefined
        let cursor: string | undefined
        let restarted = false
        for (;;) {
          const page = await internal('graph/page', {
            reader: READER,
            ...(epoch ? { epoch } : {}),
            ...(cursor ? { cursor } : {}),
          })
          if (page.status === 409 && epoch) {
            restarted = true
            break
          }
          expect(page.status).toBe(200)
          const body = (await page.json()) as {
            epoch: string
            entries: PintaCausalEntry[]
            nextCursor: string | null
          }
          epoch = body.epoch
          entries.push(...body.entries)
          if (!body.nextCursor) break
          cursor = body.nextCursor
        }
        if (!restarted) return { epoch: epoch!, entries }
      }
    }
    const currentEpoch = async () =>
      ((await (await internal('graph/page', { reader: READER })).json()) as { epoch: string }).epoch
    const rows = () =>
      conn.sql<
        {
          item_id: string
          kind: string
          name: string
          revision: number
          format_version: number
          bytes: number
          deleted_at: Date | null
        }[]
      >`select item_id, kind, name, revision, format_version, bytes, deleted_at from members.creations
        where user_id=${actor.userId} and tool='pinta' and item_id <> 'sz-pinta-palettes' and revision > 0
        order by item_id`

    try {
      // ── O perfil antigo, todo gravado pelo escritor antigo ──────────────────────────────────────
      for (const d of drawings) await write(d.itemId, d.kind)
      await write('apagado', 'pixel-sprite')
      const removed = await legacy('/apagado', {
        method: 'DELETE',
        body: { baseRevision: 1, maxFormatVersion: 6 },
      })
      expect(removed.status).toBe(200)
      await write('sz-pinta-palettes', 'palette-library', 1)
      // Uma aba antiga reservou um desenho e ainda não confirmou.
      expect((await reserve('aba-antiga', 'pixel-sprite', 0)).status).toBe(200)
      const before = await rows()
      const [paletteBefore] =
        await conn.sql`select revision, storage_ref from members.creations where user_id=${actor.userId} and item_id='sz-pinta-palettes'`

      // ── A descoberta: tudo aparece, nada certificado, a cerca ainda aberta ───────────────────────
      const first = await snapshot()
      expect(first.entries.map((e) => e.itemId).sort()).toEqual([...byId.keys()].sort())
      expect(first.entries.every((e) => e.coverage === 'unknown')).toBe(true)
      expect((await legacy('')).status).toBe(200)

      // ── A conferência cai no meio ───────────────────────────────────────────────────────────────
      const pending = first.entries.map((e) => e.itemId).sort()
      let epoch = first.epoch
      const backfill = async (itemId: string, at: string) => {
        const entry = first.entries.find((e) => e.itemId === itemId)!
        const ticket = await internal('backfill/ticket', {
          epoch: at,
          itemId,
          revision: entry.revision,
          reader: READER,
        })
        expect(ticket.status).toBe(200)
        const { binding } = await ticket.json()
        return {
          binding,
          attest: () =>
            internal('backfill/attest', {
              purpose: 'pinta-backfill-content-v1',
              binding,
              sha256: sha(byId.get(itemId)!.n),
              manifest: manifest(byId.get(itemId)!),
            }),
        }
      }
      const HALF = 80
      let lostAck: Awaited<ReturnType<typeof backfill>> | undefined
      for (const itemId of pending.slice(0, HALF)) {
        const step = await backfill(itemId, epoch)
        expect((await step.attest()).status).toBe(200)
        lostAck = step
        epoch = await currentEpoch()
      }
      // Um bilhete emitido para o próximo desenho, sem o atestado (a rede caiu).
      const dangling = await backfill(pending[HALF]!, epoch)
      // E um bilhete velho de outro desenho, preso numa época que já passou.
      const staleTarget = pending[HALF + 1]!
      const stale = await backfill(staleTarget, epoch)
      const intruder = await backfill(pending[HALF + 2]!, epoch)
      expect((await intruder.attest()).status).toBe(200)
      // O serviço reinicia (deploy, réplica nova): nada fica preso a este processo.
      await service.stop()
      service = await serving()

      // ── A retomada ─────────────────────────────────────────────────────────────────────────────
      // O ACK perdido: reenviar o mesmo atestado é idempotente e não muda nada.
      expect((await lostAck!.attest()).status).toBe(200)
      // O bilhete velho não certifica nada: a época mudou desde que ele foi emitido.
      const refused = await stale.attest()
      expect(refused.status).toBe(409)
      expect(await refused.json()).toMatchObject({ reason: 'epoch-changed' })
      const resumed = await snapshot()
      const certified = new Set(
        resumed.entries.filter((e) => e.coverage === 'certified').map((e) => e.itemId),
      )
      expect(certified.size).toBe(HALF + 1)
      expect(certified.has(dangling.binding.itemId)).toBe(false)
      epoch = resumed.epoch
      for (const entry of resumed.entries) {
        if (entry.coverage === 'certified') continue
        const step = await backfill(entry.itemId, epoch)
        expect((await step.attest()).status).toBe(200)
        epoch = await currentEpoch()
      }

      // ── Tudo conferido, nada perdido ────────────────────────────────────────────────────────────
      const adopted = await snapshot()
      expect(adopted.entries).toHaveLength(drawings.length)
      for (const entry of adopted.entries) {
        const d = byId.get(entry.itemId)!
        expect(entry).toMatchObject({
          coverage: 'certified',
          sha256: sha(d.n),
          revision: 1,
          kind: d.kind,
          name: d.itemId,
        })
      }
      expect(await rows()).toEqual(before)
      const [paletteAfterBackfill] =
        await conn.sql`select revision, storage_ref from members.creations where user_id=${actor.userId} and item_id='sz-pinta-palettes'`
      expect(paletteAfterBackfill).toEqual(paletteBefore)
      // Conferir não fecha o escritor antigo: até a primeira unidade causal, ele segue.
      expect((await legacy('')).status).toBe(200)

      // ── A adoção: a primeira unidade causal (um desenho novo) ────────────────────────────────────
      const novo: Extract<PintaCausalMember, { action: 'put' }> = {
        action: 'put',
        itemId: 'novo',
        name: 'novo',
        kind: 'pixel-sprite',
        bytes: 5,
        sha256: sha(9001),
        itemUpdatedAt: new Date().toISOString(),
        formatVersion: 6,
        baseRevision: 0,
        operation: { type: 'create' },
      }
      const unit = async (members: PintaCausalMember[], manifests: PintaCausalManifest[]) => {
        const intent: PintaCausalIntent = {
          protocol: 1,
          opId: randomUUID(),
          baseEpoch: await currentEpoch(),
          reader: READER,
          members,
          readSet: [],
        }
        const page = {
          ...intent,
          page: 0,
          pages: 1,
          intentHash: await pintaCausalIntentHash(intent),
        }
        const reserved = await internal('units/reserve', page, true)
        if (reserved.status !== 200) return reserved
        const { status } = await reserved.json()
        for (const [n, binding] of status.tickets.entries()) {
          const attested = await internal('units/attest', {
            purpose: 'pinta-unit-content-v1',
            binding,
            manifest: manifests[n],
            transitions: [],
          })
          if (attested.status !== 200) return attested
        }
        return internal('units/commit', { opId: intent.opId })
      }
      const committed = await unit(
        [novo],
        [manifest({ itemId: 'novo', kind: 'pixel-sprite', n: 9001 })],
      )
      expect(committed.status).toBe(200)
      expect(await committed.json()).toMatchObject({ status: { state: 'committed' } })
      const final = await snapshot()
      expect(final.entries.map((e) => e.itemId).sort()).toEqual([...byId.keys(), 'novo'].sort())
      expect(final.entries.every((e) => e.coverage === 'certified')).toBe(true)

      // A ligação mapa → folha atravessou a adoção: tirar a peça 0 da folha sem o mapa é recusado.
      const remap: PintaCausalMember = {
        action: 'put',
        itemId: 't-000',
        name: 't-000',
        kind: 'tileset',
        bytes: 5,
        sha256: sha(9002),
        itemUpdatedAt: new Date().toISOString(),
        formatVersion: 6,
        baseRevision: 1,
        operation: { type: 'remap', oldToNew: [-1, 0, 1], count: 2 },
      }
      const structural = await unit(
        [remap],
        [{ ...manifest(byId.get('t-000')!), sheet: { tileSize: 16, count: 2 } }],
      )
      expect(structural.status).toBe(409)
      expect(await structural.json()).toMatchObject({ reason: 'missing-consumer', itemId: 'm-000' })

      // ── O escritor antigo agora é recusado com clareza, e nada muda ─────────────────────────────
      const afterAdoption = await rows()
      for (const refusal of [
        await legacy(''),
        await legacy('/s-000/download'),
        await reserve('s-000', 'pixel-sprite', 1),
        await legacy('/aba-antiga/commit', {
          method: 'POST',
          body: { revision: 1, verifiedPartHashes: [], verifiedFormatVersion: 6 },
        }),
        await legacy('/s-001', {
          method: 'DELETE',
          body: { baseRevision: 1, maxFormatVersion: 6 },
        }),
      ]) {
        expect(refusal.status).toBe(409)
        expect(await refusal.json()).toMatchObject({ reason: 'protocol-required' })
      }
      expect(await rows()).toEqual(afterAdoption)
      expect(afterAdoption.filter((r) => r.item_id !== 'novo')).toEqual(before)

      // ── O rascunho do Pinta da aula não passa pela cerca dos desenhos pessoais ─────────────────
      const lessons = new DrizzleCreationsRepository(conn.db)
      const draft = {
        ...actor,
        tool: 'lesson-pinta' as const,
        itemId: 'aula-pinta-bloco-1',
        kind: 'pixel-sprite',
        name: 'Rascunho da aula',
        itemUpdatedAt: new Date(),
        bytes: 5,
        thumb: null,
        now: new Date(),
        limits: CREATION_LIMITS,
        formatVersion: 6,
        maxReadFormatVersion: 6,
      }
      expect((await lessons.reserveUpload(draft)).ok).toBe(true)
      expect(
        (await lessons.commit({ ...draft, revision: 1, storageRef: 'aula/rascunho.gz' })).ok,
      ).toBe(true)
      expect(await lessons.get(actor.userId, 'lesson-pinta', draft.itemId, 'kids')).toMatchObject({
        revision: 1,
        storageRef: 'aula/rascunho.gz',
      })

      // ── A paleta passa ao protocolo negociado ───────────────────────────────────────────────────
      const palette = (action: string, payload: unknown) =>
        fetch(`${service.base}/members/internal/creations/pinta/palette/${action}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...gateway },
          body: JSON.stringify({ ...actor, privileged: true, payload }),
        })
      const head = await (await palette('head', {})).json()
      expect(head.paletteHead).toMatchObject({ adopted: false, exists: true, revision: 1 })
      // O cliente antigo ainda lê a paleta, inclusive depois da adoção dos desenhos.
      expect((await legacy('/sz-pinta-palettes/download')).status).toBe(200)
      const reservedPalette = await palette('reserve', {
        protocol,
        baseGeneration: head.paletteHead.generation,
        baseRevision: 1,
        bytes: 100,
        itemUpdatedAt: new Date().toISOString(),
      })
      expect(reservedPalette.status).toBe(200)
      const ticket = PintaPaletteTicketSchema.parse((await reservedPalette.json()).ticket)
      const negotiated = await palette('commit', { ticket, sha256: '8'.repeat(64) })
      expect(negotiated.status).toBe(200)
      expect((await negotiated.json()).paletteHead).toMatchObject({
        adopted: true,
        exists: true,
        revision: 2,
      })
      const oldPaletteWrite = await reserve('sz-pinta-palettes', 'palette-library', 2, 1)
      expect(oldPaletteWrite.status).toBe(409)
      expect(await oldPaletteWrite.json()).toMatchObject({
        error: { code: 'PINTA_PALETTE_WRITE_REQUIRED' },
      })
      expect((await legacy('/sz-pinta-palettes/download')).status).toBe(200)
      expect(await rows()).toEqual(afterAdoption)
    } finally {
      await service.stop()
    }
  }, 240_000)
})
