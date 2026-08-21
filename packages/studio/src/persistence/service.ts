import type { Project } from '#core'
// Import do MÓDULO PURO (não do barrel #blockly): o service vive no chunk do
// núcleo e não pode arrastar Blockly (workspaceState → buildIR → blockly/core).
import { isBlocksStateEmpty } from '../blockly/blocksStateShape'
import { snapshotProjectWithCurrentAuthority } from '../state/bridgeAuthority'
import type { BlocksHydrationStatus, ProjectStoreApi } from '../state/projectStore'
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

// Teto da restauração em 2º plano dos blocos: passado disso o status vira
// 'failed' (a UI destrava; a partição salva segue PROTEGIDA até resolver). Uma
// resolução tardia ainda restaura normalmente — o timeout só solta a espera.
const BLOCKS_HYDRATION_TIMEOUT_DEFAULT_MS = 10_000
let blocksHydrationTimeoutMs = BLOCKS_HYDRATION_TIMEOUT_DEFAULT_MS

/** Encurta o timeout da restauração dos blocos em testes (timers reais). */
export function setBlocksHydrationTimeoutForTests(ms: number | null): void {
  blocksHydrationTimeoutMs = ms ?? BLOCKS_HYDRATION_TIMEOUT_DEFAULT_MS
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
  /** Restaura partes pesadas omitidas pelo load rápido, sem bloquear a abertura. */
  hydrateAfterLoad(project: Project): void
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
  readonly scopeIdentity: string
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

function scopedProjectIdentity(scopeIdentity: string, projectId: string): string {
  return `${scopeIdentity}\u0000${projectId}`
}

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
function isFenced(scopeIdentity: string, projectId: string): boolean {
  const identity = scopedProjectIdentity(scopeIdentity, projectId)
  const deletedAt = deletedProjects.get(identity)
  if (deletedAt === undefined) return false
  const now = Date.now()
  if (now - deletedAt >= DELETED_FENCE_GRACE_MS) {
    deletedProjects.delete(identity)
    return false
  }
  return true
}

export function cancelPendingAutosavesFor(projectId: string, scopeIdentity = 'external'): void {
  const now = Date.now()
  pruneDeletedFence(now)
  deletedProjects.set(scopedProjectIdentity(scopeIdentity, projectId), now)
  for (const service of liveServices) {
    if (service.scopeIdentity !== scopeIdentity) continue
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
  const serviceScopeIdentity = adapter?.scopeIdentity ?? 'external'
  const pending = new Map<string, PendingAutosave>()
  // Capturado no attach: duas instâncias já ligadas não mudam de debounce se
  // outra instância (ou outro arquivo de teste concorrente) ajustar o default.
  // Em produção o valor continua 1 s; nos testes elimina interferência global
  // entre serviços que exercitam corridas temporais em paralelo.
  let attachedAutosaveDelay = autosaveDelay

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

  // Status da restauração em 2º plano dos blocos, POR id (autoritativo desta
  // instância; o campo espelhado no store é só para a UI reagir). Enquanto
  // 'pending'/'failed', os saves desta instância NÃO gravam a partição de blocos
  // — ver `snapshotForSave`.
  const blocksHydrationById = new Map<string, BlocksHydrationStatus>()

  function setHydrationStatus(projectId: string, status: BlocksHydrationStatus): void {
    blocksHydrationById.set(projectId, status)
    const state = store.getState()
    if (state.project?.id === projectId) state.setBlocksHydration(status)
  }

  function shouldStripBlocks(projectId: string): boolean {
    const status = blocksHydrationById.get(projectId)
    return status === 'pending' || status === 'failed'
  }

  /**
   * TRANCA ANTI-PERDA: enquanto a partição de blocos ainda está sendo restaurada
   * ('pending') — ou falhou em ser lida ('failed') — o snapshot enviado ao
   * adapter/host vai SEM `blocksState`. O guard existente do `persistProject`
   * (não grava a partição quando `blocksState == null`) faz o resto: um estado
   * quase-vazio (workspace recém-limpo) ou DERIVADO (reconstrução da Ponte ao
   * reabrir) nunca sobrescreve os blocos reais salvos no disco. Depois de
   * resolver ('restored'/'empty'/'discarded'), os saves voltam ao normal — um
   * clear deliberado do aluno continua sendo persistido.
   */
  function snapshotForSave(project: Project): Project {
    const currentAuthority = snapshotProjectWithCurrentAuthority(project)
    if (currentAuthority.blocksState == null) return currentAuthority
    if (!shouldStripBlocks(project.id)) return currentAuthority
    return { ...currentAuthority, blocksState: null }
  }

  const internals: ServiceInternals = {
    scopeIdentity: serviceScopeIdentity,
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
      blocksHydrationById.delete(projectId)
    },
  }

  function clearAllTimers(): void {
    for (const entry of pending.values()) clearTimeout(entry.timer)
    pending.clear()
  }

  const service: PersistenceService = {
    handlers: {},
    attach,
    hydrateAfterLoad,
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

  function hydrateAfterLoad(project: Project): void {
    // Mantém no Map só o projeto vivo desta instância: status de projetos já
    // fechados não interessam mais (um save enfileirado deles carrega blocksState
    // null em memória, que o guard do persistProject já pula sozinho).
    for (const id of [...blocksHydrationById.keys()]) {
      if (id !== project.id) blocksHydrationById.delete(id)
    }
    // Elegibilidade (status fica 'idle' — nada é trancado): sem partição a
    // restaurar (adapter sem loadBlocksState), projeto pro (blocos não se
    // aplicam) ou o host já entregou o projeto COMPLETO.
    if (!adapter?.loadBlocksState) return
    if (project.kind === 'pro') return
    // A partição existente pertence aos blocos antigos: o texto da Ponte foi
    // editado depois. Não a restaura por cima do código novo; o reverse-parse
    // produzirá uma partição coerente e então retirará esta marca.
    if (project.bridgeCodeAhead === true) {
      setHydrationStatus(project.id, 'discarded')
      return
    }
    if (project.blocksState != null) return
    setHydrationStatus(project.id, 'pending')
    // O timeout NÃO abandona a leitura: só troca 'pending'→'failed' para a UI
    // destravar (a tranca continua protegendo a partição). Se a leitura resolver
    // depois, o `.then` abaixo ainda restaura normalmente.
    const timeout = setTimeout(() => {
      if (blocksHydrationById.get(project.id) !== 'pending') return
      console.warn(
        '[sz] a restauração dos blocos salvos está demorando — a partição fica protegida até resolver.',
      )
      setHydrationStatus(project.id, 'failed')
    }, blocksHydrationTimeoutMs)
    void adapter
      .loadBlocksState(project)
      .then((blocksState) => {
        clearTimeout(timeout)
        const current = store.getState()
        if (current.project?.id !== project.id) {
          blocksHydrationById.delete(project.id)
          return
        }
        if (current.project.bridgeCodeAhead === true) {
          setHydrationStatus(project.id, 'discarded')
          return
        }
        if (blocksState == null) {
          // Definitivo: não há nada salvo. Os modos podem derivar do código.
          setHydrationStatus(project.id, 'empty')
          return
        }
        // Restaura SÓ para dentro de um canvas VAZIO. Blocos vivos não-vazios
        // (o aluno montou algo, ou a Ponte derivou do código) vencem o layout
        // salvo mais antigo — sobrescrever trabalho em memória com o disco no
        // meio da sessão nunca é certo. ⚠️ O sinal NÃO é `isDirty`: um autosave
        // que corra nesta janela chama `markSaved` e limpa o isDirty, e a
        // restauração tardia clobraria os blocos vivos "salvos". Um canvas vivo
        // vazio, por outro lado, não codifica trabalho nenhum (edições de
        // arquivo são preservadas — o patch só troca o blocksState).
        if (!isBlocksStateEmpty(current.project.blocksState)) {
          setHydrationStatus(project.id, 'discarded')
          return
        }
        current.hydrateProjectState({ blocksState })
        setHydrationStatus(project.id, 'restored')
      })
      .catch((err) => {
        clearTimeout(timeout)
        console.warn(
          '[sz] não foi possível restaurar o layout salvo dos blocos:',
          err instanceof Error ? err.message : err,
        )
        if (store.getState().project?.id === project.id) {
          setHydrationStatus(project.id, 'failed')
        } else {
          blocksHydrationById.delete(project.id)
        }
      })
  }

  function persistAndMark(project: Project): Promise<void> {
    // Já excluído antes de começar: não persiste de volta o que foi apagado.
    // (checa fora da cadeia para nem enfileirar a task do projeto apagado.)
    if (isFenced(serviceScopeIdentity, project.id)) return Promise.resolve()
    // Encadeia no mutex por id: dois autosaves do mesmo projeto confirmam EM
    // ORDEM (o 2º só envia ao adapter depois do 1º resolver).
    return runSerialized(project.id, async () => {
      // Re-checa DENTRO da cadeia: o delete pode ter chegado enquanto este save
      // esperava o anterior na fila.
      if (isFenced(serviceScopeIdentity, project.id)) return
      try {
        // Tranca anti-perda avaliada NA HORA do write (o status pode ter mudado
        // enquanto este save aguardava a cadeia). `markSaved` compara a
        // referência ORIGINAL — o snapshot é só o que vai ao adapter.
        if (adapter) await adapter.save(snapshotForSave(project))
        // Excluído ENQUANTO o save estava em voo (adapter lento/remoto): aborta
        // sem marcar salvo — o `delMany` do delete já correu, re-persistir
        // ressuscitaria o projeto apagado.
        if (isFenced(serviceScopeIdentity, project.id)) return
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
      // O host recebe o MESMO snapshot protegido que o adapter: enquanto a
      // partição de blocos hidrata, um host que persiste via onChange também não
      // pode gravar um blocksState quase-vazio/derivado por cima do real.
      emitChange(snapshotForSave(project), 'autosave')
      void persistAndMark(project)
    }, attachedAutosaveDelay)
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
      emitChange(snapshotForSave(project), 'flush')
      void persistAndMark(project)
    }
  }

  function attach(): () => void {
    attachedAutosaveDelay = autosaveDelay
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
    // Nem um save explícito limpa a cerca: ele pode ter sido disparado por uma
    // referência obsoleta enquanto o delete ainda disputa com um save em voo.
    // IDs novos são ULIDs; um reaproveitamento excepcional só volta a ser
    // aceito depois da janela de graça, quando `isFenced` poda a marca.
    internals.clearTimerFor(project.id)
    // reason 'flush': o salvar explícito é um ponto de drenagem como o
    // fechamento — se o host usa keepalive no flush, o save manual também o usa.
    emitChange(snapshotForSave(project), 'flush')
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
      if (isFenced(serviceScopeIdentity, project.id)) return
      try {
        // Mesmo snapshot protegido para adapter E host (recalculado na hora do
        // write — o status pode ter resolvido enquanto o save aguardava a fila).
        const snapshot = snapshotForSave(project)
        if (adapter) await adapter.save(snapshot)
        await service.handlers.onSave?.(snapshot)
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
