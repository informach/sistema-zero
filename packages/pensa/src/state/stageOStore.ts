/**
 * Store por INSTÂNCIA da ETAPA O (factory, padrão do projectStore): checklist
 * do lançamento. O stage view traz os ARTEFATOS (o espelho `checklist_seed`
 * indica seed já feita) E os itens VIVOS do ciclo (contrato 07/2026) — o
 * loadStage re-hidrata os checks no reload. Os PATCHes devolvem o item
 * canônico; toggle otimista com rollback; advance `{from:'o'}` liga a festa
 * (`launched`) e guarda o delta de gamificação. A Carta da Ideia da celebração
 * é buscada em segundo plano no stage z.
 */
import { z } from 'zod'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { friendlyErrorMessage } from '../core/copy'
import { type PensaGamificationDelta, parseGamificationDelta } from '../core/gamification'
import type {
  PensaChecklistItemView,
  PensaCycleView,
  PensaStageView,
  PensaTransport,
} from '../core/types'

/** Conteúdo do artefato `idea` (a Carta da Ideia carimbada na festa). */
const ideaContentSchema = z.object({ text: z.string() })

export interface PensaStageOStoreState {
  cycleId: string | null
  stageLoaded: boolean
  loadingStage: boolean
  stageError: string | null

  /** Existe artefato `checklist_seed` (seed já feita alguma vez). */
  hasSeed: boolean
  /** Itens VIVOS (ids reais). `null` = nada em memória (fresh/reload). */
  items: PensaChecklistItemView[] | null

  generating: boolean
  generateError: string | null

  /** Item com PATCH de toggle em voo (evita cliques concorrentes no mesmo). */
  togglingId: string | null
  toggleError: string | null

  advancing: boolean
  advanceError: string | null
  /** Advance o→done aprovado: hora da festa (LaunchCelebration). */
  launched: boolean
  gamification: PensaGamificationDelta | null
  /** Texto da Carta da Ideia (buscado em segundo plano após o lançamento). */
  ideaText: string | null

  loadStage(cycleId: string): Promise<void>
  /** POST generate {type:'checklist_seed'} → REPLACE do template (ids reais). */
  generateChecklist(projectId: string): Promise<boolean>
  toggleItem(itemId: string, done: boolean): Promise<boolean>
  advance(): Promise<boolean>
}

export type PensaStageOStore = StoreApi<PensaStageOStoreState>

export function createStageOStore(transport: PensaTransport): PensaStageOStore {
  return createStore<PensaStageOStoreState>((set, get) => ({
    cycleId: null,
    stageLoaded: false,
    loadingStage: false,
    stageError: null,

    hasSeed: false,
    items: null,

    generating: false,
    generateError: null,

    togglingId: null,
    toggleError: null,

    advancing: false,
    advanceError: null,
    launched: false,
    gamification: null,
    ideaText: null,

    async loadStage(cycleId) {
      set({ cycleId, loadingStage: true, stageError: null })
      try {
        const view = await transport.request<PensaStageView>(`/cycles/${cycleId}/stages/o`)
        // Trocou de ciclo enquanto carregava? Descarta.
        if (get().cycleId !== cycleId) return
        set({
          loadingStage: false,
          stageLoaded: true,
          hasSeed: view.artifacts.some((artifact) => artifact.type === 'checklist_seed'),
          // Estado VIVO do checklist vem na própria view — reload preserva os checks.
          ...(view.checklist.length > 0 ? { items: view.checklist } : {}),
        })
      } catch (error) {
        if (get().cycleId !== cycleId) return
        set({ loadingStage: false, stageError: friendlyErrorMessage(error) })
      }
    },

    async generateChecklist(projectId) {
      const { cycleId, generating } = get()
      if (!cycleId || generating) return false
      set({ generating: true, generateError: null })
      try {
        const { items } = await transport.request<{ items: PensaChecklistItemView[] }>(
          `/cycles/${cycleId}/artifacts/generate`,
          { method: 'POST', body: { type: 'checklist_seed', projectId } },
        )
        set({ generating: false, items, hasSeed: true, toggleError: null })
        return true
      } catch (error) {
        set({ generating: false, generateError: friendlyErrorMessage(error) })
        return false
      }
    },

    async toggleItem(itemId, done) {
      const { items, togglingId } = get()
      if (!items || togglingId === itemId) return false
      const current = items.find((item) => item.id === itemId)
      if (!current || current.done === done) return true
      // Otimista: o check muda na hora; o PATCH confirma (resposta canônica).
      set((state) => ({
        togglingId: itemId,
        toggleError: null,
        items: (state.items ?? []).map((item) =>
          item.id === itemId
            ? { ...item, done, doneAt: done ? new Date().toISOString() : null }
            : item,
        ),
      }))
      try {
        const { item } = await transport.request<{ item: PensaChecklistItemView }>(
          `/checklist/${itemId}`,
          { method: 'PATCH', body: { done } },
        )
        set((state) => ({
          togglingId: null,
          items: (state.items ?? []).map((it) => (it.id === itemId ? item : it)),
        }))
        return true
      } catch (error) {
        // Rollback: o check volta como estava.
        set((state) => ({
          togglingId: null,
          toggleError: friendlyErrorMessage(error),
          items: (state.items ?? []).map((it) => (it.id === itemId ? current : it)),
        }))
        return false
      }
    },

    async advance() {
      const { cycleId, advancing } = get()
      if (!cycleId || advancing) return false
      set({ advancing: true, advanceError: null })
      try {
        const response = await transport.request<{
          cycle: PensaCycleView
          gamification?: unknown
        }>(`/cycles/${cycleId}/advance`, { method: 'POST', body: { from: 'o' } })
        set({
          advancing: false,
          launched: true,
          gamification: parseGamificationDelta(response.gamification),
        })
        // Carta da Ideia em segundo plano (a festa não espera; sem carta,
        // a celebração mostra o nome do projeto).
        void (async () => {
          try {
            const zView = await transport.request<PensaStageView>(`/cycles/${cycleId}/stages/z`)
            const idea = zView.artifacts.find((artifact) => artifact.type === 'idea')
            const parsed = ideaContentSchema.safeParse(idea?.content)
            if (parsed.success && get().cycleId === cycleId) set({ ideaText: parsed.data.text })
          } catch {
            // Festa segue sem a carta.
          }
        })()
        return true
      } catch (error) {
        set({ advancing: false, advanceError: friendlyErrorMessage(error) })
        return false
      }
    },
  }))
}
