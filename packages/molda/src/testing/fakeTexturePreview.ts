/** Prévia 3D da textura FALSA para os testes de componente. */
import type { TexturePreviewLike } from '../viewport/TexturePreview'
import { setMoldaTexturePreviewFactory } from '../viewport/texturePreviewFactory'

export interface FakeTexturePreview extends TexturePreviewLike {
  textures: Array<{ rgba: Uint8Array; size: number }>
  disposed: boolean
}

export function installFakeTexturePreview(): {
  instances: FakeTexturePreview[]
  uninstall(): void
} {
  const instances: FakeTexturePreview[] = []
  setMoldaTexturePreviewFactory(() => {
    const fake: FakeTexturePreview = {
      textures: [],
      disposed: false,
      setTexture(rgba, size) {
        fake.textures.push({ rgba, size })
      },
      dispose() {
        fake.disposed = true
      },
    }
    instances.push(fake)
    return fake
  })
  return { instances, uninstall: () => setMoldaTexturePreviewFactory(null) }
}
