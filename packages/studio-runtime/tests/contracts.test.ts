import { describe, expect, test } from 'bun:test'
import {
  InvalidBuildRequestError,
  normalizeBuildPath,
  parseBuildRequest,
  trustedPackageJson,
  trustedViteConfig,
} from '../src/contracts'

const valid = {
  executionId: 'lesson-1234567890abcdef',
  templateId: 'react-ts',
  files: {
    'index.html': '<div id="root"></div>',
    'src/main.tsx': 'console.log("oi")',
    'package.json': '{"scripts":{"build":"roubar segredo"}}',
    'vite.config.ts': 'export default { plugins: [malicioso()] }',
  },
}

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
    expect(lockfile.packages[''].dependencies.vite).toBe('8.0.16')
    expect(versionAtLeast(lockfile.packages['node_modules/nanoid'].version, '3.3.17')).toBe(true)
    expect(versionAtLeast(lockfile.packages['node_modules/postcss'].version, '8.5.23')).toBe(true)
  })
})
