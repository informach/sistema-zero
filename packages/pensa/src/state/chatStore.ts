/**
 * Store por INSTÂNCIA da ETAPA Z (factory, padrão do projectStore): conversa
 * de clareza com o Zappy via `transport.streamChat` (SSE no host) + Carta da
 * Ideia (gerar/validar/avançar). Mensagens ficam CRUAS no estado (com a linha
 * `SUGESTÕES:` persistida) — a UI exibe via splitChips/hideChipLines; os chips
 * derivados vivem em `chips`. Erros viram mensagem gentil (a UI oferece retry).
 */

import { z } from 'zod'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { splitChips } from '../core/chips'
import { friendlyErrorMessage } from '../core/copy'
import type {
  PensaArtifactView,
  PensaChatMessage,
  PensaCycleView,
  PensaStageView,
  PensaTransport,
  PensaZState,
} from '../core/types'

const zStateSchema = z.object({
  answered: z.object({
    who: z.boolean(),
    problem: z.boolean(),
    action: z.boolean(),
    screens: z.boolean(),
    success: z.boolean(),
  }),
  ready: z.boolean(),
})

/** Valida o `state` cru da conversa (etapa nova chega `{}` → null). */
export function parseZState(value: unknown): PensaZState | null {
  const result = zStateSchema.safeParse(value)
  return result.success ? result.data : null
}

/** Chips vigentes = os da ÚLTIMA mensagem do assistente. */
function lastAssistantChips(messages: PensaChatMessage[]): string[] {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (message && message.role === 'assistant') return splitChips(message.content).chips
  }
  return []
}

export interface PensaChatStoreState {
  cycleId: string | null
  stage: 'z'
  /** Cópia local das mensagens persistidas + turno em curso (conteúdo CRU). */
  messages: PensaChatMessage[]
  summary: string | null
  /** Buffer do delta do turno em curso (bolha ao vivo). */
  streamingText: string
  sending: boolean
  chatError: string | null
  /** Última mensagem que falhou (o retry a reenvia). */
  lastFailedMessage: string | null
  zState: PensaZState | null
  /** Sugestões clicáveis extraídas da última mensagem do assistente. */
  chips: string[]
  stageLoaded: boolean
  loadingStage: boolean
  stageError: string | null

  /** Latest do type 'idea' (a Carta da Ideia). */
  ideaArtifact: PensaArtifactView | null
  generatingIdea: boolean
  validating: boolean
  advancing: boolean
  ideaError: string | null

  loadStage(cycleId: string): Promise<void>
  send(projectId: string, message: string): void
  /** Reenvia a última mensagem que falhou. */
  retry(projectId: string): void
  /** Aborta o turno em voo (nada foi persistido; a mensagem pode ser reenviada). */
  cancel(): void
  generateIdea(): Promise<boolean>
  validateIdea(): Promise<boolean>
  advance(): Promise<boolean>
}

export type PensaChatStore = StoreApi<PensaChatStoreState>

export function createChatStore(transport: PensaTransport): PensaChatStore {
  /** Cancela o turno em curso (fechado pelo send de cada turno). */
  let cancelActiveTurn: (() => void) | null = null

  return createStore<PensaChatStoreState>((set, get) => ({
    cycleId: null,
    stage: 'z',
    messages: [],
    summary: null,
    streamingText: '',
    sending: false,
    chatError: null,
    lastFailedMessage: null,
    zState: null,
    chips: [],
    stageLoaded: false,
    loadingStage: false,
    stageError: null,

    ideaArtifact: null,
    generatingIdea: false,
    validating: false,
    advancing: false,
    ideaError: null,

    async loadStage(cycleId) {
      set({ cycleId, loadingStage: true, stageError: null })
      try {
        const view = await transport.request<PensaStageView>(`/cycles/${cycleId}/stages/z`)
        // Trocou de ciclo enquanto carregava? Descarta.
        if (get().cycleId !== cycleId) return
        const messages = view.conversation.messages
        set({
          loadingStage: false,
          stageLoaded: true,
          messages,
          summary: view.conversation.summary,
          zState: parseZState(view.state),
          chips: lastAssistantChips(messages),
          ideaArtifact: view.artifacts.find((artifact) => artifact.type === 'idea') ?? null,
        })
      } catch (error) {
        if (get().cycleId !== cycleId) return
        set({ loadingStage: false, stageError: friendlyErrorMessage(error) })
      }
    },

    send(projectId, message) {
      const { cycleId, sending } = get()
      const trimmed = message.trim()
      if (!cycleId || sending || !trimmed) return

      // Mensagem otimista da criança (removida se o turno falhar/for abortado).
      const userMessage: PensaChatMessage = {
        role: 'user',
        content: trimmed,
        at: new Date().toISOString(),
      }
      set((state) => ({
        messages: [...state.messages, userMessage],
        sending: true,
        chatError: null,
        streamingText: '',
        chips: [],
      }))

      let buffer = ''
      let closed = false
      let abortStream: (() => void) | null = null

      const rollbackTurn = (chatError: string | null): void => {
        set((state) => {
          const messages = state.messages.filter((m) => m !== userMessage)
          return {
            messages,
            sending: false,
            streamingText: '',
            chatError,
            lastFailedMessage: trimmed,
            chips: lastAssistantChips(messages),
          }
        })
      }

      cancelActiveTurn = () => {
        if (closed) return
        closed = true
        abortStream?.()
        rollbackTurn(null)
      }

      try {
        const abort = transport.streamChat(
          { projectId, cycleId, stage: 'z', message: trimmed },
          {
            onDelta(text) {
              if (closed) return
              buffer += text
              set({ streamingText: buffer })
            },
            onState(state) {
              if (closed) return
              const parsed = parseZState(state)
              if (parsed) set({ zState: parsed })
            },
            onDone() {
              if (closed) return
              closed = true
              const assistantMessage: PensaChatMessage = {
                role: 'assistant',
                content: buffer,
                at: new Date().toISOString(),
              }
              set((state) => ({
                messages: [...state.messages, assistantMessage],
                sending: false,
                streamingText: '',
                chips: splitChips(buffer).chips,
                lastFailedMessage: null,
              }))
            },
            onError(error) {
              if (closed) return
              closed = true
              rollbackTurn(friendlyErrorMessage(error))
            },
          },
        )
        if (!closed) abortStream = abort
      } catch (error) {
        // Transport sem streaming (ou falha síncrona) — mesmo tratamento de erro.
        if (!closed) {
          closed = true
          rollbackTurn(friendlyErrorMessage(error))
        }
      }
    },

    retry(projectId) {
      const { lastFailedMessage, sending } = get()
      if (!lastFailedMessage || sending) return
      set({ chatError: null })
      get().send(projectId, lastFailedMessage)
    },

    cancel() {
      cancelActiveTurn?.()
      cancelActiveTurn = null
    },

    async generateIdea() {
      const { cycleId, generatingIdea } = get()
      if (!cycleId || generatingIdea) return false
      set({ generatingIdea: true, ideaError: null })
      try {
        const { artifact } = await transport.request<{ artifact: PensaArtifactView }>(
          `/cycles/${cycleId}/artifacts/generate`,
          { method: 'POST', body: { type: 'idea' } },
        )
        set({ generatingIdea: false, ideaArtifact: artifact })
        return true
      } catch (error) {
        set({ generatingIdea: false, ideaError: friendlyErrorMessage(error) })
        return false
      }
    },

    async validateIdea() {
      const { cycleId, validating } = get()
      if (!cycleId || validating) return false
      set({ validating: true, ideaError: null })
      try {
        const { artifact } = await transport.request<{ artifact: PensaArtifactView }>(
          `/cycles/${cycleId}/artifacts/idea/validate`,
          { method: 'POST' },
        )
        set({ validating: false, ideaArtifact: artifact })
        return true
      } catch (error) {
        set({ validating: false, ideaError: friendlyErrorMessage(error) })
        return false
      }
    },

    async advance() {
      const { cycleId, advancing } = get()
      if (!cycleId || advancing) return false
      set({ advancing: true, ideaError: null })
      try {
        await transport.request<{ cycle: PensaCycleView }>(`/cycles/${cycleId}/advance`, {
          method: 'POST',
          body: { from: 'z' },
        })
        set({ advancing: false })
        return true
      } catch (error) {
        set({ advancing: false, ideaError: friendlyErrorMessage(error) })
        return false
      }
    },
  }))
}
