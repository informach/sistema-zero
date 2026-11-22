/**
 * Os exemplos GRANDES da galeria "Ver os jogos prontos" (lote 9 da conclusão do plano do Estúdio,
 * 22/11/2026): entram no grupo do motor deles com nome, descrição e capa, e o jogo inteiro só
 * carrega no clique (`load`). O jogo D tem 1,75 milhão de caracteres de materiais: no catálogo da
 * extensão, ele viria junto com a lista toda.
 */
import type { ExampleExperience } from '#core'
import type { ExtensionExampleDifficulty } from '#extensions'
import type { SZIRV2 } from '#ir'
import type { ProjectAsset } from '../core/project'
import { JOGO_D_COVER, JOGO_D_RESUMO } from './jogoDResumo'

export interface BigExample {
  /** O grupo da galeria em que ele aparece (o motor que ele usa). */
  extensionId: 'game-2d' | 'game-3d'
  name: string
  description: string
  experience: ExampleExperience
  difficulty: ExtensionExampleDifficulty
  concepts: readonly string[]
  genre: string
  /** A imagem do card, tirada do próprio jogo. */
  cover: string
  load(): Promise<{ ir: SZIRV2; assets: readonly ProjectAsset[] }>
}

export const BIG_EXAMPLES: readonly BigExample[] = [
  {
    extensionId: 'game-2d',
    ...JOGO_D_RESUMO,
    cover: JOGO_D_COVER,
    load: async () => {
      const { jogoDExample } = await import('./jogoDExample')
      return { ir: jogoDExample.ir, assets: jogoDExample.assets ?? [] }
    },
  },
]
