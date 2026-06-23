import { CATEGORY_COLORS, categoryShades } from '../theme'
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
]

/**
 * Sub-categorias da paleta de HTML (à la Scratch/MakeCode): cada grupo tem ÍCONE
 * e uma cor da FAMÍLIA do HTML (tons de ciano/azul/teal), preservando a identidade
 * "HTML é ciano" e ainda dando navegação por cor. Cada bloco herda a cor do grupo.
 */
export const HTML_GROUPS: { name: string; colour: string; types: string[] }[] = [
  {
    name: '📝 Texto',
    colour: '#1fb4d2',
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
    colour: '#1593b0',
    types: [
      'sz_html_div',
      'sz_html_header',
      'sz_html_nav',
      'sz_html_section',
      'sz_html_main',
      'sz_html_footer',
    ],
  },
  { name: '📋 Listas', colour: '#2cc3dd', types: ['sz_html_ul', 'sz_html_li'] },
  {
    name: '🖼️ Mídia & Links',
    colour: '#128bab',
    types: ['sz_html_image', 'sz_html_link'],
  },
  {
    name: '✏️ Formulário',
    colour: '#21a9c6',
    types: ['sz_html_form', 'sz_html_input', 'sz_html_textarea', 'sz_html_button', 'sz_html_label'],
  },
]

// IDENTIDADE: cada sub-grupo recebe um TOM da cor base da categoria (HTML),
// derivado claro→escuro por `categoryShades` — as cores nos literais de
// HTML_GROUPS acima são só placeholders; o valor real é atribuído aqui.
const HTML_SHADES = categoryShades(CATEGORY_COLORS.html, HTML_GROUPS.length)
HTML_GROUPS.forEach((g, i) => {
  g.colour = HTML_SHADES[i] ?? CATEGORY_COLORS.html
})
// Pinta cada bloco com o tom do seu grupo (cor = navegação + categoria).
const HTML_COLOUR_BY_TYPE = new Map<string, string>(
  HTML_GROUPS.flatMap((g) => g.types.map((t) => [t, g.colour] as const)),
)
for (const b of HTML_BLOCKS) {
  const colour = HTML_COLOUR_BY_TYPE.get(b.type)
  if (colour) b.colour = colour
}
