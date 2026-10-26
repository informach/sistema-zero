import reference from '../../../runtime/python/turtle/api-reference.json'
import {
  optional,
  type PythonApiCallee,
  pythonApiCallCodec,
  required,
} from '../../blocks/apiCallCodec'
import type { PythonBlockCodec } from '../../blocks/contract'
import { integer, name, text } from '../../blocks/nodes'
import { TURTLE_CONCEPTS, type TurtleConcept } from './labels'

interface TurtleAPI {
  owner: string
  name: string
  signature: string
  canonical: string
  receiver?: string | null
}
const entries = reference.entries as TurtleAPI[]

/** Procedural names first in this order, so the palette shows the spelling books use. */
const PREFERRED_MODULE_NAME: Readonly<Record<string, string>> = { mainloop: 'done' }

function namesOf(concept: TurtleConcept) {
  const method: string[] = []
  const module: string[] = []
  for (const entry of entries) {
    if (entry.canonical !== concept.canonical) continue
    if (concept.owner === 'turtle') {
      if (entry.owner === 'turtle') module.push(entry.name)
    } else if (entry.owner === concept.owner) method.push(entry.name)
    else if (entry.owner === 'turtle' && (entry.receiver ?? 'Turtle') === concept.owner)
      module.push(entry.name)
  }
  const sortCanonical = (list: string[]) => {
    const first = PREFERRED_MODULE_NAME[concept.canonical] ?? concept.canonical
    return [...new Set(list)].sort((a, b) => Number(b === first) - Number(a === first))
  }
  return { method: sortCanonical(method), module: sortCanonical(module) }
}

/** Method names that only Turtle objects have: taught on any receiver (self.caneta.penup()). */
const DISTINCTIVE = new Set([
  'forward',
  'back',
  'right',
  'left',
  'goto',
  'setheading',
  'home',
  'setx',
  'sety',
  'xcor',
  'ycor',
  'heading',
  'towards',
  'penup',
  'pendown',
  'pencolor',
  'fillcolor',
  'pensize',
  'begin_fill',
  'end_fill',
  'filling',
  'isdown',
  'circle',
  'dot',
  'stamp',
  'clearstamp',
  'clearstamps',
  'shapesize',
  'hideturtle',
  'showturtle',
  'isvisible',
  'onkeypress',
  'onkey',
  'listen',
  'ontimer',
  'tracer',
  'bgcolor',
  'bgpic',
  'register_shape',
  'exitonclick',
  'window_width',
  'window_height',
  'colormode',
  'getshapes',
  'ondrag',
  'onrelease',
  'addcomponent',
])

const RECEIVERS = {
  Turtle: { label: 'tartaruga', variable: 't' },
  Screen: { label: 'tela', variable: 'tela' },
  Shape: { label: 'forma', variable: 'forma' },
} as const

function calleeOf(concept: TurtleConcept): PythonApiCallee {
  const { method, module } = namesOf(concept)
  if (concept.owner === 'turtle') {
    if (!module.length) throw new Error(`Turtle.${concept.canonical} sem nome de módulo.`)
    return { kind: 'module', module: 'turtle', names: module }
  }
  if (!method.length) throw new Error(`Turtle.${concept.canonical} sem método.`)
  const receiver = RECEIVERS[concept.owner]
  return {
    kind: 'method',
    names: method,
    receiver: {
      label: receiver.label,
      default: () => name(receiver.variable),
      instance: { module: 'turtle', name: concept.owner },
      ...(DISTINCTIVE.has(concept.canonical) ? { any: true } : {}),
    },
    ...(module.length ? { module: 'turtle', moduleNames: module } : {}),
  }
}

const idOf = (concept: TurtleConcept) =>
  `sz_py_turtle_${concept.owner === 'turtle' ? 'new' : concept.owner === 'Turtle' ? 'turtle' : concept.owner.toLowerCase()}_${concept.canonical.toLowerCase()}`

function codecsOf(concept: TurtleConcept): PythonBlockCodec[] {
  const callee = calleeOf(concept)
  const names = callee.kind === 'path' ? [] : callee.names
  const api = `${concept.owner === 'turtle' ? 'turtle' : concept.owner}.${names.join(' / ')}${
    entries.find(
      (entry) =>
        entry.canonical === concept.canonical &&
        (entry.owner === concept.owner || concept.owner === 'turtle'),
    )?.signature ?? '()'
  }`
  const base = {
    owner: 'python-turtle' as const,
    title: concept.title,
    category: concept.category,
    level: concept.level,
    help: concept.help,
    api,
    callee,
    ...(concept.canonical === 'addcomponent' || concept.canonical === 'Shape'
      ? { requiredRuntimeFeatures: ['turtle-compound-shapes'] as const }
      : {}),
  }
  const codecs = [
    pythonApiCallCodec({
      ...base,
      id: idOf(concept),
      role: concept.role,
      params: concept.params ?? [],
      ...(concept.variadic ? { variadic: concept.variadic } : {}),
      ...(concept.starter ? { starter: true } : {}),
      dependencies: dependenciesOf(concept),
    }),
  ]
  // `cor = turtle.pencolor()`: the same concept used to read the current value.
  if (concept.getter)
    codecs.push(
      pythonApiCallCodec({
        ...base,
        id: `${idOf(concept)}_valor`,
        title: concept.getterTitle ?? `${concept.title} atual`,
        role: 'value',
        params: (concept.params ?? []).map((param) => ({
          ...param,
          optional: true,
          initial: false,
        })),
        ...(concept.variadic
          ? { variadic: { ...concept.variadic, minimum: 0, defaults: () => [] } }
          : {}),
        hidden: true,
      }),
    )
  return codecs
}

function dependenciesOf(concept: TurtleConcept): string[] {
  const dependencies = ['sz_py_import_one']
  if (concept.owner !== 'turtle') dependencies.push('sz_py_assign')
  if (
    ['onclick', 'onrelease', 'ondrag', 'onkey', 'onkeypress', 'ontimer'].includes(concept.canonical)
  )
    dependencies.push('sz_py_function', 'sz_py_turtle_screen_mainloop')
  if (['onkey', 'onkeypress'].includes(concept.canonical))
    dependencies.push('sz_py_turtle_screen_listen')
  if (concept.canonical === 'tracer') dependencies.push('sz_py_turtle_screen_update')
  if (concept.canonical === 'begin_fill') dependencies.push('sz_py_turtle_turtle_end_fill')
  if (concept.canonical === 'end_fill') dependencies.push('sz_py_turtle_turtle_begin_fill')
  if (['clearstamp', 'clearstamps'].includes(concept.canonical))
    dependencies.push('sz_py_turtle_turtle_stamp')
  if (concept.canonical === 'addcomponent') dependencies.push('sz_py_turtle_new_shape')
  return dependencies
}

/** One block per Turtle concept: aliases, procedural and method forms share it. */
/** A vector drawing from the Pinta as a turtle shape (formas_do_pinta, beside turtle.py). */
const PINTA_SHAPE_CODEC = pythonApiCallCodec({
  id: 'sz_py_turtle_pinta_shape',
  owner: 'python-turtle',
  title: '🎨 usar o desenho do Pinta como forma',
  category: 'Aparência',
  level: 2,
  role: 'statement',
  help: 'Transforma um desenho vetorial do Pinta numa forma da tartaruga: ela gira junto e cresce sem borrar. Depois escolha a forma pelo nome do arquivo (de assets/nave.svg sai a forma nave). O desenho fica virado para a direita, para onde a tartaruga anda.',
  api: "formas_do_pinta.registrar('assets/nave.svg')",
  callee: { kind: 'module', module: 'formas_do_pinta', names: ['registrar'] },
  params: [
    required('caminho', '', () => text('assets/nave.svg'), 'pos'),
    optional('nome', 'com o nome', () => text('nave')),
    optional('tamanho', 'com o lado maior de', () => integer('64')),
  ],
  // It needs `import formas_do_pinta`, and the next step is wearing the shape.
  dependencies: ['sz_py_import_one', 'sz_py_turtle_turtle_shape'],
})

export const PYTHON_TURTLE_CODECS: readonly PythonBlockCodec[] = [
  ...TURTLE_CONCEPTS.flatMap(codecsOf),
  PINTA_SHAPE_CODEC,
]

/** Names `from turtle import *` provides (the procedural API and the classes). */
export const TURTLE_STAR_EXPORTS: readonly string[] = [
  ...new Set(entries.filter((entry) => entry.owner === 'turtle').map((entry) => entry.name)),
]
