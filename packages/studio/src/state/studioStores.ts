import { useContext } from 'react'
import { createTranslator, type Locale, type StudioProBuildLimits } from '#core'
import { createLocalPersistenceAdapter } from '../persistence/local'
import { createPersistenceService, type PersistenceService } from '../persistence/service'
import { resolvePersistenceAdapter, type StudioPersistence } from '../persistence/types'
import { createChecksStore } from './checksStore'
import { createDiagnosticsStore } from './diagnosticsStore'
import { createEditorHistory, type EditorHistory } from './editorHistory'
import { createHighlightStore } from './highlightStore'
import { createLogsStore } from './logsStore'
import { createPendingEditorEdits, type PendingEditorEdits } from './pendingEditorEdits'
import { createProjectStore, type StudioLimits, useProjectStore } from './projectStore'
import { createSourcemapStore } from './sourcemapStore'
import { StudioStoresContext } from './storesContext'
import { createUIStore } from './uiStore'

/**
 * Conjunto de stores + serviço de persistência de UMA instância do <Studio>.
 * Criado no mount (1x por instância) e distribuído via StudioStoresContext —
 * duas instâncias na mesma página não compartilham projeto/console/highlight,
 * e cada montagem nasce limpa (StrictMode-safe).
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
  checks: ReturnType<typeof createChecksStore>
  diagnostics: ReturnType<typeof createDiagnosticsStore>
  pendingEditorEdits: PendingEditorEdits
  /** As pilhas de desfazer dos editores desta instância (os botões da barra). */
  editorHistory: EditorHistory
  persistence: PersistenceService
}

export interface CreateStudioStoresOptions {
  /** Estático por instância (como locale): trocar exige remount do <Studio>. */
  persistence?: StudioPersistence
  /** Limites de política do host (maxFileChars etc.) — também estáticos. */
  limits?: StudioLimits
  /** Cotas do compilador Pro remoto, quando o host usa um runtime remoto. */
  proBuildLimits?: StudioProBuildLimits
  /** Locale estático usado também por mensagens produzidas fora do React. */
  locale?: Locale
}

export function createStudioStores(options: CreateStudioStoresOptions = {}): StudioStores {
  const project = createProjectStore({
    limits: options.limits,
    proBuildLimits: options.proBuildLimits,
    translator: createTranslator(options.locale ?? 'pt-BR'),
  })
  const adapter = resolvePersistenceAdapter(
    options.persistence ?? 'local',
    createLocalPersistenceAdapter,
  )
  const pendingEditorEdits = createPendingEditorEdits()
  return {
    project,
    ui: createUIStore(),
    highlight: createHighlightStore(),
    logs: createLogsStore(),
    sourcemap: createSourcemapStore(),
    checks: createChecksStore(),
    diagnostics: createDiagnosticsStore(),
    pendingEditorEdits,
    editorHistory: createEditorHistory(),
    persistence: createPersistenceService(project, adapter, {
      flushPendingEditorEdits: () => pendingEditorEdits.flush(),
    }),
  }
}

// Fallback fora de um <Studio> (lista de projetos/testes): serviço sobre a
// store default + IndexedDB, espelhando o comportamento do app standalone.
let defaultPersistenceService: PersistenceService | null = null

/** Serviço de persistência da instância atual (Salvar explícito, flush). */
export function useStudioPersistence(): PersistenceService {
  const stores = useContext(StudioStoresContext)
  if (stores) return stores.persistence
  defaultPersistenceService ??= createPersistenceService(
    useProjectStore,
    createLocalPersistenceAdapter(),
  )
  return defaultPersistenceService
}

/** Buffers de edição que devem ser materializados antes de expor um snapshot. */
export function usePendingEditorEdits(): PendingEditorEdits | null {
  return useContext(StudioStoresContext)?.pendingEditorEdits ?? null
}

/**
 * As pilhas de desfazer dos editores desta instância. `null` fora de um <Studio> (a lista de
 * projetos, testes de componente isolados): ali não há editor e a barra não mostra os botões.
 */
export function useEditorHistory(): EditorHistory | null {
  return useContext(StudioStoresContext)?.editorHistory ?? null
}
