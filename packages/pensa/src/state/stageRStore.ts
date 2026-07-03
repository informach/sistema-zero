/**
 * Store por INSTÂNCIA da ETAPA R (factory, padrão do projectStore): kanban de
 * missões. O stage view só traz os ARTEFATOS (o espelho `mission_plan` indica
 * plano já gerado); as tasks VIVAS vêm do generate (`{tasks}`) e dos PATCHes
 * (resposta canônica `{task}`). Movimentos são otimistas com rollback; regra
 * kids: no máximo 1 card em 'doing' (a troca é confirmada na UI e executada
 * pelo swapDoing). A semeadura do Estúdio (ensureStudioProject) usa a
 * capability opcional do host + PATCH do projeto. Erros viram mensagem gentil.
 *
 * O GET da etapa devolve TAMBÉM as tasks VIVAS do ciclo (contrato 07/2026) — o
 * loadStage re-hidrata o quadro no reload sem re-gerar o plano. "Recriar as
 * missões" fica só de fallback raro (plano salvo com quadro vazio).
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import { friendlyErrorMessage } from '../core/copy'
import { type PensaGamificationDelta, parseGamificationDelta } from '../core/gamification'
import type {
  PensaCycleView,
  PensaMission,
  PensaProjectDetailView,
  PensaStageView,
  PensaTaskColumn,
  PensaTaskView,
  PensaTransport,
} from '../core/types'

/** O que a criança escreve ao criar/editar uma missão à mão (autoria manual). */
export interface PensaTaskDraft {
  title: string
  summary?: string | null
  taskType?: string | null
  mission: PensaMission
}

export interface PensaStageRStoreState {
  cycleId: string | null
  stageLoaded: boolean
  loadingStage: boolean
  stageError: string | null

  /** Existe artefato `mission_plan` (plano já gerado alguma vez). */
  hasPlan: boolean
  /** Tasks VIVAS (ids reais). `null` = nada em memória (fresh/reload). */
  tasks: PensaTaskView[] | null

  generating: boolean
  generateError: string | null

  /** Task com PATCH de movimento em voo (desabilita os botões de estado). */
  movingTaskId: string | null
  moveError: string | null

  /** Autoria manual (add/editar/apagar) em voo + erro gentil. */
  savingTask: boolean
  taskActionError: string | null
  /** "Sugerir mais missões" (append via IA) em voo. */
  suggestingMore: boolean

  /** Semeadura do projeto do Estúdio em voo. */
  seeding: boolean
  seedError: string | null

  advancing: boolean
  advanceError: string | null
  /** Delta devolvido pelo advance (toast "+XP" na UI). */
  gamification: PensaGamificationDelta | null

  loadStage(cycleId: string): Promise<void>
  /** POST generate {type:'mission_plan'} → REPLACE total (tasks com ids reais). */
  generateMissions(projectId: string): Promise<boolean>
  /** "Sugerir mais missões": POST generate {append:true} → APPEND (não zera o quadro). */
  suggestMoreMissions(projectId: string): Promise<boolean>
  /** Autoria manual: cria 1 missão no fim do backlog (POST /tasks). */
  addTask(draft: PensaTaskDraft): Promise<boolean>
  /** Autoria manual: edita título/resumo/missão de 1 card (PATCH conteúdo). */
  editTask(taskId: string, draft: PensaTaskDraft): Promise<boolean>
  /** Autoria manual: apaga 1 card (DELETE, otimista com rollback). */
  removeTask(taskId: string): Promise<boolean>
  /** Sobe/desce 1 card DENTRO da coluna (otimista com rollback). */
  reorderTask(taskId: string, direction: 'up' | 'down'): Promise<boolean>
  /** Grava a anotação da criança no card (PATCH notes, otimista). */
  setTaskNotes(taskId: string, notes: string | null): Promise<boolean>
  /**
   * Move OTIMISTA (rollback no erro). Alvo 'doing' já ocupado por outra task →
   * recusa (false, sem rede): a UI pergunta e chama swapDoing.
   */
  moveTask(taskId: string, column: PensaTaskColumn): Promise<boolean>
  /** Troca confirmada: a task em 'doing' volta ao backlog e esta assume. */
  swapDoing(taskId: string): Promise<boolean>
  /**
   * Semeadura LAZY (primeira abertura de missão): host cria o projeto no
   * Estúdio → PATCH `/projects/:id {studioProjectId}` → absorve o detail.
   * Sem a capability (ou falha) → null (a UI degrada para orientação textual).
   */
  ensureStudioProject(project: PensaProjectDetailView): Promise<string | null>
  advance(): Promise<boolean>
}

export type PensaStageRStore = StoreApi<PensaStageRStoreState>

export interface PensaStageRStoreOptions {
  /** Capability opcional do host (PensaHostAdapter.createStudioProject). */
  createStudioProject?: (name: string) => Promise<string>
  /** Recebe o detalhe do projeto após o PATCH da semeadura. */
  onProjectUpdated?: (project: PensaProjectDetailView) => void
}

export function createStageRStore(
  transport: PensaTransport,
  options: PensaStageRStoreOptions = {},
): PensaStageRStore {
  return createStore<PensaStageRStoreState>((set, get) => ({
    cycleId: null,
    stageLoaded: false,
    loadingStage: false,
    stageError: null,

    hasPlan: false,
    tasks: null,

    generating: false,
    generateError: null,

    movingTaskId: null,
    moveError: null,

    savingTask: false,
    taskActionError: null,
    suggestingMore: false,

    seeding: false,
    seedError: null,

    advancing: false,
    advanceError: null,
    gamification: null,

    async loadStage(cycleId) {
      set({ cycleId, loadingStage: true, stageError: null })
      try {
        const view = await transport.request<PensaStageView>(`/cycles/${cycleId}/stages/r`)
        // Trocou de ciclo enquanto carregava? Descarta.
        if (get().cycleId !== cycleId) return
        set({
          loadingStage: false,
          stageLoaded: true,
          hasPlan: view.artifacts.some((artifact) => artifact.type === 'mission_plan'),
          // Estado VIVO do quadro vem na própria view — o reload re-hidrata as
          // colunas sem re-gerar o plano ("Recriar" fica só de fallback raro).
          ...(view.tasks.length > 0 ? { tasks: view.tasks } : {}),
        })
      } catch (error) {
        if (get().cycleId !== cycleId) return
        set({ loadingStage: false, stageError: friendlyErrorMessage(error) })
      }
    },

    async generateMissions(projectId) {
      const { cycleId, generating } = get()
      if (!cycleId || generating) return false
      set({ generating: true, generateError: null })
      try {
        const { tasks } = await transport.request<{ tasks: PensaTaskView[] }>(
          `/cycles/${cycleId}/artifacts/generate`,
          { method: 'POST', body: { type: 'mission_plan', projectId } },
        )
        set({ generating: false, tasks, hasPlan: true, moveError: null })
        return true
      } catch (error) {
        set({ generating: false, generateError: friendlyErrorMessage(error) })
        return false
      }
    },

    async suggestMoreMissions(projectId) {
      const { cycleId, suggestingMore } = get()
      if (!cycleId || suggestingMore) return false
      set({ suggestingMore: true, generateError: null })
      try {
        // append:true → o BFF gera poucas NOVAS e as ANEXA (não zera o quadro).
        const { tasks } = await transport.request<{ tasks: PensaTaskView[] }>(
          `/cycles/${cycleId}/artifacts/generate`,
          { method: 'POST', body: { type: 'mission_plan', projectId, append: true } },
        )
        set((state) => ({
          suggestingMore: false,
          tasks: [...(state.tasks ?? []), ...tasks],
        }))
        return true
      } catch (error) {
        set({ suggestingMore: false, generateError: friendlyErrorMessage(error) })
        return false
      }
    },

    async addTask(draft) {
      const { cycleId, savingTask } = get()
      if (!cycleId || savingTask) return false
      set({ savingTask: true, taskActionError: null })
      try {
        const { tasks } = await transport.request<{ tasks: PensaTaskView[] }>(
          `/cycles/${cycleId}/tasks`,
          { method: 'POST', body: { tasks: [draft] } },
        )
        set((state) => ({ savingTask: false, tasks: [...(state.tasks ?? []), ...tasks] }))
        return true
      } catch (error) {
        set({ savingTask: false, taskActionError: friendlyErrorMessage(error) })
        return false
      }
    },

    async editTask(taskId, draft) {
      const { savingTask } = get()
      if (savingTask) return false
      set({ savingTask: true, taskActionError: null })
      try {
        const { task } = await transport.request<{ task: PensaTaskView }>(`/tasks/${taskId}`, {
          method: 'PATCH',
          body: { title: draft.title, summary: draft.summary ?? null, mission: draft.mission },
        })
        set((state) => ({
          savingTask: false,
          tasks: (state.tasks ?? []).map((t) => (t.id === taskId ? task : t)),
        }))
        return true
      } catch (error) {
        set({ savingTask: false, taskActionError: friendlyErrorMessage(error) })
        return false
      }
    },

    async removeTask(taskId) {
      const { tasks, savingTask } = get()
      if (!tasks || savingTask) return false
      const before = tasks
      // Otimista: some da lista já; volta no erro.
      set({ savingTask: true, taskActionError: null, tasks: tasks.filter((t) => t.id !== taskId) })
      try {
        await transport.request(`/tasks/${taskId}`, { method: 'DELETE' })
        set({ savingTask: false })
        return true
      } catch (error) {
        set({ savingTask: false, taskActionError: friendlyErrorMessage(error), tasks: before })
        return false
      }
    },

    async reorderTask(taskId, direction) {
      const { tasks, movingTaskId } = get()
      if (!tasks || movingTaskId) return false
      const current = tasks.find((t) => t.id === taskId)
      if (!current) return false
      const column = [...tasks]
        .filter((t) => t.column === current.column)
        .sort((a, b) => a.position - b.position)
      const index = column.findIndex((t) => t.id === taskId)
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= column.length) return false
      // Otimista: troca a posição com o vizinho; o servidor re-sequencia denso.
      const before = tasks
      set((state) => ({
        movingTaskId: taskId,
        moveError: null,
        tasks: (state.tasks ?? []).map((t) => (t.id === taskId ? { ...t, position: target } : t)),
      }))
      try {
        const { task } = await transport.request<{ task: PensaTaskView }>(`/tasks/${taskId}`, {
          method: 'PATCH',
          body: { position: target },
        })
        set((state) => ({
          movingTaskId: null,
          tasks: (state.tasks ?? []).map((t) => (t.id === taskId ? task : t)),
        }))
        return true
      } catch (error) {
        set({ movingTaskId: null, moveError: friendlyErrorMessage(error), tasks: before })
        return false
      }
    },

    async setTaskNotes(taskId, notes) {
      const { tasks } = get()
      if (!tasks) return false
      const current = tasks.find((t) => t.id === taskId)
      if (!current) return false
      const before = tasks
      set((state) => ({
        taskActionError: null,
        tasks: (state.tasks ?? []).map((t) => (t.id === taskId ? { ...t, notes } : t)),
      }))
      try {
        const { task } = await transport.request<{ task: PensaTaskView }>(`/tasks/${taskId}`, {
          method: 'PATCH',
          body: { notes },
        })
        set((state) => ({
          tasks: (state.tasks ?? []).map((t) => (t.id === taskId ? task : t)),
        }))
        return true
      } catch (error) {
        set({ taskActionError: friendlyErrorMessage(error), tasks: before })
        return false
      }
    },

    async moveTask(taskId, column) {
      const { tasks, movingTaskId } = get()
      if (!tasks || movingTaskId) return false
      const current = tasks.find((task) => task.id === taskId)
      if (!current) return false
      if (current.column === column) return true
      // Regra kids: só 1 missão em "Fazendo agora" (a troca passa pelo swapDoing).
      if (column === 'doing' && tasks.some((t) => t.column === 'doing' && t.id !== taskId)) {
        return false
      }
      // Entra no FIM da coluna alvo (o servidor re-sequencia as posições).
      const position = tasks.filter((t) => t.column === column && t.id !== taskId).length
      set((state) => ({
        movingTaskId: taskId,
        moveError: null,
        tasks: (state.tasks ?? []).map((t) => (t.id === taskId ? { ...t, column, position } : t)),
      }))
      try {
        const { task } = await transport.request<{ task: PensaTaskView }>(`/tasks/${taskId}`, {
          method: 'PATCH',
          body: { column, position },
        })
        // A resposta do PATCH é a task CANÔNICA (ids/positions reais).
        set((state) => ({
          movingTaskId: null,
          tasks: (state.tasks ?? []).map((t) => (t.id === taskId ? task : t)),
        }))
        return true
      } catch (error) {
        // Rollback: o card volta para onde estava.
        set((state) => ({
          movingTaskId: null,
          moveError: friendlyErrorMessage(error),
          tasks: (state.tasks ?? []).map((t) => (t.id === taskId ? current : t)),
        }))
        return false
      }
    },

    async swapDoing(taskId) {
      const { tasks } = get()
      if (!tasks) return false
      const doing = tasks.find((t) => t.column === 'doing' && t.id !== taskId)
      if (doing) {
        const demoted = await get().moveTask(doing.id, 'backlog')
        if (!demoted) return false
      }
      return get().moveTask(taskId, 'doing')
    },

    async ensureStudioProject(project) {
      if (project.studioProjectId) return project.studioProjectId
      const create = options.createStudioProject
      // Host sem a capability: degrade (orientação textual, sem split).
      if (!create) return null
      if (get().seeding) return null
      set({ seeding: true, seedError: null })
      try {
        // O funil da etapa E já renomeou o projeto com o nome da identidade,
        // então project.name É o nome do jogo.
        const studioProjectId = await create(project.name)
        const { project: updated } = await transport.request<{
          project: PensaProjectDetailView
        }>(`/projects/${project.id}`, { method: 'PATCH', body: { studioProjectId } })
        options.onProjectUpdated?.(updated)
        set({ seeding: false })
        return updated.studioProjectId
      } catch (error) {
        set({ seeding: false, seedError: friendlyErrorMessage(error) })
        return null
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
        }>(`/cycles/${cycleId}/advance`, { method: 'POST', body: { from: 'r' } })
        set({ advancing: false, gamification: parseGamificationDelta(response.gamification) })
        return true
      } catch (error) {
        set({ advancing: false, advanceError: friendlyErrorMessage(error) })
        return false
      }
    },
  }))
}
