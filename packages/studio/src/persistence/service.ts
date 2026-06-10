import type { Project } from '#core'
import type { ProjectStoreApi } from '../state/projectStore'
import type { StudioPersistenceAdapter } from './types'

const AUTOSAVE_DELAY_DEFAULT = 1000
let autosaveDelay = AUTOSAVE_DELAY_DEFAULT

/**
 * Encurta o debounce do autosave em testes — bun:test não tem fake timers,
 * então os testes usam timers reais com um delay curto.
 */
export function setAutosaveDelayForTests(ms: number | null): void {
  autosaveDelay = ms ?? AUTOSAVE_DELAY_DEFAULT
}

/** Callbacks do host. Mutável de propósito: o <Studio> re-aponta a cada render. */
export interface PersistenceHandlers {
  onChange?: (project: Project) => void
  onSave?: (project: Project) => void | Promise<void>
  onError?: (error: { kind: 'persistence'; message: string }) => void
}

export interface PersistenceService {
  handlers: PersistenceHandlers
  /** Liga autosave (subscribe no store) + flush em pagehide/beforeunload. Devolve o detach. */
  attach(): () => void
  /** Salvar explícito (botão Salvar / handle.save()): cancela o debounce e persiste já. */
  save(): Promise<void>
  /** Tem onde persistir? false = persistence 'none' (host salva via onChange/onSave). */
  readonly hasAdapter: boolean
}

interface PendingAutosave {
  timer: ReturnType<typeof setTimeout>
  project: Project
}

interface ServiceInternals {
  clearTimerFor(projectId: string): void
}

// Registro global dos serviços vivos: `deleteProject` (ação fora do ciclo do
// serviço) cancela autosaves pendentes do projeto excluído em TODAS as
// instâncias — senão um timer em voo re-persistiria o projeto apagado.
const liveServices = new Set<ServiceInternals>()

export function cancelPendingAutosavesFor(projectId: string): void {
  for (const service of liveServices) service.clearTimerFor(projectId)
}

function formatPersistenceError(err: unknown): string {
  const detail = err instanceof Error ? err.message : String(err)
  return detail ? `Falha ao salvar projeto: ${detail}` : 'Falha ao salvar projeto.'
}

/**
 * Agendador de persistência de UMA instância do <Studio>. Observa o
 * projectStore e, a cada mutação, agenda um autosave debounced que:
 *   1. emite `onChange` com o snapshot completo (SEMPRE — inclusive com
 *      persistence 'none', é assim que o host persiste no backend);
 *   2. persiste no adapter (se houver) e marca salvo/erro no store.
 * Qualquer adapter ganha o autosave de graça; o flush roda em
 * pagehide/beforeunload/detach e no salvar explícito.
 */
export function createPersistenceService(
  store: ProjectStoreApi,
  adapter: StudioPersistenceAdapter | null,
): PersistenceService {
  const pending = new Map<string, PendingAutosave>()

  const internals: ServiceInternals = {
    clearTimerFor(projectId) {
      const entry = pending.get(projectId)
      if (!entry) return
      clearTimeout(entry.timer)
      pending.delete(projectId)
    },
  }

  function clearAllTimers(): void {
    for (const entry of pending.values()) clearTimeout(entry.timer)
    pending.clear()
  }

  const service: PersistenceService = {
    handlers: {},
    attach,
    save,
    get hasAdapter() {
      return adapter !== null
    },
  }

  function emitChange(project: Project): void {
    try {
      service.handlers.onChange?.(project)
    } catch (err) {
      // Callback do host não pode derrubar o autosave.
      console.warn('[sz] onChange do host lançou:', err)
    }
  }

  function emitError(message: string): void {
    try {
      service.handlers.onError?.({ kind: 'persistence', message })
    } catch (err) {
      console.warn('[sz] onError do host lançou:', err)
    }
  }

  async function persistAndMark(project: Project): Promise<void> {
    try {
      if (adapter) await adapter.save(project)
      if (store.getState().project === project) {
        store.getState().markSaved()
      }
    } catch (err) {
      const message = formatPersistenceError(err)
      if (store.getState().project === project) {
        store.getState().markSaveFailed(message)
      } else {
        console.warn(message)
      }
      emitError(message)
    }
  }

  function schedule(project: Project): void {
    internals.clearTimerFor(project.id)
    const timer = setTimeout(() => {
      const entry = pending.get(project.id)
      if (entry?.timer === timer) pending.delete(project.id)
      emitChange(project)
      void persistAndMark(project)
    }, autosaveDelay)
    pending.set(project.id, { timer, project })
  }

  function flushPending(): void {
    const snapshots = Array.from(pending.values(), (entry) => entry.project)
    const current = store.getState()
    if (
      current.project &&
      current.isDirty &&
      !snapshots.some((project) => project.id === current.project?.id)
    ) {
      snapshots.push(current.project)
    }
    clearAllTimers()
    for (const project of snapshots) {
      emitChange(project)
      void persistAndMark(project)
    }
  }

  function attach(): () => void {
    const unsub = store.subscribe((state, prev) => {
      if (!state.project) return
      if (state.project === prev.project) return
      schedule(state.project)
    })
    const flushOnPageExit = () => flushPending()
    window.addEventListener('pagehide', flushOnPageExit)
    window.addEventListener('beforeunload', flushOnPageExit)
    liveServices.add(internals)

    return () => {
      // Unmount também drena o que está pendente — fechar um modal com o
      // Studio não pode perder a última edição.
      flushPending()
      unsub()
      window.removeEventListener('pagehide', flushOnPageExit)
      window.removeEventListener('beforeunload', flushOnPageExit)
      liveServices.delete(internals)
      clearAllTimers()
    }
  }

  async function save(): Promise<void> {
    const project = store.getState().project
    if (!project) return
    internals.clearTimerFor(project.id)
    emitChange(project)
    try {
      if (adapter) await adapter.save(project)
      await service.handlers.onSave?.(project)
      if (store.getState().project === project) {
        store.getState().markSaved()
      }
    } catch (err) {
      const message = formatPersistenceError(err)
      if (store.getState().project === project) {
        store.getState().markSaveFailed(message)
      }
      emitError(message)
      throw err
    }
  }

  return service
}
