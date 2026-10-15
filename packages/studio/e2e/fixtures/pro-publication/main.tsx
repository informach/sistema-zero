import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  StudioProjectPlayer,
  type StudioProjectPlayerProps,
} from '../../../src/components/preview/StudioProjectPlayer'
import { createGameStorageSession } from '../../../src/state/gameStorage'

function Fixture() {
  const [props, setProps] = useState<StudioProjectPlayerProps | null>(null)
  const [status, setStatus] = useState('loading')
  const frame = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    const abort = new AbortController()
    void fetch('/fixture-publication', { signal: abort.signal })
      .then((response) => response.json())
      .then(setProps)
      .catch(() => {})
    return () => abort.abort()
  }, [])
  const message = (data: unknown) => frame.current?.contentWindow?.postMessage(data, '*')
  return (
    <main>
      <output aria-label="Player status">{status}</output>
      <button type="button" onClick={() => message({ type: 'sz:audio', muted: true })}>
        Silenciar pelo player
      </button>
      <button type="button" onClick={() => message({ type: 'sz:audio', muted: false })}>
        Restaurar som pelo player
      </button>
      <button
        type="button"
        onClick={() => {
          message({ type: 'sz:gamepad', action: 'keydown', key: 'Enter', code: 'Enter' })
          message({ type: 'sz:gamepad', action: 'keyup', key: 'Enter', code: 'Enter' })
        }}
      >
        Começar pelo player
      </button>
      <button
        type="button"
        onClick={async () => {
          await createGameStorageSession('editor-project').write({ score: 'editor' })
          document.querySelector('#editor-save')!.textContent = 'editor'
        }}
      >
        Preparar progresso do editor
      </button>
      <output id="editor-save" />
      <button
        type="button"
        onClick={async () => {
          document.querySelector('#editor-save')!.textContent =
            (await createGameStorageSession('editor-project').load()).score ?? 'empty'
        }}
      >
        Consultar progresso do editor
      </button>
      <div style={{ width: '100%', height: '850px' }}>
        {props && (
          <StudioProjectPlayer
            {...props}
            ref={frame}
            onReady={() => setStatus('ready')}
            onError={() => setStatus('error')}
          />
        )}
      </div>
    </main>
  )
}
createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
)
