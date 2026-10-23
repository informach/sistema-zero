import { describe, expect, test } from 'bun:test'
import { codeIdeasPass, collectCodeIdeas, projectCodeFiles, projectCodeIdeas } from '../codeIdeas'

const ideas = (code: string, name = 'main.js') => collectCodeIdeas([{ name, code }])

describe('ideias de programação lidas do código', () => {
  test('laços: for, while, do-while, for-of, for-in e forEach', () => {
    for (const code of [
      'for (let i = 0; i < 3; i++) {}',
      'while (x) {}',
      'do {} while (x)',
      'for (const a of lista) {}',
      'for (const k in obj) {}',
      'lista.forEach((item) => {})',
    ])
      expect(ideas(code).loops).toBeGreaterThan(0)
    // Anti-vácuo: código sem laço não passa.
    expect(ideas('const a = 1; desenhar(a)').loops).toBe(0)
  })

  test('variáveis, inclusive desestruturação', () => {
    const found = ideas(
      'let pontos = 0; const { vida, nivel: fase } = estado; var [x, ...resto] = l',
    )
    for (const name of ['pontos', 'vida', 'fase', 'x', 'resto'])
      expect(found.variables.has(name)).toBe(true)
    expect(found.variables.has('nivel')).toBe(false)
  })

  test('funções: declaração, seta, método e atribuição', () => {
    const found = ideas(`
      function pular() {}
      const correr = () => {}
      class Heroi { constructor() {} atirar() {} }
      jogo.pausar = function () {}
      const obj = { girar() {}, voar: () => {} }
    `)
    for (const name of ['pular', 'correr', 'atirar', 'pausar', 'girar', 'voar'])
      expect(found.functions.has(name)).toBe(true)
    expect(found.functions.has('constructor')).toBe(false)
  })

  test('chamadas: soltas e de método', () => {
    const found = ideas('pular(); heroi.atirar(); jogo?.pausar()')
    for (const name of ['pular', 'atirar', 'pausar']) expect(found.calls.has(name)).toBe(true)
    expect(codeIdeasPass({ type: 'callsFunction', name: 'pular' }, found)).toBe(true)
    expect(codeIdeasPass({ type: 'callsFunction', name: 'correr' }, found)).toBe(false)
  })

  test('TypeScript e JSX também são lidos', () => {
    expect(ideas('let vida: number = 3', 'main.ts').variables.has('vida')).toBe(true)
    expect(
      ideas('const App = () => <div>{lista.map((x) => x)}</div>', 'App.tsx').functions.has('App'),
    ).toBe(true)
  })

  test('código quebrado não derruba a leitura', () => {
    expect(() => ideas('function (( {')).not.toThrow()
  })

  test('comentário e texto não contam como código', () => {
    const found = ideas('// for (;;) {}\nconst msg = "while (true)"')
    expect(found.loops).toBe(0)
  })
})

describe('de onde vem o código de cada projeto', () => {
  test('um arquivo além do orçamento fica inconclusivo, nunca ausente', () => {
    expect(() =>
      collectCodeIdeas([{ name: 'main.js', code: 'while (true) break;'.padEnd(500_001) }]),
    ).toThrow('Não consegui conferir todo o código')
  })

  test('o orçamento acumulado não pode omitir um arquivo posterior', () => {
    expect(() =>
      collectCodeIdeas([
        { name: 'first.js', code: '/* primeiro */'.padEnd(250_000) },
        { name: 'last.js', code: 'while (true) break;'.padEnd(250_001) },
      ]),
    ).toThrow('Não consegui conferir todo o código')
  })

  test('atingir o teto de nós não devolve contagens parciais', () => {
    expect(() => collectCodeIdeas([{ name: 'main.js', code: 'x;'.repeat(100_001) }])).toThrow(
      'Não consegui conferir todo o código',
    )
  })

  test('um arquivo completo no limite continua sendo avaliado', () => {
    expect(
      collectCodeIdeas([{ name: 'main.js', code: 'while (true) break;'.padEnd(500_000) }]).loops,
    ).toBe(1)
  })

  test('a leitura limitada da IR não pode ocultar código rawJS', () => {
    expect(() =>
      projectCodeIdeas({
        ir: { items: Array.from({ length: 200_001 }, () => ({ type: 'noop' })) },
      }),
    ).toThrow('Não consegui conferir todo o código')
  })
  test('Pro: a árvore, sem configuração nem dependências', () => {
    const files = projectCodeFiles({
      kind: 'pro',
      tree: {
        src: { kind: 'dir' },
        'src/main.ts': { kind: 'file', content: 'let vida = 3' },
        'vite.config.ts': { kind: 'file', content: 'const segredo = 1' },
        'node_modules/x/index.js': { kind: 'file', content: 'let dep = 1' },
        'src/types.d.ts': { kind: 'file', content: 'declare let tipo: number' },
        'index.html': { kind: 'file', content: '<script>let html = 1</script>' },
      },
    })
    expect(files.map((f) => f.name)).toEqual(['src/main.ts'])
  })

  test('clássico com IR: só o código que a IR não traduziu (rawJS)', () => {
    const project = {
      ir: { version: 2, behavior: { start: [{ type: 'rawJS', code: 'for (;;) { break }' }] } },
      files: { 'script.js': 'function preload() { for (const a of b) {} }' },
    }
    expect(projectCodeFiles(project)).toEqual([{ name: 'raw.js', code: 'for (;;) { break }' }])
    expect(projectCodeIdeas(project).functions.has('preload')).toBe(false)
  })

  test('clássico sem IR (Ponte à frente): o script.js e os extras', () => {
    const ideasOf = projectCodeIdeas({
      ir: null,
      files: { 'script.js': 'let vida = 3' },
      extraFiles: [{ name: 'util.js', content: 'function ajudar() {}' }],
    })
    expect(ideasOf.variables.has('vida')).toBe(true)
    expect(ideasOf.functions.has('ajudar')).toBe(true)
  })
})

describe('o que mudou desde o projeto inicial (review da etapa 2)', () => {
  const proTree = (files: Record<string, string>) => ({
    kind: 'pro',
    tree: Object.fromEntries(
      Object.entries(files).map(([path, content]) => [path, { kind: 'file', content }]),
    ),
  })
  const modelo = proTree({
    'src/main.ts': 'for (const x of lista) desenhar(x)\nfunction desenhar(x) {}',
  })
  test('o laço que o modelo já tinha não conta; um laço novo conta', () => {
    expect(
      codeIdeasPass({ type: 'usesLoop' }, projectCodeIdeas(modelo), projectCodeIdeas(modelo)),
    ).toBe(false)
    const mexeu = proTree({
      'src/main.ts':
        'for (const x of lista) desenhar(x)\nfunction desenhar(x) {}\nwhile (vivo) andar()',
    })
    expect(
      codeIdeasPass({ type: 'usesLoop' }, projectCodeIdeas(mexeu), projectCodeIdeas(modelo)),
    ).toBe(true)
  })
  test('a função do modelo não conta; criar outra com o nome pedido conta', () => {
    const rule = { type: 'definesFunction' as const, name: 'desenhar' }
    expect(codeIdeasPass(rule, projectCodeIdeas(modelo), projectCodeIdeas(modelo))).toBe(false)
  })
  test('os runtimes que a conversão para o Pro copia não são o jogo da criança', () => {
    const convertido = proTree({
      'public/sz-input.js': 'for (;;) break',
      'public/sz-ext/game-2d.js': 'while (true) {}',
      'public/sw.js': 'do {} while (false)',
      'src/main.js': 'desenhar()',
    })
    expect(projectCodeIdeas(convertido).loops).toBe(0)
  })
  test('forEach solto não é laço; obj[nome]() não chama "nome"; declare let não é variável', () => {
    const found = collectCodeIdeas([
      { name: 'a.ts', code: 'forEach(x)\nobj[pular]()\ndeclare let vida: number' },
    ])
    expect(found.loops).toBe(0)
    expect(found.calls.has('pular')).toBe(false)
    expect(found.variables.has('vida')).toBe(false)
  })
  test('funções que antes escapavam: campo privado, "as", useCallback e pular.call', () => {
    const found = collectCodeIdeas([
      {
        name: 'a.ts',
        code: 'class A { #pular = () => {} }\nconst correr = (() => {}) as Acao\npular.call(this)',
      },
    ])
    expect(found.functions.has('pular')).toBe(true)
    expect(found.functions.has('correr')).toBe(true)
    expect(found.calls.has('pular')).toBe(true)
  })
  test('JSX num .ts e arquivos .mts também são lidos', () => {
    expect(
      collectCodeIdeas([{ name: 'a.ts', code: 'const B = () => <b />; for(;;) break' }]).loops,
    ).toBe(1)
    expect(projectCodeIdeas(proTree({ 'src/m.mts': 'while (a) b()' })).loops).toBe(1)
  })
})
