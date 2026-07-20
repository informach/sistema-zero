import { CATEGORY_COLORS, categoryShades } from '../theme'
import type { BlockDefinition } from './types'

const C = CATEGORY_COLORS.svg

/** Slot de filhos: formas e metadados que ficam dentro de SVG, grupos e símbolos. */
const svgChildren: Pick<BlockDefinition, 'message1' | 'args1'> = {
  message1: 'colocar dentro %1',
  args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
}

function classMsg1(text = ''): Pick<BlockDefinition, 'message1' | 'args1'> {
  return {
    message1: 'classe (opcional) %1',
    args1: [{ type: 'field_input', name: 'CLASS', text }],
  }
}

function classMsg2(text = ''): Pick<BlockDefinition, 'message2' | 'args2'> {
  return {
    message2: 'classe (opcional) %1',
    args2: [{ type: 'field_input', name: 'CLASS', text }],
  }
}

const idField = { type: 'field_input', name: 'ID', text: '' }

export const SVG_BLOCKS: BlockDefinition[] = [
  {
    type: 'sz_html_svg',
    message0: 'Criar área de desenho vetorial\nid (opcional) %1 tamanho %2 × %3\nmapa interno %4',
    args0: [
      idField,
      { type: 'field_input', name: 'WIDTH', text: '200' },
      { type: 'field_input', name: 'HEIGHT', text: '200' },
      { type: 'field_input', name: 'VIEWBOX', text: '0 0 200 200' },
    ],
    ...svgChildren,
    ...classMsg2('desenho'),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'É como uma folha transparente que continua nítida ao aumentar. O mapa interno (viewBox) diz quais coordenadas cabem na folha.',
  },
  {
    type: 'sz_svg_title',
    message0: 'Dar um nome ao desenho %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Meu desenho' }],
    ...classMsg1(),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Conta o nome do desenho para leitores de tela. Coloque este bloco no começo da área de desenho.',
  },
  {
    type: 'sz_svg_desc',
    message0: 'Descrever o desenho %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Uma forma colorida.' }],
    ...classMsg1(),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Explica o que aparece no desenho para quem usa leitor de tela. No SVG, essa descrição se chama desc.',
  },
  {
    type: 'sz_svg_defs',
    message0: 'Guardar formas para reutilizar\nid (opcional) %1',
    args0: [idField],
    ...svgChildren,
    ...classMsg2(),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'É uma caixa de peças guardadas: elas não aparecem sozinhas, mas podem ser usadas várias vezes depois.',
  },
  {
    type: 'sz_svg_symbol',
    message0: 'Criar peça reutilizável\nnome (id) %1',
    args0: [idField],
    ...svgChildren,
    ...classMsg2(),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Junta formas numa peça com nome. Coloque dentro de “Guardar formas” e escolha esse nome em “Reutilizar forma”.',
  },
  {
    type: 'sz_svg_group',
    message0: 'Agrupar formas\nid (opcional) %1\nmover, girar ou escalar %2',
    args0: [idField, { type: 'field_input', name: 'TRANSFORM', text: 'translate(0, 0)' }],
    ...svgChildren,
    ...classMsg2('grupo'),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'É como juntar peças com uma fita para mover, girar ou aumentar todas de uma vez. O nome técnico da mudança é transform.',
  },
  {
    type: 'sz_svg_use',
    message0:
      'Reutilizar uma forma\nid (opcional) %1\nforma guardada %2\nmover, girar ou escalar %3',
    args0: [
      idField,
      { type: 'field_name_picker', name: 'HREF', text: '', kind: 'svg-reference' },
      { type: 'field_input', name: 'TRANSFORM', text: '' },
    ],
    ...classMsg1('forma'),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Faz outra cópia de uma peça com nome. Primeiro crie uma peça reutilizável; depois escolha seu #nome aqui.',
  },
  {
    type: 'sz_svg_circle',
    message0:
      'Desenhar círculo\nid (opcional) %1\ncentro horizontal %2 vertical %3\nraio %4 cor de dentro %5',
    args0: [
      idField,
      { type: 'field_input', name: 'CX', text: '100' },
      { type: 'field_input', name: 'CY', text: '100' },
      { type: 'field_input', name: 'R', text: '50' },
      { type: 'field_svg_paint', name: 'FILL', text: '#a78bfa' },
    ],
    ...classMsg1('forma'),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Marca o centro e abre um compasso até o raio escolhido. No SVG, o centro também aparece como cx e cy.',
  },
  {
    type: 'sz_svg_ellipse',
    message0:
      'Desenhar elipse\nid (opcional) %1\ncentro horizontal %2 vertical %3\nraio de lado %4 de cima %5\ncor de dentro %6',
    args0: [
      idField,
      { type: 'field_input', name: 'CX', text: '100' },
      { type: 'field_input', name: 'CY', text: '100' },
      { type: 'field_input', name: 'RX', text: '70' },
      { type: 'field_input', name: 'RY', text: '40' },
      { type: 'field_svg_paint', name: 'FILL', text: '#22d3ee' },
    ],
    ...classMsg1('forma'),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Desenha um círculo achatado. Os dois raios dizem quanto ele abre para os lados e para cima.',
  },
  {
    type: 'sz_svg_rect',
    message0:
      'Desenhar retângulo\nid (opcional) %1\ncomeçar em x %2 y %3\nlargura %4 altura %5\ncor de dentro %6',
    args0: [
      idField,
      { type: 'field_input', name: 'X', text: '35' },
      { type: 'field_input', name: 'Y', text: '55' },
      { type: 'field_input', name: 'WIDTH', text: '130' },
      { type: 'field_input', name: 'HEIGHT', text: '90' },
      { type: 'field_svg_paint', name: 'FILL', text: '#f472b6' },
    ],
    ...classMsg1('forma'),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Desenha uma caixa a partir do canto x, y, usando a largura e a altura escolhidas.',
  },
  {
    type: 'sz_svg_line',
    message0:
      'Desenhar linha\nid (opcional) %1\ncomeçar em x %2 y %3\nterminar em x %4 y %5\ncor da linha %6',
    args0: [
      idField,
      { type: 'field_input', name: 'X1', text: '30' },
      { type: 'field_input', name: 'Y1', text: '30' },
      { type: 'field_input', name: 'X2', text: '170' },
      { type: 'field_input', name: 'Y2', text: '170' },
      { type: 'field_svg_paint', name: 'STROKE', text: '#fbbf24' },
    ],
    ...classMsg1('forma'),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Liga dois pontos com um traço. A cor da linha é chamada stroke no código SVG.',
  },
  {
    type: 'sz_svg_polyline',
    message0:
      'Desenhar linha com vários pontos\nid (opcional) %1\npontos %2\ncor de dentro %3 da linha %4',
    args0: [
      idField,
      { type: 'field_input', name: 'POINTS', text: '30,150 100,40 170,150' },
      { type: 'field_svg_paint', name: 'FILL', text: 'none' },
      { type: 'field_svg_paint', name: 'STROKE', text: '#60a5fa' },
    ],
    ...classMsg1('forma'),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Liga uma sequência de pontos sem fechar a forma. Escreva cada ponto como x,y e separe os pares com espaços.',
  },
  {
    type: 'sz_svg_polygon',
    message0:
      'Desenhar forma com vários pontos\nid (opcional) %1\npontos %2\ncor de dentro %3 da linha %4',
    args0: [
      idField,
      { type: 'field_input', name: 'POINTS', text: '30,150 100,40 170,150' },
      { type: 'field_svg_paint', name: 'FILL', text: '#34d399' },
      { type: 'field_svg_paint', name: 'STROKE', text: '#1a2240' },
    ],
    ...classMsg1('forma'),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Liga vários pontos e fecha a última ponta na primeira. Assim você pode criar triângulos, estrelas e muito mais.',
  },
  {
    type: 'sz_svg_path',
    message0:
      'Desenhar caminho livre\nid (opcional) %1\ntraçado %2\ncor de dentro %3 da linha %4\nmover, girar ou escalar %5',
    args0: [
      idField,
      { type: 'field_input', name: 'D', text: 'M30 150L100 35L170 150Z' },
      { type: 'field_svg_paint', name: 'FILL', text: '#fb923c' },
      { type: 'field_svg_paint', name: 'STROKE', text: '#1a2240' },
      { type: 'field_input', name: 'TRANSFORM', text: '' },
    ],
    ...classMsg1('forma'),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Desenha livremente seguindo instruções: M move o lápis, L faz uma linha, C faz uma curva e Z fecha a forma. O traçado se chama d no SVG.',
  },
  {
    type: 'sz_svg_text',
    message0: 'Escrever no desenho\nid (opcional) %1\nposição x %2 y %3\ntexto %4 cor %5',
    args0: [
      idField,
      { type: 'field_input', name: 'X', text: '100' },
      { type: 'field_input', name: 'Y', text: '110' },
      { type: 'field_input', name: 'TEXT', text: 'Olá!' },
      { type: 'field_svg_paint', name: 'FILL', text: '#1a2240' },
    ],
    ...classMsg1('texto'),
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Escreve uma mensagem na posição escolhida. Use a classe “texto” com o bloco de alinhamento para centralizá-la.',
  },

  // Aparência: CSS específico de SVG; todos conectam na área de Aparência.
  {
    type: 'sz_css_fill',
    message0: 'Pintar dentro da forma\nescolher %1 nova cor %2',
    args0: [
      { type: 'field_name_picker', name: 'SELECTOR', text: '.forma', kind: 'selector' },
      { type: 'field_svg_paint', name: 'VALUE', text: '#fb923c' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Troca a cor de dentro da forma. No CSS e no SVG, essa pintura é chamada fill; “Sem cor” deixa só o contorno.',
  },
  {
    type: 'sz_css_stroke',
    message0: 'Pintar a linha da forma\nescolher %1 nova cor %2',
    args0: [
      { type: 'field_name_picker', name: 'SELECTOR', text: '.forma', kind: 'selector' },
      { type: 'field_svg_paint', name: 'VALUE', text: '#1a2240' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Troca a cor da linha ao redor da forma. O nome técnico dessa linha é stroke.',
  },
  {
    type: 'sz_css_stroke_width',
    message0: 'Mudar a grossura da linha\nescolher %1 grossura %2',
    args0: [
      { type: 'field_name_picker', name: 'SELECTOR', text: '.forma', kind: 'selector' },
      { type: 'field_number', name: 'VALUE', value: 3, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Aumenta ou diminui a grossura do contorno. No código, ela se chama stroke-width.',
  },
  {
    type: 'sz_css_stroke_dasharray',
    message0: 'Fazer linha tracejada\nescolher %1 ritmo %2',
    args0: [
      { type: 'field_name_picker', name: 'SELECTOR', text: '.forma', kind: 'selector' },
      { type: 'field_input', name: 'VALUE', text: '8, 5' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Alterna pedaços desenhados e espaços. “8, 5” significa 8 de traço e 5 de espaço; no código é stroke-dasharray.',
  },
  {
    type: 'sz_css_stroke_linecap',
    message0: 'Escolher a ponta da linha\nforma %1 ponta %2',
    args0: [
      { type: 'field_name_picker', name: 'SELECTOR', text: '.forma', kind: 'selector' },
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
    tooltip: 'Escolhe como cada ponta do traço termina. No código, isso se chama stroke-linecap.',
  },
  {
    type: 'sz_css_text_anchor',
    message0: 'Alinhar texto do desenho\nescolher %1 alinhamento %2',
    args0: [
      { type: 'field_name_picker', name: 'SELECTOR', text: '.texto', kind: 'selector' },
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['começo', 'start'],
          ['meio', 'middle'],
          ['fim', 'end'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Escolhe se a posição x marca o começo, o meio ou o fim do texto. No código, isso se chama text-anchor.',
  },
]

/** Subcategorias da paleta; cada uma recebe um tom verde da identidade SVG. */
export const SVG_GROUPS: { name: string; colour: string; types: string[] }[] = [
  {
    name: '🖼️ Estrutura',
    colour: C,
    types: [
      'sz_html_svg',
      'sz_svg_title',
      'sz_svg_desc',
      'sz_svg_defs',
      'sz_svg_symbol',
      'sz_svg_group',
      'sz_svg_use',
    ],
  },
  {
    name: '⬛ Formas',
    colour: C,
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
  { name: '🔤 Texto', colour: C, types: ['sz_svg_text'] },
  {
    name: '🎨 Aparência',
    colour: C,
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

const SVG_SHADES = categoryShades(CATEGORY_COLORS.svg, SVG_GROUPS.length)
SVG_GROUPS.forEach((group, index) => {
  group.colour = SVG_SHADES[index] ?? CATEGORY_COLORS.svg
})
const SVG_COLOUR_BY_TYPE = new Map<string, string>(
  SVG_GROUPS.flatMap((group) => group.types.map((type) => [type, group.colour] as const)),
)
for (const block of SVG_BLOCKS) {
  const colour = SVG_COLOUR_BY_TYPE.get(block.type)
  if (colour) block.colour = colour
}
