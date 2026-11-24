// Browser QA entry for the real gallery, backed by the account host and IndexedDB.
import { createRoot } from 'react-dom/client'
import type { CreationsCloud } from '../../member-shell/src/lib/creations-cloud'
import { createCloudMirroredPintaPersistence } from '../../member-shell/src/lib/pinta-cloud-persistence'
import { PintaApp } from '../src/components/PintaApp'
import { createPintaCausalPersistence } from '../src/state/persistence'

const offline = async (): Promise<never> => {
  throw new TypeError('sem rede')
}
const cloud: CreationsCloud = {
  tool: 'pinta',
  supported: true,
  list: offline,
  upload: offline,
  peek: offline,
  remove: offline,
  download: offline,
  enqueueUpload: () => {},
  enqueueRemove: () => {},
  flush: offline,
  confirm: offline,
  getState: () => ({ status: 'offline', pending: 1, lastSavedAt: null, lastError: null }),
  getItemState: () => ({ status: 'offline', lastError: null, code: null }),
  subscribe: () => () => {},
  subscribeItems: () => () => {},
  dispose: () => {},
  pintaCausal: {
    snapshot: offline,
    verifyEpoch: offline,
    backfill: offline,
    download: offline,
    upload: offline,
  },
}

export function mountPintaRecoveryGallery(namespace: string): void {
  const local = createPintaCausalPersistence({ namespace })
  const persistence = createCloudMirroredPintaPersistence({
    local,
    cloud,
    viewerId: namespace,
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  const node = document.getElementById('root')
  if (!node) throw Error('Galeria de prova sem raiz')
  createRoot(node).render(<PintaApp persistence={persistence} />)
}

Object.assign(window, { mountPintaRecoveryGallery })
