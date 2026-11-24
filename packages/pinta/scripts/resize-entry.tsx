import { createRoot } from 'react-dom/client'
import { pintaAssetToWire } from '../src/assets/wire'
import { createPintaPersistence } from '../src/state/persistence'
import { createResizeScreenHost } from './homologacao/resizeScreenHost'
import { runResizeRegionsProbe } from './resize-regions-probe'

const params = new URL(location.href).searchParams,
  read = params.get('read')
if (read) {
  Object.assign(window, {
    resizeStored: (await createPintaPersistence({ namespace: read }).listAllAssets()).map(
      pintaAssetToWire,
    ),
  })
} else {
  const host = await createResizeScreenHost(
    params.get('lesson') === '1',
    `qa-resize-${crypto.randomUUID()}`,
  )
  Object.assign(window, { resizeQa: host, runResizeRegionsProbe })
  const root = document.getElementById('root')
  if (!root) throw Error('Palco ausente')
  createRoot(root).render(<host.Host />)
}
