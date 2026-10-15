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
