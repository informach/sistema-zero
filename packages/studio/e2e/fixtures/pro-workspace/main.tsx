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
if (new URLSearchParams(location.search).has('performance')) {
  for (let index = 0; index < 75; index++) {
    const path = `src/fixture-${String(index).padStart(3, '0')}.ts`
    Object.assign(project.tree, {
      [path]: {
        kind: 'file',
        content: `export const value${index} = ${index}\n${'// deterministic workspace fixture\n'.repeat(300)}`,
      },
    })
  }
}
if (new URLSearchParams(location.search).has('symbols')) {
  project.tree['src/main.ts'].content = [
    ...Array.from({ length: 350 }, (_, index) => `export const item${index} = ${index};`),
    'export function zzUpdate() { return item349; }',
  ].join('\n')
}
if (new URLSearchParams(location.search).has('references')) {
  project.tree['src/main.ts'].content = [
    'export const score = 1;',
    ...Array.from({ length: 251 }, () => 'console.log(score);'),
  ].join('\n')
}
const runtime = {
  async build() {
    return {
      html: '<!doctype html><html><body><p id="session"></p><script>document.getElementById("session").textContent="Sessão "+Date.now()</script></body></html>',
    }
  },
}
const startupProject = createEmptyProject('startup-hostile-browser', 'Primeira execução')
startupProject.mode = 'bridge'
startupProject.bridgeCodeAhead = true
startupProject.files['script.js'] = [
  'console.log("startup-first-run");',
  'const dados = Array.from({ length: 300000 }, (_, i) => (i * 7919) % 10007);',
  'const fim = Date.now() + 30000;',
  'function gastar() { if (Date.now() < fim) { dados.slice().sort((a, b) => a - b); gastar(); } }',
  'gastar();',
].join('\n')
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
  const [models, setModels] = useState({ value: '[]', version: 0 })
  const [zipResult, setZipResult] = useState('')
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {new URLSearchParams(location.search).has('zip') && (
        <div>
          {[false, true].map((cancel) => (
            <button
              type="button"
              key={String(cancel)}
              onClick={async () => {
                const { zipProbe } = await import('./zipProbe')
                setZipResult(JSON.stringify(await zipProbe(cancel)))
              }}
            >
              {cancel ? 'Cancelar ZIP de teste' : 'Gerar ZIP de teste'}
            </button>
          ))}
          <output aria-label="Resultado ZIP">{zipResult}</output>
        </div>
      )}
      <button
        type="button"
        onClick={async () => {
          const { editor } = await import('monaco-editor/esm/vs/editor/editor.api.js')
          const value = JSON.stringify(
            editor.getModels().map((model) => ({
              id: model.id,
              path: getMonacoModelPath(model),
              language: model.getLanguageId(),
              markers: editor
                .getModelMarkers({ resource: model.uri })
                .map((marker) => marker.message),
              content: model.getValue(),
            })),
          )
          setModels((previous) => ({ value, version: previous.version + 1 }))
        }}
      >
        Inspecionar buffers
      </button>
      <output
        aria-label="Buffers da sessão"
        data-version={models.version}
        style={{ display: 'none' }}
      >
        {models.value}
      </output>
      <div style={{ flex: 1, minHeight: 0 }}>
        <StudioEditor
          initialProject={
            new URLSearchParams(location.search).has('startup') ? startupProject : project
          }
          persistence="none"
          features={{ terminal: false }}
          proRuntime={runtime}
          editingAccess={
            new URLSearchParams(location.search).has('observer') ? 'observer' : 'author'
          }
          tutor={new URLSearchParams(location.search).has('noTutor') ? undefined : tutor}
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
