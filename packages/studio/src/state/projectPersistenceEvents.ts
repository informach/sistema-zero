import {
  captureProjectStorageScope,
  isPrivateRegionalProjectScope,
  type ProjectStorageScope,
} from './projectStorageRuntime'

/** Evento de janela disparado quando uma miniatura termina de gravar. */
export const PROJECT_THUMB_UPDATED_EVENT = 'sz:project-thumb-updated'
/**
 * Evento da PÁGINA (`CustomEvent<{ id, deleted? }>`) disparado depois de toda escrita/apagamento
 * de projeto local — inclusive as silenciosas para a nuvem (restauro), porque o silêncio é para
 * o espelho, não para a lista. A lista de projetos relê SÓ aquele item (`loadProjectSummaryById`)
 * em vez de recarregar tudo (meta + capas de todos) a cada renomear/duplicar/apagar/restauro.
 */
export const PROJECT_CHANGED_EVENT = 'sz:project-changed'
export interface ProjectChangedDetail {
  id: string
  deleted?: boolean
}

export function notifyProjectChanged(id: string, deleted = false): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(
      new CustomEvent<ProjectChangedDetail>(PROJECT_CHANGED_EVENT, { detail: { id, deleted } }),
    )
  } catch {
    // Ambiente sem CustomEvent: a lista recarrega no próximo gesto, como antes.
  }
}
/**
 * "Guardado na sua conta" (18/08/2026): o HOST observa TODA escrita e apagamento
 * do armazenamento local por este gancho único — é por aqui que passam o autosave
 * (`PersistenceService`), renomear/duplicar/apagar do `ProjectCard`, o import e a
 * sincronia de desenhos do Pinta. O host relê o snapshot por `loadProjectById(id)`
 * na hora de subir (sempre o estado mais recente). Um só ponto: componentes não
 * sabem que a nuvem existe. `null` desliga (aula, playground, testes).
 */
export interface StudioCloudMirror {
  /** Alguma partição do projeto `id` foi gravada (autosave, renomear, assets). */
  onChanged(id: string): void
  /** O projeto `id` foi apagado localmente. */
  onDeleted(id: string): void
  /**
   * A MINIATURA do projeto `id` foi gravada (a captura ao sair do editor, a capa escolhida). É
   * um aviso à parte do `onChanged` de propósito: a capa não muda o `updatedAt` do projeto, e o
   * host decide se vale uma subida só por ela (só quando a nuvem ainda não tem miniatura).
   */
  onThumbChanged?(id: string): void
}

let cloudMirror: StudioCloudMirror | null = null

export function setStudioCloudMirror(mirror: StudioCloudMirror | null): void {
  cloudMirror = mirror
}

/** Best-effort: um espelho que lança nunca derruba a gravação local. */
export function notifyMirrorChanged(id: string, scope = captureProjectStorageScope()): void {
  if (isPrivateRegionalProjectScope(scope)) return
  try {
    cloudMirror?.onChanged(id)
  } catch {
    // O espelho é do host; falha lá é problema de lá.
  }
}

export function notifyMirrorDeleted(id: string, scope = captureProjectStorageScope()): void {
  if (isPrivateRegionalProjectScope(scope)) return
  try {
    cloudMirror?.onDeleted(id)
  } catch {
    // idem
  }
}

export function notifyMirrorThumbChanged(id: string, scope = captureProjectStorageScope()): void {
  if (isPrivateRegionalProjectScope(scope)) return
  try {
    cloudMirror?.onThumbChanged?.(id)
  } catch {
    // idem
  }
}

export function notifyThumbUpdated(id: string): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent(PROJECT_THUMB_UPDATED_EVENT, { detail: id }))
  } catch {
    // Ambiente sem CustomEvent: a lista relê no próximo gesto.
  }
}

export function notifyRecoveredProjects(scope: ProjectStorageScope, ids: readonly string[]): void {
  if (scope.identity !== captureProjectStorageScope().identity) return
  for (const id of new Set(ids)) {
    notifyMirrorChanged(id, scope)
    notifyProjectChanged(id)
  }
}
