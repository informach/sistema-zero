import { expect, it } from 'bun:test'
import { PintaCausalIntentSchema } from '@sistemazero/core/creations/pinta-causal'
import type { PintaCausalLocalPort } from '@sistemazero/pinta'
import { createPixelSpriteAsset } from '../../pinta/src/core/project'
import { createPintaCausalPersistence } from '../../pinta/src/state/persistence'
import { flushPintaCausalOutbox } from '../src/lib/pinta-causal-queue'

it('the worker seals the exact preparation before network and keeps its bytes on failure', async () => {
  const asset = createPixelSpriteAsset({ name: 'cabana', frameSize: 8 })
  const pending = {
    opId: 'd1b1d364-08d2-427b-ad93-182773629af3',
    preparation: 'leitura-local',
    baseEpoch: '4',
    readSet: [],
    members: [
      {
        itemId: asset.id,
        baseRevision: 1,
        action: 'put' as const,
        localRevision: 'edicao-exata',
        operation: { type: 'update' as const },
      },
    ],
  }
  let stored: Awaited<ReturnType<PintaCausalLocalPort['inFlight']>> = null
  let seals = 0
  let remoteAttempts = 0
  let confirmed = false
  const local: Parameters<typeof flushPintaCausalOutbox>[0]['local'] = {
    inspect: async () => ({
      version: 1,
      protocolKnown: true,
      epoch: '4',
      pending: confirmed ? [] : [pending],
      sealed: null,
      confirmed: new Map(),
    }),
    inFlight: async () => stored,
    encodeCandidates: createPintaCausalPersistence({ namespace: 'queue-test-codec' }).causal
      .encodeCandidates,
    prepare: async () => ({ pending, assets: [asset] }),
    seal: async (preparation, intent, intentHash, blobs) => {
      expect(preparation).toBe(pending.preparation)
      expect(PintaCausalIntentSchema.safeParse(intent).success).toBe(true)
      seals++
      stored = {
        sealed: {
          intent,
          intentHash,
          local: pending,
          bytes: blobs.get(asset.id)?.size ?? 0,
        },
        blobs,
      }
      return true
    },
    acknowledge: async () => {
      confirmed = true
      stored = null
      return true
    },
  }
  const flush = () =>
    flushPintaCausalOutbox({
      local,
      cloud: {
        upload: async ({ intent, intentHash, blobs }) => {
          const frozen = stored
          if (!frozen) throw Error('Unidade não selada')
          expect(blobs).toBe(frozen.blobs)
          expect(intentHash).toBe(frozen.sealed.intentHash)
          if (++remoteAttempts === 1) throw Error('sem internet')
          const member = intent.members[0]
          if (member?.action !== 'put') throw Error('fixture')
          return {
            epoch: '5',
            opId: intent.opId,
            intentHash,
            members: [
              {
                itemId: member.itemId,
                deleted: false,
                revision: 2,
                sha256: member.sha256,
                layoutRevision: null,
              },
            ],
          }
        },
      },
      reader: 6,
      signal: new AbortController().signal,
    })
  await expect(flush()).rejects.toThrow('sem internet')
  expect(confirmed).toBe(false)
  await flush()
  expect({ seals, remoteAttempts, confirmed }).toEqual({
    seals: 1,
    remoteAttempts: 2,
    confirmed: true,
  })
})

it('leitor A guarda PUT novo e recusa seal, replay e exclusão protegidos antes da rede', async () => {
  const signal = new AbortController().signal
  const asset = createPixelSpriteAsset({ name: 'mapa', frameSize: 8 })
  const { puts, blobs } = await createPintaCausalPersistence({
    namespace: 'rollback-proof',
  }).causal.encodeCandidates([asset], signal)
  const put = { ...puts[0]!, kind: 'tilemap' as const, formatVersion: 8 }
  const pending = {
    opId: crypto.randomUUID(),
    baseEpoch: '2',
    preparation: 'rev',
    readSet: [],
    members: [
      {
        itemId: asset.id,
        localRevision: 'r1',
        baseRevision: 1,
        action: 'put' as const,
        operation: { type: 'update' as const },
      },
    ],
  }
  const intent = {
    protocol: 1 as const,
    reader: 8,
    opId: pending.opId,
    baseEpoch: '2',
    readSet: [],
    members: [
      { ...put, action: 'put' as const, operation: { type: 'update' as const }, baseRevision: 1 },
    ],
  }
  const sealed = {
    intent,
    intentHash: 'a'.repeat(64),
    bytes: blobs.get(asset.id)!.size,
    local: pending,
  }
  let seals = 0
  let uploads = 0
  for (const phase of ['pending', 'sealed', 'delete']) {
    const deleting = {
      ...pending,
      members: [
        { itemId: asset.id, localRevision: 'r2', baseRevision: 1, action: 'delete' as const },
      ],
    }
    const local: Parameters<typeof flushPintaCausalOutbox>[0]['local'] = {
      inspect: async () => ({
        version: 3,
        epoch: '2',
        protocolKnown: true,
        confirmed: new Map(),
        sealed: null,
        pending: [phase === 'delete' ? deleting : pending],
      }),
      retained: async () => ({ puts: phase === 'delete' ? [] : [put], blobs }),
      inFlight: async () => (phase === 'sealed' ? { sealed, blobs } : null),
      prepare: async () => {
        throw Error('não deve remontar')
      },
      encodeCandidates: async () => {
        throw Error('não deve recodificar')
      },
      seal: async () => {
        seals++
        return false
      },
      acknowledge: async () => {
        throw Error('não deve confirmar')
      },
    }
    await expect(
      flushPintaCausalOutbox({
        local,
        reader: 8,
        signal,
        inventoryFloor: phase === 'delete' ? 8 : 1,
        cloud: {
          upload: async () => {
            uploads++
            throw Error('não deve enviar')
          },
        },
      }),
    ).rejects.toMatchObject({ code: 'CREATION_CLIENT_OUTDATED' })
  }
  expect({ seals, uploads }).toEqual({ seals: 0, uploads: 0 })
})
