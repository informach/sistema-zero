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

/** Contexto do `onChange`: distingue um autosave do debounce de um flush de
 * fechamento (pagehide/unmount/save). No flush o host deve usar um transporte
 * keepalive (navigator.sendBeacon / fetch keepalive) — a biblioteca não pode. */
export interface ChangeContext {
  reason: 'autosave' | 'flush'
}

/** Callbacks do host. Mutável de propósito: o <Studio> re-aponta a cada render. */
export interface PersistenceHandlers {
  onChange?: (project: Project, ctx?: ChangeContext) => void
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
  /** Descarrega o projeto desta instância se for o id apagado (null no store). */
  unloadIfLoaded(projectId: string): void
}

// Registro global dos serviços vivos: `deleteProject` (ação fora do ciclo do
// serviço) cancela autosaves pendentes do projeto excluído em TODAS as
// instâncias — senão um timer em voo re-persistiria o projeto apagado.
const liveServices = new Set<ServiceInternals>()

// IDs marcados como excluídos enquanto um save pode estar EM VOO. Cancelar só os
// timers pendentes não basta: um autosave que já passou do debounce removeu sua
// entrada de `pending` e está aguardando `adapter.save` (lento/remoto) quando o
// delete chega — o projeto não está mais em `pending`, então `clearTimerFor` não
// acha nada, o `delMany` apaga e o save em voo RE-PERSISTE o apagado. Marcar o
// id aqui faz `persistAndMark` abortar antes e depois do await.
//
// É um Map id→timestamp (não um Set) só para limitar o crescimento: cada delete
// vazaria um ULID (~26 chars) PARA SEMPRE. A poda é lazy, numa janela de graça
// MAIOR que qualquer save realista — NÃO se pode limpar na resolução do delMany
// (reabriria a corrida de ressurreição que o guard pós-await fecha). A semântica
// da cerca é idêntica à do Set; só o crescimento fica limitado.
const DELETED_FENCE_GRACE_MS = 60_000
const deletedProjects = new Map<string, number>()

/** Remove marcas de exclusão mais velhas que a janela de graça. A cerca já fez
 * seu papel (o save em voo daquele id já terminou há muito); a entrada só ocupa
 * memória. Idempotente e barato — roda nas bordas (marcar/checar). */
function pruneDeletedFence(now: number): void {
  if (deletedProjects.size === 0) return
  for (const [id, deletedAt] of deletedProjects) {
    if (now - deletedAt >= DELETED_FENCE_GRACE_MS) deletedProjects.delete(id)
  }
}

/** A cerca ainda vale para este id? (excluído há menos que a janela de graça.)
 * Poda lazy de passagem para limitar o crescimento do Map. */
function isFenced(projectId: string): boolean {
  const deletedAt = deletedProjects.get(projectId)
  if (deletedAt === undefined) return false
  const now = Date.now()
  if (now - deletedAt >= DELETED_FENCE_GRACE_MS) {
    deletedProjects.delete(projectId)
    return false
  }
  return true
}

export function cancelPendingAutosavesFor(projectId: string): void {
  const now = Date.now()
  pruneDeletedFence(now)
  deletedProjects.set(projectId, now)
  for (const service of liveServices) {
    service.clearTimerFor(projectId)
    // Fecha a janela de ressurreição ALÉM da janela de graça: um editor aberto
    // noutra instância com este projeto carregado continuaria sujo e, ao expirar
    // a cerca, re-persistiria o id apagado. Descarregá-lo de TODAS as instâncias
    // (project:null) garante que nenhum store volte a agendar um save desse id.
    service.unloadIfLoaded(projectId)
  }
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

  // Dedupe de flush no unload: `flushPending` está registrado em pagehide E
  // beforeunload (ambos podem disparar num único fechamento) — sem isto cada
  // unload emitia onChange('flush') DUAS vezes e re-persistia o mesmo snapshot
  // (o `isDirty` segue true porque o persist é async, então o 2º evento via o
  // projeto ainda sujo e re-enfileirava). Marca-se ao flushar e re-arma só quando
  // uma edição genuína volta a agendar (schedule), para um flush legítimo depois
  // de novas edições continuar funcionando.
  let flushed = false

  // Mutex por id de projeto: encadeia os `adapter.save` do MESMO projeto para
  // não correrem entre si. Sem isso, quando um debounce dispara e uma edição
  // seguinte agenda outro save antes do primeiro resolver, um adapter remoto/BFF
  // pode confirmar o POST antigo POR ÚLTIMO e perder a edição mais nova. O
  // caminho IndexedDB default já é correto (setMany serializa no idb), mas a
  // cadeia torna qualquer adapter remoto seguro. A entrada é removida quando a
  // própria cauda termina, para o Map não crescer.
  const saveChains = new Map<string, Promise<void>>()

  function runSerialized(projectId: string, task: () => Promise<void>): Promise<void> {
    const prev = saveChains.get(projectId)
    // SEM save anterior em voo: roda JÁ (síncrono até o 1º await), preservando o
    // comportamento histórico — adapter.save é iniciado de imediato, não adiado
    // p/ uma microtask. COM um save em voo do MESMO id, encadeia para os dois não
    // intercalarem (o POST antigo não pode confirmar depois do novo). `prev` nunca
    // rejeita (task captura tudo), mas blindamos com o 2º handler.
    const next = prev ? prev.then(task, task) : task()
    saveChains.set(projectId, next)
    void next.finally(() => {
      // Só limpa se ESTA execução ainda for a cauda — uma nova edição já pode
      // ter encadeado outra task no mesmo id.
      if (saveChains.get(projectId) === next) saveChains.delete(projectId)
    })
    return next
  }

  const internals: ServiceInternals = {
    clearTimerFor(projectId) {
      const entry = pending.get(projectId)
      if (!entry) return
      clearTimeout(entry.timer)
      pending.delete(projectId)
    },
    unloadIfLoaded(projectId) {
      // Só desta instância: descarrega o projeto se for o id apagado. Sem isso, um
      // editor aberto noutra instância seguiria sujo e re-persistiria o id quando
      // a cerca expirasse. `unloadProject` zera project/isDirty/saveError, então o
      // subscribe do attach (`!state.project → return`) nunca reagenda esse id.
      if (store.getState().project?.id === projectId) {
        store.getState().unloadProject()
      }
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

  function emitChange(project: Project, reason: ChangeContext['reason']): void {
    try {
      service.handlers.onChange?.(project, { reason })
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

  function persistAndMark(project: Project): Promise<void> {
    // Já excluído antes de começar: não persiste de volta o que foi apagado.
    // (checa fora da cadeia para nem enfileirar a task do projeto apagado.)
    if (isFenced(project.id)) return Promise.resolve()
    // Encadeia no mutex por id: dois autosaves do mesmo projeto confirmam EM
    // ORDEM (o 2º só envia ao adapter depois do 1º resolver).
    return runSerialized(project.id, async () => {
      // Re-checa DENTRO da cadeia: o delete pode ter chegado enquanto este save
      // esperava o anterior na fila.
      if (isFenced(project.id)) return
      try {
        if (adapter) await adapter.save(project)
        // Excluído ENQUANTO o save estava em voo (adapter lento/remoto): aborta
        // sem marcar salvo — o `delMany` do delete já correu, re-persistir
        // ressuscitaria o projeto apagado.
        if (isFenced(project.id)) return
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
    })
  }

  function schedule(project: Project): void {
    // NÃO se limpa a cerca aqui: create/import/duplicate sempre usam um ULID
    // NOVO, então o agendamento de uma edição NUNCA precisa reabrir a cerca de um
    // id legitimamente. Limpar incondicionalmente aqui (no caminho do autosave de
    // uma edição qualquer) ressuscitava o projeto apagado — um editor aberto que
    // continua sendo digitado após o delete de outra instância re-persistia o id.
    // A cerca é tirada SÓ nos caminhos legítimos de re-criação/persistência (ver
    // `save` e os clears de create/persist), e auto-expira pela janela de graça.
    internals.clearTimerFor(project.id)
    // Edição genuína: re-arma o flush (um flush anterior já drenou, mas há algo
    // novo a salvar no próximo fechamento).
    flushed = false
    const timer = setTimeout(() => {
      const entry = pending.get(project.id)
      if (entry?.timer === timer) pending.delete(project.id)
      emitChange(project, 'autosave')
      void persistAndMark(project)
    }, autosaveDelay)
    pending.set(project.id, { timer, project })
  }

  function flushPending(): void {
    // Já drenado neste ciclo de fechamento (pagehide já correu, beforeunload
    // chegou em seguida): no-op até uma nova edição re-armar.
    if (flushed) return
    flushed = true
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
      // reason 'flush': fechamento (pagehide/beforeunload/unmount/save). O fetch
      // do adapter remoto será abortado pela navegação, então o host precisa
      // trocar para navigator.sendBeacon / fetch keepalive ao ver este reason.
      emitChange(project, 'flush')
      void persistAndMark(project)
    }
  }

  function attach(): () => void {
    const unsub = store.subscribe((state, prev) => {
      if (!state.project) return
      if (state.project === prev.project) return
      // Carregar/hidratar instala um novo Project com isDirty:false — sem esse
      // guard a troca de referência agendava um write redundante dos MESMOS
      // bytes (round-trip desperdiçado em adapters remotos). Só edições reais
      // (setProject/setFile/... marcam isDirty:true) devem agendar.
      if (!state.isDirty) return
      schedule(state.project)
    })
    const flushOnPageExit = () => flushPending()
    // `pagehide`/`beforeunload` só existem no browser. O Studio é browser-only
    // (`ssr:false`), mas instanciar o serviço fora do DOM (SSR, testes sem DOM)
    // não pode lançar — cai no padrão "degrada sem a API ausente" do pacote.
    const hasWindow = typeof window !== 'undefined'
    if (hasWindow) {
      window.addEventListener('pagehide', flushOnPageExit)
      window.addEventListener('beforeunload', flushOnPageExit)
    }
    liveServices.add(internals)

    return () => {
      // Unmount também drena o que está pendente — fechar um modal com o
      // Studio não pode perder a última edição.
      flushPending()
      unsub()
      if (hasWindow) {
        window.removeEventListener('pagehide', flushOnPageExit)
        window.removeEventListener('beforeunload', flushOnPageExit)
      }
      liveServices.delete(internals)
      clearAllTimers()
    }
  }

  async function save(): Promise<void> {
    const project = store.getState().project
    if (!project) return
    // Salvar explícito é sobre o projeto carregado AGORA — está vivo: tira a
    // marca de excluído para um id reaproveitado não ser bloqueado.
    deletedProjects.delete(project.id)
    internals.clearTimerFor(project.id)
    // reason 'flush': o salvar explícito é um ponto de drenagem como o
    // fechamento — se o host usa keepalive no flush, o save manual também o usa.
    emitChange(project, 'flush')
    // O `adapter.save` corre no MESMO mutex por id dos autosaves: um Salvar
    // manual nunca intercala com um autosave em voo do mesmo projeto (o POST
    // antigo não pode confirmar depois do novo). `onSave`, marcação no store e a
    // propagação do erro ficam DENTRO da cadeia para preservar a ordem e o
    // contrato (Promise rejeitada marca o badge).
    // `failure` é um objeto const: o callback async preenche-o sem esbarrar no
    // estreitamento do TS, que não reabre uma reatribuição de `let` feita dentro
    // de uma closure async (leria `failure` como o `null` inicial).
    const failure: { err?: unknown; thrown: boolean } = { thrown: false }
    await runSerialized(project.id, async () => {
      // O delete pode ter chegado enquanto este save aguardava um autosave na
      // fila — não persiste de volta o apagado.
      if (isFenced(project.id)) return
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
        failure.err = err
        failure.thrown = true
      }
    })
    // Contrato do salvar explícito: a Promise propaga a falha (marca o badge no
    // host). Capturado dentro da cadeia e re-lançado fora para não derrubar o
    // mutex (a task encadeada não pode rejeitar).
    if (failure.thrown) throw failure.err
  }

  return service
}
