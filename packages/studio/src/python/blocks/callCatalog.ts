import type { PythonNode } from '../language/types'
import { optional, type PythonApiSpec, pythonApiCallCodec, required } from './apiCallCodec'
import { metadata } from './catalogHelpers'
import type {
  PythonBlockCodec,
  PythonBlockInput,
  PythonCategory,
  PythonReceiverKind,
} from './contract'
import { attribute, boolean, call, integer, isNode, name, node, nodes, text } from './nodes'
import { samePythonValue } from './semantic'

const n = (value: number) => () => integer(String(value))
const t = (value: string) => () => text(value)
const v = (value: string) => () => name(value)

type Spec = Omit<PythonApiSpec, 'owner' | 'id'> & { id: string }
const programming = (spec: Spec): PythonBlockCodec =>
  pythonApiCallCodec({ ...spec, id: `sz_py_${spec.id}`, owner: 'programming' })
const builtin = (path: string) => ({ kind: 'path' as const, path: [path] })
const moduleCall = (module: string, ...names: string[]) => ({
  kind: 'module' as const,
  module,
  names,
})
const method = (
  names: string[],
  receiver: {
    label: string
    default(): PythonNode
    kinds: PythonReceiverKind[]
  },
) => ({ kind: 'method' as const, names, receiver })
const LIST = { label: 'lista', default: v('lista'), kinds: ['List' as const] }
/** append/insert are taught on any receiver: lists often live in dicts, objects and lists. */
const ANY_LIST = { label: 'lista', default: v('lista'), any: true }
/** A file is proven by `with open(...) as arquivo` (or `arquivo = open(...)`). */
const FILE = { label: 'arquivo', default: v('arquivo'), kinds: ['file' as const] }
const TEXT = { label: 'texto', default: v('texto'), kinds: ['text' as const] }
const DICT = { label: 'dicionário', default: v('dados'), kinds: ['Dict' as const] }

/** `range(fim)`, `range(início, fim)` and `range(início, fim, passo)` with their own labels. */
const RANGE_LABELS = [['até'], ['de', 'até'], ['de', 'até', 'pulando']] as const
const rangeCodec: PythonBlockCodec = {
  ...metadata(
    'range',
    'contar',
    'Repetições',
    1,
    'value',
    'range(fim) / range(início, fim, passo)',
    'Os números de 0 até antes do fim. Com início, começa nele; com passo, pula de tantos em tantos.',
  ),
  binding: { root: 'range' },
  match: { kinds: ['Call'], names: ['range'] },
  controls: [{ key: 'args:count', label: 'número', kind: 'count', minimum: 1, maximum: 3 }],
  defaultNode: () => call(name('range'), [integer('10')]),
  decode(value) {
    const { func, args, keywords } = value.fields
    if (
      value.kind !== 'Call' ||
      !isNode(func) ||
      func.kind !== 'Name' ||
      func.fields.id !== 'range' ||
      !nodes(args) ||
      args.length < 1 ||
      args.length > 3 ||
      args.some((arg) => arg.kind === 'Starred') ||
      !nodes(keywords) ||
      keywords.length ||
      !isNode(func.fields.ctx) ||
      func.fields.ctx.kind !== 'Load'
    )
      return
    const labels = RANGE_LABELS[args.length - 1]!
    return {
      fields: [],
      inputs: args.map((arg, index) => ({
        name: `args:${index}`,
        label: labels[index]!,
        role: 'value' as const,
        nodes: [arg],
      })),
      extra: { 'args:count': args.length },
    }
  },
  encode(shape) {
    const count = Number(shape.extra?.['args:count'] ?? 1)
    if (![1, 2, 3].includes(count)) throw new Error('Use de um a três números.')
    const args = Array.from({ length: count }, (_, index) => {
      const found = shape.inputs.find((item) => item.name === `args:${index}`)
      if (found?.nodes.length !== 1) throw new Error('Preencha os números de contar.')
      return found.nodes[0]!
    })
    return call(name('range'), args)
  },
  reshape(shape, key, value) {
    if (key !== 'args:count' || typeof value !== 'number' || value < 1 || value > 3)
      throw new Error('Use de um a três números.')
    const old = shape.inputs
    // Going from "até 10" to "de 0 até 10" keeps the end value in the "até" socket.
    const values: PythonNode[] =
      old.length === 1 && value > 1
        ? [integer('0'), old[0]!.nodes[0]!, ...(value === 3 ? [integer('1')] : [])]
        : old.length > 1 && value === 1
          ? [old[1]!.nodes[0]!]
          : [...old.map((item) => item.nodes[0]!), integer('1')].slice(0, value)
    const labels = RANGE_LABELS[value - 1]!
    const inputs: PythonBlockInput[] = values.map((item, index) => ({
      name: `args:${index}`,
      label: labels[index]!,
      role: 'value',
      nodes: [item],
    }))
    return { fields: [], inputs, extra: { ...shape.extra, 'args:count': value } }
  },
}

const specs: Spec[] = [
  // Entrada e saída
  {
    id: 'print',
    title: 'mostrar',
    category: 'Entrada e saída',
    level: 1,
    role: 'statement',
    callee: builtin('print'),
    api: 'print(*valores, sep=" ", end="\\n")',
    help: 'Mostra valores no console. Com vários valores, põe um espaço entre eles (ou o separador escolhido).',
    params: [optional('sep', 'separador', t(' '), 'kw'), optional('end', 'no fim', t('\n'), 'kw')],
    variadic: { label: 'valor', defaults: () => [text('Olá!')] },
  },
  {
    id: 'input',
    title: 'perguntar',
    category: 'Entrada e saída',
    level: 1,
    role: 'value',
    callee: builtin('input'),
    api: 'input(pergunta)',
    help: 'Espera a resposta digitada no console e devolve um texto. Para usar como número, converta com "número inteiro de".',
    params: [
      { ...optional('prompt', 'pergunta', t('Como você se chama? '), 'pos'), initial: true },
    ],
  },
  // Números e matemática
  {
    id: 'int',
    title: 'número inteiro de',
    category: 'Números e matemática',
    level: 1,
    role: 'value',
    callee: builtin('int'),
    api: 'int(valor)',
    help: 'Transforma um texto como "12" (ou um decimal) em número inteiro.',
    params: [required('x', 'valor', t('10'), 'pos'), optional('base', 'base', n(10))],
  },
  {
    id: 'float_call',
    title: 'número decimal de',
    category: 'Números e matemática',
    level: 2,
    role: 'value',
    callee: builtin('float'),
    api: 'float(valor)',
    help: 'Transforma um texto como "2.5" em número decimal. Use ponto, não vírgula.',
    params: [required('x', 'valor', t('2.5'), 'pos')],
  },
  {
    id: 'random_randint',
    title: 'sortear um número de',
    category: 'Números e matemática',
    level: 1,
    role: 'value',
    callee: moduleCall('random', 'randint'),
    api: 'random.randint(a, b)',
    help: 'Um número inteiro sorteado, incluindo os dois limites. Precisa de "usar o módulo random".',
    params: [required('a', '', n(1)), required('b', 'até', n(6))],
    dependencies: ['sz_py_import_one'],
  },
  {
    id: 'random_random',
    title: 'sortear um decimal entre 0 e 1',
    category: 'Números e matemática',
    level: 2,
    role: 'value',
    callee: moduleCall('random', 'random'),
    api: 'random.random()',
    help: 'Um número decimal sorteado, de 0 até quase 1. Bom para chances: menor que 0.3 acontece 30% das vezes.',
    params: [],
    dependencies: ['sz_py_import_one'],
  },
  {
    id: 'random_uniform',
    title: 'sortear um decimal de',
    category: 'Números e matemática',
    level: 2,
    role: 'value',
    callee: moduleCall('random', 'uniform'),
    api: 'random.uniform(a, b)',
    help: 'Um número decimal sorteado entre os dois limites.',
    params: [required('a', '', n(0)), required('b', 'até', n(10))],
    dependencies: ['sz_py_import_one'],
  },
  {
    id: 'abs',
    title: 'sem o sinal',
    category: 'Números e matemática',
    level: 1,
    role: 'value',
    callee: builtin('abs'),
    api: 'abs(número)',
    help: 'O número sem o sinal de menos: -5 vira 5. É a distância até zero.',
    params: [
      required(
        'x',
        'número',
        () => node('UnaryOp', { op: node('USub'), operand: integer('5') }),
        'pos',
      ),
    ],
  },
  {
    id: 'round',
    title: 'arredondar',
    category: 'Números e matemática',
    level: 2,
    role: 'value',
    callee: builtin('round'),
    api: 'round(número, casas)',
    help: 'Arredonda para o inteiro mais perto, ou para o número de casas decimais escolhido.',
    params: [
      required('number', 'número', () =>
        node('Constant', {
          value: { literal: 'float', value: '0x1.4000000000000p+1' },
          kind: null,
        }),
      ),
      optional('ndigits', 'casas', n(1)),
    ],
  },
  {
    id: 'min',
    title: 'o menor de',
    category: 'Números e matemática',
    level: 1,
    role: 'value',
    callee: builtin('min'),
    api: 'min(valores)',
    help: 'O menor valor entre os escolhidos (ou entre os itens de uma lista).',
    params: [],
    variadic: { label: 'valor', minimum: 1, defaults: () => [integer('3'), integer('7')] },
  },
  {
    id: 'max',
    title: 'o maior de',
    category: 'Números e matemática',
    level: 1,
    role: 'value',
    callee: builtin('max'),
    api: 'max(valores)',
    help: 'O maior valor entre os escolhidos (ou entre os itens de uma lista).',
    params: [],
    variadic: { label: 'valor', minimum: 1, defaults: () => [integer('3'), integer('7')] },
  },
  ...(
    [
      ['sqrt', 'raiz quadrada de', 'math.sqrt(x)', 'A raiz quadrada: 9 dá 3.', 9],
      ['floor', 'arredondar para baixo', 'math.floor(x)', 'O inteiro logo abaixo: 2.7 dá 2.', 2],
      ['ceil', 'arredondar para cima', 'math.ceil(x)', 'O inteiro logo acima: 2.1 dá 3.', 2],
      [
        'sin',
        'seno de',
        'math.sin(ângulo)',
        'O seno de um ângulo em radianos. Use "radianos de" para converter graus.',
        0,
      ],
      [
        'cos',
        'cosseno de',
        'math.cos(ângulo)',
        'O cosseno de um ângulo em radianos. Use "radianos de" para converter graus.',
        0,
      ],
      [
        'radians',
        'radianos de',
        'math.radians(graus)',
        'Converte graus em radianos: 180 graus são pi radianos.',
        90,
      ],
      ['degrees', 'graus de', 'math.degrees(radianos)', 'Converte radianos em graus.', 1],
    ] as const
  ).map(
    ([fn, title, api, help, value]): Spec => ({
      id: `math_${fn}`,
      title,
      category: 'Números e matemática',
      level: 2,
      role: 'value',
      callee: moduleCall('math', fn),
      api,
      help: `${help} Precisa de "usar o módulo math".`,
      params: [required('x', '', n(value), 'pos')],
      dependencies: ['sz_py_import_one'],
    }),
  ),
  {
    id: 'math_atan2',
    title: 'ângulo de',
    category: 'Números e matemática',
    level: 3,
    role: 'value',
    callee: moduleCall('math', 'atan2'),
    api: 'math.atan2(y, x)',
    help: 'O ângulo (em radianos) de uma direção y, x. Ótimo para mirar: o ângulo de dy, dx.',
    params: [required('y', 'y', n(1), 'pos'), required('x', 'x', n(1), 'pos')],
    dependencies: ['sz_py_import_one'],
  },
  {
    id: 'math_hypot',
    title: 'distância de',
    category: 'Números e matemática',
    level: 3,
    role: 'value',
    callee: moduleCall('math', 'hypot'),
    api: 'math.hypot(dx, dy)',
    help: 'O tamanho de uma diagonal: a distância de dx, dy (como no teorema de Pitágoras).',
    params: [],
    variadic: { label: 'medida', minimum: 1, defaults: () => [integer('3'), integer('4')] },
    dependencies: ['sz_py_import_one'],
  },
  {
    id: 'time_time',
    title: 'segundos no relógio',
    category: 'Números e matemática',
    level: 2,
    role: 'value',
    callee: moduleCall('time', 'time'),
    api: 'time.time()',
    help: 'Os segundos contados por um relógio. Subtraia duas leituras para saber quanto tempo passou. Precisa de "usar o módulo time".',
    params: [],
    dependencies: ['sz_py_import_one'],
  },
  {
    id: 'time_monotonic',
    title: 'segundos no cronômetro',
    category: 'Números e matemática',
    level: 3,
    role: 'value',
    callee: moduleCall('time', 'monotonic'),
    api: 'time.monotonic()',
    help: 'Segundos de um cronômetro que nunca volta para trás. Subtraia duas leituras para medir quanto tempo passou.',
    params: [],
    dependencies: ['sz_py_import_one'],
  },
  // Textos
  {
    id: 'str',
    title: 'texto de',
    category: 'Textos',
    level: 1,
    role: 'value',
    callee: builtin('str'),
    api: 'str(valor)',
    help: 'Transforma um valor em texto, por exemplo para juntar com outro texto.',
    params: [required('object', 'valor', n(10), 'pos')],
  },
  ...(
    [
      ['upper', 'em maiúsculas', 'Uma cópia do texto em LETRAS MAIÚSCULAS.'],
      ['lower', 'em minúsculas', 'Uma cópia do texto em letras minúsculas.'],
      ['strip', 'sem espaços nas pontas', 'Uma cópia do texto sem espaços no começo e no fim.'],
      ['isdigit', 'só tem algarismos?', 'Verdadeiro quando o texto só tem algarismos, como "123".'],
    ] as const
  ).map(
    ([fn, title, help]): Spec => ({
      id: `text_${fn}`,
      title,
      category: 'Textos',
      level: 2,
      role: 'value',
      callee: method([fn], TEXT),
      api: `str.${fn}()`,
      help,
      params: [],
    }),
  ),
  {
    id: 'text_split',
    title: 'separar',
    category: 'Textos',
    level: 2,
    role: 'value',
    callee: method(['split'], TEXT),
    api: 'str.split(separador)',
    help: 'Quebra o texto numa lista de pedaços. Sem separador, quebra nos espaços.',
    params: [optional('sep', 'em', t(','))],
  },
  {
    id: 'text_join',
    title: 'juntar com',
    category: 'Textos',
    level: 2,
    role: 'value',
    callee: method(['join'], { ...TEXT, label: 'separador', default: t(', ') }),
    api: 'separador.join(lista)',
    help: 'Junta os textos de uma lista, pondo o separador entre eles.',
    params: [required('iterable', 'a lista', v('lista'), 'pos')],
  },
  {
    id: 'text_replace',
    title: 'trocar',
    category: 'Textos',
    level: 2,
    role: 'value',
    callee: method(['replace'], TEXT),
    api: 'str.replace(velho, novo)',
    help: 'Uma cópia do texto trocando um pedaço por outro.',
    params: [
      required('old', '', t('a'), 'pos'),
      required('new', 'por', t('e'), 'pos'),
      optional('count', 'vezes', n(1), 'pos'),
    ],
  },
  ...(
    [
      ['startswith', 'começa com?', 'Verdadeiro se o texto começa com o pedaço escolhido.'],
      ['endswith', 'termina com?', 'Verdadeiro se o texto termina com o pedaço escolhido.'],
      [
        'find',
        'posição de',
        'Onde o pedaço aparece pela primeira vez (contando do 0), ou -1 se não aparece.',
      ],
    ] as const
  ).map(
    ([fn, title, help]): Spec => ({
      id: `text_${fn}`,
      title,
      category: 'Textos',
      level: 2,
      role: 'value',
      callee: method([fn], TEXT),
      api: `str.${fn}(pedaço)`,
      help,
      params: [required(fn === 'find' ? 'sub' : 'prefix', '', t('a'), 'pos')],
    }),
  ),
  // Listas e coleções
  {
    id: 'len',
    title: 'tamanho de',
    category: 'Listas e coleções',
    level: 1,
    role: 'value',
    callee: builtin('len'),
    api: 'len(coleção)',
    help: 'Quantos itens a lista (ou letras o texto) tem.',
    params: [required('obj', '', v('lista'), 'pos')],
  },
  {
    id: 'file_read',
    title: 'o conteúdo do arquivo',
    category: 'Entrada e saída',
    level: 2,
    role: 'value',
    callee: { kind: 'method', names: ['read'], receiver: FILE },
    api: 'arquivo.read()',
    help: 'Todo o texto do arquivo aberto com "abrir o arquivo … para ler".',
    dependencies: ['sz_py_with_open'],
    params: [],
  },
  {
    id: 'file_write',
    title: 'escrever no arquivo',
    category: 'Entrada e saída',
    level: 2,
    role: 'statement',
    callee: { kind: 'method', names: ['write'], receiver: FILE },
    api: 'arquivo.write(texto)',
    help: 'Grava o texto no arquivo aberto para escrever ou acrescentar. Para mudar de linha, termine o texto com \n.',
    dependencies: ['sz_py_with_open'],
    params: [required('s', 'o texto', t('olá'), 'pos')],
  },
  {
    id: 'list_append',
    title: 'pôr no fim de',
    category: 'Listas e coleções',
    level: 1,
    role: 'statement',
    callee: { kind: 'method', names: ['append'], receiver: ANY_LIST },
    api: 'lista.append(valor)',
    help: 'Acrescenta um item no fim da lista.',
    dependencies: ['sz_py_list', 'sz_py_assign'],
    params: [required('object', 'o valor', n(10), 'pos')],
  },
  {
    id: 'list_clear',
    title: 'esvaziar',
    category: 'Listas e coleções',
    level: 2,
    role: 'statement',
    callee: method(['clear'], { ...LIST, kinds: ['List', 'Dict', 'Set'] }),
    api: 'lista.clear()',
    help: 'Tira todos os itens da lista (ou do dicionário), deixando-a vazia.',
    dependencies: ['sz_py_list', 'sz_py_assign'],
    params: [],
  },
  {
    id: 'list_insert',
    title: 'inserir em',
    category: 'Listas e coleções',
    level: 2,
    role: 'statement',
    callee: { kind: 'method', names: ['insert'], receiver: ANY_LIST },
    api: 'lista.insert(posição, valor)',
    help: 'Põe um item na posição escolhida (0 é o começo), empurrando os outros.',
    dependencies: ['sz_py_list', 'sz_py_assign'],
    params: [
      required('index', 'na posição', n(0), 'pos'),
      required('object', 'o valor', n(10), 'pos'),
    ],
  },
  {
    id: 'collection_remove',
    title: 'tirar de',
    category: 'Listas e coleções',
    level: 2,
    role: 'statement',
    callee: method(['remove'], { ...LIST, kinds: ['List', 'Set'] }),
    api: 'lista.remove(valor)',
    help: 'Tira a primeira vez que o valor aparece. Se ele não estiver lá, dá erro.',
    params: [required('value', 'o valor', n(10), 'pos')],
  },
  {
    id: 'collection_pop',
    title: 'retirar de',
    category: 'Listas e coleções',
    level: 2,
    role: 'value',
    callee: method(['pop'], { ...LIST, kinds: ['List', 'Dict'] }),
    api: 'lista.pop(posição)',
    help: 'Tira um item e devolve ele. Sem posição, tira o último; com 0, o primeiro.',
    params: [optional('index', 'a posição', n(0), 'pos')],
  },
  {
    id: 'list_sort',
    title: 'ordenar',
    category: 'Listas e coleções',
    level: 2,
    role: 'statement',
    callee: method(['sort'], LIST),
    api: 'lista.sort()',
    help: 'Põe os itens da lista em ordem (do menor para o maior). Com "ao contrário", do maior para o menor.',
    params: [
      optional('key', 'pela regra', v('len'), 'kw'),
      optional('reverse', 'ao contrário', () => boolean(true), 'kw'),
    ],
  },
  {
    id: 'list_index',
    title: 'posição em',
    category: 'Listas e coleções',
    level: 2,
    role: 'value',
    callee: method(['index'], LIST),
    api: 'lista.index(valor)',
    help: 'Em que posição o valor está (contando do 0).',
    params: [required('value', 'de', n(10), 'pos')],
  },
  {
    id: 'list_call',
    title: 'lista feita de',
    category: 'Listas e coleções',
    level: 2,
    role: 'value',
    callee: builtin('list'),
    api: 'list(coleção)',
    help: 'Uma lista nova com os itens da coleção (ou vazia). Útil para copiar uma lista.',
    params: [optional('iterable', '', v('lista'), 'pos')],
  },
  {
    id: 'tuple_call',
    title: 'tupla feita de',
    category: 'Listas e coleções',
    level: 3,
    role: 'value',
    callee: builtin('tuple'),
    api: 'tuple(coleção)',
    help: 'Uma tupla (lista que não muda) com os itens da coleção.',
    params: [optional('iterable', '', v('lista'), 'pos')],
  },
  {
    id: 'sum',
    title: 'soma de',
    category: 'Listas e coleções',
    level: 2,
    role: 'value',
    callee: builtin('sum'),
    api: 'sum(lista)',
    help: 'A soma de todos os números da lista.',
    params: [required('iterable', '', v('lista'), 'pos')],
  },
  {
    id: 'sorted',
    title: 'cópia ordenada de',
    category: 'Listas e coleções',
    level: 2,
    role: 'value',
    callee: builtin('sorted'),
    api: 'sorted(lista)',
    help: 'Uma nova lista com os itens em ordem. A lista original não muda.',
    params: [
      required('iterable', '', v('lista'), 'pos'),
      optional('key', 'pela regra', v('len'), 'kw'),
      optional('reverse', 'ao contrário', () => boolean(true), 'kw'),
    ],
  },
  {
    id: 'enumerate',
    title: 'posição e item de',
    category: 'Listas e coleções',
    level: 2,
    role: 'value',
    callee: builtin('enumerate'),
    api: 'enumerate(lista)',
    help: 'Use em "para cada" com dois nomes (posição, item) para saber também em que posição cada item está.',
    params: [required('iterable', '', v('lista'), 'pos'), optional('start', 'começando em', n(1))],
  },
  {
    id: 'random_choice',
    title: 'sortear um item de',
    category: 'Listas e coleções',
    level: 2,
    role: 'value',
    callee: moduleCall('random', 'choice'),
    api: 'random.choice(lista)',
    help: 'Um item sorteado da lista. Precisa de "usar o módulo random".',
    params: [required('seq', '', v('lista'), 'pos')],
    dependencies: ['sz_py_import_one'],
  },
  {
    id: 'random_shuffle',
    title: 'embaralhar',
    category: 'Listas e coleções',
    level: 2,
    role: 'statement',
    callee: moduleCall('random', 'shuffle'),
    api: 'random.shuffle(lista)',
    help: 'Mistura a ordem dos itens da lista. Precisa de "usar o módulo random".',
    params: [required('x', '', v('lista'), 'pos')],
    dependencies: ['sz_py_import_one'],
  },
  ...(
    [
      ['keys', 'chaves de', 'As chaves do dicionário, na ordem em que foram postas.'],
      ['values', 'valores de', 'Os valores do dicionário, na ordem em que foram postos.'],
      ['items', 'pares de', 'Os pares (chave, valor). Use em "para cada" com dois nomes.'],
    ] as const
  ).map(
    ([fn, title, help]): Spec => ({
      id: `dict_${fn}`,
      title,
      category: 'Listas e coleções',
      level: 2,
      role: 'value',
      callee: method([fn], DICT),
      api: `dicionário.${fn}()`,
      help,
      params: [],
    }),
  ),
  {
    id: 'dict_get',
    title: 'valor em',
    category: 'Listas e coleções',
    level: 2,
    role: 'value',
    callee: method(['get'], DICT),
    api: 'dicionário.get(chave, padrão)',
    help: 'O valor da chave, ou o padrão (None se não escolher) quando a chave não existe. Não dá erro.',
    params: [
      required('key', 'da chave', t('nome'), 'pos'),
      optional('default', 'ou então', n(0), 'pos'),
    ],
  },
  {
    id: 'set_create',
    title: 'novo conjunto',
    category: 'Listas e coleções',
    level: 3,
    role: 'value',
    callee: builtin('set'),
    api: 'set(coleção)',
    help: 'Um conjunto: cada valor aparece uma vez só.',
    params: [optional('iterable', 'com', v('lista'), 'pos')],
  },
  {
    id: 'set_add',
    title: 'pôr no conjunto',
    category: 'Listas e coleções',
    level: 3,
    role: 'statement',
    callee: method(['add'], { label: 'conjunto', default: v('conjunto'), kinds: ['Set'] }),
    api: 'conjunto.add(valor)',
    help: 'Acrescenta um valor ao conjunto (se já estiver lá, nada muda).',
    params: [required('elem', 'o valor', n(10), 'pos')],
  },
  // Som
  {
    id: 'audio_play',
    title: 'tocar o som',
    category: 'Som',
    level: 1,
    role: 'statement',
    callee: moduleCall('sz_audio', 'play'),
    api: 'sz_audio.play(arquivo, loop=False, volume=1.0)',
    help: 'Toca um som WAV do projeto. Em "repetir", toca sem parar (música de fundo). Precisa de "usar o módulo sz_audio".',
    params: [
      required('path', '', t('sons/pulo.wav'), 'pos'),
      optional('loop', 'repetir', () => boolean(true), 'kw'),
      optional(
        'volume',
        'volume',
        () =>
          node('Constant', {
            value: { literal: 'float', value: '0x1.0000000000000p-1' },
            kind: null,
          }),
        'kw',
      ),
    ],
    dependencies: ['sz_py_import_one'],
  },
  {
    id: 'audio_stop',
    title: 'parar os sons',
    category: 'Som',
    level: 1,
    role: 'statement',
    callee: moduleCall('sz_audio', 'stop'),
    api: 'sz_audio.stop(som=None)',
    help: 'Para todos os sons, ou só o som guardado numa variável quando "tocar o som" foi guardado.',
    params: [optional('handle', 'o som', v('musica'), 'pos')],
    dependencies: ['sz_py_import_one'],
  },
]

/** `x = lista.pop()` and `lista.pop()` both appear in games; keep the statement too. */
const popStatement = programming({
  id: 'collection_pop_statement',
  title: 'retirar de',
  category: 'Listas e coleções',
  level: 2,
  role: 'statement',
  callee: method(['pop'], { ...LIST, kinds: ['List', 'Dict'] }),
  api: 'lista.pop(posição)',
  help: 'Tira um item da lista sem guardar.',
  params: [optional('index', 'a posição', n(0), 'pos')],
  hidden: true,
})
const audioPlayValue = programming({
  ...specs.find((spec) => spec.id === 'audio_play')!,
  id: 'audio_play_value',
  role: 'value',
  hidden: true,
})

export const PYTHON_CALL_BLOCK_CODECS: readonly PythonBlockCodec[] = [
  rangeCodec,
  ...specs.map(programming),
  popStatement,
  audioPlayValue,
]

export const PYTHON_MATH_PI_CODEC: PythonBlockCodec = {
  ...metadata(
    'math_pi',
    'pi',
    'Números e matemática',
    2,
    'value',
    'math.pi',
    'O número pi (3.14159…). Precisa de "usar o módulo math".',
  ),
  binding: { root: 'math', module: 'math' },
  match: { kinds: ['Attribute'], names: ['pi'] },
  defaultNode: () => attribute(name('math'), 'pi'),
  decode(value) {
    return samePythonValue(value, this.defaultNode()) ? { fields: [], inputs: [] } : undefined
  },
  encode() {
    return this.defaultNode()
  },
}
export type { PythonCategory }
