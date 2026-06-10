import { createContext, useContext } from 'react'
import { IDE_MODES, type IDEMode } from '#core'

/** Configuração de IA injetada pelo host. */
export interface StudioAIConfig {
  /** Chave OpenRouter do host. Quando presente, a seção de chave do Settings some. */
  apiKey?: string
  /** Fixa o modelo (o seletor do Settings some). */
  model?: string
  /**
   * Permite o aluno colar a própria chave no Settings (BYOK). Default: true
   * quando o host NÃO injeta apiKey; false quando injeta.
   */
  allowUserKey?: boolean
}

export interface StudioFeatures {
  /** Painel de preview (iframe sandbox). Default: true. */
  preview?: boolean
  /** Aba Console no painel inferior. Default: true. */
  console?: boolean
  /** Painel de extensões + botão na Topbar. Default: true. */
  extensions?: boolean
  /** Aba Terminal (WebContainer). Default: false — exige COOP/COEP no host. */
  terminal?: boolean
  /** Aba/painel de IA. `true` = BYOK (mock até ter chave); objeto configura. Default: false. */
  ai?: boolean | StudioAIConfig
}

export interface ResolvedStudioConfig {
  preview: boolean
  console: boolean
  extensions: boolean
  terminal: boolean
  ai: boolean
  aiConfig: { apiKey?: string; model?: string; allowUserKey: boolean }
  allowedModes: readonly IDEMode[]
}

export function resolveStudioConfig(
  features: StudioFeatures | undefined,
  allowedModes: readonly IDEMode[] | undefined,
): ResolvedStudioConfig {
  const ai = features?.ai ?? false
  const aiObject = typeof ai === 'object' ? ai : {}
  const modes = allowedModes?.filter((mode) => IDE_MODES.includes(mode)) ?? IDE_MODES
  return {
    preview: features?.preview ?? true,
    console: features?.console ?? true,
    extensions: features?.extensions ?? true,
    terminal: features?.terminal ?? false,
    ai: ai !== false,
    aiConfig: {
      apiKey: aiObject.apiKey,
      model: aiObject.model,
      allowUserKey: aiObject.allowUserKey ?? !aiObject.apiKey,
    },
    allowedModes: modes.length > 0 ? modes : IDE_MODES,
  }
}

// Default = comportamento do app standalone (tudo ligado, BYOK) — vale para
// componentes renderizados FORA de um <Studio> (lista do playground, testes).
const STANDALONE_CONFIG: ResolvedStudioConfig = {
  preview: true,
  console: true,
  extensions: true,
  terminal: true,
  ai: true,
  aiConfig: { allowUserKey: true },
  allowedModes: IDE_MODES,
}

const StudioConfigContext = createContext<ResolvedStudioConfig>(STANDALONE_CONFIG)

export const StudioConfigProvider = StudioConfigContext.Provider

export function useStudioConfig(): ResolvedStudioConfig {
  return useContext(StudioConfigContext)
}
