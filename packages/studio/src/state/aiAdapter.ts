import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { type AIProvider, MockAIProvider, OpenRouterProvider } from '#ai'
import type { IDEMode, InstalledExtension } from '#core'
import { formatExtensionPromptContext } from '#extensions'
import { findExtension } from '#official-extensions'
import { useStudioConfig } from '../studio/config'
import { useProjectStore } from './projectStore'
import { useSettingsStore } from './settingsStore'

const EMPTY_INSTALLED_EXTENSIONS: InstalledExtension[] = []

/** Contexto estável e curto das extensões instaladas para o system prompt. */
export function buildInstalledExtensionContext(
  installedExtensions: readonly InstalledExtension[],
): string {
  const extensions = installedExtensions
    .map((entry) => findExtension(entry.id))
    .filter((extension): extension is NonNullable<ReturnType<typeof findExtension>> =>
      Boolean(extension),
    )
  return formatExtensionPromptContext(extensions)
}

/**
 * Factory que escolhe o provider de IA. Precedência: provider seguro injetado
 * pelo HOST (features.ai do <Studio>) > BYOK do aluno (Settings). Sem ambos →
 * MockAIProvider (respostas estáticas em PT-BR).
 *
 * Reage a mudanças de `mode` e `installedExtensions` para que o system prompt
 * sempre tenha contexto fresco.
 */
export function useAIProvider(): { provider: AIProvider; isReal: boolean; mode: IDEMode } {
  const { aiConfig } = useStudioConfig()
  const userKey = useSettingsStore((s) => s.aiApiKey)
  const userModel = useSettingsStore((s) => s.aiModel)
  const apiKey = aiConfig.allowUserKey ? userKey : ''
  const model = aiConfig.model ?? userModel
  const { mode, installedExtensions } = useProjectStore(
    useShallow((s) => ({
      mode: s.project?.mode ?? 'blocks',
      installedExtensions: s.project?.installedExtensions ?? EMPTY_INSTALLED_EXTENSIONS,
    })),
  )

  return useMemo(() => {
    if (aiConfig.provider) {
      return { provider: aiConfig.provider, isReal: true, mode }
    }
    if (!apiKey) {
      return { provider: new MockAIProvider(), isReal: false, mode }
    }
    const extContext = buildInstalledExtensionContext(installedExtensions)
    return {
      provider: new OpenRouterProvider({
        apiKey,
        model,
        mode,
        extensionContext: extContext || undefined,
      }),
      isReal: true,
      mode,
    }
  }, [aiConfig.provider, apiKey, model, mode, installedExtensions])
}
