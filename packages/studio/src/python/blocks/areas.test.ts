import { describe, expect, test } from 'bun:test'
import type { PythonNode } from '../language/types'
import {
  analyzePythonModuleAreas,
  canonicalPythonArea,
  isPythonSettingsStatement,
  PYTHON_AREA_MARKERS,
  PYTHON_AREAS,
  type PythonAreaKind,
  planPythonOrganize,
  pythonAreaIndex,
  pythonCommuteConflict,
  pythonDisplayAreas,
  pythonOfferedAreas,
  pythonStatementFitsArea,
  pythonStatementsCommute,
} from './areas'
import {
  attribute,
  boolean,
  call,
  expression,
  integer,
  moduleNode,
  name,
  node,
  pass,
  text,
} from './nodes'

const alias = (id: string, asname: string | null = null) => node('alias', { name: id, asname })
const imp = (...ids: string[]) => node('Import', { names: ids.map((id) => alias(id)) })
const fromImport = (module: string, ids: string[], level = 0) =>
  node('ImportFrom', {
    module,
    names: ids.map((id) => alias(id)),
    level: { literal: 'int', value: String(level) },
  })
const assign = (target: string, value: PythonNode) =>
  node('Assign', { targets: [name(target, 'Store')], value, type_comment: null })
const args = (defaults: PythonNode[] = []) =>
  node('arguments', {
    posonlyargs: [],
    args: [],
    vararg: null,
    kwonlyargs: [],
    kw_defaults: [],
    kwarg: null,
    defaults,
  })
const def = (
  id: string,
  body: PythonNode[] = [pass()],
  options: { decorators?: PythonNode[]; defaults?: PythonNode[] } = {},
) =>
  node('FunctionDef', {
    name: id,
    args: args(options.defaults),
    body,
    decorator_list: options.decorators ?? [],
    returns: null,
    type_comment: null,
    type_params: [],
  })
const cls = (id: string, body: PythonNode[] = [pass()]) =>
  node('ClassDef', { name: id, bases: [], keywords: [], body, decorator_list: [], type_params: [] })
const run = (func: PythonNode, values: PythonNode[] = []) => expression(call(func, values))
const method = (receiver: string, member: string, values: PythonNode[] = []) =>
  run(attribute(name(receiver), member), values)
const loop = (test: PythonNode, body: PythonNode[]) => node('While', { test, body, orelse: [] })
const globalStmt = (...ids: string[]) => node('Global', { names: ids })
const binop = (left: PythonNode, right: PythonNode) =>
  node('BinOp', { left, op: node('Mult'), right })

type Line = { statement: PythonNode; codec?: string }
const line = (statement: PythonNode, codec?: string): Line => ({ statement, codec })
const analyze = (lines: Line[]) =>
  analyzePythonModuleAreas(
    moduleNode(lines.map((item) => item.statement)),
    lines.map((item) => item.codec),
  )
const roles = (lines: Line[]) =>
  analyze(lines).statements.map((info) => (info.role === 'area' ? info.area : info.role))

describe('registro das áreas', () => {
  test('seis áreas na ordem do arquivo, cada uma com o seu comentário', () => {
    expect(PYTHON_AREAS.map((area) => area.kind)).toEqual([
      'libraries',
      'settings',
      'molds',
      'start',
      'events',
      'loops',
    ])
    expect(PYTHON_AREAS.map((area) => area.marker)).toEqual([
      '# 📦 Bibliotecas',
      '# 🎛️ Configurações',
      '# 🧩 Meus moldes',
      '# ⚙️ Ao iniciar',
      '# ⚡ Quando acontecer',
      '# 🔁 Enquanto estiver rodando',
    ])
    expect(PYTHON_AREA_MARKERS.size).toBe(6)
    expect(PYTHON_AREAS.map((area) => area.frameType)).toEqual(
      PYTHON_AREAS.map((area) => `sz_py_area_${area.kind}`),
    )
  })
})

describe('a área de cada linha', () => {
  test('Pygame Zero', () => {
    expect(
      roles([
        line(imp('random')),
        line(imp('pgzrun')),
        line(assign('WIDTH', integer('800')), 'sz_py_pgzero_width'),
        line(
          assign(
            'GRAVIDADE',
            node('Constant', {
              value: { literal: 'float', value: '0x1.999999999999ap-3' },
              kind: null,
            }),
          ),
        ),
        line(assign('VAO', binop(integer('2'), name('LARGURA')))),
        line(def('recomecar', [globalStmt('vy'), assign('vy', integer('0'))])),
        line(assign('passarinho', call(name('Actor'), [text('passarinho')]))),
        line(assign('vy', integer('0'))),
        line(run(name('recomecar'))),
        line(def('on_key_down'), 'sz_py_pgzero_on_key_down'),
        line(def('update'), 'sz_py_pgzero_update'),
        line(def('draw'), 'sz_py_pgzero_draw'),
        line(method('pgzrun', 'go'), 'sz_py_pgzero_go'),
      ]),
    ).toEqual([
      'libraries',
      'libraries',
      'settings',
      'settings',
      // LARGURA ainda não é configuração conhecida acima dela: o valor não é fixo.
      'start',
      'molds',
      'start',
      // vy é trocada por `global` numa função: é variável do jogo, não configuração.
      'start',
      'start',
      'events',
      'loops',
      'loops',
      'terminal',
    ])
  })

  test('Turtle: teclas, o bloco "repetir a cada" e a primeira volta', () => {
    expect(
      roles([
        line(imp('turtle')),
        line(assign('INTERVALO', integer('16'))),
        line(def('virar')),
        line(assign('tela', call(attribute(name('turtle'), 'Screen')))),
        line(
          method('tela', 'onkeypress', [name('virar'), text('Right')]),
          'sz_py_turtle_screen_onkeypress',
        ),
        line(method('tela', 'listen'), 'sz_py_turtle_screen_listen'),
        line(def('a_cada_quadro'), 'sz_py_turtle_every'),
        line(run(name('a_cada_quadro'))),
        line(method('tela', 'mainloop'), 'sz_py_turtle_screen_mainloop'),
      ]),
    ).toEqual([
      'libraries',
      'settings',
      'molds',
      'start',
      'events',
      'events',
      'loops',
      'loops',
      'terminal',
    ])
  })

  test('Raylib: o laço da janela e o fim depois dele', () => {
    expect(
      roles([
        line(fromImport('pyray', ['*'])),
        line(run(name('init_window'), [integer('800'), integer('450'), text('Jogo')])),
        line(
          loop(call(name('window_should_close')), [run(name('begin_drawing'))]),
          'sz_py_rl2d_window_loop',
        ),
        line(run(name('unload_texture'), [name('t')]), 'sz_py_rl2d_unload_texture'),
        line(run(name('close_window')), 'sz_py_rl2d_close_window'),
      ]),
    ).toEqual(['libraries', 'start', 'loops', 'terminal', 'terminal'])
  })

  test('Pygame-ce: o while do jogo vai para o laço; pygame.quit fecha', () => {
    const update = run(attribute(attribute(name('pygame'), 'display'), 'update'))
    expect(
      roles([
        line(imp('pygame')),
        line(assign('rodando', boolean(true))),
        line(loop(name('rodando'), [update])),
        line(method('pygame', 'quit'), 'sz_py_pygame_quit'),
      ]),
    ).toEqual(['libraries', 'start', 'loops', 'terminal'])
  })

  test('docstring fica presa no topo; o if __name__ é do Ao iniciar', () => {
    const main = node('If', {
      test: node('Compare', {
        left: name('__name__'),
        ops: [node('Eq')],
        comparators: [text('__main__')],
      }),
      body: [run(name('iniciar'))],
      orelse: [],
    })
    expect(roles([line(expression(text('Jogo'))), line(def('iniciar')), line(main)])).toEqual([
      'pinned',
      'molds',
      'start',
    ])
  })

  test('configuração só com nome em MAIÚSCULAS, valor fixo e criada uma vez', () => {
    expect(isPythonSettingsStatement(assign('VIDAS', integer('3')))).toBe(true)
    expect(isPythonSettingsStatement(assign('vidas', integer('3')))).toBe(false)
    expect(isPythonSettingsStatement(assign('CHAO', call(name('carregar'))))).toBe(false)
    expect(
      roles([line(assign('VIDAS', integer('3'))), line(assign('VIDAS', integer('5')))]),
    ).toEqual(['start', 'start'])
    const pair = node('Assign', {
      targets: [
        node('Tuple', { elts: [name('W', 'Store'), name('H', 'Store')], ctx: node('Store') }),
      ],
      value: node('Tuple', { elts: [integer('1280'), integer('720')], ctx: node('Load') }),
      type_comment: null,
    })
    expect(roles([line(pair)])).toEqual(['settings'])
  })
})

describe('efeitos e troca de lugar', () => {
  const info = (lines: Line[]) => analyze(lines).statements

  test('decorador, valor padrão e corpo de classe leem na hora; corpo de função e lambda, depois', () => {
    const [load, decorated, withDefault, klass, body, lambda] = info([
      line(assign('textura', call(name('load_texture')))),
      line(def('a', [pass()], { decorators: [name('textura')] })),
      line(def('b', [pass()], { defaults: [name('textura')] })),
      line(cls('Nave', [assign('largura', attribute(name('textura'), 'width'))])),
      line(def('c', [expression(name('textura'))])),
      line(assign('f', node('Lambda', { args: args(), body: name('textura') }))),
    ])
    for (const eager of [decorated!, withDefault!, klass!])
      expect(pythonCommuteConflict(load!, eager)).toEqual({ reason: 'name', name: 'textura' })
    expect(pythonStatementsCommute(load!, body!)).toBe(true)
    expect(pythonStatementsCommute(load!, lambda!)).toBe(true)
  })

  test('compreensão: a variável do laço é dela; walrus cria nome do módulo', () => {
    const comprehension = node('ListComp', {
      elt: name('i'),
      generators: [
        node('comprehension', {
          target: name('i', 'Store'),
          iter: call(name('range'), [integer('3')]),
          ifs: [],
          is_async: 0,
        }),
      ],
    })
    const [list, walrus] = info([
      line(assign('lista', comprehension)),
      line(expression(node('NamedExpr', { target: name('n', 'Store'), value: integer('1') }))),
    ])
    expect(list!.effects.reads.has('i')).toBe(false)
    expect(walrus!.effects.binds.has('n')).toBe(true)
  })

  test('duas chamadas não trocam; o registro de tecla troca com o que não mexe nos registros', () => {
    const [, , , bg, clear, register, draw] = info([
      line(imp('turtle')),
      line(assign('tela', call(attribute(name('turtle'), 'Screen')))),
      line(def('virar')),
      line(method('tela', 'bgcolor', [text('black')])),
      line(method('tela', 'clear')),
      line(
        method('tela', 'onkeypress', [name('virar'), text('Up')]),
        'sz_py_turtle_screen_onkeypress',
      ),
      line(run(name('print'), [text('oi')])),
    ])
    expect(pythonCommuteConflict(bg!, draw!)).toEqual({ reason: 'effects' })
    expect(pythonStatementsCommute(register!, bg!)).toBe(true)
    expect(pythonCommuteConflict(register!, clear!)).toEqual({ reason: 'effects' })
  })

  test('chamada de função da criança soma o que ela lê', () => {
    const [config, start] = info([
      line(def('desenhar', [expression(name('pontos'))])),
      line(run(name('desenhar'))),
    ]).slice(0)
    expect(start!.effects.reads.has('pontos')).toBe(true)
    expect(config!.effects.reads.has('pontos')).toBe(false)
  })

  test('laço de topo é barreira', () => {
    const [before, barrier] = info([
      line(assign('x', integer('1'))),
      line(loop(boolean(true), [pass()])),
    ])
    expect(pythonCommuteConflict(before!, barrier!)).toEqual({ reason: 'barrier' })
  })

  test('import * desconhecido conflita com qualquer nome', () => {
    const [star, use] = info([
      line(fromImport('settings', ['*'])),
      line(expression(name('LARGURA'))),
    ])
    expect(pythonStatementsCommute(star!, use!)).toBe(false)
  })
})

describe('em que área cada linha aparece', () => {
  test('nunca volta para uma área anterior e prefere a área da linha', () => {
    const statements = analyze([
      line(run(name('print'), [text('oi')])),
      line(imp('random')),
      line(def('f')),
      line(assign('x', integer('1'))),
    ]).statements
    const areas = pythonDisplayAreas(statements)
    // O import depois de um comando não volta para Bibliotecas: fica no Ao iniciar.
    expect(areas).toEqual(['start', 'start', 'start', 'start'])
    const indexes = areas.map(pythonAreaIndex)
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b))
  })

  test('programa já arrumado aparece em cada área certa', () => {
    const areas = pythonDisplayAreas(
      analyze([
        line(imp('pgzrun')),
        line(assign('WIDTH', integer('800')), 'sz_py_pgzero_width'),
        line(def('f')),
        line(assign('x', integer('1'))),
        line(def('on_key_down'), 'sz_py_pgzero_on_key_down'),
        line(def('update'), 'sz_py_pgzero_update'),
        line(method('pgzrun', 'go'), 'sz_py_pgzero_go'),
      ]).statements,
    )
    expect(areas).toEqual(['libraries', 'settings', 'molds', 'start', 'events', 'loops', 'loops'])
  })
})

describe('organizar', () => {
  const shuffled = (): Line[] => [
    line(imp('pgzrun')),
    line(assign('passarinho', call(name('Actor'), [text('p')]))),
    line(assign('WIDTH', integer('800')), 'sz_py_pgzero_width'),
    line(def('update', [expression(name('passarinho'))]), 'sz_py_pgzero_update'),
    line(def('recomecar', [expression(name('passarinho'))])),
    line(run(name('recomecar'))),
    line(imp('random')),
    line(def('on_key_down', [run(name('recomecar'))]), 'sz_py_pgzero_on_key_down'),
    line(method('pgzrun', 'go'), 'sz_py_pgzero_go'),
  ]

  test('leva cada linha para a área dela quando é seguro', () => {
    const plan = planPythonOrganize(analyze(shuffled()))
    expect(plan.changed).toBe(true)
    expect(plan.order).toEqual([0, 6, 2, 4, 1, 5, 7, 3, 8])
    expect(plan.areas).toEqual([
      'libraries',
      'libraries',
      'settings',
      'molds',
      'start',
      'start',
      'events',
      'loops',
      'loops',
    ])
    expect(plan.notes).toEqual([])
  })

  test('é idempotente e não mexe no que já está arrumado', () => {
    const lines = shuffled()
    const first = planPythonOrganize(analyze(lines))
    const again = planPythonOrganize(analyze(first.order.map((index) => lines[index]!)))
    expect(again.changed).toBe(false)
    expect(again.order).toEqual(first.order.map((_, position) => position))
  })

  test('a classe que usa a imagem logo que é criada fica no Ao iniciar, com o motivo', () => {
    const plan = planPythonOrganize(
      analyze([
        line(fromImport('pyray', ['*'])),
        line(assign('textura', call(name('load_texture'), [text('nave.png')]))),
        line(cls('Nave', [assign('largura', attribute(name('textura'), 'width'))])),
      ]),
    )
    expect(plan.changed).toBe(false)
    expect(plan.areas).toEqual(['libraries', 'start', 'start'])
    expect(plan.notes).toEqual([
      { statement: 2, wanted: 'molds', blocker: 1, conflict: { reason: 'name', name: 'textura' } },
    ])
  })

  test('nada atravessa um laço de topo', () => {
    const plan = planPythonOrganize(
      analyze([
        line(imp('pygame')),
        line(loop(boolean(true), [pass()])),
        line(def('depois')),
        line(imp('random')),
      ]),
    )
    // O laço fica no lugar; o que vem depois dele pode se arrumar, mas continua depois.
    expect(plan.order.slice(0, 2)).toEqual([0, 1])
    expect(new Set(plan.order.slice(2))).toEqual(new Set([2, 3]))
  })

  test('linha presa (sem lugar próprio na fonte) não se mexe', () => {
    const lines = shuffled()
    const plan = planPythonOrganize(analyze(lines), (index) => index !== 6)
    expect(plan.order.indexOf(6)).toBe(6)
  })

  test('a linha presa fora da área dela leva o motivo "fixed"', () => {
    const plan = planPythonOrganize(
      analyze([line(run(name('print'), [text('oi')])), line(imp('random'))]),
      (index) => index !== 1,
    )
    expect(plan.order).toEqual([0, 1])
    expect(plan.notes).toEqual([
      { statement: 1, wanted: 'libraries', conflict: { reason: 'fixed' } },
    ])
  })

  test('a exibição tem o menor custo possível (conferida por força bruta)', () => {
    let seed = 11
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const kinds = PYTHON_AREAS.map((item) => item.kind)
    const start = pythonAreaIndex('start')
    const cost = (wanted: PythonAreaKind, role: string, shown: number) =>
      role !== 'area' ? 0 : pythonAreaIndex(wanted) === shown ? 0 : shown === start ? 1 : 3
    for (let round = 0; round < 200; round++) {
      const size = 1 + Math.floor(random() * 5)
      // As linhas que ligam/desligam o jogo são sempre o FIM do arquivo (a análise só as acha ali).
      const terminals = random() < 0.3 ? 1 + Math.floor(random() * size) : 0
      const infos = Array.from({ length: size }, (_, index) => ({
        role: (index >= size - terminals ? 'terminal' : 'area') as 'area' | 'terminal',
        area: kinds[Math.floor(random() * kinds.length)]!,
        effects: {
          binds: new Set<string>(),
          reads: new Set<string>(),
          pure: false,
          barrier: false,
          registration: false,
          sensitive: false,
        },
      }))
      // Toda sequência que nunca volta, e o menor custo entre elas.
      let best = Number.POSITIVE_INFINITY
      const search = (index: number, from: number, total: number) => {
        if (index === size) {
          best = Math.min(best, total)
          return
        }
        for (let shown = from; shown < kinds.length; shown++)
          search(index + 1, shown, total + cost(infos[index]!.area, infos[index]!.role, shown))
      }
      search(0, 0, 0)
      const shown = pythonDisplayAreas(infos).map(pythonAreaIndex)
      expect(shown).toEqual([...shown].sort((a, b) => a - b))
      const total = shown.reduce(
        (sum, area, index) => sum + cost(infos[index]!.area, infos[index]!.role, area),
        0,
      )
      expect(total).toBe(best)
    }
  })

  test('fuzz: toda dupla que não pode trocar mantém a ordem, e as áreas nunca voltam', () => {
    let seed = 7
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]!
    const names = ['a', 'b', 'c', 'TAM', 'VEL', 'tela']
    const templates: (() => Line)[] = [
      () => line(imp(pick(['random', 'math', 'turtle']))),
      () => line(assign(pick(names), integer(String(Math.floor(random() * 9))))),
      () => line(assign(pick(names), name(pick(names)))),
      () => line(def(pick(['f', 'g', 'h']), [expression(name(pick(names)))])),
      () => line(def(pick(['f', 'g']), [pass()], { defaults: [name(pick(names))] })),
      () => line(cls('K', [assign('x', name(pick(names)))])),
      () => line(run(name(pick(['f', 'g', 'print'])), [name(pick(names))])),
      () => line(method('tela', pick(['bgcolor', 'clear', 'update']))),
      () =>
        line(
          method('tela', 'onkey', [name(pick(['f', 'g'])), text('x')]),
          'sz_py_turtle_screen_onkey',
        ),
      () => line(def('a_cada_quadro'), 'sz_py_turtle_every'),
      () => line(run(name('a_cada_quadro'))),
      () => line(loop(boolean(true), [pass()])),
    ]
    for (let round = 0; round < 300; round++) {
      const lines = Array.from({ length: 2 + Math.floor(random() * 10) }, () => pick(templates)())
      const analysis = analyze(lines)
      const plan = planPythonOrganize(analysis)
      const position = new Map(plan.order.map((original, index) => [original, index]))
      for (let i = 0; i < lines.length; i++)
        for (let j = i + 1; j < lines.length; j++)
          if (!pythonStatementsCommute(analysis.statements[i]!, analysis.statements[j]!))
            expect(position.get(i)! < position.get(j)!).toBe(true)
      const indexes = plan.areas.map(pythonAreaIndex)
      expect(indexes).toEqual([...indexes].sort((a, b) => a - b))
      expect([...plan.order].sort((a, b) => a - b)).toEqual(lines.map((_, index) => index))
    }
  })
})

describe('arraste e paleta', () => {
  const fits = (kind: PythonAreaKind, statement: PythonNode, codec?: string) =>
    pythonStatementFitsArea(kind, statement, codec, { repeatFunctions: new Set(['a_cada_quadro']) })

  test('o Ao iniciar aceita tudo; as outras só os blocos delas', () => {
    const anything = run(name('print'))
    expect(fits('start', anything)).toBe(true)
    expect(fits('libraries', anything)).toBe(false)
    expect(fits('libraries', imp('random'))).toBe(true)
    expect(fits('settings', assign('VEL', integer('2')))).toBe(true)
    expect(fits('settings', assign('vel', integer('2')))).toBe(false)
    expect(fits('molds', def('f'))).toBe(true)
    expect(fits('molds', def('update'), 'sz_py_pgzero_update')).toBe(false)
    expect(fits('events', def('on_key_down'), 'sz_py_pgzero_on_key_down')).toBe(true)
    expect(fits('events', def('f'))).toBe(false)
    expect(fits('loops', def('update'), 'sz_py_pgzero_update')).toBe(true)
    expect(fits('loops', run(name('a_cada_quadro')))).toBe(true)
    const flip = run(attribute(attribute(name('pygame'), 'display'), 'flip'))
    expect(fits('loops', loop(name('rodando'), [flip]))).toBe(true)
    // O `while` que não é o laço do jogo (uma pergunta repetida) fica no Ao iniciar, como na análise.
    expect(fits('loops', loop(name('rodando'), [pass()]))).toBe(false)
    expect(fits('loops', method('pgzrun', 'go'), 'sz_py_pgzero_go')).toBe(true)
    expect(fits('loops', anything)).toBe(false)
  })

  test('as áreas oferecidas seguem a paleta; o Ao iniciar está sempre', () => {
    expect(pythonOfferedAreas([])).toEqual(['start'])
    expect(pythonOfferedAreas(['sz_py_print', 'sz_py_assign', 'sz_py_def'])).toEqual([
      'settings',
      'molds',
      'start',
    ])
    expect(
      pythonOfferedAreas(['sz_py_import_one', 'sz_py_pgzero_on_key_down', 'sz_py_pgzero_draw']),
    ).toEqual(['libraries', 'start', 'events', 'loops'])
    expect(canonicalPythonArea('sz_py_pygame_flip')).toBe('loops')
    expect(canonicalPythonArea('sz_py_print')).toBeUndefined()
  })
})
