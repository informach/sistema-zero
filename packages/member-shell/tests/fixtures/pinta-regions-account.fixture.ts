import { beforeEach, expect, test } from 'bun:test'
import '../../../pinta/src/testing/idbMock'
import { pintaInventoryFloor, pintaWriteFormatVersion } from '@sistemazero/core/creations'
import type { PintaCausalEntry, PintaCausalResult } from '@sistemazero/core/creations/pinta-causal'
import type { PintaWorkshopAsset } from '../../../pinta/src/core/assetMemory'
import { createTilesetAsset } from '../../../pinta/src/core/project'
import {
  attachWorkshopBook,
  pintaWorkshopAssetFromJson,
  pintaWorkshopAssetToJson,
} from '../../../pinta/src/export/workshopDocument'
import { PINTA_CAUSAL_OUTBOX_KEY } from '../../../pinta/src/state/assetAuthorityKeys'
import { createGalleryStore } from '../../../pinta/src/state/galleryStore'
import { isLocalRegionAsset } from '../../../pinta/src/state/localRegionAssetAuthority'
import {
  createPintaCausalPersistence,
  dbNameFor,
  setPintaStorageNamespace,
} from '../../../pinta/src/state/persistence'
import {
  createWorkshopPintaPersistence,
  WORKSHOP_NATIVE_CEILING_MESSAGE,
  workshopNativeSchema,
} from '../../../pinta/src/state/workshopPersistence'
import { automapFixture } from '../../../pinta/src/testing/automapFixture'
import { clearIdbMock, idbMockDb, setIdbMockCodec } from '../../../pinta/src/testing/idbMock'
import { addTile } from '../../../pinta/src/tiles/tilesetOps'
import type { CreationsCloud } from '../../src/lib/creations-cloud'
import { createMemorySyncedMarks } from '../../src/lib/creations-sync'
import {
  type PintaCausalCloud,
  PintaCausalRequestError,
  pintaCausalGzipHash,
} from '../../src/lib/pinta-causal-cloud'
import { flushPintaCausalOutbox } from '../../src/lib/pinta-causal-queue'
import {
  createCloudMirroredPintaPersistence,
  createMemoryPintaFormatMemory,
} from '../../src/lib/pinta-cloud-persistence'

// Etapa 1 das regiões (23/11/2026), sem flag: o host com a fila causal monta a oficina (teto
// nativo 8, leitor e escritor 7). Estes casos provam o transporte e o que acontece quando um
// cliente antigo (o deploy anterior, leitor 6) encontra o dado regional, no aparelho e na conta.
// IndexedDB com os bytes físicos (codec ligado), igual à janela focal.
beforeEach(() => {
  clearIdbMock()
  setIdbMockCodec(true)
})

const gunzip = (bytes: Uint8Array<ArrayBuffer> | Blob) =>
  new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()

function cloudFormat(asset: PintaWorkshopAsset): number {
  const schema = workshopNativeSchema(asset)
  return schema === 9 ? 8 : schema === 8 ? 7 : pintaWriteFormatVersion(asset.kind)
}

async function published(asset: PintaWorkshopAsset, revision: number, layout: string | null) {
  const json = pintaWorkshopAssetToJson(asset)
  if (!json) throw Error('Documento sem formato')
  const gzip = new Uint8Array(
    await new Response(
      new Blob([json]).stream().pipeThrough(new CompressionStream('gzip')),
    ).arrayBuffer(),
  )
  const entry: PintaCausalEntry = {
    itemId: asset.id,
    kind: asset.kind,
    name: asset.name,
    itemUpdatedAt: new Date(asset.updatedAt).toISOString(),
    formatVersion: cloudFormat(asset),
    revision,
    sha256: await pintaCausalGzipHash(gzip.buffer),
    layoutRevision: layout,
    bytes: gzip.byteLength,
    coverage: 'certified',
  }
  return { entry, gzip }
}

/**
 * O grafo do Members em memória com o piso do inventário: um item de nuvem >= 7 sobe o piso, e
 * um leitor abaixo dele leva `client-outdated` na leitura e na escrita, como no serviço real.
 */
function causalServer(seed: readonly Awaited<ReturnType<typeof published>>[]) {
  const remote = new Map(seed.map(({ entry }) => [entry.itemId, entry]))
  const stored = new Map(seed.map(({ entry, gzip }) => [entry.itemId, gzip]))
  const receipts = new Map<string, PintaCausalResult>()
  const control = { epoch: 3, offline: false, commits: [] as string[][] }
  const floor = () =>
    Math.max(
      1,
      ...[...remote.values()].map((entry) =>
        pintaInventoryFloor('pinta', entry.kind, entry.formatVersion),
      ),
    )
  function transport(reader: number): PintaCausalCloud {
    return {
      snapshot: async () => {
        const requiredFormat = floor()
        if (requiredFormat > reader) throw new PintaCausalRequestError(409, 'client-outdated')
        return { epoch: String(control.epoch), requiredFormat, entries: [...remote.values()] }
      },
      verifyEpoch: async () => {},
      backfill: async (): Promise<never> => {
        throw Error('Operação inesperada')
      },
      download: async ({ itemId }) => {
        const bytes = stored.get(itemId)
        if (!bytes) throw Error(`Download inesperado de ${itemId}`)
        return new Uint8Array(bytes)
      },
      upload: async ({ intent, intentHash, blobs }) => {
        if (control.offline) throw new TypeError('Failed to fetch')
        if (
          intent.reader > reader ||
          floor() > intent.reader ||
          intent.members.some((m) => m.action === 'put' && m.formatVersion > intent.reader)
        )
          throw new PintaCausalRequestError(409, 'client-outdated')
        if (intent.baseEpoch !== String(control.epoch))
          throw new PintaCausalRequestError(409, 'epoch-changed')
        for (const member of intent.members)
          if ((remote.get(member.itemId)?.revision ?? 0) !== member.baseRevision)
            throw new PintaCausalRequestError(409, 'stale-base', member.itemId)
        control.epoch++
        const members: PintaCausalResult['members'] = []
        for (const member of intent.members) {
          if (member.action !== 'put') throw Error('fixture')
          const blob = blobs.get(member.itemId)
          if (!blob) throw Error('Candidato ausente')
          const bytes = new Uint8Array(await blob.arrayBuffer())
          if ((await pintaCausalGzipHash(bytes.buffer)) !== member.sha256) throw Error('Hash')
          const previous = remote.get(member.itemId)
          const revision = (previous?.revision ?? 0) + 1
          const layoutRevision = previous?.layoutRevision ?? null
          remote.set(member.itemId, {
            itemId: member.itemId,
            kind: member.kind,
            name: member.name,
            itemUpdatedAt: member.itemUpdatedAt,
            formatVersion: member.formatVersion,
            revision,
            sha256: member.sha256,
            layoutRevision,
            bytes: member.bytes,
            coverage: 'certified',
          })
          stored.set(member.itemId, bytes)
          members.push({
            itemId: member.itemId,
            revision,
            sha256: member.sha256,
            layoutRevision,
            deleted: false,
          })
        }
        control.commits.push(intent.members.map((member) => member.itemId))
        const receipt = { opId: intent.opId, epoch: String(control.epoch), intentHash, members }
        receipts.set(intent.opId, receipt)
        return receipt
      },
      // A unit refused before its reservation has no row on the server: `unknown`.
      settle: async ({ intent }) => {
        const result = receipts.get(intent.opId)
        return result ? { state: 'committed', result } : { state: 'unknown' }
      },
    }
  }
  return { transport, remote, stored, control, floor }
}

/** A conta antiga nunca é chamada: a fila causal leva toda gravação. */
function causalOnlyCloud(transport: PintaCausalCloud): CreationsCloud {
  const unused = async (): Promise<never> => {
    throw Error('Operação não solicitada')
  }
  return {
    tool: 'pinta',
    supported: true,
    pintaCausal: transport,
    list: async () => [],
    upload: unused,
    peek: async () => null,
    remove: unused,
    download: unused,
    enqueueUpload: () => {
      throw Error('Subida antiga não solicitada')
    },
    enqueueRemove: () => {},
    flush: async () => {},
    confirm: async () => {},
    getState: () => ({ status: 'idle', pending: 0, lastSavedAt: null, lastError: null }),
    getItemState: () => ({ status: 'idle', lastError: null, code: null }),
    subscribe: () => () => {},
    subscribeItems: () => () => {},
    dispose: () => {},
  }
}

const locks = {
  holdOpen: async () => () => {},
  withClosed: (_: readonly string[], apply: () => Promise<boolean>) => apply(),
}

/** O host desta etapa: a oficina com teto 8 e a fila com leitor e escritor 7. */
function newHost(namespace: string, transport: PintaCausalCloud) {
  const local = createWorkshopPintaPersistence({
    namespace,
    guardCausalWrites: true,
    nativeCeiling: 8,
  })
  const mirror = createCloudMirroredPintaPersistence({
    local,
    cloud: causalOnlyCloud(transport),
    viewerId: namespace,
    localNamespace: namespace,
    marks: createMemorySyncedMarks(),
    formatMemory: createMemoryPintaFormatMemory(),
    causal: { local: local.causal, reader: 7, writer: 7, ...locks },
  })
  const flush = () =>
    flushPintaCausalOutbox({
      local: local.causal,
      cloud: transport,
      reader: 7,
      writer: 7,
      signal: new AbortController().signal,
    })
  return { local, mirror, flush }
}

/** O deploy anterior: o armazenamento de sempre (nativo até 7) e a fila com leitor 6. */
function oldHost(namespace: string, transport: PintaCausalCloud) {
  const local = createPintaCausalPersistence({ namespace })
  const mirror = createCloudMirroredPintaPersistence({
    local,
    cloud: causalOnlyCloud(transport),
    viewerId: namespace,
    localNamespace: namespace,
    marks: createMemorySyncedMarks(),
    formatMemory: createMemoryPintaFormatMemory(),
    reconcileMinIntervalMs: 0,
    causal: { local: local.causal, ...locks },
  })
  const flush = () =>
    flushPintaCausalOutbox({
      local: local.causal,
      cloud: transport,
      reader: 6,
      signal: new AbortController().signal,
    })
  return { local, mirror, flush }
}

/** Espera a reconciliação que a leitura da galeria dispara terminar (sucesso ou recusa). */
async function reconciled(mirror: ReturnType<typeof newHost>['mirror']) {
  const ended = new Promise<void>((resolve) => {
    const off = mirror.subscribe?.((event) => {
      if (event.type !== 'sync-end') return
      off?.()
      resolve()
    })
  })
  const listed = await mirror.listAllAssets()
  await ended
  return listed
}

/**
 * Uma conta adotada na época 3 com uma folha. O aparelho já a tem (descida aplicada pela oficina).
 * Na galeria, a criança cria outra folha e um mundo gigante com ela, e os dois sobem.
 */
async function accountWithWorld(namespace: string) {
  setPintaStorageNamespace(namespace)
  const sheet = addTile(createTilesetAsset({ name: 'pecas', tileSize: 16 }), 0)
  const seed = [await published(sheet, 1, '3')]
  const server = causalServer(seed)
  const host = newHost(namespace, server.transport(7))
  expect(
    await host.local.causal.applyPull(
      {
        fromEpoch: null,
        epoch: '3',
        transitions: [
          {
            id: sheet.id,
            before: null,
            beforeRevision: null,
            after: sheet,
            remote: seed[0]!.entry,
          },
        ],
      },
      () => true,
    ),
  ).toBe(true)
  const gallery = createGalleryStore(host.mirror)
  await gallery.getState().load()
  const created = await gallery.getState().create({ kind: 'tileset', name: 'chao', tileSize: 16 })
  if (created?.kind !== 'tileset') throw Error(gallery.getState().mutateError ?? 'Folha ausente')
  const world = await gallery.getState().createRegionMap({ name: 'mundo', tilesetId: created.id })
  if (!world || !isLocalRegionAsset(world))
    throw Error(gallery.getState().mutateError ?? 'Mundo ausente')
  return { namespace, server, host, gallery, sheet, newSheet: created, world }
}

test('transporte 7: a folha e o mundo gigante sobem na ordem certa, e outro aparelho baixa os mesmos bytes', async () => {
  const { server, host, newSheet, world, namespace } = await accountWithWorld('regioes-sobem')
  try {
    await host.flush()
    const state = await host.local.causal.inspect()
    expect(state.pending).toEqual([])
    expect(state.sealed).toBeNull()
    // Nenhum aparelho fica com o mapa sem a folha: a folha entra antes ou junto do mapa.
    const sheetCommit = server.control.commits.findIndex((ids) => ids.includes(newSheet.id))
    const worldCommit = server.control.commits.findIndex((ids) => ids.includes(world.id))
    expect(sheetCommit).toBeGreaterThanOrEqual(0)
    expect(worldCommit).toBeGreaterThanOrEqual(sheetCommit)
    expect(server.remote.get(world.id)).toMatchObject({ formatVersion: 7, kind: 'tilemap' })
    expect(server.remote.get(newSheet.id)?.formatVersion).toBe(6)
    expect(server.floor()).toBe(7)
    const local = await host.local.loadAssetById(world.id)
    const uploaded = pintaWorkshopAssetFromJson(await gunzip(server.stored.get(world.id)!))
    expect(uploaded && pintaWorkshopAssetToJson(uploaded)).toBe(
      local && pintaWorkshopAssetToJson(local),
    )

    // Outro aparelho com o código desta etapa: a reconciliação da galeria desce o mundo inteiro.
    const other = `${namespace}-outro`
    setPintaStorageNamespace(other)
    const device = newHost(other, server.transport(7))
    await reconciled(device.mirror)
    const pulled = await device.local.loadAssetById(world.id)
    expect(pulled && isLocalRegionAsset(pulled)).toBe(true)
    expect(pulled && pintaWorkshopAssetToJson(pulled)).toBe(
      uploaded && pintaWorkshopAssetToJson(uploaded),
    )
    // A galeria focal da conta lista o mundo como cartão, ao lado da fila V4.
    expect(idbMockDb(dbNameFor(other)).has(PINTA_CAUSAL_OUTBOX_KEY)).toBe(true)
    const index = await device.mirror.listGalleryIndex?.()
    expect(index?.cards.map((card) => card.id)).toEqual([world.id])
    device.mirror.dispose?.()
  } finally {
    host.mirror.dispose?.()
  }
})

test('deploy anterior no mesmo aparelho: o mundo vira aviso, nada é apagado nem regravado e nada sobe', async () => {
  const { server, host, sheet, world, namespace } = await accountWithWorld('regioes-antigo')
  host.mirror.dispose?.()
  await host.flush()
  const db = idbMockDb(dbNameFor(namespace))
  const before = structuredClone([...db])
  const commits = server.control.commits.length

  const old = oldHost(namespace, server.transport(6))
  try {
    const listed = await reconciled(old.mirror)
    expect(listed.map((asset) => asset.id)).not.toContain(world.id)
    // A galeria antiga mostra "feito numa versão mais nova do Pinta" (o número é o do registro
    // físico 3 e não aparece para a criança).
    expect(old.mirror.getReadIssues?.()).toContainEqual(
      expect.objectContaining({ id: world.id, status: 'unsupported' }),
    )
    // A conta com o piso 7 fecha a leitura do leitor 6: nada desce, nada é apagado.
    expect(structuredClone([...db])).toEqual(before)
    expect(server.control.commits).toHaveLength(commits)

    // O código antigo ainda edita uma folha. A edição fica no aparelho: a leitura da conta é
    // recusada antes de qualquer subida, então a fila dele nem chega a selar a unidade.
    const current = await old.local.loadAssetById(sheet.id)
    if (current?.kind !== 'tileset') throw Error('Folha ausente')
    await old.mirror.persistAsset({ ...current, name: 'pecas-antigas' })
    await reconciled(old.mirror)
    expect((await old.local.causal.inspect()).sealed).toBeNull()
    expect(server.control.commits).toHaveLength(commits)
    expect(server.remote.get(world.id)?.revision).toBe(1)
    // O mundo continua com os mesmos registros físicos (documento, espelho e regiões).
    for (const [key, value] of before)
      if (String(key).includes(world.id)) expect(db.get(key)).toEqual(value)

    // O código desta etapa volta: o mundo reabre editável e sobe junto com a folha antiga, agora
    // por um escritor que lê o inventário inteiro.
    old.mirror.dispose?.()
    const back = newHost(namespace, server.transport(7))
    await reconciled(back.mirror)
    const reopened = await back.local.loadAssetById(world.id)
    if (!reopened || !isLocalRegionAsset(reopened)) throw Error('O mundo não reabriu')
    const gallery = createGalleryStore(back.mirror)
    await gallery.getState().load()
    const renamed = await gallery.getState().rename(world.id, 'mundo-de-volta')
    expect(gallery.getState().mutateError).toBeNull()
    expect(renamed).toBe(true)
    await back.flush()
    expect(server.remote.get(world.id)).toMatchObject({ revision: 2, name: 'mundo-de-volta' })
    expect(server.remote.get(sheet.id)).toMatchObject({ revision: 2, name: 'pecas-antigas' })
    back.mirror.dispose?.()
  } finally {
    old.mirror.dispose?.()
  }
})

test('corrida entre aparelhos: a aba antiga selou antes do piso subir e a fila nova não trava', async () => {
  const namespace = 'regioes-corrida'
  setPintaStorageNamespace(namespace)
  const sheet = addTile(createTilesetAsset({ name: 'pecas', tileSize: 16 }), 0)
  const seed = [await published(sheet, 1, '3')]
  const server = causalServer(seed)
  // Aparelho A, ainda com o deploy anterior: recebe a folha e edita offline (selada com leitor 6).
  const old = oldHost(namespace, server.transport(6))
  expect(
    await old.local.causal.applyPull(
      {
        fromEpoch: null,
        epoch: '3',
        transitions: [
          {
            id: sheet.id,
            before: null,
            beforeRevision: null,
            after: sheet,
            remote: seed[0]!.entry,
          },
        ],
      },
      () => true,
    ),
  ).toBe(true)
  const current = await old.local.loadAssetById(sheet.id)
  if (current?.kind !== 'tileset') throw Error('Folha ausente')
  await old.mirror.persistAsset({ ...current, name: 'pecas-antigas' })
  server.control.offline = true
  await expect(old.flush()).rejects.toThrow('Failed to fetch')
  const sealed = (await old.local.causal.inspect()).sealed
  expect(sealed?.intent).toMatchObject({ reader: 6, baseEpoch: '3' })
  old.mirror.dispose?.()
  server.control.offline = false

  // Aparelho B, com o código desta etapa, guarda um mundo gigante: o piso da conta vai a 7.
  const other = `${namespace}-b`
  setPintaStorageNamespace(other)
  const b = newHost(other, server.transport(7))
  await reconciled(b.mirror)
  const gallery = createGalleryStore(b.mirror)
  await gallery.getState().load()
  const world = await gallery.getState().createRegionMap({ name: 'mundo', tilesetId: sheet.id })
  if (!world) throw Error(gallery.getState().mutateError ?? 'Mundo ausente')
  await b.flush()
  expect(server.floor()).toBe(7)
  b.mirror.dispose?.()

  // A recarrega com o código desta etapa. A unidade de leitor 6 nunca será aceita: ela é
  // encerrada e recuperada, a fila segue e o mundo desce.
  setPintaStorageNamespace(namespace)
  const back = newHost(namespace, server.transport(7))
  try {
    await reconciled(back.mirror)
    const state = await back.local.causal.inspect()
    expect(state.sealed).toBeNull()
    expect(server.remote.get(sheet.id)?.revision).toBe(1)
    const pulled = await back.local.loadAssetById(world.id)
    expect(pulled && isLocalRegionAsset(pulled)).toBe(true)
    // A edição antiga não se perde: fica neste aparelho (cópia ou arquivos guardados).
    const names = (await back.local.listAllAssets()).map(({ name }) => name)
    const files = [...((await back.mirror.loadRetainedRecoveryFiles?.()) ?? new Map()).keys()]
    expect(
      names.some((name) => name.startsWith('pecas-antigas')) ||
        files.some((file) => file.includes(sealed!.intent.opId)),
    ).toBe(true)
  } finally {
    back.mirror.dispose?.()
  }
})

test('aparelho antigo que nunca viu o mundo: a conta recusa a leitura e o aparelho fica intacto', async () => {
  const { server, host } = await accountWithWorld('regioes-aparelho-novo')
  await host.flush()
  host.mirror.dispose?.()
  const fresh = 'regioes-aparelho-antigo'
  setPintaStorageNamespace(fresh)
  const old = oldHost(fresh, server.transport(6))
  try {
    expect(await reconciled(old.mirror)).toEqual([])
    expect(
      [...idbMockDb(dbNameFor(fresh)).keys()].filter((key) =>
        String(key).startsWith('pinta:local:'),
      ),
    ).toEqual([])
    await expect(server.transport(6).snapshot()).rejects.toMatchObject({
      reason: 'client-outdated',
    })
  } finally {
    old.mirror.dispose?.()
  }
})

test('aba antiga com a mesma fila: ela não sobe nem descarta a unidade regional da aba nova', async () => {
  const { server, host, world, namespace } = await accountWithWorld('regioes-duas-abas')
  const outbox = () => structuredClone(idbMockDb(dbNameFor(namespace)).get(PINTA_CAUSAL_OUTBOX_KEY))
  const before = outbox()
  expect((await host.local.causal.inspect()).pending.length).toBeGreaterThan(0)
  const old = oldHost(namespace, server.transport(6))
  try {
    await expect(old.flush()).rejects.toThrow()
    expect(server.control.commits).toEqual([])
    expect(outbox()).toEqual(before)
    await host.flush()
    expect(server.remote.get(world.id)?.formatVersion).toBe(7)
  } finally {
    old.mirror.dispose?.()
    host.mirror.dispose?.()
  }
})

test('o nativo 9 não é anunciado: a conta recusa guardar um mapa com regras sem tocar na fila', async () => {
  const { host, namespace } = await accountWithWorld('regioes-sem-nove')
  const { map, sheet, book } = await automapFixture()
  const authored = attachWorkshopBook(map, book)
  if (!authored) throw Error('O livro não se ligou ao mapa')
  const db = idbMockDb(dbNameFor(namespace))
  const before = structuredClone([...db])
  try {
    await expect(host.mirror.persistAssets([sheet, authored])).rejects.toThrow(
      WORKSHOP_NATIVE_CEILING_MESSAGE,
    )
    expect(structuredClone([...db])).toEqual(before)
  } finally {
    host.mirror.dispose?.()
  }
})
