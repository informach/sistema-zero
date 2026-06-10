import { create } from 'zustand'

export type BottomTab = 'console' | 'terminal' | 'ai'

interface UIStore {
  bottomTab: BottomTab
  setBottomTab: (t: BottomTab) => void
  showExtensions: boolean
  setShowExtensions: (b: boolean) => void
  showPreview: boolean
  setShowPreview: (b: boolean) => void
  /** Quando `true`, o preview executa e atualiza automaticamente (Play). Quando `false`, para de renderizar e esvazia o iframe (Parar). */
  previewRunning: boolean
  setPreviewRunning: (b: boolean) => void
  togglePreviewRunning: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  bottomTab: 'console',
  setBottomTab: (bottomTab) => set({ bottomTab }),
  showExtensions: false,
  setShowExtensions: (showExtensions) => set({ showExtensions }),
  showPreview: true,
  setShowPreview: (showPreview) => set({ showPreview }),
  previewRunning: true,
  setPreviewRunning: (previewRunning) => set({ previewRunning }),
  togglePreviewRunning: () => set((s) => ({ previewRunning: !s.previewRunning })),
}))
