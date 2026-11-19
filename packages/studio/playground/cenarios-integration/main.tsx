import { setStudioStorageNamespace } from '@sistemazero/studio'
import { StudioEditor } from '@sistemazero/studio/editor'
import { createLocalPersistenceAdapter } from '@sistemazero/studio/local-persistence'
import { StrictMode, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useStudioCreationLibraries } from '../../../member-shell/src/components/creator/use-studio-creation-libraries'
import { criarHostEmMemoria } from '../../../molda-cenarios/src/oficina/host-memoria'
import { loadProTemplate } from '../../src/components/code/pro-templates'
import type { EditableStudioProject } from '../../src/core/editableProject'
import { buildPythonSourceFiles } from '../../src/export/pythonSource'
import type { StudioRuntimeEnvironment } from '../../src/runtime/environment'
import { RAYLIB_3D_EXTENSION } from '../../src/runtime/python/raylib/contract'
import { prepareEditableStudioProject } from '../../src/state/editableProjectValidation'
import { documentFixture } from '../../src/state/fixtures/projectDocuments'
import { pythonEnvironmentFixture } from '../../src/state/fixtures/pythonEnvironment'
import '@fontsource/baloo-2/latin-700.css'
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-700.css'
import '../styles.css'

// Synthetic, isolated authoring host. It grants no real account or Python executor.
const pessoa = '11111111-1111-4111-8111-111111111111',
  namespace = `adult:${pessoa}`,
  consulta = new URLSearchParams(location.search),
  linguagem = consulta.get('python') === '1' ? 'python' : 'javascript',
  kind = consulta.get('pro') === '1' ? 'pro' : 'classic',
  id = `qa-cenarios-${linguagem}-${kind}`
setStudioStorageNamespace(namespace)
function App() {
  const persistencia = useMemo(() => createLocalPersistenceAdapter({ namespace }), []),
    host = useMemo(() => criarHostEmMemoria({ equipe: true }), []),
    { moldaLibrary } = useStudioCreationLibraries(namespace, false, true, pessoa),
    [initial, setInitial] = useState<EditableStudioProject | null>(null),
    [ambiente, setAmbiente] = useState<StudioRuntimeEnvironment>(),
    [erro, setErro] = useState(''),
    atual = useRef<EditableStudioProject | null>(null)
  useEffect(() => {
    let ativo = true
    Object.assign(globalThis, {
      __cenarios: { host },
      __qaStudio: {
        projeto: () => atual.current,
        guardar: async () => {
          if (!atual.current) throw Error('Projeto ainda não abriu')
          await persistencia.save(atual.current)
        },
        exportarPython: async () => {
          if (atual.current?.programmingLanguage !== 'python') throw Error('Escolha Python')
          return buildPythonSourceFiles(atual.current)
        },
      },
    })
    void (async () => {
      const salvo = await persistencia.load(id)
      if (salvo) {
        if (ativo) {
          atual.current = salvo
          setInitial(salvo)
        }
        return
      }
      const fixture = linguagem === 'python' ? await pythonEnvironmentFixture(kind) : null,
        raw = fixture?.project ?? documentFixture('javascript', kind)
      if (raw.kind === 'pro' && raw.programmingLanguage === 'javascript') {
        const template = await loadProTemplate('three-ts')
        raw.tree = template.tree
        raw.proMeta = { templateId: template.id, devScript: template.devScript }
      }
      raw.id = id
      raw.name = 'Meu programa preservado'
      raw.assets = []
      delete raw.coverAssetName
      raw.installedExtensions =
        linguagem === 'python'
          ? [{ ...RAYLIB_3D_EXTENSION, installedAt: 1 }]
          : [{ id: 'game-3d', version: '0.30.0', installedAt: 1 }]
      if (raw.kind === 'pro')
        raw.tree[raw.programmingLanguage === 'python' ? raw.python.entrypoint : 'src/main.ts'] = {
          kind: 'file',
          content:
            linguagem === 'python'
              ? 'programa_preservado = 41\n'
              : 'const programa_preservado = 41;\n',
        }
      else if (raw.programmingLanguage === 'python')
        raw.files[raw.python.entrypoint] = 'programa_preservado = 41\n'
      else raw.files['script.js'] = 'const programa_preservado = 41;\n'
      raw.mode = raw.kind === 'classic' ? 'bridge' : 'code'
      const project = await prepareEditableStudioProject(raw)
      if (!project) throw Error('Projeto de ensaio inválido')
      if (ativo) {
        atual.current = project
        setInitial(project)
        if (consulta.has('antigo') && fixture) setAmbiente(fixture.environment)
      }
    })().catch((e: unknown) => {
      if (ativo) setErro(e instanceof Error ? e.message : String(e))
    })
    return () => {
      ativo = false
    }
  }, [host, persistencia])
  if (erro) return <p role="alert">{erro}</p>
  if (!initial) return <p role="status">Abrindo ensaio local…</p>
  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="m-0 bg-slate-100 px-4 py-1 text-xs text-slate-700">
        Ensaio local de importação · perfil sintético · execução em ensaio separado
      </p>
      <div className="min-h-0 flex-1">
        <StudioEditor
          initialProject={initial}
          autoRun={false}
          features={{ preview: false }}
          persistence={persistencia}
          runtimeEnvironment={ambiente}
          moldaLibrary={moldaLibrary}
          theme={consulta.get('tema') === 'dark' ? 'dark' : 'light'}
          onChange={(p) => {
            atual.current = p
          }}
          onSave={(p) => {
            atual.current = p
          }}
          onExit={() => location.reload()}
        />
      </div>
    </div>
  )
}
const element = document.getElementById('root')
if (!element) throw Error('Raiz do ensaio ausente')
createRoot(element).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
