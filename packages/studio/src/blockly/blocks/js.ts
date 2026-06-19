import { CATEGORY_COLORS } from '../theme'
import type { BlockDefinition } from './types'

const C = CATEGORY_COLORS.js

/**
 * Blocos da LINGUAGEM JavaScript: variáveis, console/alert, controle de fluxo,
 * listas, timers e Web APIs (storage/fetch). A MANIPULAÇÃO DO DOM (eventos,
 * busca de elementos, propriedades, classes, criação) vive em `dom.ts`
 * (categoria "DOM", entre CSS e JavaScript na toolbox).
 */
export const JS_BLOCKS: BlockDefinition[] = [
  {
    type: 'sz_js_array_push',
    message0: 'na lista %1 adicionar %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'lista' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Acrescenta um valor ao fim da lista.',
  },
  {
    type: 'sz_js_array_remove',
    message0: 'na lista %1 remover o %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'lista' },
      {
        type: 'field_dropdown',
        name: 'END',
        options: [
          ['último', 'pop'],
          ['primeiro', 'shift'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Remove o último ou o primeiro item da lista.',
  },
  {
    type: 'sz_js_array_splice',
    message0: 'na lista %1 remover %2 item(ns) a partir da posição %3',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'lista' },
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
      { type: 'input_value', name: 'START', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Remove uma quantidade de itens da lista a partir de uma posição.',
  },
  {
    type: 'sz_js_console_log_text',
    message0: 'Mostrar texto no console %1',
    args0: [{ type: 'field_input', name: 'VALUE', text: 'Olá' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_js_console_log_var',
    message0: 'Mostrar valor da variável %1 no console',
    args0: [{ type: 'field_input', name: 'NAME', text: 'contador' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_js_alert_text',
    message0: 'Mostrar aviso com texto %1',
    args0: [{ type: 'field_input', name: 'VALUE', text: 'Olá!' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Mostra uma janelinha de aviso na tela.',
  },
  {
    type: 'sz_js_alert_var',
    message0: 'Mostrar aviso com valor da variável %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'contador' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Mostra uma janelinha de aviso com o valor de uma variável.',
  },
  {
    type: 'sz_js_var_declare',
    message0: 'declarar variável %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'x' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Declara uma variável sem valor inicial.',
  },
  {
    type: 'sz_js_var_create',
    message0: 'Criar variável %1 com valor %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'contador' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cria uma variável e guarda nela um valor — número, conta, aleatório, etc.',
  },
  {
    type: 'sz_js_const_create',
    message0: 'Criar constante %1 com valor %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'PI' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cria uma constante: um valor que não muda depois de criado.',
  },
  {
    type: 'sz_js_var_assign',
    message0: 'Alterar variável %1 para %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'contador' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Muda o valor de uma variável que já existe.',
  },
  {
    type: 'sz_js_var_increment',
    message0: 'Somar %1 em variável %2',
    args0: [
      { type: 'field_number', name: 'DELTA', value: 1 },
      { type: 'field_input', name: 'NAME', text: 'contador' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_js_if_else',
    message0: 'Se %1',
    args0: [{ type: 'input_value', name: 'COND', check: 'JSValue' }],
    message1: 'então %1',
    args1: [{ type: 'input_statement', name: 'THEN' }],
    message2: 'senão %1',
    args2: [{ type: 'input_statement', name: 'ELSE' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Executa o "então" quando a condição for verdadeira; senão, o "senão".',
  },
  {
    type: 'sz_js_repeat',
    message0: 'Repetir %1 vezes',
    args0: [{ type: 'field_number', name: 'TIMES', value: 5, min: 0 }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_js_while',
    message0: 'enquanto %1',
    args0: [{ type: 'input_value', name: 'COND', check: 'JSValue' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    level: 'intermediario',
    tooltip:
      'Repete o "fazer" enquanto a condição for verdadeira. Garanta que a condição um dia fique falsa, senão o laço não termina.',
  },
  {
    type: 'sz_js_do_while',
    message0: 'fazer %1',
    args0: [{ type: 'input_statement', name: 'DO' }],
    message1: 'enquanto %1',
    args1: [{ type: 'input_value', name: 'COND', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    level: 'intermediario',
    tooltip: 'Executa o "fazer" pelo menos uma vez e repete enquanto a condição for verdadeira.',
  },
  {
    type: 'sz_js_break',
    message0: 'sair do laço',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    level: 'intermediario',
    tooltip: 'Interrompe o laço (loop) atual imediatamente.',
  },
  {
    type: 'sz_js_continue',
    message0: 'pular para a próxima volta',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    level: 'intermediario',
    tooltip: 'Pula o resto desta volta e vai direto para a próxima repetição do laço.',
  },
  {
    type: 'sz_js_for_of',
    message0: 'para cada %1 de %2',
    args0: [
      { type: 'field_input', name: 'ITEM', text: 'item' },
      { type: 'field_input', name: 'NAME', text: 'lista' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    level: 'intermediario',
    tooltip:
      'Percorre cada item de uma lista. Sem posição/índice — use "para cada item" se precisar do índice.',
  },
  {
    type: 'sz_js_for_range',
    message0: 'contar %1 de %2 até %3 (passo %4)',
    args0: [
      { type: 'field_input', name: 'VAR', text: 'i' },
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
      { type: 'input_value', name: 'STEP', check: 'JSValue' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    level: 'intermediario',
    tooltip: 'Laço de contagem: vai de "de" até "até" (exclusivo) somando o passo a cada volta.',
  },
  {
    type: 'sz_js_try_catch',
    message0: 'tentar %1',
    args0: [{ type: 'input_statement', name: 'BODY' }],
    message1: 'se der erro %1 fazer %2',
    args1: [
      { type: 'field_input', name: 'ERR', text: 'erro' },
      { type: 'input_statement', name: 'HANDLER' },
    ],
    message2: 'no fim, sempre %1',
    args2: [{ type: 'input_statement', name: 'FINALLY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    level: 'avancado',
    tooltip:
      'Tenta executar o "tentar"; se acontecer um erro, executa o "se der erro" (com a mensagem na variável); o "no fim" roda sempre. Deixe o "no fim" vazio se não precisar.',
  },
  {
    type: 'sz_js_for_each',
    message0: 'para cada item %1 (posição %2) na lista %3',
    args0: [
      { type: 'field_input', name: 'ITEM', text: 'item' },
      { type: 'field_input', name: 'INDEX', text: '' },
      { type: 'field_input', name: 'NAME', text: 'lista' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Repete o "fazer" para cada item da lista. Deixe a posição em branco se não precisar dela.',
  },
  {
    type: 'sz_js_set_timeout',
    message0: 'depois de %1 ms',
    args0: [{ type: 'input_value', name: 'MS', check: 'JSValue' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Espera um tempo (em milissegundos) e então executa o "fazer".',
  },
  {
    type: 'sz_js_set_interval',
    message0: 'repetir a cada %1 ms',
    args0: [{ type: 'input_value', name: 'MS', check: 'JSValue' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Repete o "fazer" a cada intervalo de tempo em milissegundos.',
  },
  {
    type: 'sz_js_storage_set',
    message0: 'guardar em %1 a chave %2 com o valor %3',
    args0: [
      {
        type: 'field_dropdown',
        name: 'STORE',
        options: [
          ['permanente (fica entre visitas)', 'local'],
          ['só nesta sessão (zera ao fechar)', 'session'],
        ],
      },
      { type: 'field_input', name: 'KEY', text: 'nome' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    level: 'iniciante',
    tooltip:
      'Salva um valor no navegador. O permanente fica salvo entre visitas; o da sessão só vale nesta aba.',
  },
  {
    type: 'sz_js_fetch_json',
    message0: 'buscar JSON da URL %1',
    args0: [{ type: 'field_input', name: 'URL', text: 'https://api.exemplo.com/dados' }],
    message1: 'quando chegar, guardar em %1 e fazer %2',
    args1: [
      { type: 'field_input', name: 'OK', text: 'dados' },
      { type: 'input_statement', name: 'BODY' },
    ],
    message2: 'se der erro, guardar em %1 e fazer %2',
    args2: [
      { type: 'field_input', name: 'ERR', text: 'erro' },
      { type: 'input_statement', name: 'CATCH' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    level: 'avancado',
    tooltip:
      'Busca dados de uma URL e converte para JSON. Os dados ficam na variável "quando chegar"; um erro fica na variável "se der erro". Precisa de permissão de rede no preview (o professor libera a origem).',
  },
]

/**
 * Sub-categorias da LINGUAGEM JavaScript (à la Scratch/MakeCode): cada grupo tem
 * ÍCONE e uma cor da FAMÍLIA do JS (tons de amarelo/âmbar/ouro), preservando a
 * identidade "JS é amarelo". Cada bloco herda a cor do grupo. (Não há grupo de
 * "Texto" porque os valores de texto vivem na categoria "Valores".)
 */
export const JS_GROUPS: { name: string; colour: string; types: string[] }[] = [
  {
    name: '🏷️ Variáveis',
    colour: '#fbbf24',
    types: [
      'sz_js_var_declare',
      'sz_js_var_create',
      'sz_js_const_create',
      'sz_js_var_assign',
      'sz_js_var_increment',
    ],
  },
  { name: '❓ Lógica & Se', colour: '#fde047', types: ['sz_js_if_else', 'sz_js_try_catch'] },
  {
    name: '🔁 Repetições',
    colour: '#facc15',
    types: [
      'sz_js_repeat',
      'sz_js_while',
      'sz_js_do_while',
      'sz_js_break',
      'sz_js_continue',
      'sz_js_for_of',
      'sz_js_for_range',
      'sz_js_for_each',
      'sz_js_set_timeout',
      'sz_js_set_interval',
    ],
  },
  {
    name: '📋 Listas',
    colour: '#eab308',
    types: ['sz_js_array_push', 'sz_js_array_remove', 'sz_js_array_splice'],
  },
  {
    name: '🖥️ Console & Avisos',
    colour: '#fcd34d',
    types: [
      'sz_js_console_log_text',
      'sz_js_console_log_var',
      'sz_js_alert_text',
      'sz_js_alert_var',
    ],
  },
  { name: '💾 Dados & Web', colour: '#ca8a04', types: ['sz_js_storage_set', 'sz_js_fetch_json'] },
]

// Cor = navegação: pinta cada bloco com a cor do seu grupo.
const JS_COLOUR_BY_TYPE = new Map<string, string>(
  JS_GROUPS.flatMap((g) => g.types.map((t) => [t, g.colour] as const)),
)
for (const b of JS_BLOCKS) {
  const colour = JS_COLOUR_BY_TYPE.get(b.type)
  if (colour) b.colour = colour
}
