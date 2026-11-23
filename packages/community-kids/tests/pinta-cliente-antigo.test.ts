/**
 * O fim das flags do Pinta (23/11/2026): todo perfil passa à nuvem causal, mas abas e aparelhos
 * com o código anterior existem de verdade (e o host atual usa o mesmo caminho quando a sessão não
 * tem a conta do Pinta, como o suporte em modo leitura). Este é o cliente SEM a fila causal num
 * perfil que já virou causal: a conta recusa com `PINTA_CAUSAL_CONFLICT`/`protocol-required`, e o
 * que está no aparelho continua inteiro, sem cópia, sem lápide e sem PUT no armazenamento.
 */
import { expect, test } from 'bun:test'
import type { PintaAsset } from '@sistemazero/pinta/assets'
import { createAsset } from '@sistemazero/pinta/assets'
import { createCreationsCloud } from '../src/lib/creations-cloud'
import { createMemorySyncedMarks } from '../src/lib/creations-sync'
import {
  createCloudMirroredPintaPersistence,
  createMemoryPintaFormatMemory,
  type PintaPersistenceLike,
} from '../src/lib/pinta-cloud-persistence'

const refusal = {
  error: { code: 'PINTA_CAUSAL_CONFLICT', message: 'protocol-required' },
  reason: 'protocol-required',
}

function device(initial: PintaAsset[]): PintaPersistenceLike & {
  rows: Map<string, PintaAsset>
  deleted: string[]
} {
  const rows = new Map(initial.map((asset) => [asset.id, asset]))
  const deleted: string[] = []
  return {
    rows,
    deleted,
    async persistAsset(asset) {
      rows.set(asset.id, asset)
    },
    async persistAssets(assets) {
      for (const asset of assets) rows.set(asset.id, asset)
    },
    async deleteAsset(id) {
      deleted.push(id)
      rows.delete(id)
    },
    async loadAssetById(id) {
      return rows.get(id) ?? null
    },
    async listAllAssets() {
      return [...rows.values()]
    },
  }
}

test('cliente antigo num perfil causal: a conta recusa com clareza e o aparelho guarda tudo', async () => {
  const heroi = createAsset({ kind: 'pixel-sprite', name: 'herói', frameSize: 16 })
  const folha = createAsset({ kind: 'tileset', name: 'folha', tileSize: 16 })
  const offline = createAsset({ kind: 'pixel-sprite', name: 'feito sem internet', frameSize: 8 })
  const requests: string[] = []
  const cloud = createCreationsCloud({
    tool: 'pinta',
    maxFormatVersion: 6,
    viewerId: 'perfil',
    audience: 'kids',
    idleMs: 0,
    wait: async () => {},
    fetch: async (input, init) => {
      const path = String(input)
      requests.push(`${init?.method ?? 'GET'} ${path}`)
      // A biblioteca de paletas fica fora da cerca dos desenhos; aqui ela ainda não existe.
      if (path.includes('sz-pinta-palettes'))
        return Response.json({ error: { code: 'CREATION_NOT_FOUND' } }, { status: 404 })
      // Todo o resto do inventário pessoal é a conta adotada: lista, reserva, commit e DELETE.
      return Response.json(refusal, { status: 409 })
    },
  })
  expect(cloud.pintaCausal).toBeUndefined()
  const marks = createMemorySyncedMarks()
  // O herói e a folha já tinham subido pelo escritor antigo (revisão 1) antes da adoção.
  marks.set(heroi.id, heroi.updatedAt, 1)
  marks.set(folha.id, folha.updatedAt, 1)
  const local = device([heroi, folha, offline])
  const mirrored = createCloudMirroredPintaPersistence({
    local,
    cloud,
    viewerId: 'perfil',
    marks,
    formatMemory: createMemoryPintaFormatMemory(),
    reconcileMinIntervalMs: 0,
    passDelayMs: 0,
  })
  const synced = () =>
    new Promise<void>((resolve) => {
      const stop = mirrored.subscribe?.((event) => {
        if (event.type !== 'sync-end') return
        stop?.()
        resolve()
      })
    })

  // A descida: a lista da conta é recusada, e nada do aparelho some nem vira cópia.
  const firstPass = synced()
  expect((await mirrored.listAllAssets()).map((asset) => asset.id).sort()).toEqual(
    [heroi.id, folha.id, offline.id].sort(),
  )
  await firstPass
  expect([...local.rows.keys()].sort()).toEqual([heroi.id, folha.id, offline.id].sort())
  expect(local.deleted).toEqual([])

  // A gravação: a edição fica no aparelho; a conta recusa a reserva e a fila mostra o erro.
  const edited = { ...heroi, name: 'herói de capa', updatedAt: heroi.updatedAt + 1000 }
  await mirrored.persistAsset(edited)
  await mirrored.persistAsset(offline)
  await cloud.flush()
  expect(local.rows.get(heroi.id)).toEqual(edited)
  expect(local.rows.get(offline.id)).toEqual(offline)
  for (const id of [heroi.id, offline.id]) {
    expect(cloud.getItemState(id)).toMatchObject({ status: 'error', code: 'PINTA_CAUSAL_CONFLICT' })
  }
  expect(cloud.getState().status).toBe('error')
  // A marca do que já tinha subido não anda (a conta não aceitou nada).
  expect(marks.revision(heroi.id)).toBe(1)
  expect(marks.revision(offline.id)).toBeUndefined()
  // Nenhum PUT, commit ou DELETE chegou a sair: só leituras e reservas recusadas.
  expect(
    requests.filter((request) => !/^(GET|POST) \/api\/creations\/pinta/.test(request)),
  ).toEqual([])
  expect(requests.some((request) => request.includes('/commit'))).toBe(false)
  expect(requests.some((request) => request.startsWith('DELETE'))).toBe(false)
  expect(local.deleted).toEqual([])
  mirrored.dispose?.()
  cloud.dispose({ abort: true })
})
