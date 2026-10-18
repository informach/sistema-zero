import { useState } from 'react'
import type { Root } from 'react-dom/client'
import { createStudioPublicationAdapter } from '../../../member-shell/src/lib/studio-publication-adapter'
import { ShareDialog } from '../../src/components/layout/ShareDialog'
import { projectPublicationId } from '../../src/core/projectPublication'
import { setProjectStorageNamespace } from '../../src/state/projectStorageRuntime'
import { StudioStoresContext } from '../../src/state/storesContext'
import { createStudioStores } from '../../src/state/studioStores'
import type { StudioShareAdapter } from '../../src/studio/share'

/** Exercises the actual sharing/history UI. Editing/runtime editor has separate fixtures. */
export function createPublicAuthorProbe(root: Root) {
  let stores = createStudioStores()
  let reopen = () => {}
  const adapter: StudioShareAdapter = {
    presetDescription: 'Meu jogo de teste',
    presetCoverUrl: 'https://cover.example.test/game.png',
    publication: createStudioPublicationAdapter(),
    async publish(input) {
      const form = new FormData()
      form.set('title', input.title)
      form.set('description', input.description)
      form.set('clientIdempotencyKey', input.requestId ?? crypto.randomUUID())
      form.set('project', new File([JSON.stringify(input.project)], 'project.json'))
      const response = await fetch('/api/studio/publish-standalone', { method: 'POST', body: form })
      const body = await response.json()
      if (!response.ok) throw new Error(JSON.stringify(body))
      return body
    },
  }
  function App() {
    const [open, setOpen] = useState(true)
    reopen = () => setOpen(true)
    return (
      <StudioStoresContext value={stores}>
        <button type="button" onClick={() => setOpen(true)}>
          Compartilhar meu projeto
        </button>
        <ShareDialog open={open} onClose={() => setOpen(false)} adapter={adapter} />
      </StudioStoresContext>
    )
  }
  return {
    async create(kind: 'classic' | 'pro', turtle = false) {
      const response = await fetch(`/public-probe/setup?kind=${kind}&turtle=${turtle ? 1 : 0}`)
      const setup = await response.json()
      setProjectStorageNamespace(`${setup.actor.userId}-public-${crypto.randomUUID()}`)
      stores = createStudioStores()
      stores.project.getState().hydrateProject(setup.project)
      root.render(<App key={setup.project.id} />)
    },
    async source(source: string) {
      const project = stores.project.getState().project
      if (project?.programmingLanguage !== 'python') throw new Error('No Python project')
      const problem = stores.project.getState().setPythonFile(project.python.entrypoint, source)
      if (problem) throw new Error(problem)
      await stores.persistence.save()
    },
    project: () => structuredClone(stores.project.getState().project),
    async pintaAsset() {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 32
      const context = canvas.getContext('2d')
      if (!context) throw new Error('PNG encoder unavailable')
      context.fillStyle = '#17a2ff'
      context.fillRect(0, 0, 32, 32)
      const problem = stores.project.getState().addAsset({
        name: 'heroi',
        kind: 'image',
        source: 'library',
        libOrigin: 'pinta',
        libId: 'personal:probe-drawing',
        libRevision: 1,
        dataUrl: canvas.toDataURL('image/png'),
        width: 32,
        height: 32,
        license: { name: 'CC0', attribution: 'Qualification drawing' },
      })
      if (problem) throw new Error(problem)
      await stores.persistence.save()
      return stores.project.getState().project?.assets?.find((asset) => asset.name === 'heroi')
        ?.proPath
    },
    playId: () => {
      const project = stores.project.getState().project
      return project ? projectPublicationId(project) : undefined
    },
    reopen: () => reopen(),
  }
}
declare global {
  var studioPublicAuthorProbe: ReturnType<typeof createPublicAuthorProbe>
}
