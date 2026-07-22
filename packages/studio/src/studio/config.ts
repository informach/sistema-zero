import { createContext, useContext } from 'react'
import {
  type AnyBlockLevel,
  type BlockLevel,
  DEFAULT_LEARNING_LEVEL,
  IDE_MODES,
  type IDEMode,
  normalizeBlockLevel,
} from '#core'
import {
  DEFAULT_HEARTBEAT_TIMEOUT_MS,
  DEFAULT_LOOP_BUDGET_MS,
  sanitizeFetchOrigins,
} from '#preview'
import type { StudioLimits } from '../state/projectStore'

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
  /** Capacidade do Console. Default: true; a visibilidade inicial depende do modo. */
  console?: boolean
  /** Painel de extensões + botão na Topbar. Default: true. */
  extensions?: boolean
  /** Botão "Exportar" na Topbar (gera o ZIP de deploy). Default: true. */
  export?: boolean
  /** Botão "Baixar" na Topbar (ZIP da FONTE, para continuar no VSCode). Default: true. */
  download?: boolean
  /** Aba Terminal (WebContainer). Default: false — exige COOP/COEP no host. */
  terminal?: boolean
  /** Aba/painel de IA. `true` = BYOK (mock até ter chave); objeto configura. Default: false. */
  ai?: boolean | StudioAIConfig
  /**
   * Habilita criar e converter projetos Pro. O tipo do projeto define os modos:
   * clássico usa Blocos/Ponte e Pro usa Código. O terminal local fica ligado por
   * padrão, mas pode ser desligado quando o host fornece um `proRuntime` remoto.
   */
  professional?: boolean
}

/** Timeout default de processos não-interativos do terminal/dev-server (ms). */
export const DEFAULT_TERMINAL_PROCESS_TIMEOUT_MS = 180_000

/** Política de segurança do preview (srcdoc), resolvida da prop `limits`. */
export interface PreviewSecurityPolicy {
  /** Orçamento de tempo síncrono de um loop antes de cortar (ms). */
  loopBudgetMs: number
  /** Timeout do watchdog de heartbeat (ms). */
  heartbeatTimeoutMs: number
  /** Origens liberadas para fetch/XHR do código do aluno (já saneadas). */
  fetchAllowedOrigins: readonly string[]
  /** Timeout de processos não-interativos do terminal (ms); `jsh` é isento. */
  terminalProcessTimeoutMs: number
}

export function resolvePreviewSecurity(limits?: StudioLimits): PreviewSecurityPolicy {
  const loop = limits?.previewLoopBudgetMs
  const heartbeat = limits?.previewHeartbeatTimeoutMs
  const terminalTimeout = limits?.terminalProcessTimeoutMs
  return {
    loopBudgetMs: typeof loop === 'number' && loop > 0 ? loop : DEFAULT_LOOP_BUDGET_MS,
    heartbeatTimeoutMs:
      typeof heartbeat === 'number' && heartbeat > 0 ? heartbeat : DEFAULT_HEARTBEAT_TIMEOUT_MS,
    fetchAllowedOrigins: sanitizeFetchOrigins(limits?.fetchAllowedOrigins),
    terminalProcessTimeoutMs:
      typeof terminalTimeout === 'number' && terminalTimeout > 0
        ? terminalTimeout
        : DEFAULT_TERMINAL_PROCESS_TIMEOUT_MS,
  }
}

const DEFAULT_PREVIEW_SECURITY: PreviewSecurityPolicy = resolvePreviewSecurity()

/** Perfil de aprendizado fixado pelo host (divulgação progressiva). */
export interface LearningConfig {
  /** Nível fixado pelo professor. */
  level: BlockLevel
  /** Tipos de bloco sempre visíveis (allowlist da aula). */
  allowBlocks?: readonly string[]
  /** IDs de extensões que podem ser oferecidas para instalação. */
  allowExtensions?: readonly string[]
  /** Nomes de categoria sempre visíveis. */
  allowCategories?: readonly string[]
  /** Se o aluno pode revelar o avançado (toggle nas configurações). */
  allowLevelReveal: boolean
}

export interface LearningConfigInput {
  /** Aceita a escala LEGADA de 3 níveis (jsonb de aulas antigas, embutidores antigos). */
  level?: AnyBlockLevel
  allowBlocks?: readonly string[]
  allowExtensions?: readonly string[]
  allowCategories?: readonly string[]
  allowLevelReveal?: boolean
}

/**
 * Fronteira ÚNICA de normalização do nível: TODA prop `level` pública passa por
 * aqui (StudioEditor/StudioLesson/StudioCore chamam 1× por instância), então os
 * consumidores internos (toolbox, ExtensionsPanel, SettingsDrawer) leem
 * `config.learning.level` JÁ normalizado — não re-normalize lá.
 */
export function resolveLearning(input?: LearningConfigInput): LearningConfig {
  return {
    level: normalizeBlockLevel(input?.level) ?? DEFAULT_LEARNING_LEVEL,
    allowBlocks: input?.allowBlocks,
    allowExtensions: input?.allowExtensions,
    allowCategories: input?.allowCategories,
    allowLevelReveal: input?.allowLevelReveal ?? true,
  }
}

const DEFAULT_LEARNING_CONFIG: LearningConfig = resolveLearning()

export interface ResolvedStudioConfig {
  preview: boolean
  console: boolean
  extensions: boolean
  export: boolean
  download: boolean
  terminal: boolean
  ai: boolean
  /** Modo profissional ligado (dev-server WebContainer). */
  professional: boolean
  aiConfig: { apiKey?: string; model?: string; allowUserKey: boolean }
  allowedModes: readonly IDEMode[]
  previewSecurity: PreviewSecurityPolicy
  learning: LearningConfig
}

/**
 * Parte da config derivada SÓ de `features`/`allowedModes`. `previewSecurity` e
 * `learning` ficam de fora de propósito: dependem da prop `limits` e do perfil de
 * aprendizado, que o Studio resolve por instância via `resolvePreviewSecurity` /
 * `resolveLearning`. Mantê-los fora daqui impede que um chamador receba
 * silenciosamente os defaults de módulo (ignorando os limites do host) — só o
 * call site do Studio (e o STANDALONE_CONFIG) os anexa.
 */
export type BaseStudioConfig = Omit<ResolvedStudioConfig, 'previewSecurity' | 'learning'>

export function resolveStudioConfig(
  features: StudioFeatures | undefined,
  allowedModes: readonly IDEMode[] | undefined,
): BaseStudioConfig {
  const ai = features?.ai ?? false
  const aiObject = typeof ai === 'object' ? ai : {}
  const professional = features?.professional ?? false
  // `allowedModes` é a allowlist do HOST. NÃO forçamos mais 'code' quando
  // `professional` está ligado: agora os modos dependem do TIPO do projeto
  // (modesForKind) — básico = Blocos/Ponte, pro = Código. `professional` só
  // habilita CRIAR/CONVERTER projetos profissionais (a Topbar intersecta a
  // allowlist com os modos do `kind`).
  const modes = allowedModes?.filter((mode) => IDE_MODES.includes(mode)) ?? IDE_MODES
  const resolvedModes = modes.length > 0 ? modes : IDE_MODES
  return {
    preview: features?.preview ?? true,
    console: features?.console ?? true,
    extensions: features?.extensions ?? true,
    export: features?.export ?? true,
    download: features?.download ?? true,
    // O modo profissional usa terminal por padrão no runtime local. Aulas e
    // autores com runtime remoto podem desligá-lo explicitamente.
    terminal: professional ? (features?.terminal ?? true) : (features?.terminal ?? false),
    ai: ai !== false,
    professional,
    aiConfig: {
      apiKey: aiObject.apiKey,
      model: aiObject.model,
      allowUserKey: aiObject.allowUserKey ?? !aiObject.apiKey,
    },
    allowedModes: resolvedModes,
  }
}

// Default = comportamento do app standalone (tudo ligado, BYOK) — vale para
// componentes renderizados FORA de um <Studio> (lista do playground, testes).
export const STANDALONE_CONFIG: ResolvedStudioConfig = {
  preview: true,
  console: true,
  extensions: true,
  export: true,
  download: true,
  terminal: true,
  ai: true,
  professional: false,
  aiConfig: { allowUserKey: true },
  allowedModes: IDE_MODES,
  previewSecurity: DEFAULT_PREVIEW_SECURITY,
  learning: DEFAULT_LEARNING_CONFIG,
}

const StudioConfigContext = createContext<ResolvedStudioConfig>(STANDALONE_CONFIG)

export const StudioConfigProvider = StudioConfigContext.Provider

export function useStudioConfig(): ResolvedStudioConfig {
  return useContext(StudioConfigContext)
}
