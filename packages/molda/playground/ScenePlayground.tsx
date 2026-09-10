import { createStore } from 'idb-keyval'
import { useCallback, useMemo } from 'react'
import { SceneWorkshopHost } from '../src/components/editor/scene/SceneWorkshopHost'

/** Not exported by the package. Only the local playground can activate this writer. */
export default function ScenePlayground({ id }: { id: string | null }) {
  const store = useMemo(() => createStore('sistema-zero-molda-playground', 'assets'), [])
  const onRouteChange = useCallback((next: string | null) => {
    const url = new URL(window.location.href)
    url.searchParams.set('oficina', 'nova')
    if (next === null) url.searchParams.delete('criacao')
    else url.searchParams.set('criacao', next)
    window.history.replaceState(window.history.state, '', url)
  }, [])
  return <SceneWorkshopHost store={store} initialId={id} onRouteChange={onRouteChange} />
}
