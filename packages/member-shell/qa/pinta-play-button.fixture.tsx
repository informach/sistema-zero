import type { PintaHostAdapter } from '@sistemazero/pinta'
import { createRoot } from 'react-dom/client'
import { PintaApp } from '../../pinta/src/components/PintaApp'
import type { PintaMemoryAsset } from '../../pinta/src/core/assetMemory'
import type { PintaPersistence } from '../../pinta/src/state/persistence'

/** Real Pinta UI hosted by the existing browser qualification page. */
export async function mountPintaPlayButton(
  persistence: PintaPersistence<PintaMemoryAsset>,
  adapter: PintaHostAdapter,
) {
  const stylesheet = document.createElement('link')
  stylesheet.rel = 'stylesheet'
  stylesheet.href = '/pinta-play-button.css'
  await new Promise<void>((resolve, reject) => {
    stylesheet.onload = () => resolve()
    stylesheet.onerror = () => reject(new Error('The real Pinta styles must load.'))
    document.head.append(stylesheet)
  })
  const element = document.createElement('div')
  element.style.cssText = 'position:fixed;inset:0;z-index:10000;background:white;overflow:auto'
  document.body.append(element)
  const root = createRoot(element)
  root.render(<PintaApp persistence={persistence} adapter={adapter} />)
  return {
    dispose() {
      root.unmount()
      element.remove()
      stylesheet.remove()
    },
  }
}
