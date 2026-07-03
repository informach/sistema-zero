/**
 * Store por INSTÂNCIA do Pensa (factory, nunca singleton de módulo): lista de
 * projetos + detalhe aberto + estados de carregamento/erro. Toda a rede passa
 * pelo `PensaTransport` injetado (paths RELATIVOS do contrato — o host prefixa
 * /api/pensa). Erros viram mensagem gentil no estado (a UI oferece retry).
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import { friendlyErrorMessage } from '../core/copy'
import type {
  PensaBuildEnv,
  PensaProjectDetailView,
  PensaProjectKind,
  PensaProjectListView,
  PensaTransport,
} from '../core/types'

export interface PensaProjectStoreState {
  projects: PensaProjectListView[]
  projectsLoaded: boolean
  loadingList: boolean
  listError: string | null

  /** Projeto aberto (navegação lista ⇄ projeto é por estado, sem router). */
  activeProjectId: string | null
  detail: PensaProjectDetailView | null
  loadingDetail: boolean
  detailError: string | null

  creating: boolean
  createError: string | null
  /** id com rename/arquivar em voo (desabilita o menu do card). */
  mutatingId: string | null
  mutateError: string | null
  /** Criação da Versão N+1 em voo (fechamento de ciclo). */
  creatingCycle: boolean
  createCycleError: string | null
  /** PATCH do buildEnv (chooser "Onde você vai construir?") em voo. */
  settingBuildEnv: boolean
  buildEnvError: string | null

  loadProjects(): Promise<void>
  openProject(id: string): Promise<void>
  closeProject(): void
  createProject(name: string, kind: PensaProjectKind): Promise<boolean>
  renameProject(id: string, name: string): Promise<boolean>
  archiveProject(id: string): Promise<boolean>
  /**
   * Fecha o ciclo: POST `/projects/:id/cycles {goal}` cria a Versão N+1 (o
   * anterior precisa estar `done`) e absorve o detalhe novo (mapa volta ao Z).
   */
  createCycle(projectId: string, goal: string): Promise<boolean>
  /**
   * Escolha (ou troca) de onde construir: PATCH `/projects/:id { buildEnv }`
   * e absorve o detalhe novo (lista + detalhe aberto).
   */
  setBuildEnv(projectId: string, env: PensaBuildEnv): Promise<boolean>
  /**
   * Absorve um detalhe atualizado vindo de fora (ex.: rename do projeto feito
   * pelo funil de identidade da etapa E) sem refetch: atualiza lista + detalhe.
   */
  absorbDetail(project: PensaProjectDetailView): void
}

export type PensaProjectStore = StoreApi<PensaProjectStoreState>

/** Deriva a entrada de LISTA a partir do detalhe (evita refetch após criar/renomear). */
function toListView(detail: PensaProjectDetailView): PensaProjectListView {
  return {
    id: detail.id,
    name: detail.name,
    kind: detail.kind,
    status: detail.status,
    cycleNumber: detail.currentCycle.number,
    stage: detail.currentCycle.stage,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  }
}

function upsertListEntry(
  projects: PensaProjectListView[],
  detail: PensaProjectDetailView,
): PensaProjectListView[] {
  const entry = toListView(detail)
  if (entry.status !== 'active') return projects.filter((p) => p.id !== entry.id)
  const index = projects.findIndex((p) => p.id === entry.id)
  if (index === -1) return [entry, ...projects]
  return projects.map((p) => (p.id === entry.id ? entry : p))
}

export function createProjectStore(transport: PensaTransport): PensaProjectStore {
  return createStore<PensaProjectStoreState>((set, get) => ({
    projects: [],
    projectsLoaded: false,
    loadingList: false,
    listError: null,

    activeProjectId: null,
    detail: null,
    loadingDetail: false,
    detailError: null,

    creating: false,
    createError: null,
    mutatingId: null,
    mutateError: null,
    creatingCycle: false,
    createCycleError: null,
    settingBuildEnv: false,
    buildEnvError: null,

    async loadProjects() {
      set({ loadingList: true, listError: null })
      try {
        const { projects } = await transport.request<{ projects: PensaProjectListView[] }>(
          '/projects',
        )
        set({ projects, projectsLoaded: true, loadingList: false })
      } catch (error) {
        set({ loadingList: false, listError: friendlyErrorMessage(error) })
      }
    },

    async openProject(id) {
      set({ activeProjectId: id, detail: null, loadingDetail: true, detailError: null })
      try {
        const { project } = await transport.request<{ project: PensaProjectDetailView }>(
          `/projects/${id}`,
        )
        // Navegou de volta (ou p/ outro projeto) enquanto carregava? Descarta.
        if (get().activeProjectId !== id) return
        set({ detail: project, loadingDetail: false })
      } catch (error) {
        if (get().activeProjectId !== id) return
        set({ loadingDetail: false, detailError: friendlyErrorMessage(error) })
      }
    },

    closeProject() {
      set({ activeProjectId: null, detail: null, loadingDetail: false, detailError: null })
    },

    async createProject(name, kind) {
      const trimmed = name.trim()
      set({ creating: true, createError: null })
      try {
        const { project } = await transport.request<{ project: PensaProjectDetailView }>(
          '/projects',
          { method: 'POST', body: { name: trimmed, kind } },
        )
        set((state) => ({
          creating: false,
          projects: upsertListEntry(state.projects, project),
          // Abre o projeto recém-criado (o detalhe já veio na resposta).
          activeProjectId: project.id,
          detail: project,
          loadingDetail: false,
          detailError: null,
        }))
        return true
      } catch (error) {
        set({ creating: false, createError: friendlyErrorMessage(error) })
        return false
      }
    },

    async renameProject(id, name) {
      const trimmed = name.trim()
      set({ mutatingId: id, mutateError: null })
      try {
        const { project } = await transport.request<{ project: PensaProjectDetailView }>(
          `/projects/${id}`,
          { method: 'PATCH', body: { name: trimmed } },
        )
        set((state) => ({
          mutatingId: null,
          projects: upsertListEntry(state.projects, project),
          detail: state.activeProjectId === id ? project : state.detail,
        }))
        return true
      } catch (error) {
        set({ mutatingId: null, mutateError: friendlyErrorMessage(error) })
        return false
      }
    },

    async archiveProject(id) {
      set({ mutatingId: id, mutateError: null })
      try {
        await transport.request<{ project: PensaProjectDetailView }>(`/projects/${id}`, {
          method: 'PATCH',
          body: { status: 'archived' },
        })
        set((state) => ({
          mutatingId: null,
          // A lista só mostra ativos.
          projects: state.projects.filter((p) => p.id !== id),
          ...(state.activeProjectId === id
            ? { activeProjectId: null, detail: null, loadingDetail: false, detailError: null }
            : {}),
        }))
        return true
      } catch (error) {
        set({ mutatingId: null, mutateError: friendlyErrorMessage(error) })
        return false
      }
    },

    async createCycle(projectId, goal) {
      const trimmed = goal.trim()
      set({ creatingCycle: true, createCycleError: null })
      try {
        const { project } = await transport.request<{ project: PensaProjectDetailView }>(
          `/projects/${projectId}/cycles`,
          { method: 'POST', body: { goal: trimmed } },
        )
        set((state) => ({
          creatingCycle: false,
          projects: upsertListEntry(state.projects, project),
          detail: state.activeProjectId === projectId ? project : state.detail,
        }))
        return true
      } catch (error) {
        set({ creatingCycle: false, createCycleError: friendlyErrorMessage(error) })
        return false
      }
    },

    async setBuildEnv(projectId, env) {
      if (get().settingBuildEnv) return false
      set({ settingBuildEnv: true, buildEnvError: null })
      try {
        const { project } = await transport.request<{ project: PensaProjectDetailView }>(
          `/projects/${projectId}`,
          { method: 'PATCH', body: { buildEnv: env } },
        )
        get().absorbDetail(project)
        set({ settingBuildEnv: false })
        return true
      } catch (error) {
        set({ settingBuildEnv: false, buildEnvError: friendlyErrorMessage(error) })
        return false
      }
    },

    absorbDetail(project) {
      set((state) => ({
        projects: upsertListEntry(state.projects, project),
        detail: state.activeProjectId === project.id ? project : state.detail,
      }))
    },
  }))
}
