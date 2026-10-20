import { useLayoutEffect, useRef, useState } from 'react'
import { Badge, Button, Modal } from '#ui'
import { isPythonProject, type PythonProjectDocument } from '../../core/editableProject'
import { PYTHON_EXTENSIONS } from '../../python/extensions/catalog'
import {
  changePythonExtension,
  pythonExtensionInstallIssue,
} from '../../python/extensions/operations'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useStudioConfig } from '../../studio/config'
import { useStudioExecution } from '../../studio/observation'
import { useStudioRuntimeEnvironment } from '../../studio/runtime-environment'
import type { ExtensionsPanelProps } from './ExtensionsPanel'

export function PythonExtensionsPanel({ open, onClose }: ExtensionsPanelProps) {
  const project = useProjectStore((state) => state.project)
  const editingAccess = useProjectStore((state) => state.editingAccess)
  const store = useProjectStoreApi()
  const environment = useStudioRuntimeEnvironment()
  const allowedIds = useStudioConfig().learning.allowExtensions
  const execution = useStudioExecution()
  const mount = useRef<HTMLDivElement>(null)
  const operation = useRef<{ cancelled: boolean; dispose(): void } | null>(null)
  const policyRef = useRef({ environment, allowedIds, writerEpoch: execution.writerEpoch })
  useLayoutEffect(() => {
    policyRef.current = {
      environment: open && execution.editingAccess === 'author' ? environment : null,
      allowedIds,
      writerEpoch: execution.writerEpoch,
    }
    setPending(false)
    setError(null)
    return () => {
      if (operation.current) {
        operation.current.cancelled = true
        operation.current.dispose()
        operation.current = null
      }
      policyRef.current = { environment: null, allowedIds: [], writerEpoch: execution.writerEpoch }
    }
  }, [environment, allowedIds, execution.writerEpoch, execution.editingAccess, open])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removal, setRemoval] = useState<{
    project: PythonProjectDocument
    extension: { id: string; version: string }
  } | null>(null)
  if (!project || !isPythonProject(project)) return null
  const entries = [
    ...PYTHON_EXTENSIONS,
    ...project.installedExtensions
      .filter((item) => !PYTHON_EXTENSIONS.some((known) => known.id === item.id))
      .map((item) => ({
        ...item,
        name: item.id,
        description: 'Extensão salva neste projeto.',
        help: '',
      })),
  ]
  const disabled = pending || editingAccess !== 'author'
  async function change(
    expected: PythonProjectDocument,
    extension: { id: string; version: string },
    action: 'install' | 'remove',
  ) {
    if (operation.current) return
    const owner = { cancelled: false, dispose() {} }
    operation.current = owner
    const policy = policyRef.current
    let unsubscribe = () => {}
    setPending(true)
    setError(null)
    try {
      let analysis:
        | Pick<import('../../python/language/controller').PythonAnalysisController, 'run'>
        | undefined
      if (action === 'remove' && extension.id === TURTLE_EXTENSION.id) {
        const { createPythonAnalysisController } = await import('../../python/language/controller')
        if (owner.cancelled) throw new Error('O contexto da análise mudou. Tente novamente.')
        const controller = createPythonAnalysisController({
          project: () =>
            !owner.cancelled &&
            policyRef.current.environment === policy.environment &&
            store.getState().editingAccess === 'author' &&
            store.getState().project === expected
              ? expected
              : null,
          environment: () => policyRef.current.environment,
          writerEpoch: () => policyRef.current.writerEpoch ?? null,
          mountFrame() {
            if (owner.cancelled || !mount.current?.isConnected)
              throw new Error('A análise Python foi encerrada.')
            const frame = document.createElement('iframe')
            frame.hidden = true
            mount.current.append(frame)
            return { frame, release: () => frame.remove() }
          },
        })
        owner.dispose = () => controller.dispose()
        unsubscribe = store.subscribe((state) => {
          if (state.project !== expected || state.editingAccess !== 'author') {
            owner.cancelled = true
            owner.dispose()
          }
        })
        analysis = controller
      }
      await changePythonExtension({
        store,
        expected,
        extension,
        action,
        policy: () => policyRef.current,
        analysis,
        assertCurrent() {
          if (operation.current !== owner || owner.cancelled)
            throw new Error(
              'O contexto da análise mudou. Tente novamente; seu código foi preservado.',
            )
        },
      })
      if (operation.current === owner) setRemoval(null)
    } catch (cause) {
      if (operation.current === owner && !owner.cancelled)
        setError(cause instanceof Error ? cause.message : 'Não foi possível alterar a extensão.')
    } finally {
      unsubscribe()
      owner.dispose()
      if (operation.current === owner) {
        operation.current = null
        setPending(false)
      }
    }
  }
  return (
    <>
      <div ref={mount} hidden />
      <Modal
        open={open}
        onClose={() => !pending && onClose()}
        title="Extensões Python"
        footer={
          <Button variant="ghost" size="sm" disabled={pending} onClick={onClose}>
            Fechar
          </Button>
        }
      >
        <p className="mb-4 text-sm text-sz-fg-soft">
          Os recursos de Programação já fazem parte do Python. Escolha uma extensão para acrescentar
          novas ferramentas.
        </p>
        <ul className="space-y-3">
          {entries.map((extension) => {
            const installed = project.installedExtensions.find((item) => item.id === extension.id)
            const issue = installed
              ? null
              : pythonExtensionInstallIssue(project, environment, extension, allowedIds)
            return (
              <li key={extension.id} className="rounded-lg border border-sz-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-sz-fg">{extension.name}</strong>
                  {installed && <Badge>Instalada</Badge>}
                  <Button
                    size="sm"
                    variant={installed ? 'ghost' : 'primary'}
                    disabled={disabled || !!issue}
                    onClick={() =>
                      installed
                        ? setRemoval({ project, extension: installed })
                        : void change(project, extension, 'install')
                    }
                  >
                    {installed ? 'Remover' : 'Instalar'}
                  </Button>
                </div>
                <p className="mt-2 text-sm text-sz-fg-soft">{extension.description}</p>
                {extension.help && <p className="mt-2 text-sm text-sz-fg-soft">{extension.help}</p>}
                {issue && <p className="mt-2 text-sm text-sz-fg-mute">{issue}</p>}
              </li>
            )
          })}
        </ul>
        {error && (
          <p role="alert" className="mt-3 text-sm text-sz-error">
            {error}
          </p>
        )}
      </Modal>
      <Modal
        open={open && !!removal}
        onClose={() => !pending && setRemoval(null)}
        title="Remover extensão?"
        footer={
          <>
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => setRemoval(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => removal && void change(removal.project, removal.extension, 'remove')}
            >
              Remover
            </Button>
          </>
        }
      >
        <p>
          Seu código continua salvo. Para executar os comandos desta extensão, você precisará
          instalá-la novamente. Antes de remover, vamos conferir os imports Python. Se Turtle ainda
          estiver em uso, indicaremos os arquivos e as linhas que precisam ser ajustados.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-sz-error">
            {error}
          </p>
        )}
      </Modal>
    </>
  )
}
