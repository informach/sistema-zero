import { awaitWithSignal } from '@sistemazero/core/http'
import { checkAdmittedPintaPngPixels } from '@sistemazero/core/studio/pinta-region-png-pixels'
import type { AdmittedPintaRegionalMaterial } from './pintaRegionalMaterial'

/** Only a fully admitted world's already bounded PNGs may reach the graphics decoder. */
export async function checkRegionalProjectPixels(
  world: AdmittedPintaRegionalMaterial['world'],
  signal?: AbortSignal,
): Promise<void> {
  for (const images of [world.maps.values(), world.images.values()]) {
    for (const { png, width, height } of images) {
      signal?.throwIfAborted()
      const decode = () => createImageBitmap(new Blob([png], { type: 'image/png' }))
      let image: ImageBitmap | undefined
      try {
        checkAdmittedPintaPngPixels({ png, width, height })
        image = signal
          ? await awaitWithSignal(decode, signal, (late) => late.close())
          : await decode()
        signal?.throwIfAborted()
        if (image.width !== width || image.height !== height) throw new Error()
      } catch (error) {
        signal?.throwIfAborted()
        throw new Error(
          'Não consegui abrir todas as imagens deste cenário. A versão original foi preservada.',
          { cause: error },
        )
      } finally {
        image?.close()
      }
    }
  }
}
