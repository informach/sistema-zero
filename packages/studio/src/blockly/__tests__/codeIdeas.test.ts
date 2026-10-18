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
      expect(ideas(code).loops).toBe(true)
    // Anti-vácuo: código sem laço não passa.
    expect(ideas('const a = 1; desenhar(a)').loops).toBe(false)
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
    expect(found.loops).toBe(false)
  })
})

describe('de onde vem o código de cada projeto', () => {
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
