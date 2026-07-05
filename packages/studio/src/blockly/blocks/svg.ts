import { CATEGORY_COLORS, categoryShades } from '../theme'
import type { BlockDefinition } from './types'

const C = CATEGORY_COLORS.svg

/**
 * Blocos de SVG (gráficos vetoriais). Vivem em categoria PRÓPRIA (🖋️ SVG), fora
 * do HTML. O gerador HTML é genérico (`renderElement` emite qualquer tag+atributos),
 * então cada bloco vira `{type:'element', tag, attrs, children}`; o round-trip
 * código↔blocos é coberto por `collectAllAttrs` (parse), `FIELD_ATTRS`/`data`
 * (workspaceState) e os `case`s em `buildIR`.
 *
 * ⚠️ Os `type` (`sz_html_svg`/`sz_svg_*`) NÃO podem ser renomeados: parser,
 * gerador, IR, reverse-sync e a allowlist de projetos salvos referenciam o type.
 */

/** Slot de filhos (formas dentro de <svg>/<g>). */
const svgChildren: Pick<BlockDefinition, 'message1' | 'args1'> = {
  message1: 'formas dentro %1',
  args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
}

const classFieldArg = { type: 'field_input', name: 'CLASS', text: '' }
/** Campo `classe` opcional — `classMsg1` p/ blocos folha, `classMsg2` p/ os com filhos. */
const classMsg1: Pick<BlockDefinition, 'message1' | 'args1'> = {
  message1: 'classe (opcional) %1',
  args1: [classFieldArg],
}
const classMsg2: Pick<BlockDefinition, 'message2' | 'args2'> = {
  message2: 'classe (opcional) %1',
  args2: [classFieldArg],
}

export const SVG_BLOCKS: BlockDefinition[] = [
  {
    type: 'sz_html_svg',
    message0: 'Criar SVG id %1 largura %2 altura %3 viewBox %4',
    args0: [
      { type: 'field_input', name: 'ID', text: '' },
      { type: 'field_input', name: 'WIDTH', text: '200' },
      { type: 'field_input', name: 'HEIGHT', text: '200' },
      { type: 'field_input', name: 'VIEWBOX', text: '' },
    ],
    ...svgChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Caixa de desenho vetorial. Coloque caminhos/círculos/grupos dentro. viewBox (opcional) define o sistema de coordenadas, ex.: "0 0 100 100".',
  },
  {
    type: 'sz_svg_group',
    message0: 'Criar grupo SVG id %1 transformar %2',
    args0: [
      { type: 'field_input', name: 'ID', text: '' },
      { type: 'field_input', name: 'TRANSFORM', text: 'translate(100, 100)' },
    ],
    ...svgChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Agrupa formas SVG e as transforma juntas (mover/girar/escalar). Dê uma classe e gire por CSS (@keyframes) para fazer um moinho rodar.',
  },
  {
    type: 'sz_svg_use',
    message0: 'Reusar forma SVG (href %1) transformar %2',
    args0: [
      { type: 'field_input', name: 'HREF', text: '#minhaForma' },
      { type: 'field_input', name: 'TRANSFORM', text: '' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Reusa uma forma que tem um id (ex.: um caminho dentro de <defs>), opcionalmente transformada, bom para repetir as pás de um moinho.',
  },
  {
    type: 'sz_svg_circle',
    message0: 'Criar círculo SVG cx %1 cy %2 raio %3 preenchimento %4',
    args0: [
      { type: 'field_input', name: 'CX', text: '0' },
      { type: 'field_input', name: 'CY', text: '0' },
      { type: 'field_input', name: 'R', text: '8' },
      { type: 'field_input', name: 'FILL', text: '' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Um círculo no centro (cx, cy) com raio r.',
  },
  {
    type: 'sz_svg_ellipse',
    message0: 'Criar elipse SVG cx %1 cy %2 raio-x %3 raio-y %4 preenchimento %5',
    args0: [
      { type: 'field_input', name: 'CX', text: '0' },
      { type: 'field_input', name: 'CY', text: '0' },
      { type: 'field_input', name: 'RX', text: '20' },
      { type: 'field_input', name: 'RY', text: '10' },
      { type: 'field_input', name: 'FILL', text: '' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Uma elipse (círculo achatado) com raios diferentes em x e y.',
  },
  {
    type: 'sz_svg_rect',
    message0: 'Criar retângulo SVG x %1 y %2 largura %3 altura %4 preenchimento %5',
    args0: [
      { type: 'field_input', name: 'X', text: '0' },
      { type: 'field_input', name: 'Y', text: '0' },
      { type: 'field_input', name: 'WIDTH', text: '20' },
      { type: 'field_input', name: 'HEIGHT', text: '20' },
      { type: 'field_input', name: 'FILL', text: '' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Um retângulo vetorial.',
  },
  {
    type: 'sz_svg_line',
    message0: 'Criar linha SVG de x %1 y %2 até x %3 y %4 contorno %5',
    args0: [
      { type: 'field_input', name: 'X1', text: '0' },
      { type: 'field_input', name: 'Y1', text: '0' },
      { type: 'field_input', name: 'X2', text: '10' },
      { type: 'field_input', name: 'Y2', text: '10' },
      { type: 'field_input', name: 'STROKE', text: 'black' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Uma linha reta entre dois pontos (precisa de um contorno para aparecer).',
  },
  {
    type: 'sz_svg_polyline',
    message0: 'Criar polilinha SVG pontos %1 preenchimento %2 contorno %3',
    args0: [
      { type: 'field_input', name: 'POINTS', text: '0,0 10,20 20,0' },
      { type: 'field_input', name: 'FILL', text: 'none' },
      { type: 'field_input', name: 'STROKE', text: 'black' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Uma sequência de linhas conectadas pelos pontos "x,y x,y …". Use preenchimento "none" para mostrar só o traço.',
  },
  {
    type: 'sz_svg_polygon',
    message0: 'Criar polígono SVG pontos %1 preenchimento %2 contorno %3',
    args0: [
      { type: 'field_input', name: 'POINTS', text: '0,0 20,0 10,20' },
      { type: 'field_input', name: 'FILL', text: '' },
      { type: 'field_input', name: 'STROKE', text: '' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Uma forma fechada ligando os pontos "x,y x,y …" (o último liga no primeiro).',
  },
  {
    type: 'sz_svg_path',
    message0: 'Criar caminho SVG id %1 forma (d) %2 preenchimento %3 contorno %4 transformar %5',
    args0: [
      { type: 'field_input', name: 'ID', text: '' },
      { type: 'field_input', name: 'D', text: 'M 0 0 L 10 0 L 5 10 Z' },
      { type: 'field_input', name: 'FILL', text: '' },
      { type: 'field_input', name: 'STROKE', text: '' },
      { type: 'field_input', name: 'TRANSFORM', text: '' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Uma forma livre desenhada pelo atributo "d" (M = mover, L = linha, C = curva, Z = fechar). Deixe preenchimento/contorno em branco para usar a cor do CSS.',
  },
  {
    type: 'sz_svg_text',
    message0: 'Criar texto SVG id %1 x %2 y %3 conteúdo %4 preenchimento %5',
    args0: [
      { type: 'field_input', name: 'ID', text: '' },
      { type: 'field_input', name: 'X', text: '0' },
      { type: 'field_input', name: 'Y', text: '0' },
      { type: 'field_input', name: 'TEXT', text: '' },
      { type: 'field_input', name: 'FILL', text: '' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Escreve um texto dentro do SVG na posição (x, y). Deixe o conteúdo vazio para preencher por código (ex.: relógio que mostra a hora).',
  },

  // ---- Aparência: CSS específico de SVG (conectam na coluna de CSS) ----
  {
    type: 'sz_css_fill',
    message0: 'Preenchimento (fill) do seletor %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '.forma' },
      { type: 'field_input', name: 'VALUE', text: '#000000' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Cor de DENTRO de uma forma SVG. Aceita cor (#hex/nome), "none" ou "transparent".',
  },
  {
    type: 'sz_css_stroke',
    message0: 'Contorno (stroke) do seletor %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '.forma' },
      { type: 'field_input', name: 'VALUE', text: '#000000' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Cor da LINHA (borda) de uma forma SVG.',
  },
  {
    type: 'sz_css_stroke_width',
    message0: 'Espessura do contorno do seletor %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '.forma' },
      { type: 'field_number', name: 'VALUE', value: 2, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Grossura da linha (stroke-width). Em SVG normalmente é sem unidade.',
  },
  {
    type: 'sz_css_stroke_dasharray',
    message0: 'Traço pontilhado do seletor %1 com padrão %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '.forma' },
      { type: 'field_input', name: 'VALUE', text: '4, 4' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Desenha a linha tracejada: "traço, espaço" (ex.: "0.2, 4.8"). É o stroke-dasharray.',
  },
  {
    type: 'sz_css_stroke_linecap',
    message0: 'Ponta do contorno do seletor %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '.forma' },
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['reta', 'butt'],
          ['redonda', 'round'],
          ['quadrada', 'square'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Formato das pontas da linha (stroke-linecap).',
  },
  {
    type: 'sz_css_text_anchor',
    message0: 'Alinhamento do texto SVG do seletor %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '.texto' },
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['início', 'start'],
          ['meio', 'middle'],
          ['fim', 'end'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Onde o texto SVG se ancora na horizontal (text-anchor): início, meio ou fim.',
  },
]

/**
 * Sub-categorias da paleta de SVG (estilo Scratch/MakeCode): cada grupo tem ícone
 * e uma cor da família do SVG (tons de azul-céu). Cada bloco herda a cor do grupo.
 */
export const SVG_GROUPS: { name: string; colour: string; types: string[] }[] = [
  {
    name: '🖼️ Estrutura',
    colour: '#2f6df0',
    types: ['sz_html_svg', 'sz_svg_group', 'sz_svg_use'],
  },
  {
    name: '⬛ Formas',
    colour: '#1f5be0',
    types: [
      'sz_svg_circle',
      'sz_svg_ellipse',
      'sz_svg_rect',
      'sz_svg_line',
      'sz_svg_polyline',
      'sz_svg_polygon',
      'sz_svg_path',
    ],
  },
  { name: '🔤 Texto', colour: '#5188f5', types: ['sz_svg_text'] },
  {
    name: '🎨 Aparência',
    colour: '#7aa3f7',
    types: [
      'sz_css_fill',
      'sz_css_stroke',
      'sz_css_stroke_width',
      'sz_css_stroke_dasharray',
      'sz_css_stroke_linecap',
      'sz_css_text_anchor',
    ],
  },
]

// IDENTIDADE: cada sub-grupo recebe um TOM da cor base da categoria (SVG),
// derivado claro→escuro (categoryShades) — os literais em SVG_GROUPS são placeholders.
const SVG_SHADES = categoryShades(CATEGORY_COLORS.svg, SVG_GROUPS.length)
SVG_GROUPS.forEach((g, i) => {
  g.colour = SVG_SHADES[i] ?? CATEGORY_COLORS.svg
})
const SVG_COLOUR_BY_TYPE = new Map<string, string>(
  SVG_GROUPS.flatMap((g) => g.types.map((t) => [t, g.colour] as const)),
)
for (const b of SVG_BLOCKS) {
  const colour = SVG_COLOUR_BY_TYPE.get(b.type)
  if (colour) b.colour = colour
}
