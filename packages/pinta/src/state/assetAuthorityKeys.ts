import { LOCAL_CHUNK_PREFIX } from './localChunkStorage'

export const PINTA_CAUSAL_OUTBOX_KEY = 'pinta:sync:causal'

export function isLocalAssetInventoryKey(key: unknown): key is string {
  return (
    typeof key === 'string' &&
    (key === PINTA_CAUSAL_OUTBOX_KEY ||
      ((key.startsWith('pinta:asset:') || key.startsWith('pinta:local:')) &&
        !key.startsWith(LOCAL_CHUNK_PREFIX)))
  )
}
