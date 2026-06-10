import { CATEGORY_COLORS } from '../theme'
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
    tooltip: 'Uma propriedade CSS (ex.: display: grid). Vai dentro de uma "Regra CSS".',
  },
  {
    type: 'sz_css_body_background',
    message0: 'Cor de fundo do body (background) %1',
    args0: [{ type: 'field_colour_sz', name: 'COLOR', colour: '#0b1020' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
  },
  {
    type: 'sz_css_body_text_color',
    message0: 'Cor do texto do body (color) %1',
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
    message0: 'Largura (width) do seletor %1 como %2 px',
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
    message0: 'Altura (height) do seletor %1 como %2 px',
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
    message0: 'Borda (border) do seletor %1 com %2 px sólida na cor %3',
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
    message0: 'Espaçamento interno (padding) do seletor %1 como %2 px',
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
    message0: 'Espaçamento externo (margin) do seletor %1 como %2 px',
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
    message0: 'Usar flex (display: flex) no seletor %1 na direção %2',
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
    tooltip: 'Ativa display:flex e define a direção dos itens.',
  },
  {
    type: 'sz_css_gap',
    message0: 'Espaço entre itens (gap) do seletor %1 como %2 px',
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
    message0: 'Alinhar na horizontal (justify-content) do seletor %1 como %2',
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
    message0: 'Alinhar na vertical (align-items) do seletor %1 como %2',
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
    message0: 'Tamanho da fonte (font-size) do seletor %1 como %2 px',
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
    message0: 'Peso da fonte (font-weight) do seletor %1 como %2',
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
    message0: 'Alinhar texto (text-align) do seletor %1 como %2',
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
    message0: 'Cor do texto (color) do seletor %1 como %2',
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
    message0: 'Caixa do texto (text-transform) do seletor %1 como %2',
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
    tooltip: 'Deixa o texto em MAIÚSCULAS, minúsculas, etc. (text-transform).',
  },
  {
    type: 'sz_css_text_decoration',
    message0: 'Sublinhado (text-decoration) do seletor %1 %2',
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
    message0: 'Espaço entre letras (letter-spacing) do seletor %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#menu a' },
      { type: 'field_number', name: 'VALUE', value: 1, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Aumenta o espaço entre as letras (letter-spacing).',
  },

  // ---- Fundo e cor ----
  {
    type: 'sz_css_background_color',
    message0: 'Cor de fundo (background-color) do seletor %1 como %2',
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
    message0: 'Fundo gradiente (linear-gradient) do seletor %1 de %2 até %3',
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
    message0: 'Arredondar cantos (border-radius) do seletor %1 como %2 px',
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
    message0: 'Sombra (box-shadow) no seletor %1 com intensidade %2',
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
    message0: 'Largura máxima (max-width) do seletor %1 como %2 px',
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
    message0: 'Largura em % (width) do seletor %1 como %2 %',
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
    message0: 'Responsivo: quando a largura da tela for %1 %2 px',
    args0: [
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: [
          ['no máximo', 'max-width'],
          ['no mínimo', 'min-width'],
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
      'Regras CSS que só valem quando a tela é menor (no máximo) ou maior (no mínimo) que o tamanho dado — @media. Use para responsividade. Coloque blocos de CSS dentro.',
  },
]
