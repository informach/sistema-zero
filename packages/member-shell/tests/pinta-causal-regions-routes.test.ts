import { expect, mock, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import {
  PintaCausalAttestationSchema,
  type PintaCausalBinding,
  type PintaCausalMember,
  pintaCausalBlobKey,
} from '@sistemazero/core/creations/pinta-causal'
import type { PintaWorkshopAsset } from '@sistemazero/pinta/assets'
import {
  attachWorkshopBook,
  pintaWorkshopAssetToJson,
} from '../../pinta/src/export/workshopDocument'
import { automapFixture } from '../../pinta/src/testing/automapFixture'
import { createRegionWorld } from '../../pinta/src/tiles/regionMap'
import type { SessionUser } from '../src/lib/types'

mock.module('server-only', () => ({}))
const { createPintaCausalRoutes } = await import('../src/routes/pinta-causal')

// Etapa 1 das regiões (23/11/2026): o BFF confere o documento nativo 8 / nuvem 7 de qualquer perfil
// causal, sem flag. O nativo 9 / nuvem 8 continua de fora: o leitor 8 é recusado no pedido e o
// corpo 9 não passa na prova sem o leitor da oficina, que segue desligado.

const userId = '11111111-1111-4111-8111-111111111111'
const accountId = '22222222-2222-4222-8222-222222222222'
const opId = '33333333-3333-4333-8333-333333333333'
const nonce = '44444444-4444-4444-8444-444444444444'
const namespace = { userId, audience: 'kids', tool: 'pinta' } as const
const user: SessionUser = {
  id: userId,
  email: '',
  firstName: '',
  lastName: '',
  role: 'customer',
  status: 'active',
  activeProfile: { accountId, name: 'Pessoa' },
}
const link = 'http://localhost/api/pinta/causal'
const context = { params: Promise.resolve({ opId }) }

function candidate(asset: PintaWorkshopAsset, formatVersion: number) {
  const json = pintaWorkshopAssetToJson(asset)
  if (!json) throw Error('O documento não tem formato portátil')
  const gzip = gzipSync(json)
  const sha256 = createHash('sha256').update(gzip).digest('hex')
  const member: Extract<PintaCausalMember, { action: 'put' }> = {
    itemId: asset.id,
    name: asset.name,
    kind: asset.kind,
    action: 'put',
    baseRevision: 0,
    formatVersion,
    itemUpdatedAt: new Date(asset.updatedAt).toISOString(),
    bytes: gzip.length,
    sha256,
    operation: { type: 'create' },
  }
  const binding: PintaCausalBinding = {
    namespace,
    opId,
    itemId: asset.id,
    nonce,
    intentHash: 'd'.repeat(64),
    baseEpoch: '0',
    baseRevision: 0,
    revision: 1,
    baseSha256: null,
    candidateSha256: sha256,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  }
  return { gzip, member, binding }
}

function bff(plan: ReturnType<typeof candidate>) {
  const calls: { path: string; body: unknown }[] = []
  const objects = new Map<string, Uint8Array>([
    [pintaCausalBlobKey(plan.binding, 'upload'), plan.gzip],
  ])
  const routes = createPintaCausalRoutes({
    gateway: {
      refreshSession: async () => ({ state: 'invalid' }),
      async gatewayFetchHmac<T = unknown>(path: string, opts?: { body?: unknown }) {
        calls.push({ path, body: opts?.body })
        const endpoint = path.replace('/members/internal/creations/pinta/', '')
        const body =
          endpoint === 'units/member'
            ? {
                member: plan.member,
                binding: plan.binding,
                baseStorageRef: null,
                baseEntry: null,
                remapSheetIds: [],
                remaps: [],
              }
            : { accepted: true }
        return { status: 200, body: body as T }
      },
    },
    session: {
      audience: 'kids',
      getAccessToken: async () => 'qa-access',
      getRefreshToken: async () => 'qa-refresh',
      verifyAccessToken: async () => ({ ok: true, user }),
    },
    enabled: () => true,
    profileAllowed: () => true,
    storage: {
      open: async (key) => {
        const value = objects.get(key)
        if (!value) return null
        return {
          body: new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(value)
              controller.close()
            },
          }),
          contentType: 'application/gzip',
          contentLength: value.byteLength,
        }
      },
      create: async (input) => {
        if (objects.has(input.key)) return false
        objects.set(input.key, input.body)
        return true
      },
      presignPut: async () => 'https://storage.example/put',
      presignGet: async () => 'https://storage.example/get',
    },
  })
  const verify = () =>
    routes.pintaCausalVerify.POST(
      new Request(`${link}/units/${opId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ itemId: plan.member.itemId }),
        headers: { 'content-type': 'application/json' },
      }),
      context,
    )
  return { routes, calls, objects, verify }
}

test('o BFF atesta e sela o mundo gigante (nativo 8 / nuvem 7) com os bytes exatos', async () => {
  const world = createRegionWorld({ name: 'mundo', tilesetId: 'folha' })
  if (!world) throw Error('O mundo gigante não nasceu')
  const plan = candidate(world, 7)
  const { verify, calls, objects } = bff(plan)
  const response = await verify()
  expect(response.status, await response.clone().text()).toBe(200)
  expect(objects.get(pintaCausalBlobKey(plan.binding, 'sealed'))).toEqual(plan.gzip)
  const attest = calls.find((call) => call.path.endsWith('/units/attest'))?.body as {
    payload: unknown
  }
  const receipt = PintaCausalAttestationSchema.parse(attest.payload)
  expect(receipt.binding.itemId).toBe(world.id)
  expect(receipt.manifest?.name).toBe('mundo')
})

test('o mesmo mundo declarado como nuvem 6 não passa: o formato do documento manda', async () => {
  const world = createRegionWorld({ name: 'mundo', tilesetId: 'folha' })
  if (!world) throw Error('O mundo gigante não nasceu')
  const plan = candidate(world, 6)
  const { verify, calls, objects } = bff(plan)
  expect((await verify()).status).toBe(409)
  expect(objects.has(pintaCausalBlobKey(plan.binding, 'sealed'))).toBe(false)
  expect(calls.some((call) => call.path.endsWith('/units/attest'))).toBe(false)
})

test('o nativo 9 (autorregras) continua de fora: leitor 8 recusado e corpo 9 sem prova', async () => {
  const { map, book } = await automapFixture()
  const authored = attachWorkshopBook(map, book)
  if (!authored) throw Error('O livro não se ligou ao mapa')
  const plan = candidate(authored, 8)
  const { routes, verify, calls, objects } = bff(plan)
  expect((await routes.pintaCausalGraph.GET(new Request(`${link}/graph?reader=8`))).status).toBe(
    400,
  )
  expect(calls).toEqual([])
  expect((await verify()).status).toBe(409)
  expect(objects.has(pintaCausalBlobKey(plan.binding, 'sealed'))).toBe(false)
  expect(calls.some((call) => call.path.endsWith('/units/attest'))).toBe(false)
})
