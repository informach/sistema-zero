import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { type AIProvider, MockAIProvider, OpenRouterProvider } from '#ai'
import type { IDEMode, InstalledExtension } from '#core'
import { findExtension } from '#official-extensions'
import { useProjectStore } from './projectStore'
import { useSettingsStore } from './settingsStore'

const EMPTY_INSTALLED_EXTENSIONS: InstalledExtension[] = []

/**
 * Factory que escolhe o provider de IA baseado nas configurações do aluno.
 * Sem chave → MockAIProvider (respostas estáticas em PT-BR).
 * Com chave → OpenRouterProvider real (BYOK).
 *
 * Reage a mudanças de `mode` e `installedExtensions` para que o system prompt
 * sempre tenha contexto fresco.
 */
export function useAIProvider(): { provider: AIProvider; isReal: boolean; mode: IDEMode } {
  const apiKey = useSettingsStore((s) => s.aiApiKey)
  const model = useSettingsStore((s) => s.aiModel)
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
