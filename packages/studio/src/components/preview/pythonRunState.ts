import type { PythonProjectDocument } from '../../core/editableProject'
import type { PythonExecutionView } from '../../runtime/python/controller'
import type { ProRunState } from '../../state/proRun'

/** O que a prévia Python é capaz de fazer agora (decidido por quem tem o controlador). */
export interface PythonRunFlags {
  canRun: boolean
  canStop: boolean
  stale: boolean
}

/** Os status em que há um programa em andamento (o Parar faz sentido). */
export function pythonExecuting(status: PythonExecutionView['status']): boolean {
  return ['loading', 'ready', 'running', 'waiting-input', 'paused'].includes(status)
}

/** O programa que roda é mais velho que o documento do editor (mesma régua da prévia). */
export function pythonPreviewIsStale(
  view: PythonExecutionView,
  project: PythonProjectDocument,
): boolean {
  const previous = view.project
  return Boolean(
    previous &&
      (previous.files !== project.files ||
        previous.tree !== project.tree ||
        previous.assets !== project.assets ||
        previous.python !== project.python ||
        previous.runtime !== project.runtime ||
        previous.installedExtensions !== project.installedExtensions),
  )
}

/**
 * Os nove status do controlador Python viram as fases que a Topbar e o palco entendem:
 * idle/stopped → parado; loading → preparando (passo 1, "Buscando o Python"); ready → passo 3
 * ("Abrindo o programa"); running/paused → rodando; waiting-input → esperando você;
 * completed → concluído; failed → erro.
 */
export function pythonRunState(view: PythonExecutionView, flags: PythonRunFlags): ProRunState {
  const base: Omit<ProRunState, 'phase'> = {
    canRun: flags.canRun,
    canStop: flags.canStop,
    ...(flags.stale ? { stale: true } : {}),
    ...(view.error ? { error: view.error } : {}),
  }
  switch (view.status) {
    case 'loading':
      return { ...base, phase: 'preparing', step: { index: 1, total: 3 }, canRun: false }
    case 'ready':
      return { ...base, phase: 'preparing', step: { index: 3, total: 3 }, canRun: false }
    case 'running':
    case 'paused':
      return { ...base, phase: 'running' }
    case 'waiting-input':
      return { ...base, phase: 'waiting' }
    case 'completed':
      return { ...base, phase: 'done' }
    case 'failed':
      return { ...base, phase: 'error' }
    default:
      return { ...base, phase: 'idle' }
  }
}
