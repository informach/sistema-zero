/**
 * Prova com o Python de verdade: organizar as áreas nunca muda o que o programa faz. Cada
 * programa roda na ordem original e na ordem que `planPythonOrganize` escolheu, e o que ele
 * escreve, o erro em que para e os valores que sobram têm de ser iguais.
 *
 * Sem Python 3.13+ no PATH a prova é pulada com aviso (como a do executor sem Chromium).
 */
import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import type { PythonNode } from '../language/types'
import { analyzePythonModuleAreas, planPythonOrganize } from './areas'

const DRIVER = fileURLToPath(new URL('./areas.differential.py', import.meta.url))

/**
 * O analisador do Estúdio (`analyzer.py`) usa `ast.parse(..., optimize=0)`, que só existe a partir do
 * Python 3.13 (o do Pyodide): num 3.12 ele recusa tudo, e a prova não diria nada.
 */
function findPython(): string | undefined {
  for (const command of ['python3', 'python']) {
    try {
      const probe = Bun.spawnSync([command, '-c', 'import sys; print(sys.version_info >= (3, 13))'])
      if (probe.exitCode === 0 && probe.stdout.toString().trim() === 'True') return command
    } catch {
      // sem este comando: tenta o próximo
    }
  }
  return undefined
}

const PYTHON = findPython()
if (!PYTHON) console.warn('[areas.differential] sem Python 3.13+ no PATH: prova diferencial pulada')

function driver<T>(request: unknown): T {
  const result = Bun.spawnSync([PYTHON!, '-I', DRIVER], {
    stdin: new TextEncoder().encode(JSON.stringify(request)),
  })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return JSON.parse(result.stdout.toString()) as T
}

interface Outcome {
  output: string
  error: string | null
  values: Record<string, string>
}
interface Comparison {
  same: boolean
  original: Outcome
  reordered: Outcome
}

/** Organiza cada fonte e roda as duas ordens no Python. */
function organizeAndCompare(sources: readonly string[]) {
  const trees = driver<(PythonNode | null)[]>({ op: 'parse', sources })
  const plans = trees.map((tree, index) => {
    if (!tree) throw new Error(`não analisou:\n${sources[index]}`)
    const body = (tree.fields.body as PythonNode[]) ?? []
    return planPythonOrganize(
      analyzePythonModuleAreas(
        tree,
        body.map(() => undefined),
      ),
    )
  })
  const results = driver<Comparison[]>({
    op: 'run',
    cases: sources.map((source, index) => ({ source, order: plans[index]!.order })),
  })
  return results.map((result, index) => ({
    ...result,
    plan: plans[index]!,
    source: sources[index]!,
  }))
}

function expectSame(results: ReturnType<typeof organizeAndCompare>) {
  for (const result of results)
    if (!result.same)
      throw new Error(
        `organizar mudou o programa (ordem ${JSON.stringify(result.plan.order)}):\n${result.source}\n` +
          `original: ${JSON.stringify(result.original)}\nreorganizado: ${JSON.stringify(result.reordered)}`,
      )
}

// Os casos da revisão de 22/11/2026 (M1 a M12): cada um mudava o programa no modelo antigo.
const REVIEW_CASES: Record<string, string> = {
  // Lista, dicionário e conjunto que ficam iguais sobem para as Configurações (22/11/2026).
  'lista fixa sobe para as Configurações': `
print('oi')
def primeira():
    return CORES[0] + str(TAMANHOS['g'])
CORES = ['r', 'g']
TAMANHOS = {'p': 1, 'g': 3}
VAZIOS = {(0, 0), (1, 2)}
print(primeira(), len(VAZIOS))
`,
  'lista que muda fica onde está': `
print('x')
PONTOS = [1]
PONTOS.append(2)
print(PONTOS)
`,
  'lista entregue a quem embaralha fica onde está': `
import random
random.seed(1)
CARTAS = [1, 2, 3, 4]
random.shuffle(CARTAS)
print(CARTAS)
`,
  'M1 configuração que depende de lista mudada': `
CORES = ['r', 'b']
CORES.append('g')
TODAS = CORES + ['k']
print(TODAS)
`,
  'M1 conta e comparação leem na hora': `
pontos = 1
print(pontos > 0, pontos + 1, f"{pontos}")
pontos = 5
LIMITE = 3
`,
  'M2 += num apelido': `
B = [1]
a = B
a += [2]
C = B + B
print(C)
`,
  'M3 decorador que registra': `
eventos = []
def registrar(f):
    eventos.append(f)
    return f
print(len(eventos))
@registrar
def pular():
    pass
print(len(eventos))
`,
  'M3 __init_subclass__ pela base': `
class Base:
    def __init_subclass__(cls):
        print('nova classe', cls.__name__)
print('antes')
class Filho(Base):
    pass
`,
  'M4 método da criança chamado onclick': `
class Botao:
    def onclick(self, f):
        print('registrou')
b = Botao()
def f():
    pass
b.onclick(f)
print('pronto')
`,
  'M4 registro antes de limpar a tela': `
import turtle
def tecla():
    print('tecla')
turtle.onkey(tecla, 'a')
turtle.clearscreen()
print('preparado')
turtle.mainloop()
`,
  'M5 laço preso dentro de um if': `
import turtle
print('a')
if True:
    turtle.mainloop()
X = 1
print('b')
`,
  'M6 função passada por nome de argumento': `
def avisar():
    print('aviso', NIVEL)
NIVEL = 1
def chamar(command):
    command()
chamar(command=avisar)
NIVEL2 = 2
`,
  'M6 lambda chamada na hora': `
x = 1
(lambda: print('x vale', x))()
x = 2
`,
  'M7 def dentro de if e global em qualquer lugar': `
if True:
    def subir():
        global nivel
        nivel = 9
nivel = 1
subir()
print(nivel)
`,
  'M8 configuração que dá erro': `
print('oi')
X = 1 / 0
`,
  'M8 divisão por configuração zero': `
ZERO = 0
print('antes')
METADE = 10 / ZERO
`,
  'M10 operador da classe da criança': `
class Ponto:
    def __add__(self, outro):
        print('somou')
        return self
p = Ponto()
print('começo')
q = p + p
DOIS = 2
`,
  'M11 exec cria nome': `
print('a')
exec('valor = 5')
print(valor)
VALOR = 1
`,
  'M12 função que chama função que prende': `
import turtle
def rodar():
    turtle.mainloop()
def comecar():
    rodar()
print('antes')
comecar()
print('depois')
`,
  'nome lido antes de existir': `
print('a')
def f(x=Q):
    return x
Q = 1
`,
  // O rastreio de chamadas: em cada caso, uma configuração ou definição de depois só pode subir se
  // nada que a linha de cima roda ler (ou trocar) aquele nome.
  'chamada por nome local dentro da função': `
def k():
    print('k vê', LIMITE)
def rodar():
    x = k
    x()
rodar()
LIMITE = 1
`,
  'função entregue à biblioteca': `
def k2(v):
    print('k2 vê', LIMITE)
    return v
print(list(map(k2, [1])))
LIMITE = 1
`,
  'apelido de função entregue à biblioteca': `
def k2(v):
    print('k2 vê', LIMITE)
    return v
acao = k2
print(list(map(acao, [1])))
LIMITE = 1
`,
  'criar objeto roda o __init__': `
class E:
    def __init__(self):
        print('init vê', LIMITE)
e = E()
LIMITE = 1
`,
  'atributo que guarda função': `
class Caixa:
    pass
def k():
    print('k vê', LIMITE)
c = Caixa()
c.acao = k
c.acao()
LIMITE = 1
`,
  'função que prende o programa com tecla registrada': `
import turtle
def tecla():
    print('tecla vê', LIMITE)
turtle.onkey(tecla, 'a')
def rodar():
    turtle.mainloop()
rodar()
LIMITE = 1
`,
  'função que troca uma definição por global': `
def trocar():
    global falar
    falar = lambda: print('trocada')
trocar()
def falar():
    print('original')
falar()
`,
  // Revisão dos lotes 1 a 3: linhas que pareciam "só criar nomes" mas podem dar erro.
  'import de um nome que não existe': `
print("Bem-vindo")
from random import randit
print("fim")
`,
  'import de submódulo que não existe': `
print("Bem-vindo")
import os.caminho
`,
  'classe com ordem de bases impossível': `
class Animal:
    pass
class Cachorro(Animal):
    pass
print("antes")
class Filhote(Animal, Cachorro):
    pass
`,
  'classe cuja base é uma função': `
def Personagem():
    pass
print("antes")
class Heroi(Personagem):
    pass
`,
  'laço que tenta de novo até dar certo (termina)': `
def sortear():
    tentativas = 0
    while True:
        tentativas += 1
        if tentativas > 2:
            break
    print('sorteou em', tentativas)
print('antes')
sortear()
def depois():
    print('depois')
depois()
`,
  'registro com função que ainda não existe': `
import turtle
turtle.onkey(pular, 'a')
print('x')
def pular():
    pass
`,
}

// Fuzz: programas pequenos montados de pedaços que já quebraram o modelo (nomes que faltam,
// registro e limpeza do Turtle, decorador, classe com operador, global, exec, erro na conta…).
const PIECES: readonly ((pick: <T>(items: readonly T[]) => T) => string)[] = [
  (p) => `print('p', ${p(['a', 'b', 'A', 'B', '1', 'f', 'len'])})`,
  (p) =>
    `${p(['A', 'B'])} = ${p(['0', '1', '3', "'x'", '(1, 2)', 'A + 1', '10 / A', '2 ** B', '[1]'])}`,
  (p) =>
    `${p(['a', 'b'])} = ${p(['[1, 2]', 'A', 'b', 'a + 1', 'len(a)', 'lambda: A', 'f()', '{1: 2}'])}`,
  (p) => `${p(['a', 'b', 'A'])}.append(${p(['1', 'a', 'A'])})`,
  (p) => `${p(['a', 'b'])} += ${p(['1', '[3]'])}`,
  (p) => `def f():\n    return ${p(['a', 'A', 'b'])}`,
  () => 'def f():\n    global a\n    a = 7',
  (p) => `def f():\n    print('em f', ${p(['a', 'A'])})`,
  (p) => `def g():\n    turtle.${p(['clearscreen()', "onkey(f, 'x')", 'listen()'])}`,
  (p) => `def f(x=${p(['A', 'a', '1'])}):\n    return x`,
  () => "def deco(fn):\n    print('deco', fn.__name__)\n    return fn",
  () => '@deco\ndef f():\n    pass',
  (p) => `class C:\n    X = ${p(['1', 'A', 'a'])}`,
  () => 'class D(C):\n    pass',
  () => "class C:\n    def __init_subclass__(cls):\n        print('sub', cls.__name__)",
  () => "class C:\n    def __add__(self, o):\n        print('soma')\n        return 0",
  () => 'x = C() + C()',
  (p) =>
    p([
      'import math',
      'import turtle',
      'from math import pi',
      'from random import randit',
      'import os.caminho',
    ]),
  () => `class F(D, C):
    pass`,
  (p) => p(['f()', 'g()', 'print(f())']),
  (p) => `turtle.onkey(${p(['f', 'g'])}, '${p(['a', 'b'])}')`,
  (p) => p(['turtle.listen()', 'turtle.clearscreen()', 'turtle.ontimer(f, 10)']),
  () => 'tela = turtle.Screen()',
  (p) => `tela.onkey(${p(['f', 'g'])}, 'k')`,
  (p) => `if ${p(['a', 'A', 'True'])}:\n    print('sim')`,
  () => 'for i in range(2):\n    print(i)',
  (p) => `try:\n    print(${p(['a', 'A', 'zz'])})\nexcept NameError:\n    print('sem nome')`,
  () => 'while False:\n    pass',
  () => "exec('a = 5')",
  () => 'A, B = 1, 2',
  (p) => `del ${p(['a', 'A'])}`,
  // Quem chama quem: parâmetro, apelido, lista de funções, método, atributo que guarda função.
  () => `def h(cb):
    cb()`,
  (p) => `h(${p(['f', 'g', 'k'])})`,
  (p) => `acao = ${p(['f', 'g', 'print'])}`,
  () => 'acao()',
  (p) => `acoes = [${p(['f', 'g'])}, k]`,
  () => `for x in acoes:
    x()`,
  () => `class E:
    def __init__(self):
        print('init', A)
    def m(self):
        global a
        a = 3`,
  (p) => p(['e = E()', 'e.m()', 'E().m()']),
  () => 'e.cb = f',
  () => 'e.cb()',
  () => "print(sorted([2, 1], key=lambda v: print('chave', A) or v))",
  () => `def k():
    f()`,
  () => `def k():
    global A
    A = 9`,
  () => 'k()',
  () => 'print(list(map(k2, [1])))',
  () => `def k2(v):
    print('k2', a)
    return v`,
]

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function fuzzSources(count: number, seed: number) {
  const random = mulberry32(seed)
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]!
  const out: string[] = []
  for (let k = 0; k < count; k++) {
    const lines: string[] = []
    const size = 4 + Math.floor(random() * 8)
    for (let i = 0; i < size; i++) lines.push(pick(PIECES)(pick))
    if (random() < 0.4) lines.push('turtle.mainloop()')
    out.push(`${lines.join('\n')}\n`)
  }
  return out
}

/** A área da linha `line` (0 = a primeira) de um programa analisado pelo Python de verdade. */
function areaOf(source: string, line: number) {
  const [tree] = driver<(PythonNode | null)[]>({ op: 'parse', sources: [source] })
  if (!tree) throw new Error(`não analisou:\n${source}`)
  const body = (tree.fields.body as PythonNode[]) ?? []
  const info = analyzePythonModuleAreas(
    tree,
    body.map(() => undefined),
  ).statements[line]!
  return info.role === 'area' ? info.area : info.role
}

describe.skipIf(!PYTHON)('lista, dicionário e conjunto em MAIÚSCULAS', () => {
  // Pedido dela (22/11/2026): Configurações são as constantes; a lista que o jogo muda é variável.
  test('ficam iguais enquanto o jogo roda: Configurações', () => {
    const constants: [string, number][] = [
      [
        'import random\nCORES = ["#f00", "#0f0"]\nprint(CORES[0], len(CORES), random.choice(CORES))\nfor cor in CORES:\n    print(cor, CORES.index(cor))\n',
        1,
      ],
      ['MAPA = ["#.#", "..."]\nprint(MAPA[1][2], "#" in MAPA[0], [*MAPA])\n', 0],
      [
        'TECLAS = {"Left": (-1, 0), "Right": (1, 0)}\nprint(TECLAS.get("Left"), TECLAS["Right"])\n',
        0,
      ],
      ['VAZIOS = {(0, 0), (1, 2)}\nprint((0, 0) in VAZIOS)\n', 0],
      ['DIRECOES = [(1, 0), (0, 1)]\nfor dx, dy in DIRECOES + [(0, 0)]:\n    print(dx)\n', 0],
      ['GRADE = [[0, 0], [1, 1]]\nprint(GRADE[0][1], len(GRADE))\n', 0],
      ['A, B = [1], (2, 3)\nprint(A[0], B)\n', 0],
      // Dicionário de listas de textos: o `for` tira textos da lista de dentro.
      [
        'ABERTURAS = {"I": ["cima", "baixo"]}\nfor lado in ABERTURAS["I"]:\n    print(lado)\nprint("cima" in ABERTURAS.get("I", []))\n',
        0,
      ],
      // Dicionário de dicionários: o `for` no dicionário entrega as chaves.
      [
        'MONSTROS = {"a": {"vida": 3}}\nfor nome in MONSTROS:\n    print(MONSTROS[nome]["vida"], MONSTROS[nome]["vida"].bit_length())\n',
        0,
      ],
    ]
    for (const [source, line] of constants)
      expect([source, areaOf(source, line)]).toEqual([source, 'settings'])
  })

  test('o programa muda, ou entrega a quem pode mudar: Ao iniciar', () => {
    const variables: [string, number][] = [
      ['FILA = []\nFILA.append(1)\n', 0],
      ['PONTOS = [0]\ndef somar():\n    PONTOS[0] += 1\n', 0],
      ['MAPA = ["#"]\ndef apagar():\n    del MAPA[0]\n', 0],
      ['import random\nCARTAS = [1, 2]\nrandom.shuffle(CARTAS)\n', 1],
      ['CORES = ["a"]\nlista = CORES\n', 0],
      ['CORES = ["a"]\ndef pintar(cores):\n    cores.append("b")\npintar(CORES)\n', 0],
      ['GRADE = [[0, 0]]\nfor linha in GRADE:\n    linha[0] = 1\n', 0],
      ['GRADE = [[0, 0]]\nprimeira = GRADE[0]\n', 0],
      // Um dicionário de dentro guardado noutro nome pode ser mudado por ele.
      ['GOLPES = {"a": {"dano": 1}}\ngolpe = GOLPES["a"]\n', 0],
      ['LISTAS = [[1], [2]]\nimport random\nprint(random.choice(LISTAS))\n', 0],
      ['TECLAS = {"a": 1}\nTECLAS.update(b=2)\n', 0],
      ['cores = ["a"]\n', 0],
      ['CHAVES = {(1, [2]): 3}\n', 0],
      ['BASE = {"a": 1}\nTUDO = {**BASE}\n', 1],
      ['CORES = ["a"]\nCORES = ["b"]\n', 0],
    ]
    for (const [source, line] of variables)
      expect([source, areaOf(source, line)]).toEqual([source, 'start'])
  })
})

describe.skipIf(!PYTHON)('organizar com o Python de verdade', () => {
  test('os casos da revisão continuam fazendo a mesma coisa', () => {
    expectSame(organizeAndCompare(Object.values(REVIEW_CASES)))
  }, 60_000)

  test('programas sorteados continuam fazendo a mesma coisa (e alguns mudam de ordem)', () => {
    // Para apertar mais: AREAS_FUZZ_COUNT=5000 AREAS_FUZZ_SEED=7 bun test …
    const count = Number(process.env.AREAS_FUZZ_COUNT ?? 400)
    const results = organizeAndCompare(
      fuzzSources(count, Number(process.env.AREAS_FUZZ_SEED ?? 20261122)),
    )
    expectSame(results)
    // Anti-vácuo: a prova só vale se o organizador de fato mexe em parte dos programas.
    const moved = results.filter((result) => result.plan.changed).length
    expect(moved).toBeGreaterThan(count / 10)
  }, 120_000)
})
