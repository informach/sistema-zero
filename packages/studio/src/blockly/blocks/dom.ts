import { CATEGORY_COLORS } from '../theme'
import type { BlockDefinition } from './types'

const C = CATEGORY_COLORS.dom

/**
 * Blocos de MANIPULAÇÃO DO DOM: eventos, busca de elementos, leitura/escrita de
 * propriedades, classes/dataset e criação/inserção. Separados da categoria
 * JavaScript (que fica com a LINGUAGEM: variáveis, controle de fluxo, listas,
 * console/alert, timers, storage, fetch) — ver toolbox.ts (categoria "DOM"
 * entre CSS e JavaScript).
 *
 * ⚠️ Os `type` continuam `sz_js_*` (NÃO renomear): parser, gerador, IR,
 * reverse-sync e a allowlist de projetos salvos referenciam o type — só a
 * organização da paleta e a cor mudaram. Recolorir = `colour: C` (sky), em vez
 * do âmbar de JavaScript.
 */
export const DOM_BLOCKS: BlockDefinition[] = [
  // ---- Eventos ----
  {
    type: 'sz_js_on_click',
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
      { type: 'field_input', name: 'TARGET', text: 'meuBotao' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_js_on_click_anywhere',
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
      { type: 'field_input', name: 'TARGET', text: 'meuElemento' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_js_on_input',
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
      { type: 'field_input', name: 'TARGET', text: 'meuInput' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_js_on_submit',
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
      { type: 'field_input', name: 'TARGET', text: 'meuForm' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_js_on_event_named',
    message0: 'quando %1 em %2 %3 chamar a função %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'EVENT',
        options: [
          ['clicar', 'click'],
          ['passar o mouse', 'mouseover'],
          ['tirar o mouse', 'mouseout'],
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
        ],
      },
      { type: 'field_input', name: 'TARGET', text: 'meuBotao' },
      { type: 'field_input', name: 'HANDLER', text: 'fazerAlgo' },
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
    level: 'intermediario',
    tooltip:
      'Use dentro de um "quando ... fazer": cancela a ação padrão do navegador (ex.: enviar formulário) ou para a propagação do evento.',
  },
  // ---- Eventos de teclado / mouse / janela (corpo embutido) ----
  {
    type: 'sz_js_on_key',
    message0: 'Quando %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'WHEN',
        options: [
          ['apertar a tecla', 'keydown'],
          ['soltar a tecla', 'keyup'],
        ],
      },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o "fazer" quando qualquer tecla é apertada (ou solta). Dentro, use "o código da tecla do evento" para saber qual foi, ex.: se ( o código da tecla = "KeyW" ). Vira document.addEventListener("keydown", (event) => { ... }).',
  },
  {
    type: 'sz_js_on_mousemove',
    message0: 'Quando mover o mouse/dedo',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o "fazer" toda vez que o mouse/dedo se move. Use "x do mouse/dedo" e "y do mouse/dedo" para a posição atual.',
  },
  {
    type: 'sz_js_on_load',
    message0: 'Quando a página terminar de carregar',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o "fazer" quando a página termina de carregar (tudo já pronto na tela). Vira window.addEventListener("load", (event) => { ... }).',
  },
  {
    type: 'sz_js_on_resize',
    message0: 'Quando a janela mudar de tamanho',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o "fazer" quando a janela do navegador muda de tamanho. Vira window.addEventListener("resize", (event) => { ... }).',
  },
  // ---- Buscar elementos ----
  {
    type: 'sz_js_get_element_by_id',
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
    type: 'sz_js_query_selector',
    message0: 'Pegar elemento via seletor %1 e guardar em %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_input', name: 'NAME', text: 'caixa' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_js_query_selector_all',
    message0: 'Pegar TODOS os elementos via seletor %1 e guardar em %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '.item' },
      { type: 'field_input', name: 'NAME', text: 'itens' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    level: 'intermediario',
    tooltip:
      'Pega todos os elementos que casam com o seletor. Use "para cada item ... na lista" para percorrê-los.',
  },
  // ---- Ler/alterar conteúdo ----
  {
    type: 'sz_js_set_property_text',
    message0: 'Alterar %1 %2 %3 para %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['o texto', 'textContent'],
          ['o valor', 'value'],
          ['o conteúdo HTML', 'innerHTML'],
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
      { type: 'field_input', name: 'TARGET', text: 'saida' },
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
    message0: 'alterar %1 %2 %3 para o valor %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['o texto', 'textContent'],
          ['o valor', 'value'],
          ['o conteúdo HTML', 'innerHTML'],
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
      { type: 'field_input', name: 'TARGET', text: 'saida' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Escreve uma propriedade do elemento com qualquer valor (texto montado, conta, etc.). Use "juntar texto" para montar HTML.',
  },
  {
    type: 'sz_js_set_property_var',
    message0: 'Alterar %1 %2 %3 para o valor da variável %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['o texto', 'textContent'],
          ['o valor', 'value'],
          ['o conteúdo HTML', 'innerHTML'],
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
      { type: 'field_input', name: 'TARGET', text: 'saida' },
      { type: 'field_input', name: 'NAME', text: 'conteudo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Escreve o valor de uma variável numa propriedade do elemento (por id ou variável).',
  },
  {
    type: 'sz_js_set_property_calc',
    message0: 'Alterar %1 %2 %3 para %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['o texto', 'textContent'],
          ['o valor', 'value'],
          ['o conteúdo HTML', 'innerHTML'],
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
      { type: 'field_input', name: 'TARGET', text: 'saida' },
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
    message0: 'Pegar %1 %2 %3 e guardar em %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['o texto', 'textContent'],
          ['o valor', 'value'],
          ['o conteúdo HTML', 'innerHTML'],
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
      { type: 'field_input', name: 'TARGET', text: 'saida' },
      { type: 'field_input', name: 'NAME', text: 'conteudo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Lê uma propriedade (o texto ou o valor digitado) de um elemento por id ou variável e guarda numa variável.',
  },
  {
    // Legado: substituído por sz_js_set_property_text. Mantido (oculto da
    // paleta) para que projetos antigos salvos com este bloco ainda carreguem.
    type: 'sz_js_set_text',
    message0: 'Alterar texto do elemento id %1 para %2',
    args0: [
      { type: 'field_input', name: 'TARGET', text: 'saida' },
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
      { type: 'field_input', name: 'TARGET', text: 'meuElemento' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_js_set_dataset',
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
      { type: 'field_input', name: 'TARGET', text: 'elemento' },
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
    message0: 'criar elemento %1 e guardar em %2',
    args0: [
      { type: 'field_input', name: 'TAG', text: 'div' },
      { type: 'field_input', name: 'NAME', text: 'elemento' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cria um novo elemento HTML em memória e guarda numa variável.',
  },
  {
    type: 'sz_js_append_child',
    message0: 'dentro de %1 adicionar %2',
    args0: [
      { type: 'field_input', name: 'PARENT', text: 'pai' },
      { type: 'field_input', name: 'CHILD', text: 'filho' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Coloca um elemento dentro de outro.',
  },
]
