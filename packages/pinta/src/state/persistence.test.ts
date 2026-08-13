import { beforeEach, describe, expect, it } from 'bun:test'
import { createPixelSpriteAsset, createVectorBackgroundAsset } from '../core/project'
import { clearIdbMock, idbMockDb, setIdbWriteGuard } from '../testing/idbMock'
import { MAX_IMAGE_SRC_CHARS, type VectorShape } from '../vector/model'

const { PintaStorageBudgetError, persistAsset, setPintaStorageNamespace } = await import(
  './persistence'
)

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
