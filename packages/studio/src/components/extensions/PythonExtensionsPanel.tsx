import { useLayoutEffect, useRef, useState } from 'react'
import { Badge, Button, Modal } from '#ui'
import { isPythonProject, type PythonProjectDocument } from '../../core/editableProject'
import { PYTHON_EXTENSIONS } from '../../python/extensions/catalog'
import {
  changePythonExtension,
  pythonExtensionInstallIssue,
} from '../../python/extensions/operations'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useStudioConfig } from '../../studio/config'
import { useStudioRuntimeEnvironment } from '../../studio/runtime-environment'
import type { ExtensionsPanelProps } from './ExtensionsPanel'

export function PythonExtensionsPanel({ open, onClose }: ExtensionsPanelProps) {
  const project = useProjectStore((state) => state.project)
  const editingAccess = useProjectStore((state) => state.editingAccess)
  const store = useProjectStoreApi()
  const environment = useStudioRuntimeEnvironment()
  const allowedIds = useStudioConfig().learning.allowExtensions
  const policyRef = useRef({ environment, allowedIds })
  useLayoutEffect(() => {
    policyRef.current = { environment, allowedIds }
    return () => {
      policyRef.current = { environment: null, allowedIds: [] }
    }
  }, [environment, allowedIds])
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
    setPending(true)
    setError(null)
    try {
      await changePythonExtension({
        store,
        expected,
        extension,
        action,
        policy: () => policyRef.current,
      })
      setRemoval(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível alterar a extensão.')
    } finally {
      setPending(false)
    }
  }
  return (
    <>
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
          instalá-la novamente.
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
