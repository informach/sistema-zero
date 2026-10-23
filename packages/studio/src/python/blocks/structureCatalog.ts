import type { PythonBlockCodec, PythonBlockRole, PythonCategory } from './contract'
import {
  attribute,
  boolean,
  call,
  integer,
  isNode,
  name,
  node,
  none,
  pass,
  text,
  withTargetContext,
} from './nodes'
import { type StructuralSlot, structuralCodec } from './structuralCodec'

const metadata = (
  id: string,
  title: string,
  category: PythonCategory,
  level: 1 | 2 | 3,
  role: PythonBlockRole,
  api: string,
  help: string,
) => ({ id: `sz_py_${id}`, owner: 'programming' as const, title, category, level, role, api, help })
const value = (field: string, label: string, optional = false): StructuralSlot => ({
  field,
  label,
  kind: 'node',
  role: 'value',
  optional,
})
const list = (field: string, label: string, role: PythonBlockRole = 'value'): StructuralSlot => ({
  field,
  label,
  kind: 'list',
  role,
})
const body = (
  field: string,
  label: string,
  role: PythonBlockRole = 'statement',
): StructuralSlot => ({
  field,
  label,
  kind: 'body',
  role,
  empty: field === 'body' && role === 'statement' ? 'pass' : undefined,
})
const word = (field: string, label: string, optional = false): StructuralSlot => ({
  field,
  label,
  kind: 'text',
  role: 'value',
  optional,
})

const structures: PythonBlockCodec[] = [
  structuralCodec({
    ...metadata(
      'if',
      'se',
      'Lógica e decisões',
      1,
      'statement',
      'if / elif / else',
      'Executa os comandos conforme a condição. Um se dentro do senão corresponde a elif.',
    ),
    defaultNode: () => node('If', { test: boolean(), body: [pass()], orelse: [] }),
    slots: [value('test', 'condição'), body('body', 'então'), body('orelse', 'senão')],
  }),
  structuralCodec({
    ...metadata(
      'while',
      'enquanto',
      'Repetições',
      2,
      'statement',
      'while',
      'Repete enquanto a condição for verdadeira. O senão roda se a repetição terminar sem break.',
    ),
    defaultNode: () => node('While', { test: boolean(), body: [pass()], orelse: [] }),
    slots: [
      value('test', 'condição'),
      body('body', 'repetir'),
      body('orelse', 'ao terminar sem sair'),
    ],
  }),
  (() => {
    const codec = structuralCodec({
      ...metadata(
        'for',
        'para cada',
        'Repetições',
        1,
        'statement',
        'for / range',
        'Percorre os itens na ordem Python. range inclui o início e não inclui o limite final.',
      ),
      defaultNode: () =>
        node('For', {
          target: name('i', 'Store'),
          iter: call(name('range'), [integer('10')]),
          body: [pass()],
          orelse: [],
          type_comment: null,
        }),
      slots: [
        value('target', 'guardar item em'),
        value('iter', 'percorrer'),
        body('body', 'repetir'),
        body('orelse', 'ao terminar sem sair'),
      ],
    })
    return {
      ...codec,
      encode(shape) {
        const result = codec.encode(shape)
        if (!isNode(result.fields.target)) throw new Error('Destino inválido.')
        result.fields.target = withTargetContext(result.fields.target, 'Store')
        return result
      },
    } satisfies PythonBlockCodec
  })(),
  ...(['List', 'Tuple', 'Set'] as const).map((kind) =>
    structuralCodec({
      ...metadata(
        kind.toLowerCase(),
        kind === 'List' ? 'lista' : kind === 'Tuple' ? 'tupla' : 'conjunto',
        'Listas e coleções',
        kind === 'List' ? 1 : 2,
        'value',
        kind,
        kind === 'List'
          ? 'Uma coleção ordenada que pode ser alterada. O primeiro índice é zero.'
          : kind === 'Tuple'
            ? 'Uma coleção ordenada cujos itens não podem ser alterados.'
            : 'Uma coleção de valores únicos, sem ordem de índices.',
      ),
      defaultNode: () =>
        node(kind, { elts: [integer('1')], ...(kind === 'Set' ? {} : { ctx: node('Load') }) }),
      slots: [list('elts', 'item')],
      contexts: kind === 'Set' ? undefined : ['Load', 'Store', 'Del'],
      accepts:
        kind === 'Set'
          ? (value) => Array.isArray(value.fields.elts) && value.fields.elts.length > 0
          : undefined,
    }),
  ),
  structuralCodec({
    ...metadata(
      'subscript',
      'item da coleção',
      'Listas e coleções',
      1,
      'value',
      'collection[index]',
      'Consulta um índice ou uma chave. Em listas e tuplas, o primeiro índice é zero.',
    ),
    defaultNode: () =>
      node('Subscript', { value: name('lista'), slice: integer('0'), ctx: node('Load') }),
    slots: [value('value', 'coleção'), value('slice', 'índice ou chave')],
    contexts: ['Load', 'Store', 'Del'],
  }),
  structuralCodec({
    ...metadata(
      'attribute',
      'atributo do objeto',
      'Classes e objetos',
      3,
      'value',
      'object.attribute',
      'Lê um atributo ou um método do objeto.',
    ),
    defaultNode: () => attribute(name('self'), 'pontos'),
    slots: [value('value', 'objeto'), word('attr', 'atributo')],
    contexts: ['Load', 'Store', 'Del'],
  }),
  structuralCodec({
    ...metadata(
      'call',
      'chamar função',
      'Funções',
      2,
      'value',
      'function(*args, **kwargs)',
      'Chama uma função ou método e devolve seu resultado. Argumentos nomeados ficam depois dos posicionais.',
    ),
    defaultNode: () => call(name('minha_funcao'), [], []),
    slots: [
      value('func', 'função'),
      list('args', 'argumento'),
      list('keywords', 'argumento nomeado', 'keyword'),
    ],
  }),
  structuralCodec({
    ...metadata(
      'keyword',
      'argumento nomeado',
      'Funções',
      2,
      'keyword',
      'name=value',
      'Passa um valor pelo nome do parâmetro.',
    ),
    defaultNode: () => node('keyword', { arg: 'valor', value: integer('1') }),
    slots: [word('arg', 'nome'), value('value', 'valor')],
  }),
  structuralCodec({
    ...metadata(
      'return',
      'devolver resultado',
      'Funções',
      2,
      'statement',
      'return',
      'Encerra a função e devolve um resultado. Sem valor, devolve None.',
    ),
    defaultNode: () => node('Return', { value: none() }),
    slots: [value('value', 'resultado', true)],
  }),
  structuralCodec({
    ...metadata(
      'alias',
      'módulo e apelido',
      'Módulos',
      2,
      'alias',
      'name as alias',
      'Conserva o nome oficial importado e permite usar um apelido no código.',
    ),
    defaultNode: () => node('alias', { name: 'math', asname: null }),
    slots: [word('name', 'nome oficial'), word('asname', 'apelido', true)],
  }),
  structuralCodec({
    ...metadata(
      'import',
      'importar módulo',
      'Módulos',
      2,
      'statement',
      'import',
      'Importa um módulo disponível no ambiente ou um arquivo do projeto.',
    ),
    defaultNode: () => node('Import', { names: [node('alias', { name: 'math', asname: null })] }),
    slots: [list('names', 'módulo', 'alias')],
  }),
  structuralCodec({
    ...metadata(
      'import_from',
      'importar de um módulo',
      'Módulos',
      2,
      'statement',
      'from module import name',
      'Importa nomes específicos de um módulo disponível.',
    ),
    defaultNode: () =>
      node('ImportFrom', {
        module: 'math',
        names: [node('alias', { name: 'sqrt', asname: null })],
        level: { literal: 'int', value: '0' },
      }),
    slots: [word('module', 'módulo'), list('names', 'nome', 'alias')],
  }),
  structuralCodec({
    ...metadata(
      'try',
      'tentar e tratar erros',
      'Tratamento de erros',
      3,
      'statement',
      'try / except / else / finally',
      'Trata os tipos de erro escolhidos. Senão roda quando não houve erro; por fim roda sempre.',
    ),
    defaultNode: () =>
      node('Try', {
        body: [pass()],
        handlers: [
          node('ExceptHandler', { type: name('ValueError'), name: 'erro', body: [pass()] }),
        ],
        orelse: [],
        finalbody: [],
      }),
    slots: [
      body('body', 'tentar'),
      list('handlers', 'tratar', 'handler'),
      body('orelse', 'se deu certo'),
      body('finalbody', 'por fim'),
    ],
  }),
  structuralCodec({
    ...metadata(
      'except',
      'quando acontecer um erro',
      'Tratamento de erros',
      3,
      'handler',
      'except Error as name',
      'Escolha o tipo de exceção que quer tratar. O apelido recebe o objeto do erro.',
    ),
    defaultNode: () =>
      node('ExceptHandler', { type: name('ValueError'), name: 'erro', body: [pass()] }),
    slots: [value('type', 'tipo do erro'), word('name', 'apelido', true), body('body', 'fazer')],
  }),
  structuralCodec({
    ...metadata(
      'raise',
      'avisar um erro',
      'Tratamento de erros',
      3,
      'statement',
      'raise',
      'Lança uma exceção. Sem valor, relança o erro que está sendo tratado.',
    ),
    defaultNode: () =>
      node('Raise', { exc: call(name('ValueError'), [text('Valor inválido')]), cause: null }),
    slots: [value('exc', 'erro', true), value('cause', 'causado por', true)],
  }),
]

export const PYTHON_STRUCTURE_BLOCK_CODECS: readonly PythonBlockCodec[] = structures
