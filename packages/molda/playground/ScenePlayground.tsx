import { createStore } from 'idb-keyval'
import { useCallback, useMemo } from 'react'
import { SceneWorkshopHost } from '../src/components/editor/scene/SceneWorkshopHost'
import { MoldaToolAccessProvider } from '../src/components/toolAccess'
import type { MoldaToolAccess } from '../src/core/toolFamilies'

/** Not exported by the package. Only the local playground can activate this writer. */
export default function ScenePlayground({
  id,
  toolAccess,
}: {
  id: string | null
  /** `?nivel=`: fora do app não há adapter, então o portão entra pelo provedor. */
  toolAccess: MoldaToolAccess | undefined
}) {
  const store = useMemo(() => createStore('sistema-zero-molda-playground', 'assets'), [])
  const onRouteChange = useCallback((next: string | null) => {
    const url = new URL(window.location.href)
    url.searchParams.set('oficina', 'nova')
    if (next === null) url.searchParams.delete('criacao')
    else url.searchParams.set('criacao', next)
    window.history.replaceState(window.history.state, '', url)
  }, [])
  return (
    <MoldaToolAccessProvider access={toolAccess}>
      <SceneWorkshopHost store={store} initialId={id} onRouteChange={onRouteChange} />
    </MoldaToolAccessProvider>
  )
}
