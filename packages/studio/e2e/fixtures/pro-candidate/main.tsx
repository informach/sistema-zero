import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createEmptyProject } from '../../../src/core/project'
import { ProPreview } from '../../../src/modes/pro/ProPreview'
import { createGameStorageSession } from '../../../src/state/gameStorage'
import { setProjectStorageNamespace } from '../../../src/state/projectStorageRuntime'
import { useProjectStore } from '../../../src/state/projectStore'
import {
  StudioProCandidatePreviewProvider,
  useProCandidatePreview,
} from '../../../src/studio/pro-candidate-preview'
import { StudioProRuntimeProvider } from '../../../src/studio/pro-runtime'
import '../../../playground/styles.css'

const project = {
  ...createEmptyProject('candidate-browser', 'Jogo atual'),
  kind: 'pro' as const,
  mode: 'code' as const,
  tree: { 'main.ts': { kind: 'file' as const, content: 'const goal = 10' } },
}
useProjectStore.setState({ project })
await createGameStorageSession(project.id).write({ score: 'saved' })
const artifact = (letter: string, ttl = 60_000) => ({
  id: letter.repeat(64),
  sha256: 'f'.repeat(64),
  url: `https://runtime.test/v1/artifacts/${letter.repeat(64)}/index.html`,
  expiresAt: Date.now() + ttl,
})
let builds = 0
const runtime = {
  async build() {
    builds++
    return { artifact: artifact('a') }
  },
}
function Fixture() {
  const [open, setOpen] = useState(true)
  const [persisted, setPersisted] = useState('')
  const [profile, setProfile] = useState(0)
  const api = useProCandidatePreview()
  const doc = useProjectStore((state) => state.project)
  const show = (letter = 'b', ttl = 60_000) =>
    api.show({
      projectId: project.id,
      jobId: 'job',
      artifact: artifact(letter, ttl),
      revisionHash: 'c'.repeat(64),
    })
  return (
    <main
      data-sz-theme="dark"
      className="bg-sz-panel text-sz-fg"
      style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" onClick={() => setOpen(!open)}>
          {open ? 'Fechar painel' : 'Abrir painel'}
        </button>
        {open && (
          <>
            <button type="button" onClick={() => show()}>
              Jogar proposta
            </button>
            <button type="button" onClick={() => show('c', 800)}>
              Prévia breve
            </button>
            <button type="button" onClick={() => show('d')}>
              Artefato indisponível
            </button>
            <button type="button" onClick={() => show('e')}>
              Recriar prévia
            </button>
          </>
        )}
        <button
          type="button"
          onClick={async () =>
            setPersisted((await createGameStorageSession(project.id).load()).score ?? 'empty')
          }
        >
          Consultar progresso salvo
        </button>
        <button
          type="button"
          onClick={() => {
            setProjectStorageNamespace(`profile-${profile + 1}`)
            setProfile(profile + 1)
            useProjectStore.setState({ project: { ...project } })
          }}
        >
          Trocar perfil
        </button>
        <button
          type="button"
          onClick={() => useProjectStore.setState({ project: { ...project, id: 'other' } })}
        >
          Trocar projeto
        </button>
      </div>
      <output aria-label="Código persistido">
        {doc?.tree?.['main.ts']?.kind === 'file' ? doc.tree['main.ts'].content : ''}
      </output>
      <output aria-label="Compilações">{builds}</output>
      <output aria-label="Progresso salvo">{persisted}</output>
      <output aria-label="Estado da proposta">{api.candidate?.status ?? 'none'}</output>
      <div style={{ minHeight: 0, flex: 1 }}>
        <ProPreview />
      </div>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudioProRuntimeProvider value={runtime}>
      <StudioProCandidatePreviewProvider>
        <Fixture />
      </StudioProCandidatePreviewProvider>
    </StudioProRuntimeProvider>
  </StrictMode>,
)
