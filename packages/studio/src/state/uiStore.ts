import { useContext } from 'react'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { IDEMode } from '#core'
import { StudioStoresContext } from './storesContext'

export type BottomTab = 'console' | 'terminal' | 'ai'
/** As três abas da janela "Materiais do jogo" — e as três portas dela no menu ⋯. */
export type AssetsTab = 'images' | 'sounds' | 'models3d'
export type ConsoleVisibilityOverride = boolean | null

/**
 * Sem escolha manual, o Console segue o padrão pedagógico do modo. Depois da
 * primeira ação no menu, a preferência da instância prevalece até o Studio ser
 * desmontado (a store não é persistida nem pertence ao projeto).
 */
export function resolveConsoleVisibility(
  mode: IDEMode | undefined,
  override: ConsoleVisibilityOverride,
): boolean {
  return override ?? mode === 'code'
}

interface UIStore {
  bottomTab: BottomTab
  setBottomTab: (t: BottomTab) => void
  showExtensions: boolean
  setShowExtensions: (b: boolean) => void
  /** Abre a janela "Materiais do jogo" — overlay, espelho do showExtensions. */
  showAssets: boolean
  setShowAssets: (b: boolean) => void
  /** Qual aba a janela mostra. Sobrevive a fechar e reabrir (a criança volta onde estava). */
  assetsTab: AssetsTab
  /**
   * O que as três PORTAS do menu ⋯ fazem. A regra precisa ser previsível para uma
   * criança: fechada, abre naquela aba; aberta em OUTRA aba, TROCA a aba (clicar
   * em "Sons" com a janela nas imagens não pode fechar tudo); aberta naquela
   * mesma aba, fecha — a porta é a entrada e a saída. É por isso que isto é uma
   * ação da store e não um `setShowAssets` na Topbar: só aqui dá para ver o
   * estado anterior das duas coisas de uma vez.
   */
  openAssetsTab: (tab: AssetsTab) => void
  /**
   * Trocar de aba DENTRO da janela. ⚠️ NÃO é o `openAssetsTab`: com ele, clicar
   * na aba que já está ativa caía no ramo "mesma aba, fecha" e a janela inteira
   * sumia. Uma aba não é um interruptor — ela só escolhe o que mostrar. (Achado
   * no navegador; nenhum teste de componente pegava, porque o painel isolado não
   * estava ligado à store.)
   */
  setAssetsTab: (tab: AssetsTab) => void
  showPreview: boolean
  setShowPreview: (b: boolean) => void
  // O Console deriva do modo enquanto `null` (Blocos/Ponte oculto, Código
  // visível). A primeira ação manual grava um boolean que prevalece em qualquer
  // modo/projeto nesta instância. Terminal/IA continuam booleanos porque só
  // existem no contexto de Código.
  consoleVisibilityOverride: ConsoleVisibilityOverride
  setConsoleVisibilityOverride: (value: ConsoleVisibilityOverride) => void
  showTerminal: boolean
  setShowTerminal: (b: boolean) => void
  showAI: boolean
  setShowAI: (b: boolean) => void
  /** Quando `true`, o preview executa e atualiza automaticamente (Play). Quando `false`, para de renderizar e esvazia o iframe (Parar). */
  previewRunning: boolean
  setPreviewRunning: (b: boolean) => void
  togglePreviewRunning: () => void
}

export function createUIStore(): StoreApi<UIStore> {
  return createStore<UIStore>((set) => ({
    bottomTab: 'console',
    setBottomTab: (bottomTab) => set({ bottomTab }),
    showExtensions: false,
    setShowExtensions: (showExtensions) => set({ showExtensions }),
    showAssets: false,
    setShowAssets: (showAssets) => set({ showAssets }),
    assetsTab: 'images',
    openAssetsTab: (tab) =>
      set((s) =>
        s.showAssets && s.assetsTab === tab
          ? { showAssets: false }
          : { showAssets: true, assetsTab: tab },
      ),
    setAssetsTab: (assetsTab) => set({ assetsTab }),
    showPreview: true,
    setShowPreview: (showPreview) => set({ showPreview }),
    consoleVisibilityOverride: null,
    setConsoleVisibilityOverride: (consoleVisibilityOverride) => set({ consoleVisibilityOverride }),
    showTerminal: true,
    setShowTerminal: (showTerminal) => set({ showTerminal }),
    showAI: true,
    setShowAI: (showAI) => set({ showAI }),
    previewRunning: true,
    setPreviewRunning: (previewRunning) => set({ previewRunning }),
    togglePreviewRunning: () => set((s) => ({ previewRunning: !s.previewRunning })),
  }))
}

const defaultUIStore = createUIStore()

type BoundUseUIStore = (<T>(selector: (s: UIStore) => T) => T) & StoreApi<UIStore>

/**
 * Hook por instância: lê a store do <Studio> mais próximo; fora de um Studio
 * cai na default de módulo. As estáticas (getState/setState/subscribe) operam
 * SEMPRE na default — contrato dos testes.
 */
export const useUIStore: BoundUseUIStore = Object.assign(function useUIStoreHook<T>(
  selector: (s: UIStore) => T,
): T {
  const stores = useContext(StudioStoresContext)
  return useStore(stores?.ui ?? defaultUIStore, selector)
}, defaultUIStore)

export function useUIStoreApi(): StoreApi<UIStore> {
  const stores = useContext(StudioStoresContext)
  return stores?.ui ?? defaultUIStore
}
