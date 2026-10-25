import {
  GAME_EXTENSION_VISUAL_GUIDANCE,
  isGameExtensionId,
} from '../official-extensions/gameVisualPolicy'
import type { ExtensionDefinition } from './types'

type ExtensionAIContext = Pick<ExtensionDefinition, 'manifest' | 'ai'>

/** Formata o contexto estável sem obrigar o chamador a carregar o manual completo. */
export function formatExtensionPromptContext(extensions: readonly ExtensionAIContext[]): string {
  const contexts = extensions
    .map((extension) => {
      const context = extension.ai?.promptSummary ?? extension.ai?.promptContext ?? ''
      return `- ${extension.manifest.name} (${extension.manifest.id}): ${context}`
    })
    .join('\n\n')
  return extensions.some((extension) => isGameExtensionId(extension.manifest.id))
    ? `${GAME_EXTENSION_VISUAL_GUIDANCE}\n\n${contexts}`
    : contexts
}
