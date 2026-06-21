import { CATEGORY_COLORS, categoryShades } from '../theme'
import type { BlockDefinition } from './types'

const C = CATEGORY_COLORS.css

export const CSS_BLOCKS: BlockDefinition[] = [
  // ---- Regra genérica (qualquer seletor + qualquer propriedade) ----
  {
    type: 'sz_css_rule',
    message0: 'Regra CSS para %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: '.minha-classe' }],
    message1: 'estilos %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'CSSDecl' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Regra CSS para qualquer seletor (.classe, #id, .nav a:hover…). Coloque blocos "propriedade: valor" dentro.',
  },
  {
    type: 'sz_css_decl',
    message0: '%1: %2',
    args0: [
      { type: 'field_input', name: 'PROP', text: 'cor' },
      { type: 'field_input', name: 'VALUE', text: 'valor' },
    ],
    previousStatement: 'CSSDecl',
    nextStatement: 'CSSDecl',
    colour: C,
    tooltip: 'Uma propriedade CSS. Vai dentro de uma "Regra CSS".',
  },
  {
    type: 'sz_css_body_background',
    message0: 'Cor de fundo do body %1',
    args0: [{ type: 'field_colour_sz', name: 'COLOR', colour: '#0b1020' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_body_text_color',
    message0: 'Cor do texto do body %1',
    args0: [{ type: 'field_colour_sz', name: 'COLOR', colour: '#e6e9f5' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_body_center',
    message0: 'Centralizar conteúdo do body',
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_width',
    message0: 'Largura do seletor %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 200, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_height',
    message0: 'Altura do seletor %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 200, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_border',
    message0: 'Borda do seletor %1 com %2 px sólida na cor %3',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'WIDTH', value: 2, min: 0 },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#22d3ee' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_padding',
    message0: 'Espaçamento interno do seletor %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 8, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_margin',
    message0: 'Espaçamento externo do seletor %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 8, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },

  // ---- Layout flex ----
  {
    type: 'sz_css_display_flex',
    message0: 'Usar flex no seletor %1 na direção %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: [
          ['linha (lado a lado)', 'row'],
          ['coluna (empilhado)', 'column'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Coloca os itens em linha ou coluna (modo flex).',
  },
  {
    type: 'sz_css_gap',
    message0: 'Espaço entre itens do seletor %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 16, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_justify',
    message0: 'Alinhar na horizontal do seletor %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['início', 'flex-start'],
          ['centro', 'center'],
          ['fim', 'flex-end'],
          ['espaço entre', 'space-between'],
          ['espaço ao redor', 'space-around'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_align',
    message0: 'Alinhar na vertical do seletor %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['esticar', 'stretch'],
          ['início', 'flex-start'],
          ['centro', 'center'],
          ['fim', 'flex-end'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },

  // ---- Tipografia ----
  {
    type: 'sz_css_font_size',
    message0: 'Tamanho da fonte do seletor %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 16, min: 1 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_font_weight',
    message0: 'Peso da fonte do seletor %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['normal', 'normal'],
          ['negrito', 'bold'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_text_align',
    message0: 'Alinhar texto do seletor %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['esquerda', 'left'],
          ['centro', 'center'],
          ['direita', 'right'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_text_color',
    message0: 'Cor do texto do seletor %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#e6e9f5' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_text_transform',
    message0: 'Caixa do texto do seletor %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#menu a' },
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['normal', 'none'],
          ['MAIÚSCULAS', 'uppercase'],
          ['minúsculas', 'lowercase'],
          ['Primeira Maiúscula', 'capitalize'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Deixa o texto em MAIÚSCULAS, minúsculas, etc.',
  },
  {
    type: 'sz_css_text_decoration',
    message0: 'Sublinhado do seletor %1 %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#menu a' },
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['sem sublinhado', 'none'],
          ['com sublinhado', 'underline'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Liga/desliga o sublinhado (útil para remover o sublinhado de links).',
  },
  {
    type: 'sz_css_letter_spacing',
    message0: 'Espaço entre letras do seletor %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#menu a' },
      { type: 'field_number', name: 'VALUE', value: 1, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Aumenta o espaço entre as letras.',
  },

  // ---- Fundo e cor ----
  {
    type: 'sz_css_background_color',
    message0: 'Cor de fundo do seletor %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#11162b' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_gradient',
    message0: 'Fundo gradiente do seletor %1 de %2 até %3',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_colour_sz', name: 'C1', colour: '#22d3ee' },
      { type: 'field_colour_sz', name: 'C2', colour: '#a78bfa' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Aplica um fundo com gradiente entre duas cores.',
  },

  // ---- Caixa e espaço ----
  {
    type: 'sz_css_border_radius',
    message0: 'Arredondar cantos do seletor %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 12, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_shadow',
    message0: 'Sombra no seletor %1 com intensidade %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      {
        type: 'field_dropdown',
        name: 'LEVEL',
        options: [
          ['leve', 'sm'],
          ['média', 'md'],
          ['forte', 'lg'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_max_width',
    message0: 'Largura máxima do seletor %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 1100, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_width_percent',
    message0: 'Largura em % do seletor %1 como %2 %',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 100, min: 0, max: 100 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },

  // ---- Responsividade (media query) ----
  {
    type: 'sz_css_media_query',
    message0: 'Responsivo: quando a tela tiver %1 %2 px',
    args0: [
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: [
          ['largura máxima', 'max-width'],
          ['largura mínima', 'min-width'],
          ['altura máxima', 'max-height'],
          ['altura mínima', 'min-height'],
        ],
      },
      { type: 'field_number', name: 'PX', value: 768, min: 0 },
    ],
    message1: 'aplicar estas regras %1',
    args1: [{ type: 'input_statement', name: 'RULES', check: 'CSSEntry' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Regras CSS que só valem quando a tela é menor (no máximo) ou maior (no mínimo) que o tamanho dado. Use para responsividade. Coloque blocos de CSS dentro.',
  },

  // ---- Fonte do Google ----
  {
    type: 'sz_css_google_font',
    message0: 'usar a fonte do Google %1',
    args0: [{ type: 'field_input', name: 'FONT', text: 'Press Start 2P' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Importa uma fonte do Google Fonts (ex.: "Press Start 2P"). Depois aplique com uma regra de font-family no body.',
  },

  // ---- CSS moderno ----
  {
    type: 'sz_css_transition',
    message0: 'transição suave do seletor %1 por %2 ms',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'MS', value: 300, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    level: 'intermediario',
    tooltip: 'Anima suavemente as mudanças de estilo do elemento.',
  },
  {
    type: 'sz_css_grid',
    message0: 'grade do seletor %1 com %2 colunas e espaço %3 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'COLS', value: 3, min: 1 },
      { type: 'field_number', name: 'GAP', value: 16, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    level: 'intermediario',
    tooltip: 'Organiza o conteúdo em grade, com N colunas iguais e espaço entre elas.',
  },
  {
    type: 'sz_css_keyframes',
    message0: 'animação chamada %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'aparecer' }],
    message1: 'no início %1',
    args1: [{ type: 'input_statement', name: 'FROM', check: 'CSSDecl' }],
    message2: 'no fim %1',
    args2: [{ type: 'input_statement', name: 'TO', check: 'CSSDecl' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    level: 'avancado',
    tooltip:
      'Cria uma animação, do estado inicial ao final. Para usar, ligue essa animação a um elemento numa Regra CSS.',
  },
  {
    type: 'sz_css_keyframes_steps',
    message0: 'animação (vários passos) chamada %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'girar' }],
    message1: 'passos %1',
    args1: [{ type: 'input_statement', name: 'STEPS', check: 'KeyframeStep' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    level: 'avancado',
    tooltip:
      'Animação com VÁRIOS passos (0%, 25%, 50%, 100%…). Arraste blocos "passo" dentro. Ligue a animação a um elemento numa Regra CSS.',
  },
  {
    type: 'sz_css_keyframe_step',
    message0: 'passo %1',
    args0: [{ type: 'field_input', name: 'AT', text: '50%' }],
    message1: 'estilo %1',
    args1: [{ type: 'input_statement', name: 'DECLS', check: 'CSSDecl' }],
    previousStatement: 'KeyframeStep',
    nextStatement: 'KeyframeStep',
    colour: C,
    level: 'avancado',
    tooltip:
      'Um momento da animação (ex.: "0%", "50%", "100%"). Coloque "propriedade: valor" dentro.',
  },

  // ---- Atalhos: variável CSS, transform, perspectiva e grade ----
  {
    type: 'sz_css_var',
    message0: 'Variável CSS --%1 = %2 (no seletor %3)',
    args0: [
      { type: 'field_input', name: 'VARNAME', text: 'cor-principal' },
      { type: 'field_input', name: 'VALUE', text: '#e94560' },
      { type: 'field_input', name: 'SELECTOR', text: ':root' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Cria uma variável CSS reutilizável (ex.: --cor-principal). Use depois escrevendo var(--cor-principal) em qualquer valor.',
  },
  {
    type: 'sz_css_transform',
    message0: 'Transformar seletor %1 com %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_input', name: 'VALUE', text: 'rotate(10deg)' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Aplica uma transformação: rotate(45deg), scale(1.2), rotateX(60deg), translateZ(20px)… Combine várias separando por espaço.',
  },
  {
    type: 'sz_css_perspective',
    message0: 'Perspectiva 3D do seletor %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#cena' },
      { type: 'field_number', name: 'VALUE', value: 600, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Dá profundidade 3D aos elementos filhos (perspective). Quanto menor, mais exagerado o 3D.',
  },
  {
    type: 'sz_css_grid_template',
    message0: 'Grade no seletor %1 colunas %2 linhas %3',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_input', name: 'COLS', text: 'repeat(3, 1fr)' },
      { type: 'field_input', name: 'ROWS', text: '' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Monta uma grade (display: grid) com colunas e (opcional) linhas, ex.: "repeat(3, 1fr)" ou "100px auto".',
  },
]

/**
 * Sub-categorias da paleta de CSS (à la Scratch/MakeCode): cada grupo tem ÍCONE e
 * uma cor da FAMÍLIA do CSS (tons de roxo/violeta/rosa), preservando a identidade
 * "CSS é roxo" e ainda dando navegação por cor. Cada bloco herda a cor do grupo.
 */
export const CSS_GROUPS: { name: string; colour: string; types: string[] }[] = [
  { name: '🧰 Regra', colour: '#7c4dff', types: ['sz_css_rule', 'sz_css_decl', 'sz_css_var'] },
  {
    name: '🎨 Cores & Fundo',
    colour: '#9466ff',
    types: [
      'sz_css_body_background',
      'sz_css_body_text_color',
      'sz_css_text_color',
      'sz_css_background_color',
      'sz_css_gradient',
    ],
  },
  {
    name: '🔤 Texto',
    colour: '#6a3df0',
    types: [
      'sz_css_font_size',
      'sz_css_font_weight',
      'sz_css_text_align',
      'sz_css_text_transform',
      'sz_css_text_decoration',
      'sz_css_letter_spacing',
    ],
  },
  {
    name: '📐 Tamanho & Caixa',
    colour: '#a87cff',
    types: [
      'sz_css_width',
      'sz_css_height',
      'sz_css_max_width',
      'sz_css_width_percent',
      'sz_css_padding',
      'sz_css_margin',
      'sz_css_border',
      'sz_css_border_radius',
      'sz_css_shadow',
    ],
  },
  {
    name: '🧩 Layout',
    colour: '#5a2fe0',
    types: [
      'sz_css_body_center',
      'sz_css_display_flex',
      'sz_css_gap',
      'sz_css_justify',
      'sz_css_align',
      'sz_css_grid',
      'sz_css_grid_template',
    ],
  },
  {
    name: '✨ Efeitos',
    colour: '#b88cff',
    types: [
      'sz_css_transition',
      'sz_css_transform',
      'sz_css_perspective',
      'sz_css_keyframes',
      'sz_css_keyframes_steps',
      'sz_css_keyframe_step',
      'sz_css_google_font',
    ],
  },
  { name: '📱 Responsivo', colour: '#8b5cf6', types: ['sz_css_media_query'] },
]

// IDENTIDADE: cada sub-grupo recebe um TOM da cor base da categoria (CSS),
// derivado claro→escuro (categoryShades) — os literais em CSS_GROUPS são placeholders.
const CSS_SHADES = categoryShades(CATEGORY_COLORS.css, CSS_GROUPS.length)
CSS_GROUPS.forEach((g, i) => {
  g.colour = CSS_SHADES[i] ?? CATEGORY_COLORS.css
})
const CSS_COLOUR_BY_TYPE = new Map<string, string>(
  CSS_GROUPS.flatMap((g) => g.types.map((t) => [t, g.colour] as const)),
)
for (const b of CSS_BLOCKS) {
  const colour = CSS_COLOUR_BY_TYPE.get(b.type)
  if (colour) b.colour = colour
}
