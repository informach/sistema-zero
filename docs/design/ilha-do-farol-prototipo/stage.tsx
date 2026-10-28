import { useEffect, useRef, useState } from 'react'
import source from '../../../.cache/ilha-do-farol/source'
export type Point = { x: number; y: number; z: number }
export type WorldState = {
  mode: 'view' | 'position' | 'contact' | 'game'
  view: 'front' | 'side' | 'top'
  key: Point
  hero?: { x: number; z: number }
  axes?: boolean
  bounds?: boolean
  visible?: boolean
  light?: boolean
}
const doc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden}canvas{display:block}</style></head><body><script>${source.replaceAll('</script', '<\\/script')}</script></body></html>`
export function World({
  state,
  onContact,
}: {
  state: WorldState
  onContact?: (contact: boolean) => void
}) {
  const frame = useRef<HTMLIFrameElement>(null),
    latest = useRef(state),
    callback = useRef(onContact)
  const [error, setError] = useState(''),
    [ready, setReady] = useState(false)
  latest.current = state
  callback.current = onContact
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return
      if (e.data?.type === 'ilha-ready') {
        setReady(true)
        frame.current?.contentWindow?.postMessage(
          { type: 'ilha-state', state: latest.current },
          '*',
        )
      }
      if (e.data?.type === 'ilha-contact' && e.data.stamp === JSON.stringify(latest.current))
        callback.current?.(e.data.contact)
      if (e.data?.type === 'ilha-error') setError(e.data.message)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [])
  useEffect(() => {
    if (ready) frame.current?.contentWindow?.postMessage({ type: 'ilha-state', state }, '*')
  }, [state, ready])
  return (
    <div className="ilha-world" data-ready={ready}>
      <iframe ref={frame} title="Ilha interativa em 3D" sandbox="allow-scripts" srcDoc={doc} />
      {error && <p role="alert">Não foi possível abrir o 3D neste navegador. {error}</p>}
      <span className="ilha-camera-label">
        {{ front: 'Vista de frente', side: 'Vista de lado', top: 'Vista de cima' }[state.view]}
      </span>
      {state.axes && (
        <div className="ilha-world-legend">
          <span data-axis="x">X · chão</span>
          <span data-axis="z">Z · chão</span>
          <span data-axis="y">Y · altura</span>
        </div>
      )}
    </div>
  )
}
