import { setStudioStorageNamespace } from '@sistemazero/studio'
import { StudioEditor } from '@sistemazero/studio/editor'
import { createLocalPersistenceAdapter } from '@sistemazero/studio/local-persistence'
import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PintaClient } from '../../../member-shell/src/components/creator/pinta-client'
import { useStudioCreationLibraries } from '../../../member-shell/src/components/creator/use-studio-creation-libraries'
import type { EditableStudioProject } from '../../src/core/editableProject'
import '@fontsource/baloo-2/latin-700.css'
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-700.css'
import './styles.css'
import { QA_PROFILE as profile } from './profile'

// Isolated synthetic profile; Playwright aborts API requests to exercise offline behavior.
// No credentials, authenticated account or successful cloud response are simulated.
setStudioStorageNamespace(profile)
function Studio() {
  const adapter = useMemo(() => createLocalPersistenceAdapter({ namespace: profile }), [])
  const [initial, setInitial] = useState<EditableStudioProject | null>(null)
  const [observed, setObserved] = useState<EditableStudioProject | null>(null)
  const { pintaLibrary } = useStudioCreationLibraries(profile, true, false)
  useEffect(() => {
    let active = true
    void (async () => {
      const summaries = (await adapter.list?.()) ?? []
      const selected =
        new URLSearchParams(window.location.search).get('project') ?? summaries[0]?.id
      if (!selected) return
      const loaded = await adapter.load(selected)
      if (active) {
        setInitial(loaded)
        setObserved(loaded)
      }
    })()
    return () => {
      active = false
    }
  }, [adapter])
  if (!initial) return <p role="status">Carregando projeto local…</p>
  return (
    <>
      <StudioEditor
        initialProject={initial}
        persistence={adapter}
        pintaLibrary={pintaLibrary}
        onExit={() => window.location.assign('/pinta')}
        onEditDrawing={(id, tab) => {
          const url = `/pinta?desenho=${encodeURIComponent(id)}`
          if (tab) tab.location.href = url
          else window.open(url, '_blank', 'noopener')
        }}
        onChange={setObserved}
        onSave={setObserved}
      />
      <output hidden data-testid="qa-project">
        {JSON.stringify(observed)}
      </output>
    </>
  )
}
const element = document.getElementById('root')
if (!element) throw new Error('Missing root')
createRoot(element).render(
  <StrictMode>
    {window.location.pathname.startsWith('/estudio') ? (
      <Studio />
    ) : (
      <PintaClient viewerId={profile} studioAvailable />
    )}
  </StrictMode>,
)
