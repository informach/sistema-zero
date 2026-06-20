import { CATEGORY_COLORS } from '../theme'
import type { BlockDefinition } from './types'

const C = CATEGORY_COLORS.html

/**
 * Slot opcional de filhos inline para os blocos de texto (h1..h3, p, span,
 * strong, em, li, label). Permite aninhar, por exemplo, um <span> dentro de um
 * <p> sem cair em "código avançado". Fica vazio no caso comum (só texto).
 */
const inlineChildren: Pick<BlockDefinition, 'message1' | 'args1'> = {
  message1: 'conteúdo (opcional) %1',
  args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
}

const classFieldArg = { type: 'field_input', name: 'CLASS', text: '' }

/**
 * Campo `classe` opcional. Toda tag HTML aceita uma class (usada pelo CSS).
 * Antes a class só sobrevivia escondida no `data` do bloco; agora é um campo
 * visível e editável. Como o índice da linha de mensagem varia, há duas
 * versões: `classMsg1` para blocos folha (só têm `message0`) e `classMsg2`
 * para blocos com filhos (já usam `message1`).
 */
const classMsg1: Pick<BlockDefinition, 'message1' | 'args1'> = {
  message1: 'classe (opcional) %1',
  args1: [classFieldArg],
}
const classMsg2: Pick<BlockDefinition, 'message2' | 'args2'> = {
  message2: 'classe (opcional) %1',
  args2: [classFieldArg],
}

export const HTML_BLOCKS: BlockDefinition[] = [
  {
    type: 'sz_html_h1',
    message0: 'Criar título com texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Olá mundo' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria o título principal da página.',
  },
  {
    type: 'sz_html_p',
    message0: 'Criar parágrafo com texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Um texto qualquer' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
  },
  {
    type: 'sz_html_button',
    message0: 'Criar botão id %1 com texto %2',
    args0: [
      { type: 'field_input', name: 'ID', text: 'meuBotao' },
      { type: 'field_input', name: 'TEXT', text: 'Clique' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
  },
  {
    type: 'sz_html_div',
    message0: 'Criar caixa id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'caixa' }],
    message1: 'conteúdo %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria uma caixa que pode conter outros blocos dentro.',
  },
  {
    type: 'sz_html_canvas',
    message0: 'Criar tela de desenho id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'tela' }],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria uma tela de desenho. O tamanho é definido nos blocos de desenho.',
  },

  // ---- Estrutura semântica (containers que seguram filhos) ----
  {
    type: 'sz_html_header',
    message0: 'Criar cabeçalho id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'cabecalho' }],
    message1: 'conteúdo %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria o cabeçalho (topo da página). Pode conter outros blocos.',
  },
  {
    type: 'sz_html_nav',
    message0: 'Criar menu id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'menu' }],
    message1: 'links %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um menu (navegação). Geralmente contém links.',
  },
  {
    type: 'sz_html_section',
    message0: 'Criar seção id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'secao' }],
    message1: 'conteúdo %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria uma seção (um bloco da página). Pode conter outros blocos.',
  },
  {
    type: 'sz_html_main',
    message0: 'Criar conteúdo principal id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'principal' }],
    message1: 'conteúdo %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria o conteúdo principal. Pode conter outros blocos.',
  },
  {
    type: 'sz_html_footer',
    message0: 'Criar rodapé id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'rodape' }],
    message1: 'conteúdo %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria o rodapé da página. Pode conter outros blocos.',
  },
  {
    type: 'sz_html_ul',
    message0: 'Criar lista id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'lista' }],
    message1: 'itens %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria uma lista. Coloque blocos "item de lista" dentro.',
  },
  {
    type: 'sz_html_form',
    message0: 'Criar formulário id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'formulario' }],
    message1: 'campos %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um formulário. Coloque campos, rótulos e botões dentro.',
  },

  // ---- Conteúdo (folhas de texto) ----
  {
    type: 'sz_html_h2',
    message0: 'Criar subtítulo com texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Subtítulo' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
  },
  {
    type: 'sz_html_h3',
    message0: 'Criar subtítulo menor com texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Seção' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
  },
  {
    type: 'sz_html_span',
    message0: 'Criar trecho com texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'destaque' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
  },
  {
    type: 'sz_html_strong',
    message0: 'Criar texto em negrito %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'importante' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um texto com ênfase forte (normalmente negrito).',
  },
  {
    type: 'sz_html_em',
    message0: 'Criar texto em itálico %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'ênfase' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um texto com ênfase (normalmente itálico).',
  },
  {
    type: 'sz_html_li',
    message0: 'Criar item de lista com texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Item da lista' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
  },
  {
    type: 'sz_html_label',
    message0: 'Criar rótulo com texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Seu nome' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
  },
  {
    type: 'sz_html_text',
    message0: 'texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'texto' }],
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Um pedaço de texto solto. Use dentro de um parágrafo, título, etc.',
  },

  // ---- Mídia e links ----
  {
    type: 'sz_html_link',
    message0: 'Criar link para %1 com texto %2',
    args0: [
      { type: 'field_input', name: 'HREF', text: '#' },
      { type: 'field_input', name: 'TEXT', text: 'Saiba mais' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um link clicável.',
  },
  {
    type: 'sz_html_image',
    message0: 'Criar imagem de %1 (descrição %2)',
    args0: [
      { type: 'field_input', name: 'SRC', text: 'https://picsum.photos/600/400' },
      { type: 'field_input', name: 'ALT', text: 'imagem' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria uma imagem. A descrição ajuda na acessibilidade.',
  },

  // ---- Formulário (campos) ----
  {
    type: 'sz_html_input',
    message0: 'Criar campo id %1 tipo %2 dica %3',
    args0: [
      { type: 'field_input', name: 'ID', text: 'campo' },
      {
        type: 'field_dropdown',
        name: 'TYPE',
        options: [
          ['texto', 'text'],
          ['e-mail', 'email'],
          ['senha', 'password'],
          ['número', 'number'],
        ],
      },
      { type: 'field_input', name: 'PLACEHOLDER', text: 'Digite aqui' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um campo para a pessoa digitar.',
  },
  {
    type: 'sz_html_textarea',
    message0: 'Criar área de texto id %1 dica %2',
    args0: [
      { type: 'field_input', name: 'ID', text: 'mensagem' },
      { type: 'field_input', name: 'PLACEHOLDER', text: 'Sua mensagem' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um campo de texto longo.',
  },

  // ---- SVG (desenho vetorial: ótimo para um moinho/cata-vento que gira por CSS) ----
  {
    type: 'sz_html_svg',
    message0: 'Criar SVG id %1 largura %2 altura %3 viewBox %4',
    args0: [
      { type: 'field_input', name: 'ID', text: '' },
      { type: 'field_input', name: 'WIDTH', text: '200' },
      { type: 'field_input', name: 'HEIGHT', text: '200' },
      { type: 'field_input', name: 'VIEWBOX', text: '' },
    ],
    message1: 'formas dentro %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
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
    message1: 'formas dentro %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Agrupa formas SVG e as transforma juntas (mover/girar/escalar). Dê uma classe e gire por CSS (@keyframes) para fazer um moinho rodar.',
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
      'Reusa uma forma que tem um id (ex.: um caminho dentro de <defs>), opcionalmente transformada — bom para repetir as pás de um moinho.',
  },
]

/**
 * Sub-categorias da paleta de HTML (à la Scratch/MakeCode): cada grupo tem ÍCONE
 * e uma cor da FAMÍLIA do HTML (tons de ciano/azul/teal), preservando a identidade
 * "HTML é ciano" e ainda dando navegação por cor. Cada bloco herda a cor do grupo.
 */
export const HTML_GROUPS: { name: string; colour: string; types: string[] }[] = [
  {
    name: '📝 Texto',
    colour: '#22d3ee',
    types: [
      'sz_html_h1',
      'sz_html_h2',
      'sz_html_h3',
      'sz_html_p',
      'sz_html_span',
      'sz_html_strong',
      'sz_html_em',
      'sz_html_text',
    ],
  },
  {
    name: '📦 Estrutura',
    colour: '#38bdf8',
    types: [
      'sz_html_div',
      'sz_html_header',
      'sz_html_nav',
      'sz_html_section',
      'sz_html_main',
      'sz_html_footer',
    ],
  },
  { name: '📋 Listas', colour: '#2dd4bf', types: ['sz_html_ul', 'sz_html_li'] },
  {
    name: '🖼️ Mídia & Links',
    colour: '#60a5fa',
    types: ['sz_html_image', 'sz_html_link', 'sz_html_canvas'],
  },
  {
    name: '✏️ Formulário',
    colour: '#818cf8',
    types: ['sz_html_form', 'sz_html_input', 'sz_html_textarea', 'sz_html_button', 'sz_html_label'],
  },
  {
    name: '🎨 SVG (vetorial)',
    colour: '#0ea5e9',
    types: [
      'sz_html_svg',
      'sz_svg_group',
      'sz_svg_path',
      'sz_svg_circle',
      'sz_svg_rect',
      'sz_svg_line',
      'sz_svg_use',
    ],
  },
]

// Cor = navegação: pinta cada bloco com a cor do seu grupo.
const HTML_COLOUR_BY_TYPE = new Map<string, string>(
  HTML_GROUPS.flatMap((g) => g.types.map((t) => [t, g.colour] as const)),
)
for (const b of HTML_BLOCKS) {
  const colour = HTML_COLOUR_BY_TYPE.get(b.type)
  if (colour) b.colour = colour
}
