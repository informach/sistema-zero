import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { EditorSkeleton } from '../../components/layout/LoadingViews'
import { isPythonProject } from '../../core/editableProject'
import { loadPythonAuthoring, pythonOfficialModules } from '../../python/blocks/authoring'
import { selectPythonPalette } from '../../python/blocks/selection'
import { resolvePythonLearningLevel } from '../../python/learning'
import { useProjectStore } from '../../state/projectStore'
import { useSettingsStore } from '../../state/settingsStore'
import { useStudioConfig } from '../../studio/config'
import { useStudioRuntimeEnvironment } from '../../studio/runtime-environment'
import { PythonClassicWorkspace } from './PythonClassicWorkspace'

const SourceEditor = lazy(() =>
  import('../../components/code/PythonSourceEditor').then((module) => ({
    default: module.PythonSourceEditor,
  })),
)

export function PythonClassicMode({ mode }: { mode: 'blocks' | 'bridge' }) {
  const projectId = useProjectStore((state) => state.project?.id)
  return <PythonClassicProjectMode key={projectId} mode={mode} />
}

function PythonClassicProjectMode({ mode }: { mode: 'blocks' | 'bridge' }) {
  const project = useProjectStore((state) => state.project)
  const environment = useStudioRuntimeEnvironment()
  const { learning } = useStudioConfig()
  const revealed = useSettingsStore((state) => state.revealAdvanced)
  const python = project && isPythonProject(project) ? project : null
  const [retry, setRetry] = useState(0)
  const runtime = python?.runtime
  const installedExtensions = python?.installedExtensions
  // Text edits retain these immutable fields and do not restart the editor.
  const request = useMemo(
    () => (runtime && installedExtensions ? { runtime, installedExtensions, retry } : null),
    [runtime, installedExtensions, retry],
  )
  const [loaded, setLoaded] = useState<{
    request: typeof request
    environment: typeof environment
    value?: Awaited<ReturnType<typeof loadPythonAuthoring>>
    error?: string
  }>()
  useEffect(() => {
    if (!request) return
    let active = true
    void loadPythonAuthoring(request, environment).then(
      (value) => active && setLoaded({ request, environment, value }),
      (error: unknown) =>
        active &&
        setLoaded({
          request,
          environment,
          error:
            error instanceof Error ? error.message : 'Não foi possível carregar os blocos Python.',
        }),
    )
    return () => {
      active = false
    }
  }, [request, environment])
  const owner =
    loaded?.request === request && loaded?.environment === environment ? loaded : undefined
  const officialNames = python ? [...pythonOfficialModules(python)].join('|') : ''
  const officialModules = useMemo(
    () => new Set(officialNames.split('|').filter(Boolean)),
    [officialNames],
  )
  const selection = useMemo(() => {
    if (!owner?.value) return null
    try {
      return {
        palette: selectPythonPalette({
          ...owner.value,
          level:
            learning.allowLevelReveal && revealed
              ? 3
              : resolvePythonLearningLevel(learning.pythonLevel),
          allowBlocks: learning.allowBlocks,
          allowCategories: learning.allowCategories,
        }),
      }
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : 'A seleção de blocos desta tarefa está indisponível.',
      }
    }
  }, [owner?.value, learning, revealed])
  if (python?.kind !== 'classic') return null
  const error = owner?.error ?? selection?.error
  if (!environment || error)
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div role="alert" className="flex shrink-0 flex-wrap items-center gap-3 p-3 text-sm">
          <p>
            {error ??
              'Os blocos ainda não estão disponíveis aqui. Seus arquivos continuam preservados.'}
          </p>
          <button
            type="button"
            className="min-h-10 rounded border border-sz-border px-3"
            onClick={() => {
              setLoaded(undefined)
              setRetry((value) => value + 1)
            }}
          >
            Tentar novamente
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <Suspense fallback={<EditorSkeleton message="Abrindo seus arquivos Python…" />}>
            <SourceEditor />
          </Suspense>
        </div>
      </div>
    )
  if (!owner?.value || !selection?.palette)
    return <EditorSkeleton message="Carregando os blocos Python…" />
  return (
    <PythonClassicWorkspace
      mode={mode}
      codecs={owner.value.codecs}
      palette={selection.palette}
      officialModules={officialModules}
    />
  )
}
