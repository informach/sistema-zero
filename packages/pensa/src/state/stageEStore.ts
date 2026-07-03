/**
 * Store por INSTÂNCIA da ETAPA E (factory, padrão do projectStore): spec
 * amigável (tirinhas + wireframes) com aprovações LOCAIS por seção e o funil
 * de identidade (nome → paleta → ícone). Aprovar as duas seções valida o spec
 * automaticamente (uma vez); salvar a identidade também renomeia o PROJETO com
 * o nome escolhido (papel do pacote, contrato). Erros viram mensagem gentil no
 * estado (a UI oferece retry).
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import { friendlyErrorMessage } from '../core/copy'
import { PENSA_NAME_MAX, PENSA_NAME_MIN } from '../core/limits'
import type {
  PensaIdentityPalette,
  PensaIdentitySuggestions,
  PensaSpecScreen,
} from '../core/specContent'
import type {
  PensaArtifactView,
  PensaCycleView,
  PensaProjectDetailView,
  PensaStageView,
  PensaTransport,
} from '../core/types'

export type PensaIdentityStep = 'name' | 'palette' | 'icon' | 'done'

/** Teto de gerações de ícone (1 inicial + 3 "Gerar outros"). */
export const MAX_ICON_GENERATIONS = 4

export interface PensaStageEStoreState {
  cycleId: string | null
  stageLoaded: boolean
  loadingStage: boolean
  stageError: string | null

  /** Latest do type 'friendly_spec' (o desenho do jogo). */
  spec: PensaArtifactView | null
  /** Latest do type 'identity' (a cara do jogo — já vem validated do save). */
  identity: PensaArtifactView | null

  generatingSpec: boolean
  specError: string | null

  /** Aprovações LOCAIS por seção (resetam quando a version do spec muda). */
  flowsApproved: boolean
  screensApproved: boolean
  validatingSpec: boolean

  advancing: boolean
  advanceError: string | null

  identityStep: PensaIdentityStep
  suggestions: PensaIdentitySuggestions | null
  loadingSuggestions: boolean
  chosenName: string | null
  chosenPalette: PensaIdentityPalette | null
  icons: string[] | null
  loadingIcons: boolean
  /** Gerações de ícone já feitas (esconde "Gerar outros" no teto). */
  iconGenerations: number
  chosenIconIndex: number | null
  savingIdentity: boolean
  identityError: string | null

  loadStage(cycleId: string): Promise<void>
  generateSpec(projectId: string, feedback?: string): Promise<boolean>
  /** Edição PONTUAL (sem IA): troca UMA tela à mão, mantém o resto e re-valida. */
  editScreen(projectId: string, screenIndex: number, screen: PensaSpecScreen): Promise<boolean>
  approveFlows(): void
  approveScreens(): void
  validateSpec(): Promise<boolean>
  loadSuggestions(projectId: string): Promise<void>
  chooseName(name: string): void
  backToNameStep(): void
  choosePalette(palette: PensaIdentityPalette): void
  backToPaletteStep(): void
  generateIcons(projectId: string): Promise<void>
  chooseIcon(index: number | null): void
  saveIdentity(projectId: string): Promise<boolean>
  /** Reabre o funil de identidade (do estado 'done') p/ ajustar nome/paleta/ícone. */
  reopenIdentity(): void
  advance(): Promise<boolean>
}

export type PensaStageEStore = StoreApi<PensaStageEStoreState>

export interface PensaStageEStoreCallbacks {
  /** Recebe o detalhe do projeto após o rename pós-identidade (nome escolhido). */
  onProjectUpdated?: (project: PensaProjectDetailView) => void
}

export function createStageEStore(
  transport: PensaTransport,
  callbacks: PensaStageEStoreCallbacks = {},
): PensaStageEStore {
  return createStore<PensaStageEStoreState>((set, get) => {
    /** Com as DUAS seções aprovadas, valida o spec draft automaticamente (uma vez). */
    const maybeAutoValidate = (): void => {
      const { flowsApproved, screensApproved, spec, validatingSpec } = get()
      if (!flowsApproved || !screensApproved) return
      if (spec?.status !== 'draft' || validatingSpec) return
      void get().validateSpec()
    }

    return {
      cycleId: null,
      stageLoaded: false,
      loadingStage: false,
      stageError: null,

      spec: null,
      identity: null,

      generatingSpec: false,
      specError: null,

      flowsApproved: false,
      screensApproved: false,
      validatingSpec: false,

      advancing: false,
      advanceError: null,

      identityStep: 'name',
      suggestions: null,
      loadingSuggestions: false,
      chosenName: null,
      chosenPalette: null,
      icons: null,
      loadingIcons: false,
      iconGenerations: 0,
      chosenIconIndex: null,
      savingIdentity: false,
      identityError: null,

      async loadStage(cycleId) {
        set({ cycleId, loadingStage: true, stageError: null })
        try {
          const view = await transport.request<PensaStageView>(`/cycles/${cycleId}/stages/e`)
          // Trocou de ciclo enquanto carregava? Descarta.
          if (get().cycleId !== cycleId) return
          const spec = view.artifacts.find((artifact) => artifact.type === 'friendly_spec') ?? null
          const identity = view.artifacts.find((artifact) => artifact.type === 'identity') ?? null
          // Spec já validado ⇒ as seções foram aprovadas antes (não pedir de novo).
          const approved = spec?.status === 'validated'
          set({
            loadingStage: false,
            stageLoaded: true,
            spec,
            identity,
            flowsApproved: approved,
            screensApproved: approved,
            identityStep: identity ? 'done' : 'name',
          })
        } catch (error) {
          if (get().cycleId !== cycleId) return
          set({ loadingStage: false, stageError: friendlyErrorMessage(error) })
        }
      },

      async generateSpec(projectId, feedback) {
        const { cycleId, generatingSpec } = get()
        if (!cycleId || generatingSpec) return false
        set({ generatingSpec: true, specError: null })
        try {
          const body: { type: 'friendly_spec'; projectId: string; feedback?: string } = {
            type: 'friendly_spec',
            projectId,
            ...(feedback === undefined ? {} : { feedback }),
          }
          const { artifact } = await transport.request<{ artifact: PensaArtifactView }>(
            `/cycles/${cycleId}/artifacts/generate`,
            { method: 'POST', body },
          )
          // Version nova ⇒ as aprovações locais resetam.
          set({
            generatingSpec: false,
            spec: artifact,
            flowsApproved: false,
            screensApproved: false,
          })
          return true
        } catch (error) {
          set({ generatingSpec: false, specError: friendlyErrorMessage(error) })
          return false
        }
      },

      async editScreen(projectId, screenIndex, screen) {
        const { cycleId, spec, generatingSpec } = get()
        if (!cycleId || !spec || generatingSpec) return false
        const content = spec.content as { screens?: PensaSpecScreen[] } | null
        const screens = Array.isArray(content?.screens) ? [...content.screens] : []
        if (screenIndex < 0 || screenIndex >= screens.length) return false
        screens[screenIndex] = screen
        set({ generatingSpec: true, specError: null })
        try {
          const { artifact } = await transport.request<{ artifact: PensaArtifactView }>(
            `/cycles/${cycleId}/artifacts/generate`,
            { method: 'POST', body: { type: 'spec_edit', projectId, screens } },
          )
          // Edição PONTUAL: o resto ficou igual — NÃO reseta as aprovações (o
          // servidor re-validou o spec; o gate e→r segue satisfeito).
          set({ generatingSpec: false, spec: artifact })
          return true
        } catch (error) {
          set({ generatingSpec: false, specError: friendlyErrorMessage(error) })
          return false
        }
      },

      approveFlows() {
        if (get().flowsApproved) return
        set({ flowsApproved: true })
        maybeAutoValidate()
      },

      approveScreens() {
        if (get().screensApproved) return
        set({ screensApproved: true })
        maybeAutoValidate()
      },

      async validateSpec() {
        const { cycleId, validatingSpec, spec } = get()
        if (!cycleId || validatingSpec || !spec) return false
        if (spec.status === 'validated') return true
        set({ validatingSpec: true, specError: null })
        try {
          const { artifact } = await transport.request<{ artifact: PensaArtifactView }>(
            `/cycles/${cycleId}/artifacts/friendly_spec/validate`,
            { method: 'POST' },
          )
          set({ validatingSpec: false, spec: artifact })
          return true
        } catch (error) {
          set({ validatingSpec: false, specError: friendlyErrorMessage(error) })
          return false
        }
      },

      async loadSuggestions(projectId) {
        const { cycleId, loadingSuggestions, suggestions } = get()
        if (!cycleId || loadingSuggestions || suggestions) return
        set({ loadingSuggestions: true, identityError: null })
        try {
          const response = await transport.request<{ suggestions: PensaIdentitySuggestions }>(
            `/cycles/${cycleId}/artifacts/generate`,
            { method: 'POST', body: { type: 'identity', projectId, step: 'suggestions' } },
          )
          set({ loadingSuggestions: false, suggestions: response.suggestions })
        } catch (error) {
          set({ loadingSuggestions: false, identityError: friendlyErrorMessage(error) })
        }
      },

      chooseName(name) {
        const trimmed = name.trim().slice(0, PENSA_NAME_MAX)
        if (trimmed.length < PENSA_NAME_MIN) return
        // Nome novo invalida os ícones (eles são gerados a partir do nome).
        set({
          chosenName: trimmed,
          identityStep: 'palette',
          identityError: null,
          icons: null,
          chosenIconIndex: null,
          iconGenerations: 0,
        })
      },

      backToNameStep() {
        set({ identityStep: 'name', identityError: null })
      },

      choosePalette(palette) {
        // Paleta nova invalida os ícones (eles são pintados com a paleta).
        set({
          chosenPalette: palette,
          identityStep: 'icon',
          identityError: null,
          icons: null,
          chosenIconIndex: null,
          iconGenerations: 0,
        })
      },

      backToPaletteStep() {
        set({ identityStep: 'palette', identityError: null })
      },

      reopenIdentity() {
        // Volta ao funil para ajustar (mantém nome/paleta/ícone já escolhidos; ao
        // salvar de novo cria uma nova versão validada e renomeia o projeto).
        set({ identityStep: 'name', identityError: null })
      },

      async generateIcons(projectId) {
        const { cycleId, loadingIcons, chosenName, chosenPalette, iconGenerations } = get()
        if (!cycleId || loadingIcons || !chosenName || !chosenPalette) return
        if (iconGenerations >= MAX_ICON_GENERATIONS) return
        set({ loadingIcons: true, identityError: null, chosenIconIndex: null })
        try {
          const { icons } = await transport.request<{ icons: string[] }>(
            `/cycles/${cycleId}/artifacts/generate`,
            {
              method: 'POST',
              body: {
                type: 'identity',
                projectId,
                step: 'icons',
                name: chosenName,
                palette: chosenPalette,
              },
            },
          )
          set((state) => ({
            loadingIcons: false,
            icons,
            iconGenerations: state.iconGenerations + 1,
          }))
        } catch (error) {
          set({ loadingIcons: false, identityError: friendlyErrorMessage(error) })
        }
      },

      chooseIcon(index) {
        set({ chosenIconIndex: index })
      },

      async saveIdentity(projectId) {
        const { cycleId, savingIdentity, chosenName, chosenPalette, icons, chosenIconIndex } = get()
        if (!cycleId || savingIdentity || !chosenName || !chosenPalette) return false
        const iconSvg = chosenIconIndex === null ? null : (icons?.[chosenIconIndex] ?? null)
        set({ savingIdentity: true, identityError: null })
        try {
          const { artifact } = await transport.request<{ artifact: PensaArtifactView }>(
            `/cycles/${cycleId}/artifacts/generate`,
            {
              method: 'POST',
              body: {
                type: 'identity',
                projectId,
                step: 'save',
                name: chosenName,
                palette: chosenPalette,
                iconSvg,
              },
            },
          )
          // O artefato JÁ vem validated (a escolha no funil É a validação).
          set({ identity: artifact, identityStep: 'done' })
        } catch (error) {
          set({ savingIdentity: false, identityError: friendlyErrorMessage(error) })
          return false
        }
        try {
          // O nome escolhido vira o nome do PROJETO (papel do pacote, contrato).
          const { project } = await transport.request<{ project: PensaProjectDetailView }>(
            `/projects/${projectId}`,
            { method: 'PATCH', body: { name: chosenName } },
          )
          callbacks.onProjectUpdated?.(project)
          set({ savingIdentity: false })
        } catch {
          // Identidade salva; só o rename falhou (o refetch pós-avanço realinha) —
          // a mensagem genérica de erro aqui assustaria sem motivo.
          set({
            savingIdentity: false,
            identityError: 'A cara do jogo foi salva! O nome novo aparece já já.',
          })
        }
        return true
      },

      async advance() {
        const { cycleId, advancing } = get()
        if (!cycleId || advancing) return false
        set({ advancing: true, advanceError: null })
        try {
          await transport.request<{ cycle: PensaCycleView }>(`/cycles/${cycleId}/advance`, {
            method: 'POST',
            body: { from: 'e' },
          })
          set({ advancing: false })
          return true
        } catch (error) {
          set({ advancing: false, advanceError: friendlyErrorMessage(error) })
          return false
        }
      },
    }
  })
}
