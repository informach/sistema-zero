import { beforeEach, describe, expect, it } from 'bun:test'
import { createPixelSpriteAsset } from '../core/project'
import { clearIdbMock, idbMockDb, setIdbWriteGuard } from '../testing/idbMock'

const { persistAsset, setPintaStorageNamespace } = await import('./persistence')

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
})
