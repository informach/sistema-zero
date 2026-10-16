import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createEmptyProject } from '../../../src/core/project'
import { getMonacoModelPath } from '../../../src/monaco/modelPaths'
import { StudioEditor } from '../../../src/studio/StudioEditor'
import type { StudioTutorConfig } from '../../../src/studio/tutor'
import '../../../playground/styles.css'

const project = {
  ...createEmptyProject('workspace-browser', 'Meu primeiro jogo'),
  kind: 'pro' as const,
  mode: 'code' as const,
  proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
  assets: [
    {
      id: 'estrela',
      name: 'estrela',
      kind: 'image' as const,
      source: 'upload' as const,
      width: 1,
      height: 1,
      dataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZwoAAAAASUVORK5CYII=',
    },
  ],
  tree: {
    src: { kind: 'dir' as const },
    'src/main.ts': {
      kind: 'file' as const,
      content: 'import { speed } from "./config"\nexport const score = speed + 1\n',
    },
    'src/config.ts': { kind: 'file' as const, content: 'export const speed = 4\n' },
    'src/closed.ts': { kind: 'file' as const, content: 'export const wrong: number = "text"\n' },
  },
}
const runtime = {
  async build() {
    return {
      html: '<!doctype html><html><body><p id="session"></p><script>document.getElementById("session").textContent="Sessão "+Date.now()</script></body></html>',
    }
  },
}
const tutor: StudioTutorConfig = {
  adapter: {
    builder: {
      availability: async () => ({
        available: false,
        reason: 'Construtor indisponível neste teste.',
      }),
      latest: async () => null,
      create: async () => {
        throw new Error('O teste não autoriza enviar uma construção.')
      },
      cancel: async () => null,
    },
    loadHistory: async () => ({ messages: [], nextCursor: null }),
    ask: async () => ({
      response: {
        id: crypto.randomUUID(),
        text: 'Confira o nome no arquivo.',
        scope: 'concept',
        blockReferences: [],
        createdAt: new Date().toISOString(),
      },
    }),
    feedback: async () => {},
    deleteHistory: async () => {},
  },
}
function Fixture() {
  const [models, setModels] = useState('[]')
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <button
        type="button"
        onClick={async () => {
          const { editor } = await import('monaco-editor/esm/vs/editor/editor.api.js')
          setModels(
            JSON.stringify(
              editor.getModels().map((model) => ({
                id: model.id,
                path: getMonacoModelPath(model),
                content: model.getValue(),
              })),
            ),
          )
        }}
      >
        Inspecionar buffers
      </button>
      <output aria-label="Buffers da sessão" style={{ display: 'none' }}>
        {models}
      </output>
      <div style={{ flex: 1, minHeight: 0 }}>
        <StudioEditor
          initialProject={project}
          persistence="none"
          features={{ terminal: false }}
          proRuntime={runtime}
          tutor={tutor}
        />
      </div>
    </div>
  )
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
)
