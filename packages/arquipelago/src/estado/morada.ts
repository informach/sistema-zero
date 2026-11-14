import {
  LeituraDaObraEstendidaSchema,
  type ObjetoDaCasa,
  type Plataforma,
} from '@sistemazero/arquipelago-contracts'
import {
  MORADA_CATALOG,
  type MoradaHouse,
  MoradaHouseSchema,
} from '@sistemazero/avatar-quarto/morada/catalog'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  isMoradaTrophyTier,
  MORADA_FUNCTION,
  MORADA_VARIANTS,
  moradaFunction,
  moradaFunctionPiece,
  moradaInstanceAllowed,
  moradaPieceAllowed,
  moradaWithFunctions,
  moradaWithGarden,
  preservePlantings,
  validateMoradaEdit,
} from '../sistemas/morada'
import { type MoradaRest, moradaRestModes } from '../sistemas/morada-descanso'
import { salvamentoPausado } from '../sistemas/pausa'
import { podeConstruir } from './construcao'
import type { EstadoDoJogo, LojaDoJogo } from './loja'

export const PAINEL_DA_MORADA = 'casa-morada'
export interface CasaMoradaEnvelope {
  house: MoradaHouse
  revision: number
  owned: string[]
}
export interface MoradaState {
  open: boolean
  scope: string | null
  editing: boolean
  house: MoradaHouse | null
  revision: number
  owned: string[]
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'error' | 'conflict'
  error: string | null
  dirty: boolean
  recovery: MoradaHouse | null
  resting: MoradaRest | null
  rest(instanceId: string, mode: MoradaRest['mode']): void
  stopRest(): void
  before: MoradaHouse[]
  load(): Promise<void>
  enter(editing?: boolean): Promise<void>
  close(): Promise<void>
  edit(house: MoradaHouse): boolean
  undo(): void
  save(): Promise<boolean>
  recover(): void
  setEditing(value: boolean): void
  syncFunctions(): void
}
export type CasaMoradaStore = StoreApi<MoradaState>
const stores = new WeakMap<LojaDoJogo, CasaMoradaStore>()

export function casaMoradaStore(game: LojaDoJogo, platform: Plataforma): CasaMoradaStore {
  const previous = stores.get(game)
  if (previous) return previous
  const result = createCasaMoradaStore(game, platform)
  stores.set(game, result)
  return result
}

/** A mesma autorização original, admitindo o painel da casa nativa. */
export function podeConstruirMorada(state: EstadoDoJogo): boolean {
  return (
    !state.visita &&
    state.modo !== 'barco' &&
    state.modo !== 'balao' &&
    podeConstruir({
      ...state,
      painelAberto: state.painelAberto === PAINEL_DA_MORADA ? null : state.painelAberto,
    })
  )
}
const FUNCTION_MIGRATION = 'arquipelago-functions-v1' as const
/**
 * A posse para editar, como o serviço a confere ao salvar: o `owned` da plataforma mais o que já
 * está na casa (ninguém perde o que já pôs; o serviço também aceita).
 */
export function posseDaCasa(owned: readonly string[], house: MoradaHouse): Set<string> {
  const posse = new Set(owned)
  for (const instance of house.instances) posse.add(instance.pieceId)
  if (house.pet) posse.add(house.pet)
  return posse
}
/** A primeira peça (ou o bichinho) da casa nova que não é dela, ou `null`. */
export function semPosseNaCasa(next: MoradaHouse, posse: ReadonlySet<string>): string | null {
  const instance = next.instances.find((i) => !moradaInstanceAllowed(i, posse))
  if (instance) return instance.pieceId
  return next.pet && !moradaPieceAllowed(next.pet, posse) ? next.pet : null
}
/** Por que uma peça não entra: troféu (e a estante) é por conquista; o resto se compra. */
export function recadoDaPosse(pieceId: string): string {
  return isMoradaTrophyTier(pieceId)
    ? 'Conquiste o troféu antes de colocá-lo na casa.'
    : 'Esta peça ainda não é sua: ela pode ser comprada com moedas no Meu quarto.'
}
const sameHouse = (left: MoradaHouse, right: MoradaHouse) =>
  JSON.stringify(MoradaHouseSchema.parse(left)) === JSON.stringify(MoradaHouseSchema.parse(right))

type DocumentState = Pick<
  MoradaState,
  'house' | 'revision' | 'owned' | 'status' | 'error' | 'dirty' | 'recovery' | 'before'
>
const emptyDocument = (): DocumentState => ({
  house: null,
  revision: 0,
  owned: [],
  status: 'idle',
  error: null,
  dirty: false,
  recovery: null,
  before: [],
})
function documentOf(state: MoradaState): DocumentState {
  return {
    house: state.house,
    revision: state.revision,
    owned: state.owned,
    status: state.status,
    error: state.error,
    dirty: state.dirty,
    recovery: state.recovery,
    before: state.before,
  }
}

export function createCasaMoradaStore(
  game: LojaDoJogo,
  platform: Plataforma,
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null = typeof localStorage ===
  'undefined'
    ? null
    : localStorage,
): CasaMoradaStore {
  const key = `morada:casa:v1:${platform.publico}:${platform.perfil.id}`
  let epoch = 0
  let currentVisit = game.getState().visita
  let selfDraft: DocumentState | null = null
  let saving: { epoch: number; promise: Promise<boolean> } | null = null
  function guard(house: MoradaHouse, revision: number) {
    try {
      storage?.setItem(key, JSON.stringify({ house, revision }))
    } catch (error) {
      platform.relatarErro(error, 'morada-guarda-local')
      throw new Error('Não foi possível guardar esta mudança no aparelho.')
    }
  }
  function reflect(house: MoradaHouse) {
    if (store.getState().scope === 'self' && !game.getState().visita)
      game.getState().definirQuarto({ ...game.getState().quarto, house })
  }
  function requestedScope() {
    const visit = game.getState().visita
    return visit ? `visit:${visit.origem ?? 'irmao'}:${visit.perfilId}` : 'self'
  }
  function activateScope() {
    const state = store.getState()
    const visit = game.getState().visita
    const scope = requestedScope()
    if (state.scope === scope && currentVisit === visit) return
    if (state.scope === 'self') selfDraft = documentOf(state)
    epoch++
    saving = null
    currentVisit = visit
    const restored =
      scope === 'self' && selfDraft
        ? {
            ...selfDraft,
            status: selfDraft.status === 'saving' ? ('ready' as const) : selfDraft.status,
          }
        : emptyDocument()
    game.setState({ descanso: null })
    store.setState({ ...restored, scope, editing: false, resting: null })
    if (scope === 'self' && restored.house) reflect(restored.house)
  }
  function valid(token: number) {
    return (
      token === epoch &&
      store.getState().scope === requestedScope() &&
      currentVisit === game.getState().visita
    )
  }
  const store = createStore<MoradaState>()((set, get) => ({
    ...emptyDocument(),
    scope: null,
    open: false,
    editing: false,
    resting: null,
    rest(instanceId, mode) {
      const state = game.getState()
      const piece = get().house?.instances.find((i) => i.id === instanceId)
      const descriptor = piece && MORADA_CATALOG.pieces[piece.pieceId]
      if (
        !get().open ||
        get().editing ||
        get().scope !== 'self' ||
        state.visita ||
        state.acesso.somenteLeitura ||
        !descriptor ||
        !moradaRestModes(descriptor).includes(mode)
      )
        return
      set({ resting: { instanceId, mode } })
      game.setState({ descanso: mode })
    },
    stopRest() {
      set({ resting: null })
      game.setState({ descanso: null })
    },
    async load() {
      activateScope()
      const token = epoch
      const visit = game.getState().visita
      if (visit) {
        const result = MoradaHouseSchema.safeParse(visit.quarto?.house)
        set({
          ...emptyDocument(),
          ...(result.success
            ? { house: result.data, status: 'ready' as const }
            : { status: 'error' as const, error: 'A casa desta pessoa não abriu agora.' }),
        })
        return
      }
      if (get().dirty || get().status === 'loading') return
      if (!platform.lerCasaMorada) {
        set({
          status: 'error',
          editing: false,
          error: 'Esta versão da plataforma ainda não oferece a casa Morada.',
        })
        return
      }
      set({ status: 'loading', error: null })
      try {
        const envelope = await platform.lerCasaMorada()
        if (!valid(token)) return
        const original = MoradaHouseSchema.parse(envelope.house)
        const readonly = game.getState().acesso.somenteLeitura
        const source = game.getState().salvamento
        let house = readonly ? original : moradaWithGarden(original, source)
        let warning: string | null = null
        if (!readonly && !original.migrations?.includes(FUNCTION_MIGRATION)) {
          let upper: ObjetoDaCasa[] = []
          let complete = false
          try {
            const response = await platform.servico.buscar('/obra-estendida')
            if (!valid(token)) return
            const parsed =
              response.status === 200
                ? LeituraDaObraEstendidaSchema.safeParse(response.corpo)
                : null
            if (parsed?.success) {
              upper = parsed.data.obra?.andar?.objetos?.map((object) => object.id) ?? []
              complete = true
            }
          } catch (error) {
            platform.relatarErro(error, 'morada-importar-andar')
          }
          if (!valid(token)) return
          const migrated = moradaWithFunctions(house, source, MORADA_CATALOG, upper)
          const errors = validateMoradaEdit(house, migrated, source)
          if (errors.length)
            warning = `Os projetos continuam guardados. Para trazê-los à casa: ${errors[0]}`
          else house = complete ? { ...migrated, migrations: [FUNCTION_MIGRATION] } : migrated
          if (!complete)
            warning =
              'A casa abriu. Os projetos do andar ainda precisam ser recuperados; tente novamente depois.'
        }
        let recovery: MoradaHouse | null = null
        const local = storage?.getItem(key)
        if (local) {
          try {
            const parsed: unknown = JSON.parse(local)
            if (typeof parsed === 'object' && parsed !== null && 'house' in parsed) {
              const result = MoradaHouseSchema.safeParse(parsed.house)
              if (result.success && !sameHouse(result.data, house)) recovery = result.data
            }
          } catch (error) {
            platform.relatarErro(error, 'morada-recuperar-local')
          }
        }
        if (!valid(token)) return
        const dirty = !sameHouse(original, house)
        if (dirty) guard(house, envelope.revision)
        set({
          house,
          revision: envelope.revision,
          owned: envelope.owned,
          status: 'ready',
          recovery,
          dirty,
          error: warning,
          before: [],
        })
        reflect(house)
      } catch (error) {
        if (!valid(token)) return
        platform.relatarErro(error, 'morada-carregar')
        set({ status: 'error', error: 'A casa não abriu agora. Tente novamente.' })
      }
    },
    async enter(editing = false) {
      const state = game.getState()
      if (
        !state.acesso.liberado ||
        state.tempoAcabou ||
        state.tempoPausado ||
        state.ferramentaAberta ||
        state.corrida !== null ||
        state.resultado !== null ||
        salvamentoPausado(state.salvamentoSituacao) ||
        (editing && !podeConstruirMorada(state))
      )
        return
      activateScope()
      if (!state.visita && !state.acesso.somenteLeitura)
        state.mudar((save) =>
          save.casa.portaNova ? save : { ...save, casa: { ...save.casa, portaNova: true } },
        )
      game.getState().definirLugar({ dentroDeCasa: true, nadando: false })
      game.getState().abrirPainel(PAINEL_DA_MORADA)
      set({ open: true, editing: editing && podeConstruirMorada(game.getState()) })
      await get().load()
    },
    async close() {
      activateScope()
      const state = get()
      if (state.scope === 'self' && state.dirty && state.house) {
        try {
          guard(state.house, state.revision)
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Sua mudança continua nesta sessão.',
          })
        }
      }
      if (state.status === 'loading') {
        epoch++
        set({ status: state.house ? 'ready' : 'idle' })
      }
      set({ open: false, editing: false, resting: null })
      game.setState({ descanso: null })
      game.getState().definirLugar({ dentroDeCasa: false, nadando: false })
      game.getState().abrirPainel(null)
      // Sair independe da rede; a cópia local só é removida após confirmação autoritativa.
      if (state.scope === 'self' && state.dirty && state.status !== 'conflict') void get().save()
    },
    edit(house) {
      activateScope()
      const current = get().house
      const state = game.getState()
      if (
        get().scope !== 'self' ||
        !current ||
        !get().editing ||
        !podeConstruirMorada(state) ||
        get().status === 'conflict'
      )
        return false
      const errors = validateMoradaEdit(current, house, state.salvamento)
      const semPosse = semPosseNaCasa(house, posseDaCasa(get().owned, current))
      if (semPosse) errors.push(recadoDaPosse(semPosse))
      if (errors.length) {
        set({ error: errors[0] })
        return false
      }
      try {
        guard(house, get().revision)
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Não foi possível guardar a mudança.',
        })
        return false
      }
      get().stopRest()
      set({ house, dirty: true, before: [...get().before.slice(-29), current], error: null })
      reflect(house)
      return true
    },
    undo() {
      const before = get().before
      const house = before.at(-1)
      if (house && get().edit(house)) set({ before: before.slice(0, -1) })
    },
    async save() {
      activateScope()
      const token = epoch
      if (saving?.epoch === token) return saving.promise
      const state = get()
      const gameState = game.getState()
      if (state.scope !== 'self' || gameState.visita || gameState.acesso.somenteLeitura)
        return false
      if (!state.dirty) return state.status === 'ready'
      if (!state.house || state.status === 'conflict') return false
      if (!platform.salvarCasaMorada) {
        set({
          status: 'error',
          error:
            'Esta versão da plataforma ainda não grava a casa Morada. Sua mudança continua guardada neste aparelho.',
        })
        return false
      }
      const house = state.house
      set({ status: 'saving', error: null })
      const task = (async () => {
        try {
          if (!platform.salvarCasaMorada)
            throw new Error('Esta versão da plataforma ainda não grava a casa Morada.')
          const envelope = await platform.salvarCasaMorada({
            house,
            revision: state.revision,
            scope: 'house',
          })
          if (!valid(token) || get().scope !== 'self') return false
          const authoritative = MoradaHouseSchema.parse(envelope.house)
          const same = get().house === house
          if (same) {
            storage?.removeItem(key)
            set({
              house: authoritative,
              revision: envelope.revision,
              owned: envelope.owned,
              dirty: false,
              status: 'ready',
              error: null,
            })
            reflect(authoritative)
            game.getState().mudar((save) => preservePlantings(authoritative, save))
          } else {
            set({ revision: envelope.revision, owned: envelope.owned, status: 'ready' })
            const latest = get().house
            if (latest) guard(latest, envelope.revision)
          }
          return true
        } catch (error) {
          if (!valid(token) || get().scope !== 'self') return false
          const current =
            typeof error === 'object' && error !== null && 'current' in error ? error.current : null
          if (
            typeof current === 'object' &&
            current !== null &&
            'house' in current &&
            'revision' in current &&
            typeof current.revision === 'number'
          ) {
            const parsed = MoradaHouseSchema.safeParse(current.house)
            if (parsed.success) {
              const owned =
                'owned' in current &&
                Array.isArray(current.owned) &&
                current.owned.every((id): id is string => typeof id === 'string')
                  ? current.owned
                  : get().owned
              const same = get().house === house
              if (current.revision === state.revision + 1 && sameHouse(parsed.data, house)) {
                if (same) storage?.removeItem(key)
                set({
                  house: same ? parsed.data : get().house,
                  revision: current.revision,
                  owned,
                  status: 'ready',
                  dirty: !same,
                  error: null,
                })
                if (same) reflect(parsed.data)
                game.getState().mudar((save) => preservePlantings(parsed.data, save))
                return true
              }
              // O backup é o rascunho próprio, nunca o documento da visita.
              set({
                recovery: get().house,
                house: parsed.data,
                revision: current.revision,
                owned,
                dirty: false,
                status: 'conflict',
                error:
                  'A casa mudou em outro aparelho. A sua versão ficou guardada para recuperar.',
              })
              reflect(parsed.data)
              return false
            }
          }
          platform.relatarErro(error, 'morada-gravar')
          set({
            status: 'error',
            error: 'A casa ainda não foi enviada. Sua mudança continua guardada neste aparelho.',
          })
          return false
        }
      })()
      saving = { epoch: token, promise: task }
      const release = () => {
        if (saving?.promise === task) saving = null
      }
      void task.then(release, release)
      return task
    },
    recover() {
      activateScope()
      const recovery = get().recovery
      if (get().scope !== 'self' || !recovery || !podeConstruirMorada(game.getState())) return
      set({ status: 'ready', editing: true })
      if (get().edit(recovery)) set({ recovery: null })
    },
    setEditing(editing) {
      activateScope()
      game.setState({ descanso: null })
      set({
        resting: null,
        editing: editing && get().scope === 'self' && podeConstruirMorada(game.getState()),
      })
    },
    syncFunctions() {
      activateScope()
      const house = get().house
      const state = game.getState()
      if (
        get().scope !== 'self' ||
        !house ||
        state.visita ||
        state.acesso.somenteLeitura ||
        get().status === 'conflict'
      )
        return
      let changed = false
      const instances = house.instances.map((instance) => {
        const id = moradaFunction(instance)
        if (
          !id ||
          ![MORADA_FUNCTION[id], ...Object.values(MORADA_VARIANTS[id])].includes(instance.pieceId)
        )
          return instance
        const pieceId = moradaFunctionPiece(id, state.salvamento.projetos[id]?.aparencia ?? null)
        if (pieceId === instance.pieceId) return instance
        changed = true
        return { ...instance, pieceId }
      })
      if (!changed) return
      const next = { ...house, instances }
      const errors = validateMoradaEdit(house, next, state.salvamento)
      if (errors.length) {
        set({ error: `A aparência foi guardada. Para colocá-la na casa: ${errors[0]}` })
        return
      }
      const semPosse = semPosseNaCasa(next, posseDaCasa(get().owned, house))
      if (semPosse) {
        set({ error: recadoDaPosse(semPosse) })
        return
      }
      try {
        guard(next, get().revision)
        set({ house: next, dirty: true })
        reflect(next)
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : 'Não foi possível guardar a mudança da aparência.',
        })
      }
    },
  }))
  // Mudar/encerrar a visita troca o documento imediatamente; respostas em voo pertencem ao epoch anterior.
  game.subscribe((state, previous) => {
    if (state.visita !== previous.visita) {
      activateScope()
      if (store.getState().open) void store.getState().load()
    }
  })
  return store
}
export function useCasaMorada<T>(store: CasaMoradaStore, select: (state: MoradaState) => T): T {
  return useStore(store, select)
}
