/**
 * O REGISTRO das paletas: a fonte de verdade das CORES.
 *
 * O vocabulário (quais ids existem, o rótulo de cada um, a cor da casa de cada superfície) mora
 * em `@sistemazero/core/palette`, porque o banco, o gateway e o BFF precisam dele sem arrastar
 * um pacote de React. Aqui mora só o que é cor — e uma paleta nova é UMA LINHA: a matiz.
 */
import type { Palette as PaletteId } from '@sistemazero/core/palette'
import type { PaletteToken } from './recipe'

export interface PaletteRecipe {
  readonly id: PaletteId
  /** A matiz em OKLCH. É tudo o que uma cor nova precisa declarar. */
  readonly hue: number
  /** Teto de croma próprio, quando a matiz pede. Padrão: `ACTION_ANCHOR.chromaCap`. */
  readonly chromaCap?: number
  /**
   * A palavra da designer vence a fórmula.
   *
   * ⚠️ Cada override é travado por teste a ΔE ≤ 0,04 do que a fórmula geraria: ele existe para
   * preservar um valor aprovado ao pixel, NUNCA para abrigar uma cor que saiu da família. Cor
   * nova nasce sem override nenhum.
   */
  readonly overrides?: Partial<Record<PaletteToken, string>>
  /**
   * Seletores do mundo antigo, com data de morte (etapa 7 do plano). É o que deixa o kids e o
   * funil seguirem funcionando enquanto os apps ainda não emitem `data-sz-palette`.
   */
  readonly legacySelectors?: readonly string[]
}

/**
 * ⭐ Azul e Rosa nascem FIXADOS nos hexadecimais aprovados em 11/09/2026 e auditados em 27
 * páginas: a migração não move um pixel. A fórmula é conferida contra eles pelo teste, e é assim
 * que ela se prova da mesma família em vez de só alegar que é.
 *
 * O Verde fixa apenas a ação (o verde da marca adulta, ao valor exato); os neutros dele passam a
 * seguir a cor, que é a decisão de produto — hoje eles são AZULADOS, herança de quando o tema
 * adulto foi copiado do kids.
 */
export const PALETTE_RECIPES: readonly PaletteRecipe[] = [
  {
    id: 'blue',
    hue: 263.2,
    overrides: {
      ground: '#e9eef6',
      'ground-alt': '#dde5f0',
      'surface-2': '#eff3f9',
      line: '#d6deea',
      ink: '#0f1a33',
      'ink-muted': '#46536e',
      field: '#74829f',
      'card-step': '#b9c6d9',
      action: '#1b5cf3',
      'action-step': '#1343b8',
      'action-light': '#6e9bff',
      'over-action': '#e2ebff',
      'white-step': '#0f3fb0',
      menu: '#121a30',
      'menu-2': '#1b2540',
      'menu-text': '#cbd4e8',
      'menu-icon': '#8e9bba',
      'logo-zero': '#0074fc',
    },
  },
  { id: 'teal', hue: 200 },
  { id: 'green', hue: 162.4, overrides: { action: '#0b7a54', 'action-hover': '#086446' } },
  { id: 'orange', hue: 53.6 },
  {
    id: 'pink',
    hue: 359.5,
    overrides: {
      ground: '#f4ecf2',
      'ground-alt': '#ecdde8',
      'surface-2': '#f8f1f6',
      line: '#e7d5e1',
      ink: '#1f1026',
      'ink-muted': '#5a4760',
      field: '#9a7892',
      'card-step': '#d2b6c8',
      action: '#c8246f',
      'action-hover': '#a81d5d',
      'action-step': '#8e1650',
      'action-light': '#ff7ab6',
      'over-action': '#fff0f6',
      'white-step': '#7e1146',
      menu: '#25132b',
      'menu-2': '#331d3a',
      'menu-text': '#e6d3e1',
      'menu-icon': '#b08fab',
      'logo-zero': '#e2489a',
    },
  },
  { id: 'purple', hue: 286.4 },
]

export function paletteRecipe(id: PaletteId): PaletteRecipe {
  const recipe = PALETTE_RECIPES.find((p) => p.id === id)
  if (!recipe) throw new Error(`Paleta sem receita de cor: ${id}`)
  return recipe
}
