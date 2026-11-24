import { createRoot } from 'react-dom/client'
import { pintaAssetToWire } from '../src/assets/wire'
import { createPintaPersistence } from '../src/state/persistence'
import { createTilesetRemapHost, type TileRemapMode } from './homologacao/tilesetRemapHost'
import { runRemapRegionsProbe } from './remap-regions-probe'

const params = new URL(location.href).searchParams,
  read = params.get('read')
if (read) {
  Object.assign(window, {
    tileRemapStored: (await createPintaPersistence({ namespace: read }).listAllAssets()).map(
      pintaAssetToWire,
    ),
  })
} else {
  const mode = params.get('mode') ?? 'normal'
  function validMode(value: string): value is TileRemapMode {
    return ['normal', 'overflow', 'supersede'].includes(value)
  }
  if (!validMode(mode)) throw Error('Modo inválido')
  const host = await createTilesetRemapHost(mode, `qa-tile-remap-${crypto.randomUUID()}`)
  Object.assign(window, { tileRemapQa: host, runRemapRegionsProbe })
  const root = document.getElementById('root')
  if (!root) throw Error('Palco ausente')
  createRoot(root).render(<host.Host />)
}
