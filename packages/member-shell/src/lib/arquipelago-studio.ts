import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import { canonicalJson } from './creations-cloud'
import type { StudioTier } from './studio-tier'

export interface ArquipelagoStudioConfig {
  viewerId: string
  tier: StudioTier
  showExamples: boolean
  showPythonCreation: boolean
  pintaOwned: boolean
  moldaOwned: boolean
  zappyEnabled: boolean
  aiCredits: AiCreditsView | null
  narrationEnabled: boolean
  voiceInputEnabled: boolean
  challenge?: { key: string; title: string } | null
}

/** Só devolve um projeto depois de comparar o snapshot completo com o da conta. */
export async function concluirStudio(
  controle: { flush(): Promise<{ id: string; snapshot: unknown } | null> },
  nuvem: {
    confirm(id: string, options: { timeoutMs: number }): Promise<void>
    downloadProject(id: string): Promise<{ raw: unknown } | null>
  },
): Promise<string | null> {
  const projeto = await controle.flush()
  if (!projeto) return null
  await nuvem.confirm(projeto.id, { timeoutMs: 15_000 })
  const remoto = await nuvem.downloadProject(projeto.id)
  if (!remoto || canonicalJson(remoto.raw) !== canonicalJson(projeto.snapshot))
    throw new Error('A versão do projeto ainda não foi confirmada na conta')
  return projeto.id
}
