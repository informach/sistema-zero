/** Prévia do céu FALSA para os testes de componente: grava as imagens recebidas. */
import type { SkyImage } from '../sky/render'
import type { SkyPreviewLike } from '../viewport/SkyPreview'
import { setMoldaSkyPreviewFactory } from '../viewport/skyPreviewFactory'

export interface FakeSkyPreview extends SkyPreviewLike {
  images: SkyImage[]
  disposed: boolean
}

export function installFakeSkyPreview(): { instances: FakeSkyPreview[]; uninstall(): void } {
  const instances: FakeSkyPreview[] = []
  setMoldaSkyPreviewFactory(() => {
    const fake: FakeSkyPreview = {
      images: [],
      disposed: false,
      setSky(image) {
        fake.images.push(image)
      },
      dispose() {
        fake.disposed = true
      },
    }
    instances.push(fake)
    return fake
  })
  return { instances, uninstall: () => setMoldaSkyPreviewFactory(null) }
}
