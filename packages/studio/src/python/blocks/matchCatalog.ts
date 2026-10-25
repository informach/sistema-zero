import type { PythonNode } from '../language/types'
import {
  bodySlot,
  listSlot,
  metadata,
  PYTHON_IDENTIFIER,
  requiredInput,
  shapeCount,
  textSlot,
  valueSlot,
} from './catalogHelpers'
import type { PythonBlockCodec } from './contract'
import { integer, isNode, name, node, nodes, pass, text } from './nodes'
import { PYTHON_MAX_ITEMS, pythonInputsByName, resizePythonShape } from './shapeControls'
import { structuralCodec } from './structuralCodec'

/**
 * `match` / `case`: the statement holds `case` pieces (a socket kind of their own) and each
 * case holds one pattern (another socket kind), so only a pattern fits after `case` and a
 * case only fits inside `match`, as in Python.
 */

const CATEGORY = 'Lógica e decisões'
const anything = () => node('MatchAs', { pattern: null, name: null })
const equalTo = (value: PythonNode) => node('MatchValue', { value })
const capture = (id: string) => node('MatchAs', { pattern: null, name: id })
const caseOf = (pattern: PythonNode, body: PythonNode[] = [pass()]) =>
  node('match_case', { pattern, guard: null, body })
const matchStatement = structuralCodec({
  ...metadata(
    'match',
    'escolher pelo valor',
    CATEGORY,
    3,
    'statement',
    'match valor: case …',
    'Compara o valor com cada caso, de cima para baixo, e faz só o primeiro que combinar. O caso "qualquer outro valor" (case _) pega o que nenhum outro pegou.',
  ),
  defaultNode: () =>
    node('Match', {
      subject: name('estado'),
      cases: [caseOf(equalTo(text('menu'))), caseOf(anything())],
    }),
  slots: [valueSlot('subject', 'valor'), { ...listSlot('cases', 'caso', 'case'), minimum: 1 }],
  accepts: (value) => nodes(value.fields.cases) && value.fields.cases.length > 0,
})

const caseClause = structuralCodec({
  ...metadata(
    'case',
    'caso',
    CATEGORY,
    3,
    'case',
    'case padrão if condição:',
    'Um caso de "escolher pelo valor": se o valor combinar com o padrão (e a condição "e se", quando houver, for verdadeira), faz os comandos de dentro.',
  ),
  defaultNode: () => caseOf(equalTo(text('menu'))),
  slots: [
    valueSlot('pattern', 'for', false, 'pattern'),
    valueSlot('guard', 'e se', true),
    bodySlot('body', 'fazer'),
  ],
})

const patterns: PythonBlockCodec[] = [
  structuralCodec({
    ...metadata(
      'case_value',
      'igual a',
      CATEGORY,
      3,
      'pattern',
      'case "texto" | case 10 | case Cor.VERMELHO',
      'Combina quando o valor é igual a este: um texto, um número ou uma constante com ponto, como Cor.VERMELHO. Uma variável sozinha não serve aqui: em Python, ela guardaria o valor em vez de comparar.',
    ),
    defaultNode: () => equalTo(text('menu')),
    // A bare variable here (`case x:`) would read back as a capture: the rendering step
    // reparses the code and refuses it, so the child sees the problem before running.
    slots: [valueSlot('value', 'valor')],
  }),
  {
    ...metadata(
      'case_singleton',
      'é exatamente',
      CATEGORY,
      3,
      'pattern',
      'case None | case True | case False',
      'Combina só com o próprio None, True ou False (comparação por identidade, como "é").',
    ),
    defaultNode: () => node('MatchSingleton', { value: null }),
    decode(value) {
      const constant = value.fields.value
      if (value.kind !== 'MatchSingleton' || !(constant === null || typeof constant === 'boolean'))
        return
      return {
        fields: [
          {
            name: 'VALUE',
            label: '',
            value: constant === null ? 'None' : constant ? 'True' : 'False',
            options: [
              ['nenhum valor (None)', 'None'],
              ['verdadeiro (True)', 'True'],
              ['falso (False)', 'False'],
            ],
          },
        ],
        inputs: [],
      }
    },
    encode(shape) {
      const value = shape.fields.find((item) => item.name === 'VALUE')?.value
      if (value !== 'None' && value !== 'True' && value !== 'False')
        throw new Error('Escolha None, True ou False.')
      return node('MatchSingleton', { value: value === 'None' ? null : value === 'True' })
    },
  },
  structuralCodec({
    ...metadata(
      'case_default',
      'qualquer outro valor',
      CATEGORY,
      3,
      'pattern',
      'case _',
      'Combina com qualquer valor. Use no último caso, para o que nenhum outro caso pegou.',
    ),
    defaultNode: anything,
    slots: [],
  }),
  structuralCodec({
    ...metadata(
      'case_capture',
      'guardar o valor em',
      CATEGORY,
      3,
      'pattern',
      'case nome | case padrão as nome',
      'Guarda o valor no nome escolhido para usar dentro do caso. Sozinho, combina com qualquer valor; com um padrão, só combina se o padrão combinar: case [x, y] as ponto.',
    ),
    defaultNode: () => capture('valor'),
    slots: [valueSlot('pattern', 'se combinar com', true, 'pattern'), textSlot('name', 'nome')],
  }),
  structuralCodec({
    ...metadata(
      'case_or',
      'um destes',
      CATEGORY,
      3,
      'pattern',
      'case "a" | "b"',
      'Combina se qualquer um dos padrões combinar, tentando da esquerda para a direita.',
    ),
    defaultNode: () => node('MatchOr', { patterns: [equalTo(text('sim')), equalTo(text('s'))] }),
    slots: [{ ...listSlot('patterns', 'padrão', 'pattern'), minimum: 2 }],
    accepts: (value) => nodes(value.fields.patterns) && value.fields.patterns.length >= 2,
  }),
  structuralCodec({
    ...metadata(
      'case_sequence',
      'lista com os itens',
      CATEGORY,
      3,
      'pattern',
      'case [x, y]',
      'Combina com uma lista ou tupla do mesmo tamanho, item a item. Um "o resto em" pega todos os itens que sobrarem.',
    ),
    defaultNode: () => node('MatchSequence', { patterns: [capture('x'), capture('y')] }),
    slots: [listSlot('patterns', 'item', 'pattern')],
  }),
  structuralCodec({
    ...metadata(
      'case_star',
      'o resto em',
      CATEGORY,
      3,
      'pattern',
      'case [primeiro, *resto]',
      'Dentro de "lista com os itens", pega todos os itens que sobrarem numa lista. Sem nome (*_), só os deixa de lado.',
    ),
    defaultNode: () => node('MatchStar', { name: 'resto' }),
    slots: [textSlot('name', 'guardar em', true)],
  }),
  {
    ...metadata(
      'case_mapping',
      'dicionário com as chaves',
      CATEGORY,
      3,
      'pattern',
      'case {"tipo": "moeda", **resto}',
      'Combina com um dicionário que tem estas chaves, cada valor combinando com o seu padrão. Outras chaves podem existir; "guardar o resto em" as junta num dicionário.',
    ),
    controls: [
      { key: 'count', label: 'chave', kind: 'count', minimum: 0, maximum: PYTHON_MAX_ITEMS },
      { key: 'rest:present', label: 'guardar o resto em', kind: 'optional' },
    ],
    defaultNode: () =>
      node('MatchMapping', {
        keys: [text('tipo')],
        patterns: [equalTo(text('moeda'))],
        rest: null,
      }),
    decode(value) {
      const { keys, patterns, rest } = value.fields
      if (
        value.kind !== 'MatchMapping' ||
        !nodes(keys) ||
        !nodes(patterns) ||
        keys.length !== patterns.length ||
        keys.length > PYTHON_MAX_ITEMS ||
        !(rest === null || typeof rest === 'string')
      )
        return
      return {
        fields: rest === null ? [] : [{ name: 'rest', label: 'guardar o resto em', value: rest }],
        inputs: keys.flatMap((key, i) => [
          { name: `key:${i}`, label: 'chave', role: 'value' as const, nodes: [key] },
          { name: `pattern:${i}`, label: 'valor', role: 'pattern' as const, nodes: [patterns[i]!] },
        ]),
        extra: { count: keys.length, 'rest:present': rest !== null },
      }
    },
    encode(shape) {
      const size = shapeCount(shape, 'count')
      const inputs = pythonInputsByName(shape)
      const present = shape.extra?.['rest:present']
      if (typeof present !== 'boolean') throw new Error('Opção do bloco Python inválida.')
      const rest = shape.fields.find((item) => item.name === 'rest')?.value
      if (present && (!rest || !PYTHON_IDENTIFIER.test(rest)))
        throw new Error('Escolha um nome para guardar o resto.')
      return node('MatchMapping', {
        keys: Array.from({ length: size }, (_, i) => requiredInput(inputs, `key:${i}`)),
        patterns: Array.from({ length: size }, (_, i) => requiredInput(inputs, `pattern:${i}`)),
        rest: present ? rest! : null,
      })
    },
    reshape(shape, key, value) {
      if (key === 'count' && typeof value === 'number')
        return resizePythonShape(shape, key, value, this.decode(this.defaultNode())!)
      if (key !== 'rest:present' || typeof value !== 'boolean')
        throw new Error('Opção desconhecida do bloco Python.')
      const result = structuredClone(shape)
      result.extra = { ...result.extra, [key]: value }
      result.fields = result.fields.filter((item) => item.name !== 'rest')
      if (value) result.fields.push({ name: 'rest', label: 'guardar o resto em', value: 'resto' })
      return result
    },
  },
  (() => {
    const prototype = () =>
      node('MatchClass', {
        cls: name('Ponto'),
        patterns: [anything()],
        kwd_attrs: ['x'],
        kwd_patterns: [equalTo(integer('0'))],
      })
    const codec: PythonBlockCodec = {
      ...metadata(
        'case_class',
        'objeto da classe',
        CATEGORY,
        3,
        'pattern',
        'case Ponto(x=0)',
        'Combina com um objeto desta classe cujos atributos combinam com os seus padrões: case Ponto(x=0) pega os pontos com x igual a zero. Os itens sem nome seguem a ordem que a classe define.',
      ),
      controls: [
        {
          key: 'patterns:count',
          label: 'item',
          kind: 'count',
          minimum: 0,
          maximum: PYTHON_MAX_ITEMS,
        },
        {
          key: 'kwd:count',
          label: 'atributo',
          kind: 'count',
          minimum: 0,
          maximum: PYTHON_MAX_ITEMS,
        },
      ],
      defaultNode: () =>
        node('MatchClass', {
          cls: name('Ponto'),
          patterns: [],
          kwd_attrs: ['x'],
          kwd_patterns: [equalTo(integer('0'))],
        }),
      decode(value) {
        const { cls, patterns, kwd_attrs, kwd_patterns } = value.fields
        if (
          value.kind !== 'MatchClass' ||
          !isNode(cls) ||
          !(cls.kind === 'Name' || cls.kind === 'Attribute') ||
          !nodes(patterns) ||
          !nodes(kwd_patterns) ||
          !Array.isArray(kwd_attrs) ||
          !kwd_attrs.every((item) => typeof item === 'string') ||
          kwd_attrs.length !== kwd_patterns.length ||
          patterns.length > PYTHON_MAX_ITEMS ||
          kwd_attrs.length > PYTHON_MAX_ITEMS
        )
          return
        return {
          fields: (kwd_attrs as string[]).map((attr, i) => ({
            name: `kwd_attrs:${i}`,
            label: 'atributo',
            value: attr,
          })),
          inputs: [
            { name: 'cls', label: 'classe', role: 'value', nodes: [cls] },
            ...patterns.map((item, i) => ({
              name: `patterns:${i}`,
              label: `item ${i + 1}`,
              role: 'pattern' as const,
              nodes: [item],
            })),
            ...kwd_patterns.map((item, i) => ({
              name: `kwd_patterns:${i}`,
              label: 'combina com',
              role: 'pattern' as const,
              nodes: [item],
            })),
          ],
          extra: { 'patterns:count': patterns.length, 'kwd:count': kwd_attrs.length },
        }
      },
      encode(shape) {
        const inputs = pythonInputsByName(shape)
        const positional = shapeCount(shape, 'patterns:count')
        const named = shapeCount(shape, 'kwd:count')
        const fields = new Map(shape.fields.map((item) => [item.name, item.value]))
        const attrs = Array.from({ length: named }, (_, i) => fields.get(`kwd_attrs:${i}`) ?? '')
        if (attrs.some((attr) => !PYTHON_IDENTIFIER.test(attr)))
          throw new Error('Escreva o nome de cada atributo.')
        const cls = requiredInput(inputs, 'cls')
        if (cls.kind !== 'Name' && cls.kind !== 'Attribute')
          throw new Error('Escolha o nome de uma classe.')
        return node('MatchClass', {
          cls,
          patterns: Array.from({ length: positional }, (_, i) =>
            requiredInput(inputs, `patterns:${i}`),
          ),
          kwd_attrs: attrs,
          kwd_patterns: Array.from({ length: named }, (_, i) =>
            requiredInput(inputs, `kwd_patterns:${i}`),
          ),
        })
      },
      reshape(shape, key, value) {
        if (typeof value !== 'number') throw new Error('Quantidade de entradas inválida.')
        const model = codec.decode(prototype())!
        if (key === 'patterns:count')
          return resizePythonShape(shape, key, value, model, ['patterns'])
        if (key === 'kwd:count')
          return resizePythonShape(shape, key, value, model, ['kwd_attrs', 'kwd_patterns'])
        throw new Error('Opção desconhecida do bloco Python.')
      },
    }
    return codec
  })(),
]

export const PYTHON_MATCH_BLOCK_CODECS: readonly PythonBlockCodec[] = [
  matchStatement,
  caseClause,
  ...patterns,
]
