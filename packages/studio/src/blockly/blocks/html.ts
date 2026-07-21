import {
  HTML_BUTTON_TYPE_OPTIONS,
  HTML_IMAGE_LOADING_OPTIONS,
  HTML_INPUT_TYPE_OPTIONS,
} from '../../html/catalog'
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
    message0: 'Escrever parágrafo %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Um texto qualquer' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Agrupa frases que falam sobre a mesma ideia.',
  },
  {
    type: 'sz_html_button',
    message0: 'Criar botão com texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Clique' }],
    message1: 'tipo %1 id opcional %2',
    args1: [
      {
        type: 'field_dropdown',
        name: 'TYPE',
        options: HTML_BUTTON_TYPE_OPTIONS.map(([label, value]) => [label, value]),
      },
      { type: 'field_input', name: 'ID', text: '' },
    ],
    message2: 'classe (opcional) %1',
    args2: [classFieldArg],
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria uma ação clicável. O tipo comum evita enviar um formulário sem querer.',
  },
  {
    type: 'sz_html_div',
    message0: 'Criar caixa com id opcional %1',
    args0: [{ type: 'field_input', name: 'ID', text: '' }],
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
    message0: 'Criar cabeçalho com id opcional %1',
    args0: [{ type: 'field_input', name: 'ID', text: '' }],
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
    message0: 'Criar menu com id opcional %1',
    args0: [{ type: 'field_input', name: 'ID', text: '' }],
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
    message0: 'Criar seção com id opcional %1',
    args0: [{ type: 'field_input', name: 'ID', text: '' }],
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
    message0: 'Criar conteúdo principal com id opcional %1',
    args0: [{ type: 'field_input', name: 'ID', text: '' }],
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
    message0: 'Criar rodapé com id opcional %1',
    args0: [{ type: 'field_input', name: 'ID', text: '' }],
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
    message0: 'Criar lista com id opcional %1',
    args0: [{ type: 'field_input', name: 'ID', text: '' }],
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
    message0: 'Criar formulário com id opcional %1',
    args0: [{ type: 'field_input', name: 'ID', text: '' }],
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
    message0: 'Criar título de seção %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Subtítulo' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Dá um título a uma parte importante da página, abaixo do título principal.',
  },
  {
    type: 'sz_html_h3',
    message0: 'Criar título dentro da seção %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Seção' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Dá um título a uma parte menor dentro de uma seção.',
  },
  {
    type: 'sz_html_span',
    message0: 'Marcar trecho de texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'destaque' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Marca um pequeno trecho para você identificar ou estilizar sem criar uma nova linha.',
  },
  {
    type: 'sz_html_strong',
    message0: 'Marcar como importante %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'importante' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Mostra que este trecho é importante. O navegador costuma deixá-lo em negrito.',
  },
  {
    type: 'sz_html_em',
    message0: 'Dar ênfase ao texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'ênfase' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Muda a entonação do trecho. O navegador costuma mostrá-lo em itálico.',
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
    tooltip: 'Cria um item que deve ficar dentro de uma lista.',
  },
  {
    type: 'sz_html_label',
    message0: 'Explicar o campo %1 com texto %2',
    args0: [
      { type: 'field_name_picker', name: 'FOR', text: '', kind: 'form-control' },
      { type: 'field_input', name: 'TEXT', text: 'Seu nome' },
    ],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Escreve o que a pessoa deve preencher e liga a explicação ao id do campo. Você também pode encaixar o campo dentro deste bloco.',
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
  {
    type: 'sz_html_comment',
    message0: 'comentário %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: ' anotação ' }],
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Uma anotação que não aparece na página, só no código. Vira <!-- ... -->.',
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
    message0: 'Imagem de %1',
    args0: [{ type: 'field_input', name: 'SRC', text: 'https://picsum.photos/600/400' }],
    message1: 'descrição %1 · só enfeite %2',
    args1: [
      { type: 'field_input', name: 'ALT', text: '' },
      { type: 'field_checkbox', name: 'DECORATIVE', checked: false },
    ],
    message2: 'tamanho %1 × %2',
    args2: [
      { type: 'field_input', name: 'WIDTH', text: '600' },
      { type: 'field_input', name: 'HEIGHT', text: '400' },
    ],
    message3: 'carregar %1',
    args3: [
      {
        type: 'field_dropdown',
        name: 'LOADING',
        options: HTML_IMAGE_LOADING_OPTIONS.map(([label, value]) => [label, value]),
      },
    ],
    message4: 'id (opcional) %1 · classe (opcional) %2',
    args4: [{ type: 'field_input', name: 'ID', text: '' }, classFieldArg],
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Cria uma imagem. Descreva o que ela comunica; marque “só enfeite” quando ela puder ser ignorada por leitores de tela. Informe largura e altura com números inteiros para a página não pular enquanto abre.',
  },

  // ---- Formulário (campos) ----
  {
    type: 'sz_html_input',
    message0: 'Criar campo',
    message1: 'id (opcional) %1 nome para envio %2',
    args1: [
      { type: 'field_input', name: 'ID', text: '' },
      { type: 'field_input', name: 'NAME', text: '' },
    ],
    message2: 'tipo %1 dica %2',
    args2: [
      {
        type: 'field_dropdown',
        name: 'TYPE',
        options: HTML_INPUT_TYPE_OPTIONS.map(([label, value]) => [label, value]),
      },
      { type: 'field_input', name: 'PLACEHOLDER', text: 'Digite aqui' },
    ],
    message3: 'valor inicial %1 começar marcado %2',
    args3: [
      { type: 'field_input', name: 'VALUE', text: '' },
      { type: 'field_checkbox', name: 'CHECKED', checked: false },
    ],
    message4: 'preenchimento automático %1',
    args4: [{ type: 'field_input', name: 'AUTOCOMPLETE', text: '' }],
    message5: 'classe (opcional) %1',
    args5: [classFieldArg],
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Cria um campo para a pessoa preencher, escolher ou marcar uma informação. O preenchimento automático pode usar valores como name, email ou off.',
  },
  {
    type: 'sz_html_textarea',
    message0: 'Criar área de texto',
    message1: 'id (opcional) %1 nome para envio %2',
    args1: [
      { type: 'field_input', name: 'ID', text: '' },
      { type: 'field_input', name: 'NAME', text: '' },
    ],
    message2: 'conteúdo inicial %1',
    args2: [{ type: 'field_input', name: 'TEXT', text: '' }],
    message3: 'dica %1',
    args3: [{ type: 'field_input', name: 'PLACEHOLDER', text: 'Sua mensagem' }],
    message4: 'preenchimento automático %1',
    args4: [{ type: 'field_input', name: 'AUTOCOMPLETE', text: '' }],
    message5: 'classe (opcional) %1',
    args5: [classFieldArg],
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip:
      'Cria um campo de texto longo. O preenchimento automático pode usar valores como street-address ou off.',
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
      'sz_html_comment',
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
