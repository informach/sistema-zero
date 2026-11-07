// Copy aprovada em 06/11/2026. A proposta de produto aparece apenas no resultado.
import type { AdultMode } from './types'
export const ENTRY = {
  desafio: {
    title: 'Encontre o primeiro passo para tirar uma ideia sua do papel.',
    emphasis: 'tirar uma ideia sua do papel',
    description:
      'Conte o que você gostaria de criar no computador e o que costuma dificultar esse começo. Ao final, veja um caminho para entender suas escolhas e levar uma primeira criação até o fim.',
    action: 'Encontrar meu primeiro passo',
  },
  comunidade: {
    title: 'Descubra seu próximo passo para criar com mais autonomia.',
    emphasis: 'criar com mais autonomia',
    description:
      'Conte o que já experimentou e o que gostaria de criar no computador. Veja como um aprendizado pode ajudar na próxima ideia e ampliar o que você consegue fazer por conta própria.',
    action: 'Encontrar meu próximo passo',
  },
} as const
export const DEFAULT_HEADLINE = 'autonomia-v2'
export const PROFILE_LABELS: Record<string, string> = {
  'autonomia-comecar': 'Começar',
  'autonomia-compreender': 'Compreender',
  'autonomia-concluir': 'Concluir e retomar',
  'autonomia-autoria': 'Ampliar a autoria',
  'autonomia-explorar': 'Explorar possibilidades',
}
export const entryFor = (mode: AdultMode) => ENTRY[mode]
