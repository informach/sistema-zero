import type { PintaHostAdapter } from '@sistemazero/pinta'
import { createRoot } from 'react-dom/client'
import { PintaApp } from '../../pinta/src/components/PintaApp'
import type { PintaMemoryAsset } from '../../pinta/src/core/assetMemory'
import type { PintaPersistence } from '../../pinta/src/state/persistence'

/** Real Pinta UI hosted by the existing browser qualification page. */
export function mountPintaPlayButton(
  persistence: PintaPersistence<PintaMemoryAsset>,
  adapter: PintaHostAdapter,
) {
  const element = document.createElement('div')
  element.style.cssText = 'position:fixed;inset:0;z-index:10000;background:white;overflow:auto'
  document.body.append(element)
  const root = createRoot(element)
  root.render(<PintaApp persistence={persistence} adapter={adapter} />)
  return {
    dispose() {
      root.unmount()
      element.remove()
    },
  }
}
