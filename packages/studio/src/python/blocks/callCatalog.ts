import type { PythonNode } from '../language/types'
import { listSlot, metadata } from './catalogHelpers'
import type { PythonBlockCodec, PythonCategory } from './contract'
import { attribute, call, integer, isNode, name, node, pythonSemanticTree, text } from './nodes'
import { structuralCodec } from './structuralCodec'

type CallDefinition = {
  id: string
  title: string
  category: PythonCategory
  level: 1 | 2 | 3
  api: string
  help: string
  path?: string
  method?: string
  receiver?: () => PythonNode
  args(): PythonNode[]
}
const callable = (path: string) => {
  const [root, ...members] = path.split('.')
  return members.reduce((value, member) => attribute(value, member), name(root!))
}
/** Calls remain official Python calls, including every positional/named argument. */
function callCodec(definition: CallDefinition): PythonBlockCodec {
  const { id, title, category, level, api, help, method, path } = definition
  const target = () =>
    method ? attribute(definition.receiver?.() ?? name('colecao'), method) : callable(path!)
  const codec = structuralCodec({
    ...metadata(id, title, category, level, 'value', api, help),
    defaultNode: () => call(target(), definition.args()),
    slots: [listSlot('args', 'argumento'), listSlot('keywords', 'argumento nomeado', 'keyword')],
  })
  const root = path?.split('.')[0]
  return {
    ...codec,
    ...(method
      ? {
          receiverKinds: id.startsWith('text_')
            ? ['text' as const]
            : id.startsWith('dict_')
              ? ['Dict' as const]
              : id.startsWith('set_')
                ? ['Set' as const]
                : id === 'collection_remove'
                  ? ['List' as const, 'Set' as const]
                  : id === 'collection_pop'
                    ? ['List' as const, 'Dict' as const]
                    : ['List' as const],
        }
      : {}),
    ...(root ? { binding: { root, ...(path!.includes('.') ? { module: root } : {}) } } : {}),
    decode(value) {
      if (!method) return codec.decode(value)
      const func = value.fields.func
      if (
        value.kind !== 'Call' ||
        !isNode(func) ||
        func.kind !== 'Attribute' ||
        func.fields.attr !== method ||
        !isNode(func.fields.value) ||
        JSON.stringify(pythonSemanticTree(func.fields.ctx!)) !== JSON.stringify(node('Load'))
      )
        return
      const shape = codec.decode(node('Call', { ...value.fields, func: target() }))
      if (!shape) return
      shape.inputs.unshift({
        name: 'receiver',
        label: 'objeto',
        role: 'value',
        nodes: [func.fields.value],
      })
      return shape
    },
    encode(shape) {
      const value = codec.encode(shape)
      if (method) {
        const receiver = shape.inputs.find((input) => input.name === 'receiver')
        if (receiver?.nodes.length !== 1) throw new Error('Escolha o objeto da chamada.')
        value.fields.func = attribute(receiver.nodes[0]!, method)
      }
      return value
    },
  }
}
const list = () => name('lista')
const string = () => text('Olá, mundo')
const number = () => [integer('10')]
const empty = () => []
const definitions: CallDefinition[] = [
  {
    id: 'print',
    title: 'mostrar no console',
    category: 'Entrada e saída',
    level: 1,
    path: 'print',
    api: 'print(*objects, sep=" ", end="\\n")',
    args: () => [text('Olá!')],
    help: 'Mostra valores no console. sep separa os valores e end define o final da mensagem.',
  },
  {
    id: 'input',
    title: 'perguntar no console',
    category: 'Entrada e saída',
    level: 1,
    path: 'input',
    api: 'input(prompt)',
    args: () => [text('Como você se chama? ')],
    help: 'Espera a resposta no console e devolve um texto. Use int ou float para converter em número.',
  },
  {
    id: 'range',
    title: 'sequência de contagem',
    category: 'Repetições',
    level: 1,
    path: 'range',
    api: 'range(stop) / range(start, stop, step)',
    args: number,
    help: 'Conta desde zero ou desde o início escolhido. O limite final não é incluído; o passo não pode ser zero.',
  },
  {
    id: 'int',
    title: 'converter em inteiro',
    category: 'Números e matemática',
    level: 1,
    path: 'int',
    api: 'int(value, base=10)',
    args: () => [text('10')],
    help: 'Converte um texto ou número em inteiro. Um texto inválido produz ValueError.',
  },
  {
    id: 'float_call',
    title: 'converter em decimal',
    category: 'Números e matemática',
    level: 2,
    path: 'float',
    api: 'float(value)',
    args: () => [text('2.5')],
    help: 'Converte um texto ou número em decimal. Textos numéricos usam ponto decimal.',
  },
  {
    id: 'abs',
    title: 'valor absoluto',
    category: 'Números e matemática',
    level: 1,
    path: 'abs',
    api: 'abs(number)',
    args: number,
    help: 'Devolve a distância numérica até zero, sem o sinal negativo.',
  },
  {
    id: 'round',
    title: 'arredondar',
    category: 'Números e matemática',
    level: 2,
    path: 'round',
    api: 'round(number, ndigits)',
    args: number,
    help: 'Arredonda segundo a regra Python: empates exatos vão para o resultado par.',
  },
  ...(['min', 'max'] as const).map(
    (path): CallDefinition => ({
      id: path,
      title: path === 'min' ? 'menor valor' : 'maior valor',
      category: 'Números e matemática',
      level: 1,
      path,
      api: `${path}(iterable) / ${path}(first, second, ...)`,
      args: () => [integer('1'), integer('2')],
      help: 'Escolhe o valor de uma coleção ou de vários argumentos, seguindo a comparação Python.',
    }),
  ),
  ...(['sqrt', 'floor', 'ceil'] as const).map(
    (method): CallDefinition => ({
      id: `math_${method}`,
      title:
        method === 'sqrt'
          ? 'raiz quadrada'
          : method === 'floor'
            ? 'arredondar para baixo'
            : 'arredondar para cima',
      category: 'Números e matemática',
      level: 2,
      path: `math.${method}`,
      api: `math.${method}(number)`,
      args: number,
      help: 'Usa o módulo math oficial. Importe math no programa antes de usar esta chamada.',
    }),
  ),
  {
    id: 'random_randint',
    title: 'sortear inteiro',
    category: 'Números e matemática',
    level: 1,
    path: 'random.randint',
    api: 'random.randint(a, b)',
    args: () => [integer('1'), integer('6')],
    help: 'Sorteia um inteiro incluindo os dois limites. Importe random; os dois argumentos precisam ser inteiros.',
  },
  {
    id: 'random_choice',
    title: 'sortear item',
    category: 'Listas e coleções',
    level: 2,
    path: 'random.choice',
    api: 'random.choice(sequence)',
    args: () => [list()],
    help: 'Escolhe um item de uma sequência que tenha elementos. Importe random no programa.',
  },
  {
    id: 'str',
    title: 'converter em texto',
    category: 'Textos',
    level: 1,
    path: 'str',
    api: 'str(value)',
    args: number,
    help: 'Devolve a representação textual Python do valor.',
  },
  {
    id: 'len',
    title: 'tamanho',
    category: 'Listas e coleções',
    level: 1,
    path: 'len',
    api: 'len(collection)',
    args: () => [list()],
    help: 'Conta itens da coleção. Em textos conta pontos de código Unicode, como no Python.',
  },
  ...(['upper', 'lower', 'strip', 'split'] as const).map(
    (method): CallDefinition => ({
      id: `text_${method}`,
      title: {
        upper: 'texto em maiúsculas',
        lower: 'texto em minúsculas',
        strip: 'retirar espaços das pontas',
        split: 'separar texto',
      }[method],
      category: 'Textos',
      level: 2,
      method,
      receiver: string,
      api: `str.${method}()`,
      args: empty,
      help: 'Produz um novo resultado sem modificar o texto original. Os argumentos seguem o método oficial de str.',
    }),
  ),
  {
    id: 'text_join',
    title: 'juntar textos',
    category: 'Textos',
    level: 2,
    method: 'join',
    receiver: () => text(', '),
    api: 'separator.join(texts)',
    args: () => [list()],
    help: 'Junta uma coleção de textos usando o texto receptor como separador.',
  },
  {
    id: 'text_replace',
    title: 'trocar parte do texto',
    category: 'Textos',
    level: 2,
    method: 'replace',
    receiver: string,
    api: 'str.replace(old, new, count)',
    args: () => [text('mundo'), text('turma')],
    help: 'Produz um novo texto substituindo as ocorrências escolhidas; count pode limitar a quantidade.',
  },
  {
    id: 'list_append',
    title: 'adicionar à lista',
    category: 'Listas e coleções',
    level: 1,
    method: 'append',
    receiver: list,
    api: 'list.append(value)',
    args: number,
    help: 'Adiciona um item no final da lista existente. O retorno é None.',
  },
  {
    id: 'collection_remove',
    title: 'remover valor da coleção',
    category: 'Listas e coleções',
    level: 2,
    method: 'remove',
    receiver: list,
    api: 'list.remove(value) / set.remove(value)',
    args: number,
    help: 'Na lista remove a primeira ocorrência; no conjunto remove o valor. Um item ausente produz um erro.',
  },
  {
    id: 'collection_pop',
    title: 'retirar e devolver item',
    category: 'Listas e coleções',
    level: 2,
    method: 'pop',
    receiver: list,
    api: 'list.pop(index=-1) / dict.pop(key)',
    args: empty,
    help: 'Remove um item e o devolve. Em listas o índice padrão é o último; dicionários precisam da chave.',
  },
  ...(['keys', 'values', 'items'] as const).map(
    (method): CallDefinition => ({
      id: `dict_${method}`,
      title: {
        keys: 'chaves do dicionário',
        values: 'valores do dicionário',
        items: 'pares do dicionário',
      }[method],
      category: 'Listas e coleções',
      level: 2,
      method,
      receiver: () => name('dados'),
      api: `dict.${method}()`,
      args: empty,
      help: 'Devolve uma visão do dicionário na ordem de inserção. Pode ser percorrida com for.',
    }),
  ),
  {
    id: 'set_create',
    title: 'criar conjunto',
    category: 'Listas e coleções',
    level: 2,
    path: 'set',
    api: 'set(iterable=())',
    args: empty,
    help: 'Cria um conjunto vazio ou a partir de uma coleção. Valores repetidos ficam apenas uma vez.',
  },
  {
    id: 'set_add',
    title: 'adicionar ao conjunto',
    category: 'Listas e coleções',
    level: 2,
    method: 'add',
    receiver: () => name('conjunto'),
    api: 'set.add(value)',
    args: number,
    help: 'Inclui um valor no conjunto existente. Se já estiver presente, ele continua uma única vez.',
  },
]

export const PYTHON_CALL_BLOCK_CODECS: readonly PythonBlockCodec[] = definitions.map(callCodec)
export const PYTHON_MATH_PI_CODEC: PythonBlockCodec = {
  ...metadata(
    'math_pi',
    'número pi',
    'Números e matemática',
    2,
    'value',
    'math.pi',
    'Usa a constante pi do módulo math. Importe math no programa.',
  ),
  binding: { root: 'math', module: 'math' },
  defaultNode: () => attribute(name('math'), 'pi'),
  decode(value) {
    return JSON.stringify(pythonSemanticTree(value)) ===
      JSON.stringify(pythonSemanticTree(this.defaultNode()))
      ? { fields: [], inputs: [] }
      : undefined
  },
  encode() {
    return this.defaultNode()
  },
}
