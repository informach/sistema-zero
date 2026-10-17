import { PensaMissionPanel } from '@sistemazero/ui/pensa-mission-panel'
import { useRef, useState } from 'react'
import { findExtensionConflict } from '../extensions/compatibility'
import { useProjectStore, useProjectStoreApi } from '../state/projectStore'
import { useStudioTutor } from './tutor'
import type { StudioTaskSession } from './types'

export function TaskGuidePanel({ session }: { session: StudioTaskSession }) {
  const store = useProjectStoreApi()
  const project = useProjectStore((state) => state.project)
  const tutor = useStudioTutor()
  const [error, setError] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)
  const installation = useRef(false)
  const setup = session.mission.kind === 'setup' ? session.mission.setup : null
  const required = setup ? [setup.runtimeExtensionId, ...setup.requiredAuxiliaryExtensionIds] : []
  const installed = required.every((id) =>
    project?.installedExtensions.some((extension) => extension.id === id),
  )
  const panelSession: StudioTaskSession = {
    ...session,
    blockedReason:
      session.blockedReason ??
      (setup && !installed
        ? 'Instale as ferramentas recomendadas antes de conferir a preparação.'
        : null),
    onNeedHelp: tutor.config ? () => tutor.setOpen(true) : session.onNeedHelp,
  }
  async function install() {
    if (session.blockedReason || !project || installation.current) return
    installation.current = true
    setInstalling(true)
    setError(null)
    try {
      const { findExtension, installExtension } = await import('../state/extensionsAdapter')
      const currentProject = store.getState().project
      if (!currentProject || currentProject.id !== project.id) return
      const definitions = required.map((id) => findExtension(id))
      const candidates = currentProject.installedExtensions.map((entry) => ({
        id: entry.id,
        conflictsWith: findExtension(entry.id)?.conflictsWith,
      }))
      for (const extension of definitions) {
        if (!extension) {
          setError('Essa ferramenta não está disponível. Volte ao Pensa para adaptar o caminho.')
          return
        }
        const candidate = { id: extension.manifest.id, conflictsWith: extension.conflictsWith }
        const conflictId = findExtensionConflict(candidate, candidates)
        if (conflictId) {
          setError(
            `Este projeto já usa ${findExtension(conflictId)?.manifest.name ?? 'outra ferramenta'}. Volte ao Pensa para conferir uma alternativa.`,
          )
          return
        }
        candidates.push(candidate)
      }
      for (const id of required) {
        const extension = findExtension(id)
        if (!extension) {
          setError('Essa ferramenta não está disponível. Volte ao Pensa para adaptar o caminho.')
          return
        }
        const result = installExtension(extension, store)
        if (!result.ok) {
          const conflict = findExtension(result.conflictId)
          setError(
            `Este projeto já usa ${conflict?.manifest.name ?? 'outra ferramenta'}. Volte ao Pensa para conferir uma alternativa.`,
          )
          return
        }
      }
    } catch {
      setError('Não consegui abrir as ferramentas agora. Tente novamente.')
    } finally {
      installation.current = false
      setInstalling(false)
    }
  }
  return (
    <PensaMissionPanel
      key={`${session.mission.id}:${session.mission.contentRevision}`}
      session={panelSession}
      recovery={error ? <p role="alert">{error}</p> : null}
      aside
    >
      {setup ? (
        <div>
          {installed ? (
            <p role="status">Já está preparada.</p>
          ) : (
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              disabled={Boolean(session.blockedReason) || installing}
              onClick={() => void install()}
            >
              Instalar ferramentas recomendadas
            </button>
          )}
        </div>
      ) : null}
    </PensaMissionPanel>
  )
}
