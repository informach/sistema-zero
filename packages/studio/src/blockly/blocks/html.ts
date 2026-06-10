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
    message0: 'Criar título (h1) com texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Olá mundo' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um elemento <h1>.',
  },
  {
    type: 'sz_html_p',
    message0: 'Criar parágrafo (p) com texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Um texto qualquer' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
  },
  {
    type: 'sz_html_button',
    message0: 'Criar botão (button) id %1 com texto %2',
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
    message0: 'Criar caixa (div) id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'caixa' }],
    message1: 'conteúdo %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria uma <div> que pode conter outros blocos dentro.',
  },
  {
    type: 'sz_html_canvas',
    message0: 'Criar tela de desenho (canvas) id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'tela' }],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um <canvas>. O tamanho é definido nos blocos de Canvas (JavaScript).',
  },

  // ---- Estrutura semântica (containers que seguram filhos) ----
  {
    type: 'sz_html_header',
    message0: 'Criar cabeçalho (header) id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'cabecalho' }],
    message1: 'conteúdo %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um <header> (topo da página). Pode conter outros blocos.',
  },
  {
    type: 'sz_html_nav',
    message0: 'Criar menu (nav) id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'menu' }],
    message1: 'links %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um <nav> (navegação). Geralmente contém links.',
  },
  {
    type: 'sz_html_section',
    message0: 'Criar seção (section) id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'secao' }],
    message1: 'conteúdo %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria uma <section> (bloco da página). Pode conter outros blocos.',
  },
  {
    type: 'sz_html_main',
    message0: 'Criar conteúdo principal (main) id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'principal' }],
    message1: 'conteúdo %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria o <main> (conteúdo principal). Pode conter outros blocos.',
  },
  {
    type: 'sz_html_footer',
    message0: 'Criar rodapé (footer) id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'rodape' }],
    message1: 'conteúdo %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um <footer> (rodapé da página). Pode conter outros blocos.',
  },
  {
    type: 'sz_html_ul',
    message0: 'Criar lista (ul) id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'lista' }],
    message1: 'itens %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria uma lista <ul>. Coloque blocos "item de lista" dentro.',
  },
  {
    type: 'sz_html_form',
    message0: 'Criar formulário (form) id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'formulario' }],
    message1: 'campos %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um <form>. Coloque campos, rótulos e botões dentro.',
  },

  // ---- Conteúdo (folhas de texto) ----
  {
    type: 'sz_html_h2',
    message0: 'Criar subtítulo (h2) com texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Subtítulo' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
  },
  {
    type: 'sz_html_h3',
    message0: 'Criar subtítulo menor (h3) com texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Seção' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
  },
  {
    type: 'sz_html_span',
    message0: 'Criar trecho (span) com texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'destaque' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
  },
  {
    type: 'sz_html_strong',
    message0: 'Criar texto em negrito (strong) %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'importante' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um <strong> (texto com ênfase forte, normalmente negrito).',
  },
  {
    type: 'sz_html_em',
    message0: 'Criar texto em itálico (em) %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'ênfase' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um <em> (texto com ênfase, normalmente itálico).',
  },
  {
    type: 'sz_html_li',
    message0: 'Criar item de lista (li) com texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Item da lista' }],
    ...inlineChildren,
    ...classMsg2,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
  },
  {
    type: 'sz_html_label',
    message0: 'Criar rótulo (label) com texto %1',
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
    tooltip: 'Um pedaço de texto solto (sem tag). Use dentro de um parágrafo, título, etc.',
  },

  // ---- Mídia e links ----
  {
    type: 'sz_html_link',
    message0: 'Criar link (a) para %1 com texto %2',
    args0: [
      { type: 'field_input', name: 'HREF', text: '#' },
      { type: 'field_input', name: 'TEXT', text: 'Saiba mais' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria um link <a href="...">.',
  },
  {
    type: 'sz_html_image',
    message0: 'Criar imagem (img) de %1 (descrição %2)',
    args0: [
      { type: 'field_input', name: 'SRC', text: 'https://picsum.photos/600/400' },
      { type: 'field_input', name: 'ALT', text: 'imagem' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria uma <img>. A descrição (alt) ajuda na acessibilidade.',
  },

  // ---- Formulário (campos) ----
  {
    type: 'sz_html_input',
    message0: 'Criar campo (input) id %1 tipo %2 dica %3',
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
    tooltip: 'Cria um campo <input>.',
  },
  {
    type: 'sz_html_textarea',
    message0: 'Criar área de texto (textarea) id %1 dica %2',
    args0: [
      { type: 'field_input', name: 'ID', text: 'mensagem' },
      { type: 'field_input', name: 'PLACEHOLDER', text: 'Sua mensagem' },
    ],
    ...classMsg1,
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'Cria uma <textarea> (campo de texto longo).',
  },
]
