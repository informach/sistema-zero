import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { STUDIO_PRO_REMOTE_PACKAGES } from '@sistemazero/core/studio'
import runtimeLock from '../runtime/package-lock.json' with { type: 'json' }
import {
  InvalidBuildRequestError,
  normalizeBuildPath,
  parseBuildRequest,
  trustedPackageJson,
  trustedViteConfig,
} from '../src/contracts'

const valid = {
  executionId: 'lesson-1234567890abcdef',
  parentOrigin: 'https://kids.test',
  templateId: 'react-ts',
  files: {
    'index.html': '<div id="root"></div>',
    'src/main.tsx': 'console.log("oi")',
    'package.json': '{"scripts":{"build":"roubar segredo"}}',
    'vite.config.ts': 'export default { plugins: [malicioso()] }',
  },
}

test('a imagem inclui os módulos locais importados pelo executor de objetivos', () => {
  const root = resolve(import.meta.dirname, '..')
  const dockerfile = readFileSync(resolve(root, 'Dockerfile'), 'utf8')
  const copied = new Set(
    [...dockerfile.matchAll(/^COPY (runtime\/[^\n]+)/gm)].flatMap((m) =>
      m[1]!.trim().split(/\s+/).slice(0, -1),
    ),
  )
  const queue = ['runtime/check-objectives.mjs'],
    seen = new Set<string>()
  for (const file of queue) {
    if (seen.has(file)) continue
    seen.add(file)
    expect(copied.has(file), `${file} não entra na imagem`).toBe(true)
    const code = readFileSync(resolve(root, file), 'utf8')
    for (const m of code.matchAll(/from\s+['"]\.\/([^'"]+\.mjs)['"]/g))
      queue.push(`runtime/${m[1]}`)
  }
})

function versionAtLeast(actual: string, minimum: string): boolean {
  const actualParts = actual.split('.').map(Number)
  const minimumParts = minimum.split('.').map(Number)
  for (let index = 0; index < Math.max(actualParts.length, minimumParts.length); index += 1) {
    const actualPart = actualParts[index] ?? 0
    const minimumPart = minimumParts[index] ?? 0
    if (actualPart !== minimumPart) return actualPart > minimumPart
  }
  return true
}

describe('contrato do executor Pro', () => {
  test('validates actual project dependencies instead of inferring them from its starter', () => {
    const parsed = parseBuildRequest({
      ...valid,
      templateId: 'vanilla-js',
      files: {
        ...valid.files,
        'package.json': JSON.stringify({ dependencies: { three: '0.180.0', phaser: '3.90.0' } }),
      },
    })
    expect(parsed.dependencies.dependencies).toEqual({ three: '0.180.0', phaser: '3.90.0' })
    expect(JSON.parse(trustedPackageJson('vanilla-js', parsed.dependencies)).dependencies).toEqual(
      parsed.dependencies.dependencies,
    )
  })

  test('rejects unavailable libraries, versions and manifest installation features', () => {
    for (const manifest of [
      { dependencies: { mitt: '3.0.1' } },
      { devDependencies: { vite: '8.0.16' } },
      { dependencies: { three: '0.179.0' } },
      { dependencies: { three: '^0.180.0' } },
      { dependencies: { three: 'https://elsewhere.test/three.tgz' } },
      { workspaces: ['packages/*'] },
      { overrides: { three: '0.179.0' } },
    ])
      expect(() =>
        parseBuildRequest({
          ...valid,
          files: { ...valid.files, 'package.json': JSON.stringify(manifest) },
        }),
      ).toThrow(InvalidBuildRequestError)
  })

  test('accepts a completed npm range lock and rejects stale roots, transitives and integrity', () => {
    const lock = structuredClone(runtimeLock)
    lock.packages[''].dependencies.three = '^0.180.0'
    const parse = (value: unknown) =>
      parseBuildRequest({
        ...valid,
        files: {
          ...valid.files,
          'package.json': JSON.stringify({ dependencies: { three: '^0.180.0' } }),
          'package-lock.json': JSON.stringify(value),
        },
      })
    expect(parse(lock).dependencies.dependencies.three).toBe('0.180.0')
    const redirected = structuredClone(lock)
    redirected.packages['node_modules/three'].resolved = 'https://other.test/three.tgz'
    expect(() => parse(redirected)).toThrow('imagem')
    const forgedGraph = structuredClone(lock)
    forgedGraph.packages['node_modules/vite'].dependencies.postcss = '0.0.0'
    expect(() => parse(forgedGraph)).toThrow('imagem')
    lock.packages['node_modules/three'].integrity += 'corrupt'
    expect(() => parse(lock)).toThrow('imagem')
    lock.packages['node_modules/three'] = structuredClone(
      runtimeLock.packages['node_modules/three'],
    )
    lock.packages['node_modules/scheduler'].version = '0.0.0'
    expect(() => parse(lock)).toThrow('scheduler')
    lock.packages[''].dependencies.three = '0.179.0'
    expect(() => parse(lock)).toThrow('versão')
  })

  test('the public package catalog exactly matches installed image versions', () => {
    for (const [name, version] of Object.entries(STUDIO_PRO_REMOTE_PACKAGES)) {
      const packages = runtimeLock.packages as Record<string, { version?: string }>
      expect(packages[`node_modules/${name}`]?.version).toBe(version)
    }
  })

  test('aceita a árvore válida e remove arquivos de configuração não confiáveis', () => {
    const parsed = parseBuildRequest(valid)
    expect(parsed.files['src/main.tsx']).toContain('console.log')
    expect(parsed.files['package.json']).toBeUndefined()
    expect(parsed.files['vite.config.ts']).toBeUndefined()
  })

  test('rejeita travessia, node_modules e env', () => {
    expect(normalizeBuildPath('../segredo.ts')).toBeNull()
    expect(normalizeBuildPath('node_modules/pacote/index.js')).toBeNull()
    expect(normalizeBuildPath('.env.local')).toBeNull()
  })

  test('exige identificador opaco, template conhecido e index', () => {
    expect(() => parseBuildRequest({ ...valid, executionId: 'curto' })).toThrow(
      InvalidBuildRequestError,
    )
    expect(() => parseBuildRequest({ ...valid, templateId: 'qualquer' })).toThrow(
      InvalidBuildRequestError,
    )
    expect(() => parseBuildRequest({ ...valid, files: { 'src/main.ts': '' } })).toThrow(
      'index.html',
    )
  })

  test('gera dependências e configuração apenas a partir do template confiável', () => {
    const pkg = JSON.parse(trustedPackageJson('react-ts')) as {
      scripts: Record<string, string>
      dependencies: Record<string, string>
    }
    expect(pkg.scripts).toEqual({ build: 'vite build' })
    expect(pkg.dependencies).toEqual({ react: '19.2.0', 'react-dom': '19.2.0' })
    expect(trustedViteConfig('react-ts')).toContain('plugins: [react()]')
    expect(trustedViteConfig('vanilla-js')).not.toContain('@vitejs/plugin-react')
  })

  test('imagem instala dependências reproduzíveis pelo lockfile', async () => {
    const dockerfile = await Bun.file(new URL('../Dockerfile', import.meta.url)).text()
    const lockfile = await Bun.file(new URL('../runtime/package-lock.json', import.meta.url)).json()

    expect(dockerfile).toContain('COPY runtime/package-lock.json')
    expect(dockerfile).toContain('npm ci --ignore-scripts')
    expect(lockfile.lockfileVersion).toBeGreaterThanOrEqual(3)
    expect(lockfile.packages[''].dependencies.vite).toBe('8.1.6')
    expect(versionAtLeast(lockfile.packages['node_modules/nanoid'].version, '3.3.17')).toBe(true)
    expect(versionAtLeast(lockfile.packages['node_modules/postcss'].version, '8.5.23')).toBe(true)
  })
})
