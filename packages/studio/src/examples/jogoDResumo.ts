/**
 * O que a galeria "Ver os jogos prontos" mostra do jogo D sem baixar o jogo (lote 9 da conclusão
 * do plano do Estúdio, 22/11/2026): nome, descrição curta, conceitos e capa. O exemplo inteiro
 * (`jogoDExample.ts`, 1,75 milhão de caracteres de materiais) só carrega no clique.
 */
import type { ExtensionExample } from '#extensions'
import { JOGO_D_CAPA } from './jogoDCapa.generated'

export const JOGO_D_RESUMO = {
  name: 'Mundo das Portas',
  experience: 'game',
  description:
    'Um mundo grande do Pinta com seis regiões, três cavernas e quatro casas. Entre pelas portas, pegue moedas, abra baús e durma na cama para guardar o jogo.',
  difficulty: 'advanced',
  concepts: ['Pinta', 'cenário', 'regiões', 'portas', 'grupos', 'guardar o jogo', 'câmera'],
  genre: 'aventura',
} as const satisfies Pick<
  ExtensionExample,
  'name' | 'experience' | 'description' | 'difficulty' | 'concepts' | 'genre'
>

/** A vila desenhada com as peças e os personagens do próprio jogo (`scripts/jogo-d/capa.ts`). */
export const JOGO_D_COVER = JOGO_D_CAPA
