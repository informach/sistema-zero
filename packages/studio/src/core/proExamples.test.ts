import { describe, expect, it } from 'bun:test'
import ts from 'typescript'
import type { ProAssetManifestEntry } from './proAssets'
import { proAssetExample, proCodeExamples } from './proExamples'

const asset: ProAssetManifestEntry = {
  id: 'a',
  name: 'estrela',
  kind: 'image',
  path: 'public/studio-assets/a.png',
  url: '/studio-assets/a.png',
  mime: 'image/png',
  bytes: 10,
  sha256: '',
  source: 'upload',
}
describe('exemplos determinísticos', () => {
  it('emits valid JS and TS for beginner helpers and assets without executing them', () => {
    for (const path of ['main.js', 'main.ts', 'App.tsx']) {
      for (const example of [
        ...proCodeExamples(path),
        proAssetExample(asset, path, {})!,
        proAssetExample({ ...asset, kind: 'audio' }, path, {})!,
      ]) {
        const result = ts.transpileModule(example.code, {
          fileName: path,
          reportDiagnostics: true,
          compilerOptions: { target: ts.ScriptTarget.ES2022 },
        })
        expect(result.diagnostics).toEqual([])
        expect(example.code).toContain(`function ${example.name}`)
        expect(example.code).not.toMatch(
          /^\s*(?:carregarImagem|criarSom|criarPlacar|escutarTecla)\(/m,
        )
      }
    }
  })
  it('does not infer a 3D engine or insert code into non-code files', () => {
    expect(proAssetExample({ ...asset, kind: 'model3d' }, 'main.ts', {})).toBeNull()
    const tree = {
      'package.json': { kind: 'file' as const, content: '{"dependencies":{"three":"0.180.0"}}' },
    }
    expect(proAssetExample({ ...asset, kind: 'model3d' }, 'main.ts', tree)?.code).toContain(
      'GLTFLoader',
    )
    expect(proAssetExample(asset, 'index.html', tree)).toBeNull()
    expect(proCodeExamples('README.md')).toEqual([])
    expect(proAssetExample({ ...asset, url: '/bad"; alert(1)//' }, 'main.js', {})?.code).toContain(
      '\\"',
    )
  })
})
