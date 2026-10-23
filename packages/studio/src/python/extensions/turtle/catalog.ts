import reference from '../../../runtime/python/turtle/api-reference.json'
import { listSlot } from '../../blocks/catalogHelpers'
import type { PythonBlockBinding, PythonBlockCodec } from '../../blocks/contract'
import { attribute, call, isNode, name, node, pythonSemanticTree } from '../../blocks/nodes'
import { structuralCodec } from '../../blocks/structuralCodec'
import type { PythonNode } from '../../language/types'
import { turtleTeachingLabel } from './labels'

interface TurtleAPI {
  owner: string
  name: string
  signature: string
  canonical: string
  receiver?: string | null
}
const same = (a: PythonNode, b: PythonNode) =>
  JSON.stringify(pythonSemanticTree(a)) === JSON.stringify(pythonSemanticTree(b))
function makeCodec(entry: TurtleAPI): PythonBlockCodec {
  const procedural = entry.owner === 'turtle'
  const receiver = procedural ? entry.receiver : entry.owner
  const receiverLabel =
    entry.owner === 'Screen' ? 'tela' : entry.owner === 'Shape' ? 'forma' : 'tartaruga'
  const teaching = turtleTeachingLabel(entry.canonical, receiver)
  const target = () => attribute(name(procedural ? 'turtle' : receiverLabel), entry.name)
  const codec = structuralCodec({
    id: `sz_py_turtle_${procedural ? 'module' : entry.owner.toLowerCase()}_${entry.name}`,
    owner: 'python-turtle',
    title: `${teaching.title} · ${entry.name}`,
    category: teaching.category,
    level: teaching.level,
    role: 'value',
    api: `${entry.owner}.${entry.name}${entry.signature}`,
    help: teaching.help,
    starter:
      procedural &&
      [
        'forward',
        'right',
        'left',
        'penup',
        'pendown',
        'pencolor',
        'circle',
        'write',
        'bgcolor',
        'done',
      ].includes(entry.name),
    dependencies: [
      'sz_py_import',
      ...(!procedural ? [`sz_py_turtle_module_${entry.owner}`, 'sz_py_assign'] : []),
      ...(['onclick', 'onrelease', 'ondrag', 'onkey', 'onkeypress', 'ontimer'].includes(
        entry.canonical,
      )
        ? ['sz_py_function', 'sz_py_turtle_module_mainloop']
        : []),
      ...(['onkey', 'onkeypress'].includes(entry.canonical) ? ['sz_py_turtle_module_listen'] : []),
      ...(entry.canonical === 'tracer' ? ['sz_py_turtle_module_update'] : []),
      ...(['begin_fill', 'end_fill'].includes(entry.canonical)
        ? [
            `sz_py_turtle_${procedural ? 'module' : 'turtle'}_${entry.canonical === 'begin_fill' ? 'end_fill' : 'begin_fill'}`,
          ]
        : []),
      ...(['clearstamp', 'clearstamps'].includes(entry.canonical)
        ? [`sz_py_turtle_${procedural ? 'module' : 'turtle'}_stamp`]
        : []),
    ],
    defaultNode: () => call(target(), structuredClone(teaching.args ?? [])),
    slots: [listSlot('args', 'argumento'), listSlot('keywords', 'argumento nomeado', 'keyword')],
  })
  function bindingFor(value: PythonNode): PythonBlockBinding | undefined {
    const func = value.fields.func
    if (value.kind !== 'Call' || !isNode(func)) return
    if (procedural && func.kind === 'Name' && typeof func.fields.id === 'string')
      return { root: func.fields.id, module: 'turtle', member: entry.name }
    if (
      func.kind !== 'Attribute' ||
      func.fields.attr !== entry.name ||
      !isNode(func.fields.value) ||
      func.fields.value.kind !== 'Name' ||
      typeof func.fields.value.fields.id !== 'string'
    )
      return
    return {
      root: func.fields.value.fields.id,
      module: 'turtle',
      ...(procedural ? {} : { instance: entry.owner as 'Turtle' | 'Screen' | 'Shape' }),
    }
  }
  return {
    ...codec,
    ...(['Shape', 'addcomponent'].includes(entry.canonical)
      ? { requiredRuntimeFeatures: ['turtle-compound-shapes'] as const }
      : {}),
    binding: { root: 'turtle', module: 'turtle' },
    bindingFor,
    decode(value) {
      const func = value.fields.func
      if (value.kind !== 'Call' || !isNode(func)) return
      let root: string | undefined
      let object: PythonNode | undefined
      let style: 'module' | 'imported' | 'method'
      if (
        procedural &&
        func.kind === 'Name' &&
        typeof func.fields.id === 'string' &&
        same(func, name(func.fields.id))
      ) {
        root = func.fields.id
        style = 'imported'
      } else if (
        func.kind === 'Attribute' &&
        func.fields.attr === entry.name &&
        isNode(func.fields.value) &&
        same(func, attribute(func.fields.value, entry.name))
      ) {
        if (procedural) {
          if (
            func.fields.value.kind !== 'Name' ||
            typeof func.fields.value.fields.id !== 'string' ||
            !same(func.fields.value, name(func.fields.value.fields.id))
          )
            return
          root = func.fields.value.fields.id
          style = 'module'
        } else {
          object = func.fields.value
          style = 'method'
        }
      } else return
      const shape = codec.decode(node('Call', { ...value.fields, func: target() }))
      if (!shape) return
      shape.extra = { ...shape.extra, callStyle: style }
      if (root !== undefined)
        shape.fields.unshift({
          name: 'ROOT',
          label: style === 'imported' ? 'nome importado' : 'módulo',
          value: root,
        })
      if (object)
        shape.inputs.unshift({
          name: 'receiver',
          label: receiverLabel,
          role: 'value',
          nodes: [object],
        })
      return shape
    },
    encode(shape) {
      const value = codec.encode(shape)
      const style = shape.extra?.callStyle
      if (procedural) {
        const root = shape.fields.find((field) => field.name === 'ROOT')?.value
        if (
          !root ||
          !/^[_\p{ID_Start}][_\p{ID_Continue}]*$/u.test(root) ||
          !['module', 'imported'].includes(String(style))
        )
          throw new Error('Escolha o nome do módulo ou da função importada.')
        value.fields.func = style === 'module' ? attribute(name(root), entry.name) : name(root)
      } else {
        const object = shape.inputs.find((input) => input.name === 'receiver')
        if (style !== 'method' || object?.nodes.length !== 1)
          throw new Error('Escolha a tartaruga, tela ou forma que vai receber o comando.')
        value.fields.func = attribute(object.nodes[0]!, entry.name)
      }
      return value
    },
  }
}

/** Draft codecs: runtime qualification/host approval remain independent required gates. */
export const PYTHON_TURTLE_CODECS: readonly PythonBlockCodec[] = Object.freeze(
  reference.entries.map(makeCodec),
)
