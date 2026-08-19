import { beforeEach, describe, expect, it } from 'bun:test'
import { createPixelSpriteAsset, createVectorBackgroundAsset } from '../core/project'
import {
  clearIdbMock,
  idbMockDb,
  idbMockStats,
  resetIdbMockStats,
  setIdbWriteGuard,
} from '../testing/idbMock'
import { MAX_IMAGE_SRC_CHARS, type VectorShape } from '../vector/model'

const { PintaStorageBudgetError, createPintaPersistence, persistAsset, setPintaStorageNamespace } =
  await import('./persistence')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

describe('persistência por perfil', () => {
  it('uma escrita enfileirada mantém o store do perfil em que foi solicitada', async () => {
    let releaseFirst = (): void => {}
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    let writes = 0
    setIdbWriteGuard(async () => {
      writes += 1
      if (writes === 1) await firstBlocked
    })

    const first = createPixelSpriteAsset({ name: 'a', frameSize: 8 })
    const second = { ...first, name: 'a-2' }
    setPintaStorageNamespace('perfil-a')
    const firstWrite = persistAsset(first)
    const secondWrite = persistAsset(second)
    await Promise.resolve()

    setPintaStorageNamespace('perfil-b')
    releaseFirst()
    await Promise.all([firstWrite, secondWrite])
    setIdbWriteGuard(null)

    const key = `pinta:asset:${first.id}`
    expect((idbMockDb('sistema-zero-pinta-perfil-a').get(key) as { name?: string })?.name).toBe(
      'a-2',
    )
    expect(idbMockDb('sistema-zero-pinta-perfil-b').has(key)).toBe(false)
  })

  function galleryOverBudget(shapeCount: number) {
    const asset = createVectorBackgroundAsset({ name: 'galeria-grande', width: 16, height: 16 })
    const prefix = 'data:image/png;base64,'
    const src = `${prefix}${'A'.repeat(MAX_IMAGE_SRC_CHARS - prefix.length)}`
    const shapes: VectorShape[] = Array.from({ length: shapeCount }, (_, index) => ({
      id: `figura-${index}`,
      type: 'image',
      x: 0,
      y: 0,
      w: 16,
      h: 16,
      src,
      fill: 'none',
      stroke: null,
      opacity: 1,
      rotation: 0,
    }))
    return { ...asset, shapes }
  }

  it('recusa uma mutação que deixaria o backup da galeria acima de 32 MiB', async () => {
    const asset = galleryOverBudget(112)

    await expect(persistAsset(asset)).rejects.toBeInstanceOf(PintaStorageBudgetError)
    expect(idbMockDb('sistema-zero-pinta').has(`pinta:asset:${asset.id}`)).toBe(false)
  })

  it('galeria legada acima do teto ainda aceita uma mutação que reduz seu backup', async () => {
    const legacy = galleryOverBudget(113)
    const key = `pinta:asset:${legacy.id}`
    idbMockDb('sistema-zero-pinta').set(key, legacy)

    await expect(persistAsset({ ...legacy, shapes: legacy.shapes.slice(0, 112) })).resolves.toBe(
      undefined,
    )
    expect((idbMockDb('sistema-zero-pinta').get(key) as typeof legacy).shapes).toHaveLength(112)
  })
})

describe('autosave com centenas de desenhos (medição)', () => {
  it('500 desenhos na galeria: 50 autosaves de UM desenho não releem a galeria inteira a cada vez', async () => {
    const persistence = createPintaPersistence()
    const assets = Array.from({ length: 500 }, (_, i) =>
      createPixelSpriteAsset({ name: `heroi-${i}`, frameSize: 16 }),
    )
    await persistence.persistAssets(assets)
    // A carga da galeria (o que a criança faz antes de editar) semeia o que houver para semear.
    const loadStart = performance.now()
    const loaded = await persistence.listAllAssets()
    expect(loaded).toHaveLength(500)
    console.log(`[perf] pinta listAllAssets(500): ${(performance.now() - loadStart).toFixed(0)}ms`)

    resetIdbMockStats()
    const edited = assets[0] as (typeof assets)[number]
    const start = performance.now()
    for (let i = 0; i < 50; i += 1) {
      await persistence.persistAsset({ ...edited, updatedAt: Date.now() + i })
    }
    const elapsed = performance.now() - start
    const stats = idbMockStats()
    console.log(`[perf] pinta 50 autosaves com 500 desenhos: ${elapsed.toFixed(0)}ms`, stats)
    // O disco recebeu os 50 writes…
    expect(stats.setMany).toBe(50)
    // …e a galeria INTEIRA não foi relida a cada autosave (o teto aqui é a régua da
    // otimização do orçamento incremental: antes, `getManyKeys` era 500 × 50 = 25.000).
    expect(stats.getManyKeys).toBeLessThanOrEqual(500)
  }, 120_000)

  it('outra ABA atualiza um desenho (mesmo id): o aviso entre abas faz o inventário esquecer o id e relê-lo na próxima gravação (o orçamento não usa bytes velhos)', async () => {
    const persistence = createPintaPersistence({ namespace: 'abas' })
    const [x, y] = [
      createPixelSpriteAsset({ name: 'x', frameSize: 16 }),
      createPixelSpriteAsset({ name: 'y', frameSize: 16 }),
    ]
    await persistence.persistAssets([x, y])
    await persistence.listAllAssets() // semeia o inventário
    // A outra aba regrava X direto no "disco" (mesmo id, outra versão) e avisa pelo canal.
    idbMockDb('sistema-zero-pinta-abas').set(`pinta:asset:${x.id}`, {
      ...x,
      updatedAt: x.updatedAt + 1,
    })
    const otherTab = new BroadcastChannel('pinta:assets:sistema-zero-pinta-abas')
    otherTab.postMessage({ ids: [x.id] })
    await new Promise((resolve) => setTimeout(resolve, 20))
    otherTab.close()
    resetIdbMockStats()
    await persistence.persistAsset({ ...y, updatedAt: y.updatedAt + 1 })
    // Releu SÓ o X (esquecido pelo aviso), não a galeria inteira.
    expect(idbMockStats().getManyKeys).toBe(1)
  })
})
