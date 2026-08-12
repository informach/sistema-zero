import { CATEGORY_COLORS } from '../theme'
import { EVENT_TARGET_EXTENSION } from './eventTargetExtension'
import type { BlockDefinition } from './types'

const C = CATEGORY_COLORS.dom

/**
 * Blocos de MANIPULAÇÃO DO DOM: eventos, busca de elementos, leitura/escrita de
 * propriedades, classes/dataset e criação/inserção. Na toolbox, ficam nas
 * subcategorias Página e Eventos do guarda-chuva Programação; os demais blocos
 * da linguagem ocupam as outras subcategorias desse mesmo grupo.
 *
 * ⚠️ Os `type` continuam `sz_js_*` (NÃO renomear): parser, gerador, IR,
 * reverse-sync e a allowlist de projetos salvos referenciam o type — só a
 * organização da paleta e a cor mudaram. Recolorir = `colour: C`, a tonalidade
 * própria de DOM dentro da família visual de Programação.
 */
export const DOM_BLOCKS: BlockDefinition[] = [
  // ---- Eventos ----
  {
    type: 'sz_js_on_click',
    placement: 'event',
    userGesture: true,
    eventObject: 'pointer',
    message0: 'Quando clicarem %1 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['no elemento id', 'id'],
          ['na variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'meuBotao', kind: 'dom-target' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Executa os blocos de dentro quando clicarem no elemento escolhido.',
  },
  {
    type: 'sz_js_on_click_anywhere',
    placement: 'event',
    userGesture: true,
    eventObject: 'pointer',
    message0: 'Quando clicarem em qualquer lugar da tela',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Reage a um clique em qualquer parte da página. Use "posição do clique" para saber onde clicaram.',
  },
  {
    type: 'sz_js_on_mouseover',
    placement: 'event',
    eventObject: 'pointer',
    message0: 'Quando o mouse passar %1 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['sobre o elemento id', 'id'],
          ['sobre a variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'meuElemento', kind: 'dom-target' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Executa os blocos de dentro quando o ponteiro passar sobre o elemento escolhido.',
  },
  {
    type: 'sz_js_on_input',
    placement: 'event',
    eventObject: 'generic',
    message0: 'Quando digitar %1 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['no elemento id', 'id'],
          ['na variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'meuInput', kind: 'dom-target' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Executa os blocos de dentro sempre que o conteúdo do campo mudar.',
  },
  {
    type: 'sz_js_on_submit',
    placement: 'event',
    eventObject: 'generic',
    message0: 'Quando enviar %1 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['o formulário id', 'id'],
          ['a variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'meuForm', kind: 'dom-target' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Executa os blocos de dentro quando o formulário for enviado, sem recarregar a página.',
  },
  {
    type: 'sz_js_on_event_named',
    placement: 'event',
    message0: 'quando %1 em %2 %3 chamar a função %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'EVENT',
        options: [
          ['clicar', 'click'],
          ['passar o mouse', 'mouseover'],
          ['tirar o mouse', 'mouseout'],
          ['apertar o mouse/dedo', 'pointerdown'],
          ['soltar o mouse/dedo', 'pointerup'],
          ['cancelar o toque/ponteiro', 'pointercancel'],
          ['perder a captura do ponteiro', 'lostpointercapture'],
          ['perder o foco da janela', 'blur'],
          ['enviar', 'submit'],
          ['digitar', 'input'],
          ['mudar', 'change'],
          ['apertar tecla', 'keydown'],
          ['soltar tecla', 'keyup'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['o elemento id', 'id'],
          ['a variável', 'var'],
          ['a janela', 'window'],
          ['o documento', 'document'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'meuBotao', kind: 'dom-target' },
      { type: 'field_name_picker', name: 'HANDLER', text: 'fazerAlgo', kind: 'function' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga um evento a uma função já criada. Dentro da função, "elemento atual" é o elemento que disparou.',
  },
  {
    type: 'sz_js_event_method',
    placement: 'event-body',
    message0: 'no evento, %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'METHOD',
        options: [
          ['cancelar a ação padrão', 'preventDefault'],
          ['parar a propagação', 'stopPropagation'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Use dentro de um "quando ... fazer": cancela a ação padrão do navegador (ex.: enviar formulário) ou para a propagação do evento.',
  },
  // ---- Eventos de teclado / mouse / janela (corpo embutido) ----
  {
    type: 'sz_js_on_key',
    placement: 'event',
    userGesture: { field: 'WHEN', equals: 'keydown' },
    eventObject: 'keyboard',
    extensions: [EVENT_TARGET_EXTENSION],
    message0: 'Quando %1 %2 %3',
    args0: [
      {
        type: 'field_dropdown',
        name: 'WHEN',
        options: [
          ['apertar a tecla', 'keydown'],
          ['soltar a tecla', 'keyup'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['na página', 'document'],
          ['na janela', 'window'],
          ['no elemento id', 'id'],
          ['na variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'document', kind: 'dom-target' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda os blocos de dentro quando uma tecla é apertada ou solta no alvo escolhido. Use o valor da tecla do evento para descobrir qual foi.',
  },
  {
    type: 'sz_js_on_mousemove',
    placement: 'event',
    eventObject: 'pointer',
    extensions: [EVENT_TARGET_EXTENSION],
    message0: 'Quando mover o mouse/dedo %1 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['na página', 'document'],
          ['na janela', 'window'],
          ['no elemento id', 'id'],
          ['na variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'document', kind: 'dom-target' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o "fazer" quando o mouse/dedo se move no alvo escolhido. Use "x do mouse/dedo" e "y do mouse/dedo" para a posição atual.',
  },
  {
    type: 'sz_js_on_pointer_down',
    placement: 'event',
    userGesture: true,
    eventObject: 'pointer',
    extensions: [EVENT_TARGET_EXTENSION],
    message0: 'Quando apertar o mouse/dedo %1 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['na janela', 'window'],
          ['na página', 'document'],
          ['no elemento id', 'id'],
          ['na variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'window', kind: 'dom-target' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda os blocos de dentro quando apertam o mouse ou tocam o alvo escolhido. É útil para ações de segurar.',
  },
  {
    type: 'sz_js_on_pointer_up',
    placement: 'event',
    userGesture: true,
    eventObject: 'pointer',
    extensions: [EVENT_TARGET_EXTENSION],
    message0: 'Quando soltar o mouse/dedo %1 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['na janela', 'window'],
          ['na página', 'document'],
          ['no elemento id', 'id'],
          ['na variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'window', kind: 'dom-target' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Roda os blocos de dentro quando soltam o mouse ou tiram o dedo do alvo escolhido.',
  },
  {
    // Legado para abrir projetos antigos. O frame "Ao iniciar" já representa
    // este momento e evita ensinar dois jeitos para o mesmo conceito.
    type: 'sz_js_on_load',
    placement: 'legacy-start',
    migration: 'unwrap-load',
    eventObject: 'generic',
    message0: 'Quando a página terminar de carregar',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    hidden: true,
    tooltip: 'Abre projetos antigos que esperavam a página terminar de carregar.',
  },
  {
    type: 'sz_js_on_resize',
    placement: 'event',
    eventObject: 'generic',
    message0: 'Quando a janela mudar de tamanho',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Roda os blocos de dentro quando a janela muda de tamanho.',
  },
  {
    type: 'sz_js_on_context_menu',
    placement: 'event',
    eventObject: 'pointer',
    message0: 'Quando abrir o menu do botão direito',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda os blocos de dentro quando o menu do botão direito é aberto. É útil para pausar controles de um jogo.',
  },
  {
    type: 'sz_js_on_blur',
    placement: 'event',
    eventObject: 'generic',
    message0: 'Quando a janela perder o foco',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda os blocos de dentro quando a pessoa sai da janela do jogo. É útil para soltar teclas que ficaram apertadas.',
  },
  {
    type: 'sz_js_element_onclick',
    placement: 'event',
    userGesture: true,
    eventObject: 'pointer',
    message0: 'ao clicar no elemento %1 %2 fazer %3',
    args0: [
      { type: 'input_value', name: 'TARGET', check: 'JSValue' },
      { type: 'input_dummy' },
      { type: 'input_statement', name: 'DO', check: 'JSStmt' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Roda os blocos de dentro quando o elemento encaixado for clicado.',
  },
  {
    type: 'sz_js_on_fullscreen_change',
    placement: 'event',
    eventObject: 'generic',
    message0: 'Quando a tela cheia mudar',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda os blocos de dentro quando a página entra ou sai da tela cheia. Use com "está em tela cheia?" para atualizar um botão.',
  },
  // ---- Tela cheia (Fullscreen API) ----
  {
    type: 'sz_js_request_fullscreen',
    placement: 'user-gesture-command',
    message0: 'entrar em tela cheia',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Faz a página inteira ocupar a tela. Use dentro de uma ação de clique ou tecla.',
  },
  {
    type: 'sz_js_exit_fullscreen',
    placement: 'command',
    message0: 'sair da tela cheia',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Volta do modo tela cheia para a janela normal.',
  },
  {
    type: 'sz_js_toggle_fullscreen',
    placement: 'user-gesture-command',
    message0: 'alternar tela cheia',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga/desliga a tela cheia: entra se estiver normal, sai se já estiver cheia. Ótimo para um botão. Use dentro de um "Quando clicarem".',
  },
  {
    type: 'sz_val_is_fullscreen',
    message0: 'está em tela cheia?',
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro quando a página está em tela cheia. Use dentro de um "se" para trocar o ícone do botão (⛶ / ✕).',
  },
  // ---- Buscar elementos ----
  {
    type: 'sz_js_get_element_by_id',
    placement: 'command',
    message0: 'Pegar elemento id %1 e guardar em %2',
    args0: [
      { type: 'field_input', name: 'ID', text: 'meuBotao' },
      { type: 'field_input', name: 'NAME', text: 'meuBotao' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Guarda o elemento de um id numa variável.',
  },
  {
    type: 'sz_val_get_element',
    message0: 'o elemento com id %1',
    args0: [{ type: 'field_input', name: 'ID', text: 'canvas1' }],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Pega o elemento que tem esse nome para encaixá-lo como valor em outro bloco.',
  },
  {
    type: 'sz_val_query_select',
    message0: '%1 que casam com o seletor %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'MODE',
        options: [
          ['todos os elementos', 'all'],
          ['o primeiro elemento', 'one'],
        ],
      },
      { type: 'field_input', name: 'SELECTOR', text: '.painel' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Pega o primeiro elemento ou todos os elementos que combinam com a busca. A lista pode ser usada em "para cada".',
  },
  {
    type: 'sz_js_query_selector',
    placement: 'command',
    message0: 'Pegar elemento via seletor %1 e guardar em %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_input', name: 'NAME', text: 'caixa' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Procura o primeiro elemento que combina com a busca e guarda em uma variável.',
  },
  {
    type: 'sz_js_query_selector_all',
    placement: 'command',
    message0: 'Pegar TODOS os elementos via seletor %1 e guardar em %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '.item' },
      { type: 'field_input', name: 'NAME', text: 'itens' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Pega todos os elementos que casam com o seletor. Use "para cada item ... na lista" para percorrê-los.',
  },
  // ---- Ler/alterar conteúdo ----
  {
    type: 'sz_js_set_property_text',
    placement: 'command',
    message0: 'Alterar %1 %2 %3 para %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['o texto', 'textContent'],
          ['o valor', 'value'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['do elemento id', 'id'],
          ['da variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'saida', kind: 'dom-target' },
      { type: 'field_input', name: 'VALUE', text: 'Novo texto' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Escreve um texto fixo numa propriedade de um elemento (por id) ou da variável que o guarda.',
  },
  {
    type: 'sz_js_set_property',
    placement: 'command',
    message0: 'alterar %1 %2 %3 para o valor %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['o texto', 'textContent'],
          ['o valor', 'value'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['do elemento id', 'id'],
          ['da variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'saida', kind: 'dom-target' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Mostra um texto ou preenche o valor de um campo usando o resultado de outro bloco.',
  },
  {
    type: 'sz_js_set_style',
    placement: 'command',
    message0: 'Mudar o estilo %1 %2 %3 (ou %4) para %5',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['esquerda (left)', 'left'],
          ['topo (top)', 'top'],
          ['direita (right)', 'right'],
          ['baixo (bottom)', 'bottom'],
          ['largura (width)', 'width'],
          ['altura (height)', 'height'],
          ['transparência (opacity)', 'opacity'],
          ['visibilidade (visibility)', 'visibility'],
          ['exibição (display)', 'display'],
          ['cursor', 'cursor'],
          ['transformação (transform)', 'transform'],
          ['fundo (background)', 'background'],
          ['cor (color)', 'color'],
          ['camada (z-index)', 'zIndex'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['do elemento id', 'id'],
          ['da variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'caixa', kind: 'dom-target' },
      { type: 'field_input', name: 'CUSTOM', text: '' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Muda uma característica visual do elemento, como posição, tamanho ou transparência. Lembre da unidade em medidas, como 120px.',
  },
  {
    type: 'sz_js_set_style_text',
    placement: 'command',
    message0: 'Definir o estilo completo %1 %2 como %3',
    args0: [
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['do elemento id', 'id'],
          ['da variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'caixa', kind: 'dom-target' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Define várias características visuais de uma vez usando um texto de estilos.',
  },
  {
    type: 'sz_js_set_attribute',
    placement: 'command',
    message0: 'Definir o atributo %1 %2 %3 como %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'stroke' },
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['do elemento id', 'id'],
          ['da variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'forma', kind: 'dom-target' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Muda uma característica segura do elemento, como stroke, fill, data- ou aria-.',
    extensions: ['sz_safe_dom_attribute'],
  },
  {
    type: 'sz_js_set_property_var',
    placement: 'command',
    message0: 'Alterar %1 %2 %3 para o valor da variável %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['o texto', 'textContent'],
          ['o valor', 'value'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['do elemento id', 'id'],
          ['da variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'saida', kind: 'dom-target' },
      { type: 'field_name_picker', name: 'NAME', text: 'conteudo', kind: 'variable' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Escreve o valor de uma variável numa propriedade do elemento (por id ou variável).',
  },
  {
    type: 'sz_js_set_property_calc',
    placement: 'command',
    message0: 'Alterar %1 %2 %3 para %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['o texto', 'textContent'],
          ['o valor', 'value'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['do elemento id', 'id'],
          ['da variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'saida', kind: 'dom-target' },
      {
        type: 'field_dropdown',
        name: 'CALC',
        options: [
          ['o ano atual', 'year'],
          ['a data de hoje', 'date'],
          ['a hora agora', 'time'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Escreve um valor calculado da data/hora (ano atual, data de hoje ou hora) numa propriedade do elemento.',
  },
  {
    type: 'sz_js_get_property',
    placement: 'command',
    message0: 'Pegar %1 %2 %3 e guardar em %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['o texto', 'textContent'],
          ['o valor', 'value'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['do elemento id', 'id'],
          ['da variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'saida', kind: 'dom-target' },
      { type: 'field_input', name: 'NAME', text: 'conteudo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Lê uma propriedade (o texto ou o valor digitado) de um elemento por id ou variável e guarda numa variável.',
  },
  {
    type: 'sz_js_get_attribute',
    placement: 'command',
    message0: 'Pegar o atributo %1 %2 %3 e guardar em %4',
    args0: [
      { type: 'field_input', name: 'ATTR', text: 'cx' },
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['do elemento id', 'id'],
          ['da variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'forma', kind: 'dom-target' },
      { type: 'field_input', name: 'NAME', text: 'valor' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Lê uma característica do elemento e guarda o resultado em uma variável.',
  },
  {
    // Legado: substituído por sz_js_set_property_text. Mantido (oculto da
    // paleta) para que projetos antigos salvos com este bloco ainda carreguem.
    type: 'sz_js_set_text',
    placement: 'command',
    message0: 'Alterar texto do elemento id %1 para %2',
    args0: [
      { type: 'field_name_picker', name: 'TARGET', text: 'saida', kind: 'dom-target' },
      { type: 'field_input', name: 'VALUE', text: 'Novo texto' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    hidden: true,
  },
  // ---- Classes e dados ----
  {
    type: 'sz_js_class_op',
    placement: 'command',
    message0: '%1 classe %2 %3 %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'OP',
        options: [
          ['adicionar', 'add'],
          ['remover', 'remove'],
          ['alternar', 'toggle'],
        ],
      },
      { type: 'field_input', name: 'CLASS', text: 'ativo' },
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['no elemento id', 'id'],
          ['na variável', 'var'],
          ['no elemento atual', 'this'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'meuElemento', kind: 'dom-target' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Adiciona, remove ou alterna uma classe visual do elemento escolhido.',
  },
  {
    type: 'sz_js_set_dataset',
    placement: 'command',
    message0: 'no elemento %1 %2 guardar no dado %3 o valor %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['id', 'id'],
          ['variável', 'var'],
        ],
      },
      { type: 'field_name_picker', name: 'TARGET', text: 'elemento', kind: 'dom-target' },
      { type: 'field_input', name: 'KEY', text: 'chave' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Guarda um valor num dado próprio do elemento.',
  },
  // ---- Criar/inserir elementos ----
  {
    type: 'sz_js_create_element',
    placement: 'command',
    message0: 'criar elemento %1 e guardar em %2',
    args0: [
      { type: 'field_input', name: 'TAG', text: 'div' },
      { type: 'field_input', name: 'NAME', text: 'elemento' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    extensions: ['sz_safe_dom_html_element'],
    tooltip: 'Cria um novo elemento HTML em memória e guarda numa variável.',
  },
  {
    type: 'sz_js_create_element_ns',
    placement: 'command',
    message0: 'criar forma SVG %1 e guardar em %2',
    args0: [
      { type: 'field_input', name: 'TAG', text: 'circle' },
      { type: 'field_input', name: 'NAME', text: 'forma' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    extensions: ['sz_safe_dom_svg_element'],
    tooltip:
      'Cria uma forma para um desenho SVG e guarda em uma variável. Depois configure seus atributos e adicione-a ao desenho.',
  },
  {
    type: 'sz_js_append_child',
    placement: 'command',
    message0: 'dentro de %1 adicionar %2',
    args0: [
      { type: 'field_name_picker', name: 'PARENT', text: 'pai', kind: 'variable' },
      { type: 'field_name_picker', name: 'CHILD', text: 'filho', kind: 'variable' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Coloca um elemento dentro de outro.',
  },
]
