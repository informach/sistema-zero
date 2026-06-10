import { createHighlightStore } from './highlightStore'
import { createLogsStore } from './logsStore'
import { createProjectStore } from './projectStore'
import { createSourcemapStore } from './sourcemapStore'
import { createUIStore } from './uiStore'

/**
 * Conjunto de stores de UMA instância do <Studio>. Criado no mount (1x por
 * instância) e distribuído via StudioStoresContext — duas instâncias na mesma
 * página não compartilham projeto/console/highlight, e cada montagem nasce
 * limpa (StrictMode-safe).
 *
 * `settingsStore` fica DE FORA de propósito: é preferência do usuário
 * (tema/fonte do código/chave de IA), compartilhada entre instâncias e
 * persistida em IndexedDB — singleton de módulo.
 */
export interface StudioStores {
  project: ReturnType<typeof createProjectStore>
  ui: ReturnType<typeof createUIStore>
  highlight: ReturnType<typeof createHighlightStore>
  logs: ReturnType<typeof createLogsStore>
  sourcemap: ReturnType<typeof createSourcemapStore>
}

export function createStudioStores(): StudioStores {
  return {
    project: createProjectStore(),
    ui: createUIStore(),
    highlight: createHighlightStore(),
    logs: createLogsStore(),
    sourcemap: createSourcemapStore(),
  }
}
