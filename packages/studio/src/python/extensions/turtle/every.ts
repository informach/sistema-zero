/**
 * 🔁 repetir [nome] a cada ⟨ms⟩ milissegundos — o laço do jogo no Turtle (áreas do projeto,
 * 22/11/2026). É a função que se reagenda no fim:
 *
 *     def a_cada_quadro():
 *         ...
 *         tela.ontimer(a_cada_quadro, 30)
 *
 * O corpo do bloco são os comandos antes do `ontimer`. A tela (ou o módulo, ou o `ontimer` de
 * `from turtle import *`) precisa ser a do Turtle: a prova é a mesma do bloco "chamar depois de".
 */
import { PYTHON_TURTLE_REPEAT_CODEC } from '../../blocks/areas'
import { PYTHON_IDENTIFIER } from '../../blocks/catalogHelpers'
import type { PythonBlockCodec, PythonBlockShape } from '../../blocks/contract'
import { call, expression, integer, isNode, name, node, nodes } from '../../blocks/nodes'
import type { PythonNode } from '../../language/types'

const emptyArguments = () =>
  node('arguments', {
    posonlyargs: [],
    args: [],
    vararg: null,
    kwonlyargs: [],
    kw_defaults: [],
    kwarg: null,
    defaults: [],
  })

function definition(functionName: string, body: PythonNode[]) {
  return node('FunctionDef', {
    name: functionName,
    args: emptyArguments(),
    body,
    decorator_list: [],
    returns: null,
    type_comment: null,
    type_params: [],
  })
}

function reschedule(receiver: string, functionName: string, milliseconds: PythonNode) {
  const func = receiver
    ? node('Attribute', { value: name(receiver), attr: 'ontimer', ctx: node('Load') })
    : name('ontimer')
  return expression(call(func, [name(functionName), milliseconds]))
}

/** A chamada `<tela>.ontimer(<nome>, <ms>)` do fim do corpo, ou nada. */
function closingCall(value: PythonNode) {
  const body = value.fields.body
  if (!nodes(body) || !body.length) return
  const last = body.at(-1)!
  const target = last.kind === 'Expr' && isNode(last.fields.value) ? last.fields.value : undefined
  if (target?.kind !== 'Call' || !isNode(target.fields.func)) return
  const func = target.fields.func
  let receiver: string | undefined
  if (func.kind === 'Name' && func.fields.id === 'ontimer') receiver = ''
  else if (
    func.kind === 'Attribute' &&
    func.fields.attr === 'ontimer' &&
    isNode(func.fields.value) &&
    func.fields.value.kind === 'Name' &&
    typeof func.fields.value.fields.id === 'string'
  )
    receiver = func.fields.value.fields.id
  if (receiver === undefined) return
  const args = target.fields.args
  if (!nodes(args) || args.length !== 2 || !nodes(target.fields.keywords)) return
  if (target.fields.keywords.length) return
  const [scheduled, milliseconds] = args as [PythonNode, PythonNode]
  if (scheduled.kind !== 'Name' || scheduled.fields.id !== value.fields.name) return
  if (milliseconds.kind === 'Starred') return
  return { call: target, receiver, milliseconds, before: body.slice(0, -1) }
}

function plainDefinition(value: PythonNode) {
  const f = value.fields
  if (
    value.kind !== 'FunctionDef' ||
    typeof f.name !== 'string' ||
    !isNode(f.args) ||
    !nodes(f.decorator_list) ||
    f.decorator_list.length ||
    f.returns !== null ||
    f.type_comment !== null ||
    !nodes(f.type_params) ||
    f.type_params.length
  )
    return false
  const a = f.args.fields
  return (
    nodes(a.posonlyargs) &&
    !a.posonlyargs.length &&
    nodes(a.args) &&
    !a.args.length &&
    a.vararg === null &&
    nodes(a.kwonlyargs) &&
    !a.kwonlyargs.length &&
    Array.isArray(a.kw_defaults) &&
    !a.kw_defaults.length &&
    a.kwarg === null &&
    nodes(a.defaults) &&
    !a.defaults.length
  )
}

/** `ontimer` é o bloco "chamar depois de": a prova da tela vem dele. */
export function turtleEveryCodec(ontimer: PythonBlockCodec): PythonBlockCodec {
  return {
    id: PYTHON_TURTLE_REPEAT_CODEC,
    owner: 'python-turtle',
    title: '🔁 repetir',
    category: 'Animação e tempo',
    level: 2,
    role: 'statement',
    help: 'O laço do jogo: roda os comandos de dentro e chama de novo a mesma função depois do tempo em milissegundos (30 dá umas 33 vezes por segundo). Para começar, chame a função uma vez.',
    api: 'def a_cada_quadro():\n    ...\n    tela.ontimer(a_cada_quadro, 30)',
    // A primeira volta é chamar a função, e o laço só anda com a janela aberta.
    dependencies: ['sz_py_run', 'sz_py_turtle_screen_mainloop', 'sz_py_import_one', 'sz_py_assign'],
    match: { kinds: ['FunctionDef'] },
    suffixes: { ms: 'milissegundos' },
    bindingFor(value) {
      const closing = closingCall(value)
      return closing && ontimer.bindingFor?.(expression(closing.call))
    },
    defaultNode: () =>
      definition('a_cada_quadro', [reschedule('tela', 'a_cada_quadro', integer('30'))]),
    decode(value) {
      if (!plainDefinition(value)) return
      const closing = closingCall(value)
      if (!closing) return
      const before = closing.before
      // O `ontimer` do fim já dá corpo à função: o miolo pode ficar vazio.
      return {
        fields: [{ name: 'NAME', label: '', value: value.fields.name as string }],
        inputs: [
          { name: 'ms', label: 'a cada', role: 'value', nodes: [closing.milliseconds] },
          { name: 'body', label: '', role: 'statement', nodes: before },
        ],
        extra: { receiver: closing.receiver },
      }
    },
    encode(shape: PythonBlockShape) {
      const functionName = (shape.fields.find((field) => field.name === 'NAME')?.value ?? '').trim()
      if (!PYTHON_IDENTIFIER.test(functionName)) throw new Error('Escolha um nome para a função.')
      const milliseconds = shape.inputs.find((input) => input.name === 'ms')?.nodes[0]
      if (!milliseconds) throw new Error('Diga de quanto em quanto tempo repetir.')
      const receiver = typeof shape.extra?.receiver === 'string' ? shape.extra.receiver : 'tela'
      if (receiver && !PYTHON_IDENTIFIER.test(receiver)) throw new Error('Tela inválida.')
      const body = shape.inputs.find((input) => input.name === 'body')?.nodes ?? []
      return definition(functionName, [...body, reschedule(receiver, functionName, milliseconds)])
    },
  }
}
