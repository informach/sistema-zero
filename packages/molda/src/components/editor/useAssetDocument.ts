import { useCallback, useEffect, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import { MoldaUnsupportedVersionError } from '../../core/documentVersion'
import type { MoldaAsset } from '../../core/model'
import type { MoldaPersistence } from '../../state/persistence'

type DocumentState =
  | { status: 'loading' }
  | { status: 'ready'; asset: MoldaAsset }
  | { status: 'error'; message: string }

/** An editor owns ONE loaded document. Late loads cannot replace an edited or different one. */
export function useAssetDocument(persistence: MoldaPersistence, id: string) {
  const [state, setState] = useState<DocumentState>({ status: 'loading' })
  const generation = useRef(0)
  const retry = useCallback(() => {
    const request = ++generation.current
    setState({ status: 'loading' })
    void Promise.resolve()
      .then(() => persistence.load(id))
      .then(
        (asset) => {
          if (generation.current !== request) return
          setState(
            asset ? { status: 'ready', asset } : { status: 'error', message: COPY.editor.notFound },
          )
        },
        (error: unknown) => {
          if (generation.current !== request) return
          setState({
            status: 'error',
            message:
              error instanceof MoldaUnsupportedVersionError
                ? COPY.gallery.recoveryHint
                : COPY.editor.loadError,
          })
        },
      )
  }, [persistence, id])
  useEffect(() => {
    retry()
    return () => {
      generation.current += 1
    }
  }, [retry])
  return { state, retry }
}
