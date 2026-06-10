import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { type AIProvider, MockAIProvider, OpenRouterProvider } from '#ai'
import type { IDEMode, InstalledExtension } from '#core'
import { findExtension } from '#official-extensions'
import { useStudioConfig } from '../studio/config'
import { useProjectStore } from './projectStore'
import { useSettingsStore } from './settingsStore'

const EMPTY_INSTALLED_EXTENSIONS: InstalledExtension[] = []

/**
 * Factory que escolhe o provider de IA. Precedência: chave/modelo injetados
 * pelo HOST (features.ai do <Studio>) > BYOK do aluno (Settings). Sem chave →
 * MockAIProvider (respostas estáticas em PT-BR).
 *
 * Reage a mudanças de `mode` e `installedExtensions` para que o system prompt
 * sempre tenha contexto fresco.
 */
export function useAIProvider(): { provider: AIProvider; isReal: boolean; mode: IDEMode } {
  const { aiConfig } = useStudioConfig()
  const userKey = useSettingsStore((s) => s.aiApiKey)
  const userModel = useSettingsStore((s) => s.aiModel)
  const apiKey = aiConfig.apiKey ?? (aiConfig.allowUserKey ? userKey : '')
  const model = aiConfig.model ?? userModel
  const { mode, installedExtensions } = useProjectStore(
    useShallow((s) => ({
      mode: s.project?.mode ?? 'blocks',
      installedExtensions: s.project?.installedExtensions ?? EMPTY_INSTALLED_EXTENSIONS,
    })),
  )

  return useMemo(() => {
    if (!apiKey) {
      return { provider: new MockAIProvider(), isReal: false, mode }
    }
    const extContext = installedExtensions
      .map((entry) => findExtension(entry.id))
      .filter((e): e is NonNullable<ReturnType<typeof findExtension>> => Boolean(e))
      .map((e) => `- ${e.manifest.name} (${e.manifest.id}): ${e.ai?.promptContext ?? ''}`)
      .join('\n\n')
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
  }, [apiKey, model, mode, installedExtensions])
}
