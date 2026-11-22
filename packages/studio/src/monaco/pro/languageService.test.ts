import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createProLanguageService, PRO_TYPESCRIPT_VERSION } from './languageService'

const libDir = dirname(fileURLToPath(import.meta.resolve('typescript')))
const libraries = Object.fromEntries(
  readdirSync(libDir)
    .filter((name) => /^lib\..*\.d\.ts$/.test(name))
    .map((name) => [name, readFileSync(join(libDir, name), 'utf8')]),
)

describe('serviço TS isolado por projeto', () => {
  it('preserva símbolos após os primeiros 300, com suas posições reais', () => {
    const service = createProLanguageService(libraries)
    const code = [
      ...Array.from({ length: 350 }, (_, index) => `export const item${index} = ${index};`),
      'export function zzUpdate() { return item349; }',
    ].join('\n')
    try {
      service.update({ 'main.ts': code })
      const symbols = service.symbols('main.ts')
      expect(symbols.length).toBe(351)
      const last = symbols.find((symbol) => symbol.name === 'zzUpdate')
      expect(last).toBeDefined()
      expect(code.slice(last?.start, (last?.start ?? 0) + (last?.length ?? 0))).toBe('zzUpdate')
    } finally {
      service.dispose()
    }
  })

  it('attributes compiler configuration errors to the actual jsconfig file', () => {
    const service = createProLanguageService(libraries)
    service.update({
      'main.js': 'const value = 1',
      'jsconfig.json': '{"compilerOptions":{"target":"invalid-target"}}',
    })
    const problems = service.diagnostics('jsconfig.json')
    expect(problems.length).toBeGreaterThan(0)
    expect(problems.every((item) => item.path === 'jsconfig.json')).toBe(true)
    service.dispose()
  })
  it('distingue pacote instalado sem tipos de pacote inexistente, sem fabricar declarações', () => {
    const service = createProLanguageService(libraries)
    service.update(
      {
        'src/main.ts': 'import value from "untyped"; console.log(value)',
        'node_modules/untyped/package.json': '{"main":"index.js"}',
      },
      ['node_modules/untyped/index.js'],
    )
    expect(service.diagnostics('src/main.ts').map((item) => item.code)).toEqual([7016])
    service.dispose()
  })
  it('resolve Three e addons com as declarações reais do pacote instalado', () => {
    const service = createProLanguageService(libraries)
    const snapshot: Record<string, string> = {
      'src/main.ts':
        'import * as THREE from "three"; import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"; const scene = new THREE.Scene(); const loader = new GLTFLoader(); scene.add(new THREE.Mesh()); loader.load("hero.glb", gltf => scene.add(gltf.scene));',
    }
    const typesRoot = dirname(fileURLToPath(import.meta.resolve('@types/three/package.json')))
    function collect(directory: string, prefix: string) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) collect(join(directory, entry.name), `${prefix}/${entry.name}`)
        else if (entry.name === 'package.json' || /\.d\.[cm]?ts$/.test(entry.name))
          snapshot[`${prefix}/${entry.name}`] = readFileSync(join(directory, entry.name), 'utf8')
      }
    }
    collect(typesRoot, 'node_modules/@types/three')
    // The first query runs before npm finishes; installing types must invalidate resolution.
    service.update({ 'src/main.ts': snapshot['src/main.ts']! })
    expect(service.diagnostics('src/main.ts').some((item) => item.code === 2307)).toBe(true)
    snapshot['node_modules/three/package.json'] = readFileSync(
      fileURLToPath(import.meta.resolve('three/package.json')),
      'utf8',
    )
    service.update(snapshot)
    snapshot['src/main.ts'] += '\n// Digitação antes da próxima análise.'
    service.update(snapshot)
    expect(service.diagnostics('src/main.ts')).toEqual([])
    service.dispose()
  })
  it('resolve arquivo fechado, pacote tipado, subpath, alias e mantém erro real', () => {
    const service = createProLanguageService(libraries)
    expect(service.version).toBe(PRO_TYPESCRIPT_VERSION)
    service.update({
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: { '@/*': ['src/*'] },
          moduleResolution: 'bundler',
          module: 'ESNext',
        },
        include: ['src'],
      }),
      'src/main.ts':
        'import { value } from "@/closed"; import { emitter } from "tiny/sub"; const n: number = value; emitter(n); const wrong: string = 1;',
      'src/closed.ts': 'export const value = 42',
      'node_modules/tiny/package.json': JSON.stringify({
        name: 'tiny',
        exports: { './sub': { types: './sub.d.ts', default: './sub.js' } },
      }),
      'node_modules/tiny/sub.d.ts': 'export declare function emitter(value: number): void;',
    })
    expect(service.diagnostics('src/main.ts').map((item) => item.code)).toEqual([2322])
    expect(service.hover('src/main.ts', 10)?.text).toContain('value')
    service.dispose()
  })
  it('remoção da dependência volta a diagnosticar import e JS tem erro de sintaxe', () => {
    const service = createProLanguageService(libraries)
    const main = 'import { value } from "typed"; console.log(value)'
    service.update({
      'main.ts': main,
      'node_modules/typed/index.d.ts': 'export const value: number;',
    })
    expect(service.diagnostics('main.ts')).toEqual([])
    service.update({ 'main.ts': main, 'broken.js': 'const = ;' })
    expect(service.diagnostics('main.ts').some((item) => item.code === 2307)).toBe(true)
    expect(service.diagnostics('broken.js').length).toBeGreaterThan(0)
    service.dispose()
  })
  it('instâncias com versões diferentes de um pacote não compartilham opções ou tipos', () => {
    const first = createProLanguageService(libraries)
    const second = createProLanguageService(libraries)
    const main = 'import { value } from "typed"; const n: number = value;'
    first.update({
      'main.ts': main,
      'node_modules/typed/index.d.ts': 'export const value: number;',
    })
    second.update({
      'main.ts': main,
      'node_modules/typed/index.d.ts': 'export const value: string;',
    })
    expect(first.diagnostics('main.ts')).toEqual([])
    expect(second.diagnostics('main.ts').map((item) => item.code)).toEqual([2322])
    first.dispose()
    second.dispose()
  })
  it('atualiza tsconfig, resolve extends e mantém autocomplete em arquivo fechado', () => {
    const service = createProLanguageService(libraries)
    const source = 'import { hero } from "@/hero"; hero.position'
    const snapshot = {
      'tsconfig.json': JSON.stringify({ extends: './base.json', include: ['src'] }),
      'base.json': JSON.stringify({
        compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } },
      }),
      'src/main.ts': source,
      'src/hero.ts': 'export const hero = { position: 42 }',
    }
    service.update(snapshot)
    expect(service.diagnostics('src/main.ts')).toEqual([])
    expect(
      service
        .completions('src/main.ts', source.indexOf('hero.position') + 5)
        .some((entry) => entry.name === 'position'),
    ).toBe(true)
    service.update({ ...snapshot, 'tsconfig.json': JSON.stringify({ include: ['src'] }) })
    expect(service.diagnostics('src/main.ts').some((entry) => entry.code === 2307)).toBe(true)
    service.dispose()
  })
})

// Lote 6 da missão (seção 7.2, "organização de imports", 21/11/2026).
describe('organizar as importações', () => {
  const aplicar = (
    source: string,
    edits: { span: { start: number; length: number }; newText: string }[],
  ) =>
    [...edits]
      .sort((a, b) => b.span.start - a.span.start)
      .reduce(
        (text, edit) =>
          text.slice(0, edit.span.start) +
          edit.newText +
          text.slice(edit.span.start + edit.span.length),
        source,
      )

  it('tira o que não é usado e põe em ordem, só no arquivo pedido', () => {
    const service = createProLanguageService(libraries)
    const main = [
      "import { zeta } from './zeta'",
      "import { alfa, nuncaUsado } from './alfa'",
      "import { beta } from './beta'",
      '',
      'export const total = alfa + beta + zeta',
      '',
    ].join('\n')
    const outro =
      "import { beta } from './beta'\nimport { alfa } from './alfa'\nexport const x = alfa + beta\n"
    try {
      service.update({
        'main.ts': main,
        'outro.ts': outro,
        'alfa.ts': 'export const alfa = 1\nexport const nuncaUsado = 2\n',
        'beta.ts': 'export const beta = 2\n',
        'zeta.ts': 'export const zeta = 3\n',
      })
      const resultado = aplicar(main, service.organizeImports('main.ts'))
      expect(resultado).toBe(
        [
          "import { alfa } from './alfa'",
          "import { beta } from './beta'",
          "import { zeta } from './zeta'",
          '',
          'export const total = alfa + beta + zeta',
          '',
        ].join('\n'),
      )
      // O outro arquivo também está fora de ordem: pedido à parte, ele se organiza sozinho.
      expect(aplicar(outro, service.organizeImports('outro.ts'))).toBe(
        "import { alfa } from './alfa'\nimport { beta } from './beta'\nexport const x = alfa + beta\n",
      )
    } finally {
      service.dispose()
    }
  })

  // Achado da medida do lote 6 (21/11/2026): as opções iam incompletas, e opção que falta conta
  // como desligada no TypeScript. "Arrumar código" tirava os espaços em volta do `=` e dos
  // operadores (`this.position=this.position.add(...)`).
  it('"Arrumar código" mantém os espaços do jeito comum e arruma os que sobram', () => {
    const service = createProLanguageService(libraries)
    const arrumado = [
      'export function total(alfa: number, beta: number): number {',
      '  const soma = alfa + beta * 2',
      '  if (soma > 10) return soma - 1',
      '  return soma',
      '}',
      '',
    ].join('\n')
    try {
      service.update({ 'main.ts': arrumado })
      expect(aplicar(arrumado, service.format('main.ts'))).toBe(arrumado)
      const baguncado = 'export const   x   =   1+2\n'
      service.update({ 'main.ts': baguncado })
      expect(aplicar(baguncado, service.format('main.ts'))).toBe('export const x = 1 + 2\n')
    } finally {
      service.dispose()
    }
  })

  // Revisão do lote 6: fora do programa TypeScript o serviço lançava "Could not find source file".
  it('num arquivo fora do programa (CSS, HTML, configuração), não há o que organizar', () => {
    const service = createProLanguageService(libraries)
    try {
      service.update({
        'src/main.ts': "import { a } from './a'\nexport const b = a\n",
        'src/a.ts': 'export const a = 1\n',
        'src/style.css': 'body { color: red }\n',
        'index.html': '<p>oi</p>\n',
        'tsconfig.json': '{"include":["src"]}',
      })
      for (const path of ['src/style.css', 'index.html', 'tsconfig.json'])
        expect(service.organizeImports(path)).toEqual([])
    } finally {
      service.dispose()
    }
  })

  it('um arquivo já organizado não muda', () => {
    const service = createProLanguageService(libraries)
    const main = "import { alfa } from './alfa'\n\nexport const total = alfa\n"
    try {
      service.update({ 'main.ts': main, 'alfa.ts': 'export const alfa = 1\n' })
      expect(aplicar(main, service.organizeImports('main.ts'))).toBe(main)
    } finally {
      service.dispose()
    }
  })
})
