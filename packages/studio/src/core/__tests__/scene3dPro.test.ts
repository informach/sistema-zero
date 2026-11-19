import { expect, test } from 'bun:test'
import { resolve } from 'node:path'
import ts from 'typescript'
import { criarTransporteDeEnsaio } from '../../testing/scene3dTransportFixture'
import { arquivosDeCenas3DPro } from '../../three/scene3dPro'
import { SCENE3D_PRO_RUNTIME_META } from '../../three/scene3dProRuntime.generated'
import { buildProAssetBundle } from '../proAssets'
import { proAssetExample } from '../proExamples'

const modulePath = 'studio-generated/molda-cenarios.mjs'
const typesPath = 'studio-generated/molda-cenarios.d.mts'

test('Pro autoral materializa o SDK e tipos sem conversão nem mudanças na árvore', async () => {
  const { assets } = await criarTransporteDeEnsaio(),
    tree = {
      'src/main.ts': { kind: 'file' as const, content: '// meu programa' },
      'package.json': { kind: 'file' as const, content: '{"dependencies":{"three":"0.184.0"}}' },
    },
    before = structuredClone(tree),
    bundle = await buildProAssetBundle(assets, tree)
  expect(tree).toEqual(before)
  expect(bundle.manifest.assets.map((a) => a.id)).toEqual(assets.map((a) => a.id))
  const source = new TextDecoder().decode(bundle.files.get(modulePath))
  expect(bundle.files.has(modulePath)).toBe(true)
  expect(source).toContain('export const')
  expect(source).toContain('criarSDKPro')
  expect(source).not.toContain('window.SZScene3D')
  for (const asset of assets) expect(source).not.toContain(asset.dataUrl)
  expect(source).toContain(SCENE3D_PRO_RUNTIME_META.sha256)
  expect(new TextDecoder().decode(bundle.files.get(typesPath))).toContain('AbortSignal')
  for (const entry of bundle.manifest.assets)
    expect(bundle.files.get(entry.path)?.length).toBe(entry.bytes)
  for (const path of [modulePath, typesPath])
    await expect(
      buildProAssetBundle(assets, { [path]: { kind: 'file', content: 'meu codigo' } }),
    ).rejects.toThrow('mesmo caminho')
  await expect(
    buildProAssetBundle(assets, { 'studio-generated': { kind: 'file', content: 'meu codigo' } }),
  ).rejects.toThrow('mesmo caminho')
})

test('projetos sem cenário não recebem runtime ou tipos extras', async () => {
  const bundle = await buildProAssetBundle([])
  expect(bundle.files.has(modulePath)).toBe(false)
  expect(bundle.files.has(typesPath)).toBe(false)
})

test('captura os metadados antes da espera sem incorporar mudanças posteriores do projeto', async () => {
  const { assets } = await criarTransporteDeEnsaio(),
    bundle = await buildProAssetBundle(assets)
  const captured = structuredClone(assets)
  const pending = arquivosDeCenas3DPro(captured, bundle.manifest.assets)
  for (const asset of captured) asset.name = 'mudou_durante_espera'
  const files = await pending
  expect(new TextDecoder().decode(files.get(modulePath))).not.toContain('mudou_durante_espera')
})

test('a receita e os tipos portáteis compilam em JS verificado e TS estrito com o handle canônico', async () => {
  const { assets } = await criarTransporteDeEnsaio(),
    bundle = await buildProAssetBundle(assets)
  const root = resolve(import.meta.dir, '../../__pro_scene__').replaceAll('\\', '/')
  const sources = new Map<string, string>()
  for (const [path, bytes] of bundle.files)
    if (path.startsWith('studio-generated/'))
      sources.set(`${root}/${path}`, new TextDecoder().decode(bytes))
  const scene = bundle.manifest.assets.find((a) => a.kind === 'scene3d')!,
    tree = {
      'package.json': { kind: 'file' as const, content: '{"dependencies":{"three":"0.184.0"}}' },
    }
  sources.set(
    `${root}/main.ts`,
    `${proAssetExample(scene, 'main.ts', tree)!.code}
import {Scene,PerspectiveCamera,Vector3} from 'three'
import {inicio,encerrar,type CenaInstalada} from './studio-generated/molda-cenarios.mjs'
import type {CenaNoCanvas} from '../three/scene3dCanvas'
declare const canonical: CenaNoCanvas
const portable: CenaInstalada=canonical
const base=await carregarCenario(new Scene(),new AbortController().signal)
base.atualizar(1/60);base.quadro(new PerspectiveCamera(),new Vector3())
base.alturas?.(1,2);base.alturas?.temChao?.({x:1,z:2})
base.fisica.resolve({x:0,y:0,z:0},1.16,.25)
base.fisica.raycast({x:0,y:5,z:0},{x:0,y:-5,z:0})?.normal.y
inicio(base).posicao.copy(portable.raiz.position)
base.descartar();encerrar()
`,
  )
  sources.set(
    `${root}/example.js`,
    `${proAssetExample(scene, 'example.js', tree)!.code}\nexport {carregarCenario}\n`,
  )
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    allowJs: true,
    checkJs: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
  }
  const native = ts.createCompilerHost(options),
    norm = (p: string) => p.replaceAll('\\', '/')
  const host: ts.CompilerHost = {
    ...native,
    fileExists: (p) => sources.has(norm(p)) || native.fileExists(p),
    readFile: (p) => sources.get(norm(p)) ?? native.readFile(p),
    directoryExists: (p) =>
      [...sources.keys()].some((f) => f.startsWith(`${norm(p)}/`)) ||
      (native.directoryExists?.(p) ?? false),
    getSourceFile: (p, language, onError, fresh) =>
      sources.has(norm(p))
        ? ts.createSourceFile(p, sources.get(norm(p))!, language, true)
        : native.getSourceFile(p, language, onError, fresh),
  }
  const program = ts.createProgram([`${root}/main.ts`, `${root}/example.js`], options, host)
  expect(
    ts
      .getPreEmitDiagnostics(program)
      .map((d) => `${d.file?.fileName}:${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`),
  ).toEqual([])
  expect(program.getSourceFiles().some((f) => norm(f.fileName) === `${root}/${modulePath}`)).toBe(
    false,
  )
}, 20_000)
