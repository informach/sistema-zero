/**
 * Áreas do projeto no Python (proposta aprovada em 22/11/2026).
 *
 * As seis áreas são TRECHOS do arquivo, na ordem em que o Python o lê: o código continua sendo a
 * fonte da verdade e o bloco de área não gera nada. Este módulo não conhece Blockly nem React: ele
 * classifica cada linha de topo, diz em que área ela aparece sem mexer no arquivo e calcula quando
 * é seguro mudá-la de lugar (o Python roda de cima para baixo, então trocar duas linhas só é
 * seguro quando uma não depende da outra).
 */
import { BEHAVIOR_AREA_LABELS } from '../../core/behaviorAreas'
import type { PythonNode, PythonValue } from '../language/types'
import { isNode, nodes } from './nodes'

export const PYTHON_AREA_KINDS = [
  'libraries',
  'settings',
  'molds',
  'start',
  'events',
  'loops',
] as const
export type PythonAreaKind = (typeof PYTHON_AREA_KINDS)[number]

export interface PythonAreaDefinition {
  kind: PythonAreaKind
  /** Posição no arquivo (e na leitura): 0 = primeira. */
  index: number
  /** Tipo do bloco de área no Blockly. */
  frameType: string
  title: string
  hint?: string
  colour: string
  /** A linha de comentário exata que abre a área no código. */
  marker: string
  tooltip: string
}

const area = (
  kind: PythonAreaKind,
  index: number,
  title: string,
  colour: string,
  tooltip: string,
  hint?: string,
): PythonAreaDefinition => ({
  kind,
  index,
  frameType: `sz_py_area_${kind}`,
  title,
  colour,
  tooltip,
  marker: `# ${title}`,
  ...(hint ? { hint } : {}),
})

/** As seis áreas, na ordem do arquivo. As quatro de comportamento têm os rótulos e as cores do JS. */
export const PYTHON_AREAS: readonly PythonAreaDefinition[] = Object.freeze([
  area(
    'libraries',
    0,
    '📦 Bibliotecas',
    '#2348cf',
    'As bibliotecas que o programa usa. Em Python, elas vêm sempre no começo do arquivo.',
    '· o que o programa usa',
  ),
  area(
    'settings',
    1,
    '🎛️ Configurações',
    '#e63946',
    'Os números e textos que ajustam o jogo e ficam iguais enquanto ele roda. O nome vai em MAIÚSCULAS.',
    '· os ajustes do jogo',
  ),
  area(
    'molds',
    2,
    BEHAVIOR_AREA_LABELS.molds,
    '#6366f1',
    'Aqui você cria as funções e as classes. Nada acontece ainda: quem usa cada uma é o Ao iniciar, um evento ou o laço do jogo.',
  ),
  area(
    'start',
    3,
    BEHAVIOR_AREA_LABELS.start,
    '#f97316',
    'Os blocos daqui rodam uma vez, de cima para baixo, quando o programa abre. Aqui cabe qualquer bloco.',
    '· roda uma vez',
  ),
  area(
    'events',
    4,
    BEHAVIOR_AREA_LABELS.events,
    '#eab308',
    'Os blocos daqui esperam: só rodam quando a tecla, o clique ou o fim da música acontece.',
    '· espera acontecer',
  ),
  area(
    'loops',
    5,
    BEHAVIOR_AREA_LABELS.loops,
    '#14b8a6',
    'Os blocos daqui repetem o tempo todo. O último bloco é o que liga o jogo.',
    '· repete sem parar',
  ),
])

export const PYTHON_AREA_BY_KIND: ReadonlyMap<PythonAreaKind, PythonAreaDefinition> = new Map(
  PYTHON_AREAS.map((definition) => [definition.kind, definition]),
)
export const PYTHON_AREA_BY_FRAME: ReadonlyMap<string, PythonAreaDefinition> = new Map(
  PYTHON_AREAS.map((definition) => [definition.frameType, definition]),
)
export const PYTHON_AREA_FRAME_TYPES: ReadonlySet<string> = new Set(
  PYTHON_AREAS.map((definition) => definition.frameType),
)
/** Textos exatos dos comentários de área: o único comentário que o Estúdio escreve ou apaga. */
export const PYTHON_AREA_MARKERS: ReadonlySet<string> = new Set(
  PYTHON_AREAS.map((definition) => definition.marker),
)
export const PYTHON_AREA_BY_MARKER: ReadonlyMap<string, PythonAreaDefinition> = new Map(
  PYTHON_AREAS.map((definition) => [definition.marker, definition]),
)
/** "Organizar blocos": a mesma arrumação do JavaScript, em duas fileiras. */
export const PYTHON_AREA_LAYOUT_ROWS: readonly (readonly PythonAreaKind[])[] = [
  ['libraries', 'settings'],
  ['molds', 'start', 'events', 'loops'],
]

export const pythonAreaIndex = (kind: PythonAreaKind) => PYTHON_AREA_BY_KIND.get(kind)!.index
export const isPythonAreaFrameType = (type: string) => PYTHON_AREA_FRAME_TYPES.has(type)

// ─── Os blocos de cada área ────────────────────────────────────────────────────────────────

/** Codecs de evento: a biblioteca chama ou registra a função quando algo acontece. */
export const PYTHON_EVENT_CODECS: ReadonlySet<string> = new Set([
  'sz_py_pgzero_on_key_down',
  'sz_py_pgzero_on_key_up',
  'sz_py_pgzero_on_mouse_down',
  'sz_py_pgzero_on_mouse_up',
  'sz_py_pgzero_on_mouse_move',
  'sz_py_pgzero_on_music_end',
  'sz_py_turtle_screen_onkeypress',
  'sz_py_turtle_screen_onkey',
  'sz_py_turtle_screen_listen',
  'sz_py_turtle_screen_onclick',
  'sz_py_turtle_turtle_onclick',
  'sz_py_turtle_turtle_ondrag',
  'sz_py_turtle_turtle_onrelease',
])
/** O bloco novo do Turtle: uma função que se agenda de novo com ontimer no fim. */
export const PYTHON_TURTLE_REPEAT_CODEC = 'sz_py_turtle_every'
/** Codecs do laço: o que roda a cada quadro. */
export const PYTHON_LOOP_CODECS: ReadonlySet<string> = new Set([
  'sz_py_pgzero_update',
  'sz_py_pgzero_draw',
  'sz_py_pgzero_clock_schedule_interval',
  PYTHON_TURTLE_REPEAT_CODEC,
  'sz_py_rl2d_window_loop',
  'sz_py_rl3d_window_loop',
])
/** Blocos que só servem dentro do laço do Pygame-ce: oferecê-los também oferece a área do laço. */
export const PYTHON_LOOP_OFFER_CODECS: ReadonlySet<string> = new Set([
  ...PYTHON_LOOP_CODECS,
  'sz_py_pygame_flip',
  'sz_py_pygame_update',
])
/** Configurações que o Pygame Zero lê pelo nome. */
export const PYTHON_SETTINGS_CODECS: ReadonlySet<string> = new Set([
  'sz_py_pgzero_width',
  'sz_py_pgzero_height',
  'sz_py_pgzero_title',
])
/** Blocos que ligam ou desligam o jogo: ficam no fim do programa. */
export const PYTHON_TERMINAL_CODECS: ReadonlySet<string> = new Set([
  'sz_py_pgzero_go',
  'sz_py_turtle_screen_mainloop',
  'sz_py_turtle_screen_exitonclick',
  'sz_py_rl2d_close_window',
  'sz_py_rl2d_close_audio_device',
  'sz_py_rl3d_close_window',
  'sz_py_rl3d_close_audio_device',
  'sz_py_pygame_quit',
])
export const PYTHON_TERMINAL_AFTER_LOOP_CODECS: ReadonlySet<string> = new Set([
  'sz_py_rl2d_unload_texture',
  'sz_py_rl2d_unload_sound',
  'sz_py_rl2d_unload_music_stream',
  'sz_py_rl2d_unload_image',
  'sz_py_rl3d_unload_texture',
  'sz_py_rl3d_unload_sound',
  'sz_py_rl3d_unload_music_stream',
  'sz_py_rl3d_unload_image',
])
export const PYTHON_IMPORT_CODECS: ReadonlySet<string> = new Set([
  'sz_py_import_one',
  'sz_py_import_all',
  'sz_py_import',
  'sz_py_import_from',
])
export const PYTHON_DEFINITION_CODECS: ReadonlySet<string> = new Set([
  'sz_py_def',
  'sz_py_function',
  'sz_py_class',
  'sz_py_decorated_function',
  'sz_py_decorated_class',
])
/** Os blocos de evento e de laço que abrem e fecham como as funções ("Fechar as funções"). */
export const PYTHON_COLLAPSIBLE_HAT_CODECS: ReadonlySet<string> = new Set([
  ...[...PYTHON_EVENT_CODECS].filter((id) => id.startsWith('sz_py_pgzero_on_')),
  'sz_py_pgzero_update',
  'sz_py_pgzero_draw',
  PYTHON_TURTLE_REPEAT_CODEC,
  'sz_py_rl2d_window_loop',
  'sz_py_rl3d_window_loop',
])

/** Chamadas que ligam/desligam o jogo, quando o bloco é genérico ou opaco. */
const TERMINAL_CALL_NAMES = new Set(['mainloop', 'done', 'exitonclick', 'close_window'])
const TERMINAL_RECEIVER_CALLS: ReadonlyMap<string, string> = new Map([
  ['go', 'pgzrun'],
  ['quit', 'pygame'],
])
/** Chamadas que prendem o programa ou o encerram, em qualquer lugar: nada passa por elas. */
const BLOCKING_CALL_NAMES = new Set([...TERMINAL_CALL_NAMES, 'close_audio_device'])
const BLOCKING_RECEIVER_CALLS: ReadonlyMap<string, string> = new Map([
  ...TERMINAL_RECEIVER_CALLS,
  ['exit', 'sys'],
])
const EXIT_CALL_NAMES = new Set(['exit', 'quit'])
/** Chamadas que escrevem nomes sem a sintaxe de criar nome: nada passa por elas. */
const DYNAMIC_SCOPE_CALLS = new Set([
  'exec',
  'eval',
  'compile',
  'globals',
  'locals',
  'vars',
  'setattr',
  'delattr',
  '__import__',
])
const TURTLE_REGISTRATIONS = new Set([
  'onkey',
  'onkeypress',
  'onkeyrelease',
  'onclick',
  'onscreenclick',
  'ondrag',
  'onrelease',
  'listen',
])
const CLOCK_REGISTRATIONS = new Set(['schedule', 'schedule_interval', 'schedule_unique'])
/** APIs cujo efeito depende de os registros já terem sido feitos (ou que desfazem registros). */
const REGISTRATION_SENSITIVE_APIS = new Set([
  'clear',
  'clearscreen',
  'reset',
  'resetscreen',
  'bye',
  'mainloop',
  'done',
  'exitonclick',
  'textinput',
  'numinput',
  'update',
  'ontimer',
  'unschedule',
  ...TURTLE_REGISTRATIONS,
  ...CLOCK_REGISTRATIONS,
])
/** Bibliotecas cujo import só cria nomes (não escreve nada na tela nem muda outro estado). */
const PURE_IMPORT_MODULES = new Set([
  'math',
  'random',
  'time',
  'json',
  'os',
  'sys',
  'itertools',
  'functools',
  'collections',
  'dataclasses',
  'enum',
  'string',
  'pathlib',
  'typing',
  'copy',
  'sz_audio',
  'turtle',
  'formas_do_pinta',
  'pyray',
  'raylib',
  'cenario',
  'pinta',
])
/** O `import pgzrun` do Pygame Zero de verdade escreve estes nomes no programa. */
const PGZERO_MODULES = new Set(['pgzrun', 'pgzero'])
const PGZERO_IMPORT_NAMES = [
  'Actor',
  'Rect',
  'ZRect',
  'animate',
  'clock',
  'exit',
  'images',
  'keyboard',
  'keymods',
  'keys',
  'mouse',
  'music',
  'screen',
  'sounds',
  'storage',
  'tone',
]
const SAFE_DECORATORS = new Set(['staticmethod', 'classmethod', 'property'])
/** Submódulos que existem com certeza (`import os.path`). */
const KNOWN_SUBMODULES = new Set(['os.path'])
/** Classes de fábrica que servem de base sem erro. */
const SAFE_BASE_CLASSES = new Set(['object', 'Exception'])
/** Métodos especiais que não rodam sozinhos em operadores ou leitura de atributo. */
const PLAIN_DUNDERS = new Set(['__init__', '__repr__', '__str__'])
const SETTINGS_NAME = /^[A-Z][A-Z0-9_]*$/

// ─── Análise das linhas de topo ─────────────────────────────────────────────────────────────

export type PythonAreaRole = 'pinned' | 'terminal' | 'area'

export interface PythonStatementEffects {
  /** Nomes do módulo que a linha cria ou troca (inclusive pelas funções da criança chamadas). */
  binds: Set<string>
  /** Nomes lidos na hora em que a linha roda (inclusive pelas funções da criança chamadas). */
  reads: Set<string>
  /**
   * Só cria nomes: rodar a linha não muda nem lê estado que possa mudar, não chama código e não
   * pode dar erro (def sem decorador, classe simples, import de biblioteca, configuração).
   */
  pure: boolean
  /** Ninguém passa por cima: laço de topo, chamada que prende ou encerra, erro, nó desconhecido. */
  barrier: boolean
  /** Registro de tecla/clique do Turtle ou agendamento do relógio do Pygame Zero. */
  registration: boolean
  /** Chama (direto ou pelas funções da criança) uma API que depende dos registros. */
  sensitive: boolean
}

export interface PythonStatementAreaInfo {
  role: PythonAreaRole
  /** Área preferida (para `terminal`, a do laço; para `pinned`, a primeira). */
  area: PythonAreaKind
  effects: PythonStatementEffects
}

export interface PythonModuleAreaAnalysis {
  statements: readonly PythonStatementAreaInfo[]
}

export interface PythonAreaContext {
  /** Nomes exportados por `from módulo import *` (Turtle, Pygame Zero, Raylib…). */
  starExports?: ReadonlyMap<string, readonly string[]>
  /** Módulos do próprio projeto (`from settings import *`): importar roda o código deles. */
  projectModules?: ReadonlySet<string>
}

interface UserCode {
  functions: Set<string>
  classes: Set<string>
  methods: Set<string>
  /** Nomes do módulo que não são def, classe nem import: chamar um deles pode levar a qualquer corpo. */
  moduleVars: Set<string>
  /** Nomes que guardam (ou podem guardar) uma função da criança. */
  callableVars: Set<string>
  /** Atributos que recebem valor (`obj.acao = …`): chamar `.acao()` pode levar a qualquer corpo. */
  storedAttributes: Set<string>
  repeatFunctions: Set<string>
  /** O que cada corpo faz: `f:nome`, `m:nome` (todos os métodos com o nome), `c:Classe` (criar). */
  bodies: Map<string, BodyFacts>
  /** O que algum corpo da criança lê quando roda (para a chamada que não se sabe aonde vai). */
  lazyReads: Set<string>
  /** Nomes trocados por `global` em qualquer lugar do módulo. */
  globalsWritten: Set<string>
  /** APIs chamadas dentro do código da criança. */
  apis: Set<string>
  /** Algum corpo prende o programa, encerra ou mexe nos nomes por fora. */
  anyBarrier: boolean
  /** Há classe com operador, propriedade ou atributo especial: qualquer conta pode chamar código. */
  magic: boolean
  /** Classes cuja criação de subclasse roda código (`__init_subclass__`, metaclasse). */
  hookedClasses: Set<string>
}

const str = (value: PythonValue | undefined) => (typeof value === 'string' ? value : undefined)
const child = (value: PythonNode, field: string) =>
  isNode(value.fields[field]) ? (value.fields[field] as PythonNode) : undefined
const list = (value: PythonNode, field: string) =>
  nodes(value.fields[field]) ? (value.fields[field] as PythonNode[]) : []

/** O nome chamado: `f(…)` → f; `a.b.f(…)` → f. */
function calleeName(call: PythonNode): string | undefined {
  const func = child(call, 'func')
  if (!func) return undefined
  if (func.kind === 'Name') return str(func.fields.id)
  if (func.kind === 'Attribute') return str(func.fields.attr)
  return undefined
}
function calleeRoot(call: PythonNode): string | undefined {
  let current = child(call, 'func')
  while (current?.kind === 'Attribute') current = child(current, 'value')
  return current?.kind === 'Name' ? str(current.fields.id) : undefined
}
const statementCall = (statement: PythonNode) => {
  if (statement.kind !== 'Expr') return undefined
  const value = child(statement, 'value')
  return value?.kind === 'Call' ? value : undefined
}
/** `a`, `a.b`, `a.b.c`: só nomes, sem chamada nem item. */
function isNamePath(value: PythonNode | undefined): boolean {
  if (!value) return false
  if (value.kind === 'Name') return true
  return value.kind === 'Attribute' && isNamePath(child(value, 'value'))
}

function isTerminalKind(statement: PythonNode, codecId: string | undefined, afterLoop: boolean) {
  if (codecId && PYTHON_TERMINAL_CODECS.has(codecId)) return true
  if (afterLoop && codecId && PYTHON_TERMINAL_AFTER_LOOP_CODECS.has(codecId)) return true
  const call = statementCall(statement)
  if (!call) return false
  const nameOf = calleeName(call)
  if (!nameOf) return false
  if (TERMINAL_CALL_NAMES.has(nameOf)) return true
  if (nameOf === 'close_audio_device') return true
  if (afterLoop && (nameOf.startsWith('unload_') || nameOf.startsWith('close_'))) return true
  const receiver = TERMINAL_RECEIVER_CALLS.get(nameOf)
  return !!receiver && calleeRoot(call) === receiver
}

/** O `while` do laço do Pygame-ce: o corpo lê os eventos, troca a tela ou espera o relógio. */
function isPygameLoop(statement: PythonNode) {
  if (statement.kind !== 'While') return false
  let found = false
  const visit = (value: PythonValue | undefined) => {
    if (found) return
    if (Array.isArray(value)) {
      for (const item of value) visit(item)
      return
    }
    if (!isNode(value)) return
    if (
      value.kind === 'FunctionDef' ||
      value.kind === 'AsyncFunctionDef' ||
      value.kind === 'Lambda'
    )
      return
    if (value.kind === 'Call') {
      const func = child(value, 'func')
      if (func?.kind === 'Attribute') {
        const attr = str(func.fields.attr)
        const owner = child(func, 'value')
        const ownerAttr = owner?.kind === 'Attribute' ? str(owner.fields.attr) : undefined
        if (attr === 'tick') found = true
        if ((attr === 'flip' || attr === 'update') && ownerAttr === 'display') found = true
        if (attr === 'get' && ownerAttr === 'event') found = true
      }
    }
    for (const field of Object.values(value.fields)) visit(field)
  }
  visit(list(statement, 'body'))
  return found
}

const isGameLoop = (statement: PythonNode, codecId: string | undefined) =>
  (statement.kind === 'While' && !!codecId && PYTHON_LOOP_CODECS.has(codecId)) ||
  isPygameLoop(statement)

const isDocstring = (statement: PythonNode, index: number) =>
  index === 0 &&
  statement.kind === 'Expr' &&
  child(statement, 'value')?.kind === 'Constant' &&
  typeof child(statement, 'value')!.fields.value === 'string'

const isFutureImport = (statement: PythonNode) =>
  statement.kind === 'ImportFrom' && statement.fields.module === '__future__'

// ─── Configurações: valor que se calcula com segurança ─────────────────────────────────────

/** O que se sabe de um valor de configuração (imutável, calculado sem erro). */
interface SafeValue {
  kind: 'int' | 'float' | 'bool' | 'str' | 'none' | 'tuple'
  /** Número conhecido (só inteiros pequenos), para repetição e expoente. */
  exact?: number
  /** Certeza de que não é zero (pode dividir por ele). */
  nonzero?: boolean
}

const numeric = (value: SafeValue) =>
  value.kind === 'int' || value.kind === 'float' || value.kind === 'bool'

function literalValue(value: PythonValue | undefined): SafeValue | undefined {
  if (value === null) return { kind: 'none' }
  if (typeof value === 'boolean') return { kind: 'bool', exact: value ? 1 : 0, nonzero: value }
  if (typeof value === 'string') return { kind: 'str' }
  if (value && typeof value === 'object' && !Array.isArray(value) && 'literal' in value) {
    if (value.literal === 'int' && typeof value.value === 'string') {
      const exact = Number(value.value)
      return {
        kind: 'int',
        ...(Number.isSafeInteger(exact) && Math.abs(exact) < 1e9 ? { exact } : {}),
        nonzero: value.value !== '0' && value.value !== '-0',
      }
    }
    if (value.literal === 'float' && typeof value.value === 'string')
      return { kind: 'float', nonzero: !/^-?0x0(\.0*)?p[+-]?\d+$/.test(value.value) }
  }
  return undefined
}

/** Avalia o valor de uma configuração sem rodar nada: undefined se pode dar erro ou é mutável. */
function safeEvaluate(
  value: PythonNode | undefined,
  known: ReadonlyMap<string, SafeValue>,
): SafeValue | undefined {
  if (!value) return undefined
  switch (value.kind) {
    case 'Constant':
      return literalValue(value.fields.value)
    case 'Name':
      return known.get(str(value.fields.id) ?? '')
    case 'Tuple': {
      const items = list(value, 'elts').map((item) => safeEvaluate(item, known))
      return items.every(Boolean) ? { kind: 'tuple', nonzero: items.length > 0 } : undefined
    }
    case 'UnaryOp': {
      const operand = safeEvaluate(child(value, 'operand'), known)
      const op = child(value, 'op')?.kind
      if (!operand) return undefined
      if (op === 'Not') return { kind: 'bool' }
      if (!numeric(operand)) return undefined
      if (op === 'USub' || op === 'UAdd')
        return {
          kind: operand.kind === 'bool' ? 'int' : operand.kind,
          ...(operand.exact !== undefined
            ? { exact: op === 'USub' ? -operand.exact : operand.exact }
            : {}),
          ...(operand.nonzero ? { nonzero: true } : {}),
        }
      if (op === 'Invert' && operand.kind !== 'float') return { kind: 'int' }
      return undefined
    }
    case 'BinOp': {
      const left = safeEvaluate(child(value, 'left'), known)
      const right = safeEvaluate(child(value, 'right'), known)
      const op = child(value, 'op')?.kind
      if (!left || !right) return undefined
      const repeat = (sequence: SafeValue, count: SafeValue) =>
        (sequence.kind === 'str' || sequence.kind === 'tuple') &&
        (count.kind === 'int' || count.kind === 'bool') &&
        count.exact !== undefined &&
        Math.abs(count.exact) <= 10_000
          ? { kind: sequence.kind }
          : undefined
      if (numeric(left) && numeric(right)) {
        const floating = left.kind === 'float' || right.kind === 'float'
        const kind: SafeValue['kind'] = floating ? 'float' : 'int'
        if (op === 'Add' || op === 'Sub' || op === 'Mult') return { kind }
        if (op === 'Div') return right.nonzero ? { kind: 'float' } : undefined
        if (op === 'FloorDiv' || op === 'Mod') return right.nonzero ? { kind } : undefined
        if (op === 'Pow')
          return right.kind === 'int' &&
            right.exact !== undefined &&
            right.exact >= 0 &&
            right.exact <= 64
            ? { kind }
            : undefined
        return undefined
      }
      if (
        op === 'Add' &&
        left.kind === right.kind &&
        (left.kind === 'str' || left.kind === 'tuple')
      )
        return { kind: left.kind }
      if (op === 'Mult') return repeat(left, right) ?? repeat(right, left)
      return undefined
    }
    default:
      return undefined
  }
}

/** Os nomes que a atribuição cria, se todos forem nomes simples (`A = 1`, `A, B = 1, 2`). */
function assignedNames(statement: PythonNode): string[] | undefined {
  const targets =
    statement.kind === 'Assign'
      ? list(statement, 'targets')
      : statement.kind === 'AnnAssign'
        ? [child(statement, 'target')].filter((item): item is PythonNode => !!item)
        : []
  if (!targets.length || (statement.kind === 'Assign' && targets.length !== 1)) return undefined
  const out: string[] = []
  const collect = (target: PythonNode): boolean => {
    if (target.kind === 'Name') {
      const id = str(target.fields.id)
      if (!id) return false
      out.push(id)
      return true
    }
    if (target.kind === 'Tuple' || target.kind === 'List')
      return list(target, 'elts').every(collect)
    return false
  }
  return targets.every(collect) ? out : undefined
}

/** O valor de cada nome de uma configuração, ou undefined se a linha não é configuração. */
function settingsValues(
  statement: PythonNode,
  known: ReadonlyMap<string, SafeValue>,
): Map<string, SafeValue> | undefined {
  if (statement.kind !== 'Assign' && statement.kind !== 'AnnAssign') return undefined
  const names = assignedNames(statement)
  if (!names?.length || !names.every((id) => SETTINGS_NAME.test(id))) return undefined
  const value = child(statement, 'value')
  if (!value) return undefined
  if (names.length === 1) {
    const target = statement.kind === 'Assign' ? list(statement, 'targets')[0] : undefined
    if (target && target.kind !== 'Name') return undefined
    const evaluated = safeEvaluate(value, known)
    return evaluated ? new Map([[names[0]!, evaluated]]) : undefined
  }
  // `A, B = 1, 2`: a mesma quantidade dos dois lados, um valor seguro por nome.
  const target = list(statement, 'targets')[0]
  const values = value.kind === 'Tuple' ? list(value, 'elts') : undefined
  if (!target || !values || list(target, 'elts').some((item) => item.kind !== 'Name'))
    return undefined
  if (values.length !== names.length) return undefined
  const out = new Map<string, SafeValue>()
  for (let index = 0; index < names.length; index++) {
    const evaluated = safeEvaluate(values[index], known)
    if (!evaluated) return undefined
    out.set(names[index]!, evaluated)
  }
  return out
}

/**
 * A regra de "Configurações" de uma linha só, sem olhar o resto do módulo (é a do arraste):
 * nome(s) em MAIÚSCULAS e valor imutável que se calcula sem erro.
 */
export function isPythonSettingsStatement(statement: PythonNode, codecId?: string): boolean {
  if (codecId && PYTHON_SETTINGS_CODECS.has(codecId)) {
    const names = assignedNames(statement)
    return !!names && names.length === 1 && !!safeEvaluate(child(statement, 'value'), new Map())
  }
  return !!settingsValues(statement, new Map())
}

// ─── Efeitos ───────────────────────────────────────────────────────────────────────────────

interface Walk {
  binds: Set<string>
  reads: Set<string>
  barrier: boolean
  /** Os corpos da criança que a linha pode rodar agora. */
  targets: CallTargets
  /** Lambdas chamadas na hora ou entregues a quem pode chamar. */
  inline: BodyFacts[]
  apis: Set<string>
}

const COMPOUND_FIELDS = ['body', 'orelse', 'finalbody', 'handlers', 'cases'] as const

const STATEMENT_KINDS = new Set([
  'Expr',
  'Assign',
  'AnnAssign',
  'AugAssign',
  'Import',
  'ImportFrom',
  'FunctionDef',
  'AsyncFunctionDef',
  'ClassDef',
  'If',
  'For',
  'While',
  'With',
  'Try',
  'TryStar',
  'Match',
  'Delete',
  'Pass',
  'Global',
  'Nonlocal',
  'Raise',
  'Assert',
  'Break',
  'Continue',
  'TypeAlias',
])

function argumentParts(args: PythonNode | undefined) {
  if (!args)
    return {
      eager: [] as PythonValue[],
      defaults: [] as PythonValue[],
      annotations: [] as PythonValue[],
    }
  const params = [
    ...list(args, 'posonlyargs'),
    ...list(args, 'args'),
    ...list(args, 'kwonlyargs'),
    child(args, 'vararg'),
    child(args, 'kwarg'),
  ].filter((item): item is PythonNode => !!item)
  const defaults = [
    ...list(args, 'defaults'),
    ...(Array.isArray(args.fields.kw_defaults) ? (args.fields.kw_defaults as PythonValue[]) : []),
  ]
  const annotations = params.map((param) => param.fields.annotation ?? null)
  return { eager: [...defaults, ...annotations], defaults, annotations }
}

/** Para onde uma chamada pode levar: corpos da criança (`f:`, `m:`, `c:`) ou "não sei". */
interface CallTargets {
  keys: Set<string>
  unknown: boolean
}

/** O que um corpo da criança (função, método, criação de objeto, lambda) faz quando roda. */
interface BodyFacts {
  reads: Set<string>
  /** Nomes do módulo trocados por `global`. */
  globals: Set<string>
  apis: Set<string>
  targets: CallTargets
  /** Prende o programa, encerra ou mexe nos nomes por fora (`exec`, `globals()`). */
  barrier: boolean
}

const emptyFacts = (): BodyFacts => ({
  reads: new Set(),
  globals: new Set(),
  apis: new Set(),
  targets: { keys: new Set(), unknown: false },
  barrier: false,
})

function mergeFacts(into: BodyFacts, from: BodyFacts) {
  for (const id of from.reads) into.reads.add(id)
  for (const id of from.globals) into.globals.add(id)
  for (const id of from.apis) into.apis.add(id)
  for (const key of from.targets.keys) into.targets.keys.add(key)
  if (from.targets.unknown) into.targets.unknown = true
  if (from.barrier) into.barrier = true
}

const NO_LOCALS: ReadonlySet<string> = new Set()
const COMPREHENSION_KINDS = new Set(['ListComp', 'SetComp', 'DictComp', 'GeneratorExp'])
const SAFE_CLASS_DECORATORS = new Set(['dataclass'])

/** `while True` / `while 1`: o laço só para por dentro. */
function truthyConstant(value: PythonValue | undefined) {
  if (value === true) return true
  if (value && typeof value === 'object' && !Array.isArray(value) && 'literal' in value)
    return value.literal === 'int' && value.value !== '0'
  return false
}

function isBlockingCall(call: PythonNode) {
  const called = calleeName(call)
  if (!called) return false
  if (BLOCKING_CALL_NAMES.has(called)) return true
  const receiver = BLOCKING_RECEIVER_CALLS.get(called)
  if (receiver && calleeRoot(call) === receiver) return true
  return child(call, 'func')?.kind === 'Name' && EXIT_CALL_NAMES.has(called)
}

function parameterNames(params: PythonNode | undefined) {
  if (!params) return []
  return [
    ...list(params, 'posonlyargs'),
    ...list(params, 'args'),
    ...list(params, 'kwonlyargs'),
    child(params, 'vararg'),
    child(params, 'kwarg'),
  ]
    .filter((item): item is PythonNode => !!item)
    .map((param) => str(param.fields.arg) ?? '')
}

/**
 * Os nomes de um escopo, sem entrar nas funções, classes, lambdas e compreensões de dentro:
 * `variables` (atribuição, `for`, `with`, `except`…), `definitions` (def, classe, import) e os
 * declarados `global`/`nonlocal` (que NÃO são do escopo).
 */
function scopeNames(params: PythonNode | undefined, body: PythonValue) {
  const variables = new Set<string>()
  const definitions = new Set<string>()
  const declared = new Set<string>()
  const visit = (value: PythonValue | undefined) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item)
      return
    }
    if (!isNode(value)) return
    switch (value.kind) {
      case 'Global':
      case 'Nonlocal':
        for (const id of value.fields.names as string[]) declared.add(id)
        return
      case 'Name':
        if (isNode(value.fields.ctx) && value.fields.ctx.kind !== 'Load')
          variables.add(str(value.fields.id) ?? '')
        return
      case 'FunctionDef':
      case 'AsyncFunctionDef':
      case 'ClassDef':
        definitions.add(str(value.fields.name) ?? '')
        visit(value.fields.decorator_list)
        return
      case 'Lambda':
        return
      case 'Import':
      case 'ImportFrom':
        for (const alias of list(value, 'names')) {
          const id = str(alias.fields.asname) ?? (str(alias.fields.name) ?? '').split('.')[0]!
          if (id !== '*') definitions.add(id)
        }
        return
      case 'ExceptHandler':
        if (str(value.fields.name)) variables.add(str(value.fields.name)!)
        break
    }
    if (COMPREHENSION_KINDS.has(value.kind)) return
    for (const field of Object.values(value.fields)) visit(field)
  }
  visit(body)
  return { params: parameterNames(params), variables, definitions, declared }
}

function scopeLocals(params: PythonNode | undefined, body: PythonValue) {
  const names = scopeNames(params, body)
  const locals = new Set([...names.params, ...names.variables, ...names.definitions])
  for (const id of names.declared) locals.delete(id)
  locals.delete('')
  return locals
}

function comprehensionTargets(value: PythonNode, into: Set<string>) {
  const collect = (target: PythonValue | undefined) => {
    if (Array.isArray(target)) {
      for (const item of target) collect(item)
      return
    }
    if (!isNode(target)) return
    if (target.kind === 'Name') into.add(str(target.fields.id) ?? '')
    else if (target.kind === 'Tuple' || target.kind === 'List') collect(target.fields.elts)
    else if (target.kind === 'Starred') collect(target.fields.value)
  }
  for (const generator of list(value, 'generators')) collect(generator.fields.target)
}

/** Função passada como argumento: quem recebe pode chamá-la na hora. */
function callbackTargets(value: PythonNode | undefined, user: UserCode, into: CallTargets) {
  if (!value) return
  if (value.kind === 'Starred') {
    callbackTargets(child(value, 'value'), user, into)
    return
  }
  if (value.kind === 'Name') {
    const id = str(value.fields.id) ?? ''
    if (user.callableVars.has(id)) into.unknown = true
    else if (user.functions.has(id)) into.keys.add(`f:${id}`)
    else if (user.classes.has(id)) into.keys.add(`c:${id}`)
  } else if (value.kind === 'Attribute') {
    const attr = str(value.fields.attr) ?? ''
    if (user.methods.has(attr)) into.keys.add(`m:${attr}`)
  }
}

/** Para onde a chamada pode levar (a lambda chamada na hora é contada por quem a vê). */
function callTargets(
  call: PythonNode,
  user: UserCode,
  locals: ReadonlySet<string>,
  into: CallTargets,
) {
  const func = child(call, 'func')
  if (func?.kind === 'Name') {
    const id = str(func.fields.id) ?? ''
    // Nome local, parâmetro ou variável do módulo pode guardar qualquer função.
    if (locals.has(id) || user.moduleVars.has(id)) into.unknown = true
    else if (user.functions.has(id)) into.keys.add(`f:${id}`)
    else if (user.classes.has(id)) into.keys.add(`c:${id}`)
  } else if (func?.kind === 'Attribute') {
    const attr = str(func.fields.attr) ?? ''
    if (user.methods.has(attr)) into.keys.add(`m:${attr}`)
    if (user.storedAttributes.has(attr)) into.unknown = true
  } else if (func?.kind !== 'Lambda') into.unknown = true
  for (const argument of list(call, 'args')) callbackTargets(argument, user, into)
  for (const keyword of list(call, 'keywords')) callbackTargets(child(keyword, 'value'), user, into)
}

/** O decorador é chamado com a função (ou a classe); `@fabrica(…)` devolve um decorador que ninguém conhece. */
function decoratorTargets(
  decorator: PythonNode,
  user: UserCode,
  locals: ReadonlySet<string>,
  into: CallTargets,
) {
  const factory = decorator.kind === 'Call'
  const call = factory
    ? decorator
    : { ...decorator, kind: 'Call', fields: { func: decorator, args: [], keywords: [] } }
  const before = into.keys.size
  const wasUnknown = into.unknown
  callTargets(call as PythonNode, user, locals, into)
  if (factory && (into.keys.size > before || (into.unknown && !wasUnknown))) into.unknown = true
}

/** O que o corpo faz quando roda (contando as funções, lambdas e compreensões de dentro). */
function bodyFacts(
  params: PythonNode | undefined,
  body: PythonValue,
  user: UserCode,
  outer: ReadonlySet<string> = NO_LOCALS,
): BodyFacts {
  const facts = emptyFacts()
  const visit = (value: PythonValue | undefined, locals: ReadonlySet<string>): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item, locals)
      return
    }
    if (!isNode(value)) return
    switch (value.kind) {
      case 'Name':
        if (isNode(value.fields.ctx) && value.fields.ctx.kind === 'Load') {
          const id = str(value.fields.id) ?? ''
          if (!locals.has(id)) facts.reads.add(id)
        }
        return
      case 'Global':
        for (const id of value.fields.names as string[]) facts.globals.add(id)
        return
      case 'FunctionDef':
      case 'AsyncFunctionDef':
      case 'Lambda': {
        visit(value.fields.decorator_list, locals)
        visit(argumentParts(child(value, 'args')).eager, locals)
        const inner = new Set([...locals, ...scopeLocals(child(value, 'args'), value.fields.body)])
        visit(value.fields.body, inner)
        return
      }
      case 'Call': {
        const called = calleeName(value)
        if (called) facts.apis.add(called)
        if (isBlockingCall(value)) facts.barrier = true
        if (child(value, 'func')?.kind === 'Name' && DYNAMIC_SCOPE_CALLS.has(called ?? '')) {
          facts.barrier = true
          facts.targets.unknown = true
        }
        callTargets(value, user, locals, facts.targets)
        break
      }
      case 'While':
        if (truthyConstant(child(value, 'test')?.fields.value)) facts.barrier = true
        break
    }
    if (COMPREHENSION_KINDS.has(value.kind)) {
      const inner = new Set(locals)
      comprehensionTargets(value, inner)
      for (const field of Object.values(value.fields)) visit(field, inner)
      return
    }
    for (const field of Object.values(value.fields)) visit(field, locals)
  }
  visit(body, new Set([...outer, ...scopeLocals(params, body)]))
  facts.reads.delete('')
  return facts
}

/** Percorre as linhas de topo e os corpos compostos de topo (if/for/with/try/match), sem entrar em função. */
function moduleScopeStatements(body: readonly PythonNode[]): PythonNode[] {
  const out: PythonNode[] = []
  const visit = (statement: PythonNode) => {
    out.push(statement)
    if (
      statement.kind === 'FunctionDef' ||
      statement.kind === 'AsyncFunctionDef' ||
      statement.kind === 'ClassDef'
    )
      return
    for (const field of COMPOUND_FIELDS)
      for (const item of list(statement, field)) {
        if (item.kind === 'ExceptHandler' || item.kind === 'match_case')
          for (const inner of list(item, 'body')) visit(inner)
        else visit(item)
      }
  }
  for (const statement of body) visit(statement)
  return out
}

/** O valor pode ser (ou guardar) uma função da criança: lambda, nome de função/classe, método. */
function holdsCallable(value: PythonValue | undefined, user: UserCode): boolean {
  if (Array.isArray(value)) return value.some((item) => holdsCallable(item, user))
  if (!isNode(value)) return false
  if (value.kind === 'Lambda') return true
  if (value.kind === 'Name') {
    const id = str(value.fields.id) ?? ''
    return user.functions.has(id) || user.classes.has(id) || user.callableVars.has(id)
  }
  if (value.kind === 'Attribute' && user.methods.has(str(value.fields.attr) ?? '')) return true
  // O resultado de uma chamada não é a função chamada (só os argumentos contam).
  if (value.kind === 'Call')
    return holdsCallable(value.fields.args, user) || holdsCallable(value.fields.keywords, user)
  return Object.values(value.fields).some((field) => holdsCallable(field, user))
}

function collectUserCode(module: PythonNode, codecIds: readonly (string | undefined)[]): UserCode {
  const body = list(module, 'body')
  const user: UserCode = {
    functions: new Set(),
    classes: new Set(),
    methods: new Set(),
    moduleVars: new Set(),
    callableVars: new Set(),
    storedAttributes: new Set(),
    repeatFunctions: new Set(),
    bodies: new Map(),
    lazyReads: new Set(),
    globalsWritten: new Set(),
    apis: new Set(),
    anyBarrier: false,
    magic: false,
    hookedClasses: new Set(),
  }
  body.forEach((statement, index) => {
    if (
      (statement.kind === 'FunctionDef' || statement.kind === 'AsyncFunctionDef') &&
      codecIds[index] === PYTHON_TURTLE_REPEAT_CODEC
    )
      user.repeatFunctions.add(str(statement.fields.name) ?? '')
  })
  // 1ª passada: os nomes de função, classe e método.
  const functionNodes: PythonNode[] = []
  const classNodes: PythonNode[] = []
  for (const statement of moduleScopeStatements(body)) {
    if (statement.kind === 'FunctionDef' || statement.kind === 'AsyncFunctionDef') {
      user.functions.add(str(statement.fields.name) ?? '')
      functionNodes.push(statement)
    }
    if (statement.kind !== 'ClassDef') continue
    const className = str(statement.fields.name) ?? ''
    user.classes.add(className)
    classNodes.push(statement)
    if (list(statement, 'keywords').length) user.hookedClasses.add(className)
    for (const member of list(statement, 'body')) {
      if (member.kind !== 'FunctionDef' && member.kind !== 'AsyncFunctionDef') continue
      const memberName = str(member.fields.name) ?? ''
      user.methods.add(memberName)
      if (memberName === '__init_subclass__') user.hookedClasses.add(className)
      if (/^__.+__$/.test(memberName) && !PLAIN_DUNDERS.has(memberName)) user.magic = true
      if (
        list(member, 'decorator_list').some(
          (decorator) => !(decorator.kind === 'Name' && str(decorator.fields.id) !== 'property'),
        )
      )
        user.magic = true
    }
  }
  // `global` em qualquer lugar, atributos que recebem valor e nomes que guardam funções.
  const visit = (value: PythonValue | undefined) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item)
      return
    }
    if (!isNode(value)) return
    if (value.kind === 'Global')
      for (const id of value.fields.names as string[]) user.globalsWritten.add(id)
    if (value.kind === 'Attribute' && isNode(value.fields.ctx) && value.fields.ctx.kind !== 'Load')
      user.storedAttributes.add(str(value.fields.attr) ?? '')
    for (const field of Object.values(value.fields)) visit(field)
  }
  visit(body)
  // Nome que recebe uma função (direto ou dentro de lista/dicionário) passa a guardar função; o
  // ponto fixo pega `b = a` depois de `a = f`.
  let grew = true
  while (grew) {
    grew = false
    const assignments = (value: PythonValue | undefined) => {
      if (Array.isArray(value)) {
        for (const item of value) assignments(item)
        return
      }
      if (!isNode(value)) return
      const targets =
        value.kind === 'Assign'
          ? value.fields.targets
          : value.kind === 'AnnAssign' || value.kind === 'AugAssign' || value.kind === 'NamedExpr'
            ? value.fields.target
            : value.kind === 'For'
              ? value.fields.target
              : undefined
      const source = value.kind === 'For' ? value.fields.iter : value.fields.value
      if (targets !== undefined && holdsCallable(source, user)) {
        const names = new Set<string>()
        const collect = (target: PythonValue | undefined) => {
          if (Array.isArray(target)) {
            for (const item of target) collect(item)
            return
          }
          if (!isNode(target)) return
          if (target.kind === 'Name') names.add(str(target.fields.id) ?? '')
          else if (target.kind === 'Tuple' || target.kind === 'List') collect(target.fields.elts)
          else if (target.kind === 'Starred') collect(target.fields.value)
        }
        collect(targets)
        for (const id of names)
          if (!user.callableVars.has(id)) {
            user.callableVars.add(id)
            grew = true
          }
      }
      for (const field of Object.values(value.fields)) assignments(field)
    }
    assignments(body)
  }
  const moduleScope = scopeNames(undefined, body)
  user.moduleVars = new Set([...moduleScope.variables, ...user.globalsWritten])
  user.moduleVars.delete('')
  // 2ª passada: o que cada corpo faz.
  const add = (key: string, facts: BodyFacts) => {
    const current = user.bodies.get(key)
    if (current) mergeFacts(current, facts)
    else user.bodies.set(key, facts)
  }
  for (const definition of functionNodes)
    add(
      `f:${str(definition.fields.name) ?? ''}`,
      bodyFacts(child(definition, 'args'), definition.fields.body, user),
    )
  const classByName = new Map<string, PythonNode[]>()
  for (const definition of classNodes) {
    const className = str(definition.fields.name) ?? ''
    classByName.set(className, [...(classByName.get(className) ?? []), definition])
    for (const member of list(definition, 'body'))
      if (member.kind === 'FunctionDef' || member.kind === 'AsyncFunctionDef')
        add(
          `m:${str(member.fields.name) ?? ''}`,
          bodyFacts(child(member, 'args'), member.fields.body, user),
        )
  }
  // Criar um objeto roda o `__init__` (e companhia) da família; com base de biblioteca, a
  // biblioteca pode chamar qualquer método da criança.
  for (const className of classByName.keys()) {
    const facts = emptyFacts()
    const family = new Set<string>()
    const queue = [className]
    let foreignBase = false
    while (queue.length) {
      const current = queue.pop()!
      if (family.has(current)) continue
      family.add(current)
      for (const definition of classByName.get(current) ?? []) {
        if (list(definition, 'keywords').length) facts.targets.unknown = true
        if (
          list(definition, 'decorator_list').some(
            (decorator) =>
              !(
                decorator.kind === 'Name' &&
                SAFE_CLASS_DECORATORS.has(str(decorator.fields.id) ?? '')
              ),
          )
        )
          facts.targets.unknown = true
        for (const base of list(definition, 'bases')) {
          const id = base.kind === 'Name' ? (str(base.fields.id) ?? '') : ''
          if (user.classes.has(id)) queue.push(id)
          else if (id !== 'object') foreignBase = true
        }
      }
    }
    const familyMethods = new Set<string>()
    for (const member of family)
      for (const definition of classByName.get(member) ?? []) {
        // O corpo da classe pode guardar fábricas que rodam ao criar (`field(default_factory=…)`).
        const plain = list(definition, 'body').filter(
          (item) => item.kind !== 'FunctionDef' && item.kind !== 'AsyncFunctionDef',
        )
        mergeFacts(facts, bodyFacts(undefined, plain, user))
        for (const item of list(definition, 'body'))
          if (item.kind === 'FunctionDef' || item.kind === 'AsyncFunctionDef')
            familyMethods.add(str(item.fields.name) ?? '')
      }
    for (const method of familyMethods)
      if (
        foreignBase ||
        method === '__init__' ||
        method === '__new__' ||
        method === '__post_init__'
      )
        facts.targets.keys.add(`m:${method}`)
    add(`c:${className}`, facts)
  }
  // Para a chamada que não se sabe aonde vai: tudo o que algum corpo (ou lambda) faz.
  const everything = emptyFacts()
  for (const facts of user.bodies.values()) mergeFacts(everything, facts)
  const lambdas = (value: PythonValue | undefined) => {
    if (Array.isArray(value)) {
      for (const item of value) lambdas(item)
      return
    }
    if (!isNode(value)) return
    if (value.kind === 'Lambda')
      mergeFacts(everything, bodyFacts(child(value, 'args'), value.fields.body, user))
    for (const field of Object.values(value.fields)) lambdas(field)
  }
  lambdas(body)
  user.lazyReads = everything.reads
  user.apis = everything.apis
  user.anyBarrier = everything.barrier
  for (const id of everything.globals) user.globalsWritten.add(id)
  return user
}

/** Tudo o que roda a partir das chamadas de uma linha (seguindo quem chama quem). */
function reachOf(targets: CallTargets, inline: readonly BodyFacts[], user: UserCode): BodyFacts {
  const out = emptyFacts()
  out.targets.unknown = targets.unknown
  const queue = [...targets.keys]
  const seen = new Set(queue)
  const absorb = (facts: BodyFacts) => {
    mergeFacts(out, { ...facts, targets: { keys: new Set(), unknown: facts.targets.unknown } })
    for (const key of facts.targets.keys)
      if (!seen.has(key)) {
        seen.add(key)
        queue.push(key)
      }
  }
  for (const facts of inline) absorb(facts)
  while (queue.length) {
    const facts = user.bodies.get(queue.pop()!)
    if (facts) absorb(facts)
  }
  return out
}

function walkStatement(statement: PythonNode, user: UserCode, context: PythonAreaContext): Walk {
  const walk: Walk = {
    binds: new Set(),
    reads: new Set(),
    barrier: false,
    targets: { keys: new Set(), unknown: false },
    inline: [],
    apis: new Set(),
  }
  const bindTarget = (target: PythonValue | undefined) => {
    if (Array.isArray(target)) {
      for (const item of target) bindTarget(item)
      return
    }
    if (!isNode(target)) return
    if (target.kind === 'Name') walk.binds.add(str(target.fields.id) ?? '')
    else if (target.kind === 'Tuple' || target.kind === 'List') bindTarget(target.fields.elts)
    else if (target.kind === 'Starred') bindTarget(target.fields.value)
    else {
      expression(target.fields.value)
      if (target.kind === 'Subscript') expression(target.fields.slice)
    }
  }
  const collectTargets = (target: PythonValue | undefined, into: Set<string>) => {
    if (Array.isArray(target)) {
      for (const item of target) collectTargets(item, into)
      return
    }
    if (!isNode(target)) return
    if (target.kind === 'Name') into.add(str(target.fields.id) ?? '')
    else if (target.kind === 'Tuple' || target.kind === 'List' || target.kind === 'Starred')
      collectTargets(target.kind === 'Starred' ? target.fields.value : target.fields.elts, into)
  }
  const expression = (value: PythonValue | undefined, locals?: ReadonlySet<string>): void => {
    if (Array.isArray(value)) {
      for (const item of value) expression(item, locals)
      return
    }
    if (!isNode(value)) return
    switch (value.kind) {
      case 'Name': {
        const id = str(value.fields.id) ?? ''
        const usage = isNode(value.fields.ctx) ? value.fields.ctx.kind : 'Load'
        if (locals?.has(id)) return
        if (usage === 'Load') walk.reads.add(id)
        else walk.binds.add(id)
        return
      }
      case 'Lambda':
        // O corpo da lambda só roda quando alguém chama.
        expression(argumentParts(child(value, 'args')).eager, locals)
        return
      case 'ListComp':
      case 'SetComp':
      case 'DictComp':
      case 'GeneratorExp': {
        const inner = new Set(locals)
        for (const generator of list(value, 'generators')) {
          expression(generator.fields.iter, inner)
          collectTargets(generator.fields.target, inner)
          expression(generator.fields.ifs, inner)
        }
        expression(value.fields.elt, inner)
        expression(value.fields.key, inner)
        expression(value.fields.value, inner)
        return
      }
      case 'NamedExpr': {
        const target = child(value, 'target')
        if (target?.kind === 'Name') walk.binds.add(str(target.fields.id) ?? '')
        expression(value.fields.value, locals)
        return
      }
      case 'Call': {
        const called = calleeName(value)
        if (called) walk.apis.add(called)
        const func = child(value, 'func')
        if (isBlockingCall(value)) walk.barrier = true
        if (func?.kind === 'Name' && DYNAMIC_SCOPE_CALLS.has(called ?? '')) walk.barrier = true
        if (calleeRoot(value) === 'sys' && called === 'exit') walk.barrier = true
        callTargets(value, user, locals ?? NO_LOCALS, walk.targets)
        // A lambda chamada na hora, ou entregue a quem pode chamar, roda agora.
        const keywordValues = list(value, 'keywords').map((keyword) => child(keyword, 'value'))
        for (const item of [func, ...list(value, 'args'), ...keywordValues])
          if (item?.kind === 'Lambda')
            walk.inline.push(bodyFacts(child(item, 'args'), item.fields.body, user, locals))
        expression(value.fields.func, locals)
        expression(value.fields.args, locals)
        expression(value.fields.keywords, locals)
        return
      }
      case 'Await':
      case 'Yield':
      case 'YieldFrom':
        walk.barrier = true
        break
    }
    for (const field of Object.values(value.fields)) expression(field, locals)
  }
  const definition = (value: PythonNode) => {
    const decorators = list(value, 'decorator_list')
    for (const decorator of decorators) decoratorTargets(decorator, user, NO_LOCALS, walk.targets)
    expression(decorators)
    expression(argumentParts(child(value, 'args')).eager)
    expression(value.fields.returns)
    expression(value.fields.type_params)
  }
  const collectPatternBinds = (pattern: PythonValue | undefined) => {
    if (Array.isArray(pattern)) {
      for (const item of pattern) collectPatternBinds(item)
      return
    }
    if (!isNode(pattern)) return
    for (const field of ['name', 'rest'])
      if (str(pattern.fields[field])) walk.binds.add(str(pattern.fields[field])!)
    if (pattern.kind === 'MatchValue') expression(pattern.fields.value)
    if (pattern.kind === 'MatchClass') expression(pattern.fields.cls)
    for (const field of Object.values(pattern.fields))
      if (Array.isArray(field) || isNode(field)) collectPatternBinds(field)
  }
  const statementBody = (value: PythonValue | undefined): void => {
    if (Array.isArray(value)) {
      for (const item of value) statementBody(item)
      return
    }
    if (!isNode(value)) return
    if (!STATEMENT_KINDS.has(value.kind)) {
      walk.barrier = true
      return
    }
    switch (value.kind) {
      case 'FunctionDef':
      case 'AsyncFunctionDef':
        definition(value)
        walk.binds.add(str(value.fields.name) ?? '')
        return
      case 'ClassDef': {
        expression(value.fields.decorator_list)
        expression(value.fields.bases)
        expression(value.fields.keywords)
        expression(value.fields.type_params)
        for (const decorator of list(value, 'decorator_list'))
          decoratorTargets(decorator, user, NO_LOCALS, walk.targets)
        // Metaclasse e base que reage a subclasses rodam código ao criar a classe.
        if (
          list(value, 'keywords').length ||
          list(value, 'bases').some(
            (base) => base.kind === 'Name' && user.hookedClasses.has(str(base.fields.id) ?? ''),
          )
        )
          walk.targets.unknown = true
        // O corpo da classe roda na hora; os nomes criados nele são da classe, não do módulo.
        for (const member of list(value, 'body')) {
          if (member.kind === 'FunctionDef' || member.kind === 'AsyncFunctionDef') {
            definition(member)
            continue
          }
          const before = new Set(walk.binds)
          statementBody(member)
          walk.binds = before
        }
        walk.binds.add(str(value.fields.name) ?? '')
        return
      }
      case 'Import':
      case 'ImportFrom': {
        for (const alias of list(value, 'names')) {
          const aliasName = str(alias.fields.name) ?? ''
          if (aliasName === '*') {
            const exported = context.starExports?.get(str(value.fields.module) ?? '')
            if (exported) for (const id of exported) walk.binds.add(id)
            else walk.binds.add('*')
            continue
          }
          const asname = str(alias.fields.asname)
          walk.binds.add(asname ?? (value.kind === 'Import' ? aliasName.split('.')[0]! : aliasName))
        }
        const modules =
          value.kind === 'Import'
            ? list(value, 'names').map((alias) => (str(alias.fields.name) ?? '').split('.')[0]!)
            : [(str(value.fields.module) ?? '').split('.')[0]!]
        if (modules.some((name) => PGZERO_MODULES.has(name)))
          for (const id of PGZERO_IMPORT_NAMES) walk.binds.add(id)
        return
      }
      case 'Assign':
        expression(value.fields.value)
        bindTarget(value.fields.targets)
        return
      case 'AnnAssign': {
        expression(value.fields.value)
        expression(value.fields.annotation)
        // `x: int` sem valor não cria o nome (só a anotação); `obj.x: int` ainda lê `obj`.
        const target = child(value, 'target')
        if (value.fields.value !== null && value.fields.value !== undefined) bindTarget(target)
        else if (target && target.kind !== 'Name') expression(target.fields.value)
        return
      }
      case 'AugAssign': {
        const target = child(value, 'target')
        if (target?.kind === 'Name') walk.reads.add(str(target.fields.id) ?? '')
        expression(value.fields.value)
        bindTarget(target)
        return
      }
      case 'Delete':
        bindTarget(value.fields.targets)
        return
      case 'For':
        expression(value.fields.iter)
        bindTarget(value.fields.target)
        statementBody(value.fields.body)
        statementBody(value.fields.orelse)
        return
      case 'While':
        walk.barrier = true
        expression(value.fields.test)
        statementBody(value.fields.body)
        statementBody(value.fields.orelse)
        return
      case 'If':
        expression(value.fields.test)
        statementBody(value.fields.body)
        statementBody(value.fields.orelse)
        return
      case 'With':
        for (const item of list(value, 'items')) {
          expression(item.fields.context_expr)
          bindTarget(item.fields.optional_vars)
        }
        statementBody(value.fields.body)
        return
      case 'Try':
      case 'TryStar':
        statementBody(value.fields.body)
        for (const handler of list(value, 'handlers')) {
          expression(handler.fields.type)
          if (str(handler.fields.name)) walk.binds.add(str(handler.fields.name)!)
          statementBody(handler.fields.body)
        }
        statementBody(value.fields.orelse)
        statementBody(value.fields.finalbody)
        return
      case 'Match':
        expression(value.fields.subject)
        for (const item of list(value, 'cases')) {
          collectPatternBinds(item.fields.pattern)
          expression(item.fields.guard)
          statementBody(item.fields.body)
        }
        return
      case 'Raise':
        walk.barrier = true
        expression(value.fields.exc)
        expression(value.fields.cause)
        return
      case 'Assert':
        expression(value.fields.test)
        expression(value.fields.msg)
        return
      case 'Expr':
        expression(value.fields.value)
        return
      case 'TypeAlias':
        bindTarget(value.fields.name)
        return
      case 'Pass':
      case 'Global':
      case 'Nonlocal':
      case 'Break':
      case 'Continue':
        return
    }
  }
  statementBody(statement)
  walk.binds.delete('')
  walk.reads.delete('')
  return walk
}

/** Tipos e nomes de fábrica que existem sempre (ler um deles não dá erro). */
const SAFE_BUILTIN_NAMES = new Set([
  'int',
  'float',
  'str',
  'bool',
  'list',
  'dict',
  'tuple',
  'set',
  'object',
  'bytes',
  'complex',
  'frozenset',
  'type',
])

/**
 * Ler este valor na hora não dá erro nem muda nada: o nome lido já foi criado por uma linha de
 * cima (sem condição) ou é de fábrica.
 */
function pureValue(value: PythonValue | undefined, bound: ReadonlySet<string>): boolean {
  if (value === null || value === undefined) return true
  if (!isNode(value)) return false
  if (value.kind === 'Constant') return true
  if (value.kind === 'Name') {
    const id = str(value.fields.id) ?? ''
    return bound.has(id) || SAFE_BUILTIN_NAMES.has(id)
  }
  if (value.kind === 'Lambda') {
    const parts = argumentParts(child(value, 'args'))
    return parts.eager.every((item) => pureValue(item, bound))
  }
  if (value.kind === 'Tuple') return list(value, 'elts').every((item) => pureValue(item, bound))
  return !!safeEvaluate(value, new Map())
}

/** `def` sem decorador, com padrões e anotações só de constante ou nome que existe. */
function pureDefinition(value: PythonNode, bound: ReadonlySet<string>) {
  if (list(value, 'decorator_list').length || list(value, 'type_params').length) return false
  const parts = argumentParts(child(value, 'args'))
  return (
    parts.eager.every((item) => pureValue(item, bound)) &&
    pureValue(value.fields.returns ?? null, bound)
  )
}

/** Linha que só cria nomes: rodar ela não muda nem lê estado que muda e não pode dar erro. */
function pureStatement(
  statement: PythonNode,
  user: UserCode,
  context: PythonAreaContext,
  bound: ReadonlySet<string>,
  imported: ReadonlySet<string>,
) {
  switch (statement.kind) {
    case 'Pass':
    case 'Global':
    case 'Nonlocal':
      return true
    case 'FunctionDef':
    case 'AsyncFunctionDef':
      return pureDefinition(statement, bound)
    case 'Assign':
    case 'AnnAssign':
      // `cor = AZUL`, `pular = lambda: …`: só cria o nome (o alvo é nome simples, nunca item ou atributo).
      return (
        !!assignedNames(statement) &&
        pureValue(statement.fields.value, bound) &&
        (statement.kind === 'Assign' || pureValue(statement.fields.annotation, bound))
      )
    case 'ClassDef': {
      if (
        list(statement, 'decorator_list').length ||
        list(statement, 'keywords').length ||
        list(statement, 'type_params').length
      )
        return false
      // Criar a classe não pode dar erro: uma base só (com duas, a ordem das bases pode ser
      // impossível) e que seja classe com certeza: da criança, criada antes e nunca trocada, ou
      // vinda de uma biblioteca importada (Actor, pygame.sprite.Sprite).
      const bases = list(statement, 'bases')
      if (bases.length > 1 || user.magic) return false
      const basesOk = bases.every((base) => {
        if (!isNamePath(base)) return false
        let root: PythonNode | undefined = base
        while (root?.kind === 'Attribute') root = child(root, 'value')
        const id = root?.kind === 'Name' ? (str(root.fields.id) ?? '') : ''
        if (!bound.has(id) && !SAFE_BASE_CLASSES.has(id)) return false
        if (user.hookedClasses.has(id) || user.moduleVars.has(id) || user.callableVars.has(id))
          return false
        if (base.kind === 'Name' && user.classes.has(id)) return !user.functions.has(id)
        if (base.kind === 'Name' && SAFE_BASE_CLASSES.has(id))
          return !user.functions.has(id) && !user.classes.has(id) && !bound.has(id)
        return imported.has(id)
      })
      if (!basesOk) return false
      return list(statement, 'body').every((member) => {
        if (member.kind === 'Pass') return true
        if (member.kind === 'Expr') return child(member, 'value')?.kind === 'Constant'
        if (member.kind === 'FunctionDef' || member.kind === 'AsyncFunctionDef') {
          const decorators = list(member, 'decorator_list')
          const plain = { ...member, fields: { ...member.fields, decorator_list: [] } }
          return (
            decorators.every(
              (decorator) =>
                decorator.kind === 'Name' && SAFE_DECORATORS.has(str(decorator.fields.id) ?? ''),
            ) && pureDefinition(plain, bound)
          )
        }
        if (member.kind === 'Assign' || member.kind === 'AnnAssign') {
          const value = child(member, 'value')
          return !!assignedNames(member) && pureValue(value ?? null, bound)
        }
        return false
      })
    }
    case 'Import':
    case 'ImportFrom': {
      const level = statement.fields.level
      const relative =
        !!level &&
        typeof level === 'object' &&
        !Array.isArray(level) &&
        'literal' in level &&
        level.value !== '0'
      if (relative) return false
      const known = (name: string) =>
        !context.projectModules?.has(name) &&
        (PURE_IMPORT_MODULES.has(name) || PGZERO_MODULES.has(name))
      if (statement.kind === 'Import')
        return list(statement, 'names').every((alias) => {
          const full = str(alias.fields.name) ?? ''
          // `import os.caminho` dá erro: submódulo só o que se sabe que existe.
          return full.includes('.') ? KNOWN_SUBMODULES.has(full) : known(full)
        })
      // `from random import randit` dá erro: o nome importado precisa estar na lista do módulo.
      const module = str(statement.fields.module) ?? ''
      const exported = context.starExports?.get(module)
      if (!known(module.split('.')[0]!) || !exported) return false
      return list(statement, 'names').every((alias) => {
        const id = str(alias.fields.name) ?? ''
        return id === '*' || exported.includes(id)
      })
    }
    default:
      return false
  }
}

/** Os nomes que a linha cria com certeza quando termina sem erro (if/for/try podem não criar). */
function surelyBoundBy(statement: PythonNode, walk: Walk): string[] {
  switch (statement.kind) {
    case 'Import':
    case 'ImportFrom':
    case 'FunctionDef':
    case 'AsyncFunctionDef':
    case 'ClassDef':
    case 'Assign':
    case 'AugAssign':
      return [...walk.binds].filter((id) => id !== '*')
    case 'AnnAssign':
      return statement.fields.value === null || statement.fields.value === undefined
        ? []
        : [...walk.binds]
    default:
      return []
  }
}

/** Nomes apagados com `del` em qualquer lugar: nunca contam como "já existe". */
function deletedNames(module: PythonNode) {
  const out = new Set<string>()
  const visit = (value: PythonValue | undefined) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item)
      return
    }
    if (!isNode(value)) return
    if (value.kind === 'Name' && isNode(value.fields.ctx) && value.fields.ctx.kind === 'Del')
      out.add(str(value.fields.id) ?? '')
    for (const field of Object.values(value.fields)) visit(field)
  }
  visit(module.fields.body)
  return out
}

/** Registro de tecla/clique do Turtle ou agendamento do relógio do Pygame Zero (forma simples). */
function registrationKind(statement: PythonNode, user: UserCode): 'turtle' | 'clock' | undefined {
  const call = statementCall(statement)
  if (!call) return undefined
  const func = child(call, 'func')
  const called = calleeName(call) ?? ''
  const simpleArgument = (value: PythonNode | undefined) =>
    !!value && (value.kind === 'Constant' || value.kind === 'Lambda' || isNamePath(value))
  const keywordValues = list(call, 'keywords').map((keyword) => child(keyword, 'value'))
  if (![...list(call, 'args'), ...keywordValues].every(simpleArgument)) return undefined
  if (func?.kind === 'Attribute') {
    if (!isNamePath(child(func, 'value')) || user.methods.has(called)) return undefined
    if (TURTLE_REGISTRATIONS.has(called)) return 'turtle'
    const receiver = child(func, 'value')
    if (
      CLOCK_REGISTRATIONS.has(called) &&
      receiver?.kind === 'Name' &&
      str(receiver.fields.id) === 'clock'
    )
      return 'clock'
    return undefined
  }
  if (func?.kind === 'Name' && TURTLE_REGISTRATIONS.has(called) && !user.functions.has(called))
    return 'turtle'
  return undefined
}

/**
 * Classifica as linhas de topo do módulo. `codecIds[i]` é o codec que a projeção escolheu para a
 * linha i (nenhum quando o bloco é opaco).
 */
export function analyzePythonModuleAreas(
  module: PythonNode,
  codecIds: readonly (string | undefined)[],
  context: PythonAreaContext = {},
): PythonModuleAreaAnalysis {
  const body = list(module, 'body')
  const user = collectUserCode(module, codecIds)
  const walks = body.map((statement) => walkStatement(statement, user, context))
  const deleted = deletedNames(module)
  // Os nomes que já existem com certeza antes de cada linha (para saber se ler não dá erro).
  const bound = new Set<string>()
  const imported = new Set<string>()
  // Configurações: nome criado uma vez só no módulo e nunca trocado por `global` numa função.
  const bindCount = new Map<string, number>()
  for (const walk of walks)
    for (const id of walk.binds) bindCount.set(id, (bindCount.get(id) ?? 0) + 1)
  // O laço que liga o jogo: depois dele, a sequência final de "desligar".
  let lastLoop = -1
  body.forEach((statement, index) => {
    if (isGameLoop(statement, codecIds[index])) lastLoop = index
  })
  const terminal = new Set<number>()
  for (let index = body.length - 1; index >= 0; index--) {
    if (!isTerminalKind(body[index]!, codecIds[index], index > lastLoop && lastLoop >= 0)) break
    terminal.add(index)
  }
  const settings = new Map<string, SafeValue>()
  const statements = body.map((statement, index): PythonStatementAreaInfo => {
    const walk = walks[index]!
    const codecId = codecIds[index]
    // O registro só é registro quando nada nele pode dar erro: tudo o que ele lê já existe.
    const registration =
      user.magic || ![...walk.reads].every((id) => bound.has(id) || SAFE_BUILTIN_NAMES.has(id))
        ? undefined
        : registrationKind(statement, user)
    // Configuração: MAIÚSCULAS, valor seguro, criada uma vez, sem `global`.
    const names = assignedNames(statement)
    const once =
      !!names?.length &&
      names.every((id) => (bindCount.get(id) ?? 0) === 1 && !user.globalsWritten.has(id))
    const values = once
      ? codecId && PYTHON_SETTINGS_CODECS.has(codecId)
        ? (() => {
            const evaluated = safeEvaluate(child(statement, 'value'), settings)
            return evaluated && names!.length === 1 ? new Map([[names![0]!, evaluated]]) : undefined
          })()
        : settingsValues(statement, settings)
      : undefined
    if (values) for (const [id, value] of values) settings.set(id, value)
    const pure = !!values || pureStatement(statement, user, context, bound, imported)
    for (const id of surelyBoundBy(statement, walk))
      if (!deleted.has(id)) {
        bound.add(id)
        if (statement.kind === 'Import' || statement.kind === 'ImportFrom') imported.add(id)
      }
    const effects: PythonStatementEffects = {
      binds: new Set(walk.binds),
      reads: new Set(walk.reads),
      pure,
      barrier: walk.barrier,
      registration: !!registration,
      sensitive: false,
    }
    const apis = new Set(walk.apis)
    // O registro só GUARDA a função (ela roda depois, no laço do Turtle ou do relógio). Nas outras
    // linhas, soma o que rodam as funções da criança alcançadas pelas chamadas.
    if (!pure && !registration) {
      const reach = reachOf(walk.targets, walk.inline, user)
      const unknown = user.magic || reach.targets.unknown
      const ran = unknown
        ? {
            reads: user.lazyReads,
            globals: user.globalsWritten,
            apis: user.apis,
            barrier: user.anyBarrier,
          }
        : reach
      for (const id of ran.reads) effects.reads.add(id)
      for (const id of ran.globals) effects.binds.add(id)
      for (const id of ran.apis) apis.add(id)
      if (ran.barrier) effects.barrier = true
    }
    effects.sensitive = [...apis].some((api) => REGISTRATION_SENSITIVE_APIS.has(api))
    const info = (role: PythonAreaRole, kind: PythonAreaKind): PythonStatementAreaInfo => ({
      role,
      area: kind,
      effects,
    })
    if (isDocstring(statement, index) || isFutureImport(statement)) {
      effects.barrier = true
      return info('pinned', 'libraries')
    }
    if (terminal.has(index)) {
      effects.barrier = true
      return info('terminal', 'loops')
    }
    if (
      statement.kind === 'Import' ||
      statement.kind === 'ImportFrom' ||
      (codecId && PYTHON_IMPORT_CODECS.has(codecId))
    )
      return info('area', 'libraries')
    if (values) return info('area', 'settings')
    if (registration === 'turtle' || (codecId && PYTHON_EVENT_CODECS.has(codecId)))
      return info('area', 'events')
    const call = statementCall(statement)
    const called = call ? calleeName(call) : undefined
    if (registration === 'clock')
      return info('area', called === 'schedule_interval' ? 'loops' : 'start')
    if (codecId && PYTHON_LOOP_CODECS.has(codecId)) return info('area', 'loops')
    if (isGameLoop(statement, codecId)) return info('area', 'loops')
    // A primeira volta do bloco "repetir a cada": `a_cada_quadro()` ou `tela.ontimer(a_cada_quadro, …)`.
    if (call) {
      const first = list(call, 'args')[0]
      if (
        child(call, 'func')?.kind === 'Name' &&
        user.repeatFunctions.has(called ?? '') &&
        !list(call, 'args').length
      )
        return info('area', 'loops')
      if (
        called === 'ontimer' &&
        first?.kind === 'Name' &&
        user.repeatFunctions.has(str(first.fields.id) ?? '')
      )
        return info('area', 'loops')
    }
    if (
      statement.kind === 'FunctionDef' ||
      statement.kind === 'AsyncFunctionDef' ||
      statement.kind === 'ClassDef' ||
      (codecId && PYTHON_DEFINITION_CODECS.has(codecId))
    )
      return info('area', 'molds')
    return info('area', 'start')
  })
  return { statements }
}

// ─── Trocar de lugar ───────────────────────────────────────────────────────────────────────

const conflictingName = (a: ReadonlySet<string>, b: ReadonlySet<string>) => {
  for (const item of a) if (b.has(item)) return item
  // `from módulo import *` desconhecido: pode ter criado qualquer nome.
  if ((a.has('*') && b.size) || (b.has('*') && a.size)) return '*'
  return undefined
}

export type PythonCommuteConflict =
  | { reason: 'pinned' | 'barrier' | 'effects' | 'fixed' }
  | { reason: 'name'; name: string }

/** Por que duas linhas NÃO podem trocar de lugar (undefined = podem). */
export function pythonCommuteConflict(
  a: PythonStatementAreaInfo,
  b: PythonStatementAreaInfo,
): PythonCommuteConflict | undefined {
  if (a.role === 'pinned' || b.role === 'pinned') return { reason: 'pinned' }
  if (a.effects.barrier || b.effects.barrier) return { reason: 'barrier' }
  const name =
    conflictingName(a.effects.binds, b.effects.binds) ??
    conflictingName(a.effects.binds, b.effects.reads) ??
    conflictingName(b.effects.binds, a.effects.reads)
  if (name) return { reason: 'name', name }
  // Uma linha que só cria nomes troca com qualquer outra que não use esses nomes.
  if (a.effects.pure || b.effects.pure) return undefined
  // O registro de tecla/clique (ou do relógio do Pygame Zero) só guarda a função para depois.
  const registrationOk = (registration: PythonStatementAreaInfo, other: PythonStatementAreaInfo) =>
    registration.effects.registration && !other.effects.registration && !other.effects.sensitive
  if (registrationOk(a, b) || registrationOk(b, a)) return undefined
  return { reason: 'effects' }
}

export const pythonStatementsCommute = (a: PythonStatementAreaInfo, b: PythonStatementAreaInfo) =>
  !pythonCommuteConflict(a, b)

// ─── Em que área cada linha aparece (sem mexer no arquivo) ─────────────────────────────────

const AREA_COUNT = PYTHON_AREAS.length
const START_INDEX = pythonAreaIndex('start')

function areaCost(info: PythonStatementAreaInfo, areaIndex: number) {
  if (info.role !== 'area') return 0
  if (pythonAreaIndex(info.area) === areaIndex) return 0
  return areaIndex === START_INDEX ? 1 : 3
}

/**
 * A área de cada linha, na ordem em que estão: a sequência nunca volta (uma área só depois da
 * outra) e o custo é mínimo (0 na área dela, 1 no Ao iniciar, 3 noutra). Todo programa cabe.
 */
export function pythonDisplayAreas(
  statements: readonly PythonStatementAreaInfo[],
): PythonAreaKind[] {
  const n = statements.length
  if (!n) return []
  // best[i][a]: menor custo das linhas i..n-1 com a linha i na área a.
  const best: number[][] = Array.from({ length: n }, () => new Array(AREA_COUNT).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let a = 0; a < AREA_COUNT; a++) {
      let next = 0
      if (i + 1 < n) {
        next = Number.POSITIVE_INFINITY
        for (let b = a; b < AREA_COUNT; b++) next = Math.min(next, best[i + 1]![b]!)
      }
      best[i]![a] = areaCost(statements[i]!, a) + next
    }
  const out: PythonAreaKind[] = []
  let previous = 0
  for (let i = 0; i < n; i++) {
    const info = statements[i]!
    let chosen = -1
    let chosenScore = Number.POSITIVE_INFINITY
    let chosenRank = Number.POSITIVE_INFINITY
    for (let a = previous; a < AREA_COUNT; a++) {
      const score = best[i]![a]!
      const preferred = pythonAreaIndex(info.area)
      const rank =
        info.role === 'terminal'
          ? a === previous
            ? 0
            : 1 + a
          : info.role === 'pinned'
            ? a
            : a === preferred
              ? 0
              : a === START_INDEX
                ? 1
                : 2 + a
      if (score < chosenScore || (score === chosenScore && rank < chosenRank)) {
        chosen = a
        chosenScore = score
        chosenRank = rank
      }
    }
    // Uma linha terminal não abre área nova: fica na última usada (ou no Ao iniciar, se é a primeira).
    if (info.role === 'terminal' && i === 0) chosen = START_INDEX
    out.push(PYTHON_AREAS[chosen]!.kind)
    previous = chosen
  }
  return out
}

// ─── Organizar ─────────────────────────────────────────────────────────────────────────────

export interface PythonAreaNote {
  /** Índice (na ordem final) da linha que ficou fora da área dela. */
  statement: number
  /** A área a que ela pertence. */
  wanted: PythonAreaKind
  /** Índice (na ordem final) da linha que segura ela, e o motivo. */
  blocker?: number
  conflict?: PythonCommuteConflict
}

export interface PythonOrganizePlan {
  /** order[k] = índice original da linha que fica na posição k. */
  order: number[]
  /** Área de cada posição da ordem final. */
  areas: PythonAreaKind[]
  notes: PythonAreaNote[]
  changed: boolean
}

export const PYTHON_ORGANIZE_LIMIT = 2000

/**
 * A ordem mais arrumada que faz o MESMO programa: toda dupla de linhas que não pode trocar de
 * lugar mantém a ordem; entre as que podem, vence a área (e depois a posição original).
 */
export function planPythonOrganize(
  analysis: PythonModuleAreaAnalysis,
  movable: (index: number) => boolean = () => true,
): PythonOrganizePlan {
  const statements = analysis.statements
  const n = statements.length
  const identity = statements.map((_, index) => index)
  if (n > PYTHON_ORGANIZE_LIMIT) {
    const areas = pythonDisplayAreas(statements)
    return {
      order: identity,
      areas,
      notes: notesFor(statements, identity, areas, movable),
      changed: false,
    }
  }
  const successors: number[][] = Array.from({ length: n }, () => [])
  const indegree = new Array<number>(n).fill(0)
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const fixed = !movable(i) || !movable(j)
      if (fixed || !pythonStatementsCommute(statements[i]!, statements[j]!)) {
        successors[i]!.push(j)
        indegree[j]!++
      }
    }
  const priority = (index: number) => {
    const info = statements[index]!
    const areaIndex =
      info.role === 'pinned'
        ? -1
        : info.role === 'terminal'
          ? AREA_COUNT
          : pythonAreaIndex(info.area)
    return areaIndex * (n + 1) + index
  }
  const ready = identity.filter((index) => indegree[index] === 0)
  const order: number[] = []
  while (ready.length) {
    let pick = 0
    for (let k = 1; k < ready.length; k++)
      if (priority(ready[k]!) < priority(ready[pick]!)) pick = k
    const next = ready.splice(pick, 1)[0]!
    order.push(next)
    for (const successor of successors[next]!)
      if (--indegree[successor]! === 0) ready.push(successor)
  }
  const ordered = order.map((index) => statements[index]!)
  const areas = pythonDisplayAreas(ordered)
  return {
    order,
    areas,
    notes: notesFor(statements, order, areas, movable),
    changed: order.some((index, position) => index !== position),
  }
}

function notesFor(
  statements: readonly PythonStatementAreaInfo[],
  order: readonly number[],
  areas: readonly PythonAreaKind[],
  movable: (index: number) => boolean,
): PythonAreaNote[] {
  const notes: PythonAreaNote[] = []
  // A linha que não pode sair do lugar (outra linha dividindo a mesma linha do arquivo) segura tudo.
  const conflictOf = (a: number, b: number): PythonCommuteConflict | undefined =>
    !movable(a) || !movable(b)
      ? { reason: 'fixed' }
      : pythonCommuteConflict(statements[a]!, statements[b]!)
  order.forEach((original, position) => {
    const info = statements[original]!
    if (info.role !== 'area' || areas[position] === info.area) return
    const wanted = pythonAreaIndex(info.area)
    const shown = pythonAreaIndex(areas[position]!)
    const note: PythonAreaNote = { statement: position, wanted: info.area }
    if (!movable(original)) {
      note.conflict = { reason: 'fixed' }
      notes.push(note)
      return
    }
    // Quem segura: a linha mais próxima, entre esta e a área dela, com que ela não pode trocar.
    if (wanted < shown) {
      for (let k = position - 1; k >= 0; k--) {
        if (pythonAreaIndex(areas[k]!) <= wanted) break
        const conflict = conflictOf(order[k]!, original)
        if (conflict) {
          note.blocker = k
          note.conflict = conflict
          break
        }
      }
    } else {
      for (let k = position + 1; k < order.length; k++) {
        if (pythonAreaIndex(areas[k]!) >= wanted) break
        const conflict = conflictOf(original, order[k]!)
        if (conflict) {
          note.blocker = k
          note.conflict = conflict
          break
        }
      }
    }
    notes.push(note)
  })
  return notes
}

// ─── Arraste e paleta ──────────────────────────────────────────────────────────────────────

export interface PythonAreaFitContext {
  /** Funções "repetir a cada" do arquivo (a chamada que dá a primeira volta entra no laço). */
  repeatFunctions?: ReadonlySet<string>
}

/**
 * A regra de arraste: o bloco solto cabe nesta área? O ⚙️ Ao iniciar aceita tudo; as outras só os
 * blocos delas. Os blocos que ligam o jogo cabem no fim de qualquer área de comportamento.
 */
export function pythonStatementFitsArea(
  kind: PythonAreaKind,
  statement: PythonNode,
  codecId: string | undefined,
  context: PythonAreaFitContext = {},
): boolean {
  if (kind === 'start') return true
  const terminal = isTerminalKind(statement, codecId, true)
  switch (kind) {
    case 'libraries':
      return statement.kind === 'Import' || statement.kind === 'ImportFrom'
    case 'settings':
      return isPythonSettingsStatement(statement, codecId)
    case 'molds':
      return (
        (statement.kind === 'FunctionDef' ||
          statement.kind === 'AsyncFunctionDef' ||
          statement.kind === 'ClassDef') &&
        !(codecId && (PYTHON_EVENT_CODECS.has(codecId) || PYTHON_LOOP_CODECS.has(codecId)))
      )
    case 'events':
      return terminal || !!(codecId && PYTHON_EVENT_CODECS.has(codecId))
    case 'loops': {
      if (terminal || (codecId && PYTHON_LOOP_CODECS.has(codecId))) return true
      // A mesma régua da análise: só o laço do jogo e o relógio do Pygame Zero.
      if (statement.kind === 'While') return isGameLoop(statement, codecId)
      const call = statementCall(statement)
      if (!call) return false
      const called = calleeName(call)
      const first = list(call, 'args')[0]
      const repeat = context.repeatFunctions ?? new Set<string>()
      if (child(call, 'func')?.kind === 'Name' && repeat.has(called ?? '')) return true
      if (called === 'ontimer' && first?.kind === 'Name' && repeat.has(str(first.fields.id) ?? ''))
        return true
      const receiver = child(child(call, 'func') ?? call, 'value')
      return (
        called === 'schedule_interval' &&
        receiver?.kind === 'Name' &&
        str(receiver.fields.id) === 'clock'
      )
    }
  }
}

/** Os blocos que ligam ou desligam o jogo (nada encaixa embaixo deles). */
export function isPythonTerminalStatement(statement: PythonNode, codecId?: string) {
  return isTerminalKind(statement, codecId, true)
}

/**
 * O bloco que LIGA ou DESLIGA o jogo (`pgzrun.go`, `mainloop`, `close_window`, `pygame.quit`…),
 * sem os de limpeza (`unload_*`): nada encaixa embaixo dele e ele mora no fim da última área.
 */
export function isPythonGameSwitchStatement(statement: PythonNode, codecId?: string) {
  return isTerminalKind(statement, codecId, false)
}

/** A área "natural" de um bloco da paleta (a que o faz aparecer em Áreas do projeto). */
export function canonicalPythonArea(codecId: string): PythonAreaKind | undefined {
  if (PYTHON_IMPORT_CODECS.has(codecId)) return 'libraries'
  if (PYTHON_SETTINGS_CODECS.has(codecId) || codecId === 'sz_py_assign') return 'settings'
  if (PYTHON_DEFINITION_CODECS.has(codecId)) return 'molds'
  if (PYTHON_EVENT_CODECS.has(codecId)) return 'events'
  if (PYTHON_LOOP_OFFER_CODECS.has(codecId)) return 'loops'
  return undefined
}

/**
 * As áreas que a categoria 🗂️ oferece: as que têm algum bloco na paleta. O ⚙️ Ao iniciar está
 * sempre (é onde cabe tudo).
 */
export function pythonOfferedAreas(paletteIds: Iterable<string>): PythonAreaKind[] {
  const offered = new Set<PythonAreaKind>(['start'])
  for (const id of paletteIds) {
    const kind = canonicalPythonArea(id)
    if (kind) offered.add(kind)
  }
  return PYTHON_AREA_KINDS.filter((kind) => offered.has(kind))
}
