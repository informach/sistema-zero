import { expect, test } from 'bun:test'
import { isStudioPythonAssetPath } from '@sistemazero/core/studio/portable-path'
import type { ArquivoCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import {
  type CenaParaStudio,
  MIME_DA_CENA_PARA_STUDIO,
} from '@sistemazero/molda-cenarios-core/studio'
import { codificarPngDeAlturas } from '@sistemazero/molda-cenarios-core/v2'
import { RAYLIB_3D_EXTENSION } from '../../runtime/python/raylib/contract'
import { prepareEditableStudioProject } from '../../state/editableProjectValidation'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { createProjectStore } from '../../state/projectStore'
import { prepareProWorkspaceOperation } from '../../state/proWorkspaceOperations'
import { decodeProjectAsset, digestAssetBytes, encodeAssetBase64 } from '../assetBinary'
import { validProAssetPath, validProMaterialPath } from '../proAssetPaths'
import { buildProAssetBundle } from '../proAssets'
import { createEmptyProject } from '../project'
import { isValidAssetDataUrl, type ProjectAsset, sanitizeProjectAssets } from '../projectAssets'
import { buildPythonAssetBundle, sanitizePythonProjectAssets } from '../pythonAssets'
import { isPythonMaterialPath } from '../scene3d/assets'
import { cenasQueUsamAsset, lerAssetDeCena3D, pacoteDeCena3D } from '../scene3d/referencias'
import { assertScene3DAssets } from '../scene3d/validacao'

const dataUrl = (mime: string, bytes: Uint8Array) =>
  `data:${mime};base64,${encodeAssetBase64(bytes)}`
function gravarEnvelope(asset: ProjectAsset, envelope: CenaParaStudio) {
  asset.dataUrl = dataUrl(
    MIME_DA_CENA_PARA_STUDIO,
    new TextEncoder().encode(JSON.stringify(envelope)),
  )
}
async function exemplo() {
  const alturas = new Uint8Array(65 * 65 * 4),
    view = new DataView(alturas.buffer)
  for (let i = 0; i < 65 * 65; i++) view.setFloat32(i * 4, 0.25, true)
  const mascara = new Uint8Array(64 * 64)
  mascara[3] = 1
  const png = await codificarPngDeAlturas({
      largura: 65,
      altura: 65,
      valores: new Float32Array(65 * 65).fill(0.25),
    }),
    arquivos: ArquivoCompilado[] = [],
    assets: ProjectAsset[] = []
  for (const [id, caminho, mime, papel, bytes] of [
    ['alturas', 'dados/alturas.bin', 'application/octet-stream', 'alturas', alturas],
    ['buracos', 'dados/buracos.bin', 'application/octet-stream', 'buracos', mascara],
    ['png', 'imagens/alturas.png', 'image/png', 'alturas', png],
  ] as const) {
    arquivos.push({
      caminho,
      mime,
      papel,
      bytes: bytes.length,
      digest: await digestAssetBytes(bytes),
      ...(id === 'png' ? { largura: 65, altura: 65 } : {}),
    })
    assets.push({
      id,
      name: id,
      kind: id === 'png' ? 'image' : 'scene3d-data',
      source: 'library',
      dataUrl: dataUrl(mime, bytes),
      ...(id !== 'png' ? { dado3d: { papel }, originalFileName: `${id}.bin` } : {}),
    })
  }
  const envelope: CenaParaStudio = {
    formato: 'studio-cena3d',
    versao: 1,
    cena: {
      formato: 'molda-cena-compilada',
      versao: 1,
      nome: 'Faísca',
      unidade: 'metro',
      eixoVertical: 'y',
      fonte: { cenario: 'faisca', revisao: 3, digest: 'a'.repeat(64) },
      arquivos,
      entidades: [],
      nos: [],
      colisoes: [],
      aguas: [],
      caminhos: [],
      marcadores: [],
      texturas: [],
      fontes: { modelos: [], texturas: [], conjuntos: [] },
      licencas: [],
      ambiente: { hora: 12 },
      terreno: {
        origem: { x: -32, z: 0 },
        passo: 1,
        colunas: 64,
        linhas: 64,
        min: 0,
        max: 1,
        fundo: 0,
        cobertura: 'grade',
        pecas: [],
        recortes: [],
        alturas: 'dados/alturas.bin',
        pngAlturas: 'imagens/alturas.png',
        buracos: 'dados/buracos.bin',
      },
    },
    recursos: arquivos.map((f, i) => ({ caminho: f.caminho, asset: assets[i]!.id })),
  }
  const scene: ProjectAsset = {
    id: 'cena-id',
    name: 'faisca',
    kind: 'scene3d',
    source: 'library',
    originalFileName: 'faisca.scene3d.json',
    libId: 'personal:cenario:faisca:3',
    libOrigin: 'molda',
    libRevision: 3,
    license: { name: 'Ensaio próprio' },
    dataUrl: '',
  }
  gravarEnvelope(scene, envelope)
  assets.push(scene)
  return { assets, scene, envelope }
}

test('scene3d e campos físicos sobrevivem ao mesmo saneador com IDs, nomes e bytes exatos', async () => {
  const { assets, scene } = await exemplo(),
    antes = JSON.stringify(assets)
  expect(sanitizeProjectAssets(assets)).toEqual(assets)
  expect(sanitizePythonProjectAssets(assets)).toEqual(assets)
  await assertScene3DAssets(assets)
  expect(pacoteDeCena3D(scene, assets).arquivos.get('dados/alturas.bin')).toEqual(
    decodeProjectAsset(assets[0]!.dataUrl).bytes,
  )
  expect(JSON.stringify(assets)).toBe(antes)
  const renomeados = assets.map((a) => ({ ...a, name: `novo-${a.name}` }))
  await assertScene3DAssets(renomeados)
  expect(cenasQueUsamAsset(renomeados, 'alturas')).toEqual(['novo-faisca'])
  expect(cenasQueUsamAsset(renomeados, 'cena-id')).toEqual([])
})

test('dependência ausente, tipo/MIME errado e IDs repetidos recusam o conjunto', async () => {
  const { assets } = await exemplo()
  for (const entrada of [
    assets.slice(1),
    [...assets, { ...assets[0]!, name: 'outro' }],
    assets.map((a) => (a.id === 'png' ? { ...a, kind: 'audio' as const } : a)),
    assets.map((a) => (a.id === 'buracos' ? { ...a, dado3d: { papel: 'alturas' as const } } : a)),
  ])
    await expect(assertScene3DAssets(entrada)).rejects.toThrow(/precisa|tipo|identificador|campo/i)
})

test('hash e resolução física não são aceitos somente porque o data URL é válido', async () => {
  const p = await exemplo(),
    bytes = decodeProjectAsset(p.assets[0]!.dataUrl).bytes
  new DataView(bytes.buffer).setFloat32(0, 0.5, true)
  p.assets[0]!.dataUrl = dataUrl('application/octet-stream', bytes)
  await expect(assertScene3DAssets(p.assets)).rejects.toThrow(/hash/i)
  const q = await exemplo()
  q.assets[0]!.dataUrl = dataUrl('application/octet-stream', new Uint8Array(4))
  await expect(assertScene3DAssets(q.assets)).rejects.toThrow(/tamanho|bytes/i)
  const r = await exemplo()
  r.envelope.cena.arquivos.find((f) => f.mime === 'image/png')!.largura = 64
  gravarEnvelope(r.scene, r.envelope)
  expect(isValidAssetDataUrl(r.scene.dataUrl, 'scene3d', r.scene.originalFileName)).toBe(false)
})

test('Float32 não finito, campo truncado e máscara inválida falham antes do runtime', async () => {
  for (const valor of [NaN, Infinity, -Infinity]) {
    const { assets } = await exemplo(),
      bytes = decodeProjectAsset(assets[0]!.dataUrl).bytes
    new DataView(bytes.buffer).setFloat32(0, valor, true)
    assets[0]!.dataUrl = dataUrl('application/octet-stream', bytes)
    expect(() => sanitizeProjectAssets(assets)).toThrow(/altura|inválido/i)
  }
  const { assets } = await exemplo()
  assets[0]!.dataUrl = dataUrl('application/octet-stream', new Uint8Array(3))
  expect(() => sanitizeProjectAssets(assets)).toThrow(/Float32/i)
  const q = await exemplo(),
    mask = decodeProjectAsset(q.assets[1]!.dataUrl).bytes
  mask[0] = 2
  q.assets[1]!.dataUrl = dataUrl('application/octet-stream', mask)
  expect(() => sanitizeProjectAssets(q.assets)).toThrow(/0 ou 1/i)
})

test('MIME, extensão, UTF-8 e orçamento dos campos são fechados', async () => {
  const { scene, assets } = await exemplo(),
    dado = assets[0]!
  expect(isValidAssetDataUrl(dado.dataUrl, 'scene3d-data', 'dados.json')).toBe(false)
  expect(isValidAssetDataUrl(scene.dataUrl, 'scene3d', 'cena.py')).toBe(false)
  expect(
    isValidAssetDataUrl(
      scene.dataUrl.replace('application/vnd.sistemazero.cena3d+json', 'application/json'),
      'scene3d',
      'cena.json',
    ),
  ).toBe(false)
  expect(
    isValidAssetDataUrl(
      dataUrl(MIME_DA_CENA_PARA_STUDIO, new Uint8Array([255])),
      'scene3d',
      'cena.json',
    ),
  ).toBe(false)
  expect(
    isValidAssetDataUrl(
      dataUrl('application/octet-stream', new Uint8Array(5 * 1024 * 1024 + 1)),
      'scene3d-data',
      'dados.bin',
    ),
  ).toBe(false)
  const invalid = assets.map((a) =>
    a.id === 'alturas' ? { ...a, dado3d: { papel: 'arbitrario' } } : a,
  )
  expect(() => sanitizeProjectAssets(invalid)).toThrow(/precisa/i)
})

test('Pro e Python materializam envelope e campos sem alterar seus bytes ou metadados', async () => {
  const { assets } = await exemplo(),
    pro = await buildProAssetBundle(assets),
    py = await buildPythonAssetBundle(assets)
  for (const a of assets) {
    const pe = pro.manifest.assets.find((e) => e.id === a.id)!,
      ye = py.manifest.assets.find((e) => e.id === a.id)!,
      bytes = decodeProjectAsset(a.dataUrl).bytes
    expect(pro.files.get(pe.path)).toEqual(bytes)
    expect(py.files.get(ye.path)).toEqual(bytes)
    expect(pe.sha256).toBe(ye.sha256)
    expect(pe.dado3d).toEqual(a.dado3d)
    expect(ye.dado3d).toEqual(a.dado3d)
  }
})

test('exceções de caminho são tipadas; JSON/bin não viram imagem, som ou arquivo executável', async () => {
  const { assets } = await exemplo(),
    scene = assets.find((a) => a.kind === 'scene3d')!,
    py = assets.map((a) => ({
      ...a,
      proPath: `cenarios/${a.name}.${a.kind === 'scene3d' ? 'json' : a.kind === 'scene3d-data' ? 'bin' : 'png'}`,
    })),
    pro = py.map((a) => ({ ...a, proPath: `public/${a.proPath}` }))
  expect(sanitizePythonProjectAssets(py)).toEqual(py)
  expect(sanitizeProjectAssets(pro)).toEqual(pro)
  expect(isStudioPythonAssetPath('cenarios/faisca.json')).toBe(false)
  expect(isPythonMaterialPath('cenarios/faisca.json', 'image')).toBe(false)
  expect(validProAssetPath('public/faisca.json')).toBe(false)
  expect(validProMaterialPath('public/faisca.json', 'audio')).toBe(false)
  expect(isValidAssetDataUrl(scene.dataUrl, 'image', 'a.png')).toBe(false)
  for (const path of [
    '../faisca.json',
    '/faisca.json',
    'cenarios/run.py',
    'cenarios/.env.json',
    'cenarios/aux.json',
  ])
    expect(isPythonMaterialPath(path, 'scene3d')).toBe(false)
  await expect(buildPythonAssetBundle(py, { files: ['cenarios/faisca.json'] })).rejects.toThrow(
    /colide|conflit/i,
  )
})

test('reabertura de documentos Classic/Pro em ambas as linguagens confere a cena inteira', async () => {
  const { assets } = await exemplo()
  for (const language of ['javascript', 'python'] as const)
    for (const kind of ['classic', 'pro'] as const) {
      const doc = documentFixture(language, kind),
        source = {
          ...(language === 'javascript' ? createEmptyProject(doc.id, doc.name) : {}),
          ...doc,
          assets,
          coverAssetName: undefined,
        }
      const parsed = await prepareEditableStudioProject(source)
      expect(parsed?.assets).toEqual(assets)
      const invalid = structuredClone(source)
      invalid.assets[0]!.dataUrl = dataUrl('application/octet-stream', new Uint8Array(4))
      await expect(prepareEditableStudioProject(invalid)).rejects.toThrow(/tamanho|bytes/i)
    }
})

test('cancelamento e versão não suportada não retornam uma cena parcial', async () => {
  const { assets, scene, envelope } = await exemplo(),
    c = new AbortController()
  c.abort()
  await expect(assertScene3DAssets(assets, c.signal)).rejects.toHaveProperty('name', 'AbortError')
  scene.dataUrl = dataUrl(
    MIME_DA_CENA_PARA_STUDIO,
    new TextEncoder().encode(JSON.stringify({ ...envelope, versao: 2 })),
  )
  expect(() => lerAssetDeCena3D(scene)).toThrow(/inválido/i)
})

test('edição protege dependências e permite renomear sem alterar seus IDs ou caminhos', async () => {
  const { assets } = await exemplo(),
    store = createProjectStore()
  const project = { ...createEmptyProject('cena-teste', 'Faísca'), assets }
  store.setState({ project, isDirty: false })
  expect(store.getState().removeAsset('alturas')).toMatch(/faisca/)
  expect(store.getState().project).toBe(project)
  expect(store.getState().isDirty).toBe(false)
  expect(
    store.getState().updateAssetImage('png', { dataUrl: 'data:image/png;base64,AAAA' }),
  ).toMatch(/faisca/)
  expect(store.getState().project).toBe(project)
  expect(store.getState().renameAsset('png', 'mapa-alturas')).toBeNull()
  const renamed = store.getState().project!.assets!
  expect(renamed.find((a) => a.id === 'png')?.name).toBe('mapa-alturas')
  await assertScene3DAssets(renamed)
  expect(store.getState().removeAsset('cena-id')).toBeNull()
  expect(store.getState().removeAsset('alturas')).toBeNull()
})

test('exclusão pelo workspace Pro também protege uma dependência do cenário', async () => {
  const { assets } = await exemplo(),
    store = createProjectStore(),
    project = {
      ...createEmptyProject('cena-pro', 'Faísca'),
      kind: 'pro' as const,
      mode: 'code' as const,
      assets,
      proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
      tree: { 'main.ts': { kind: 'file' as const, content: '' } },
    }
  store.setState({ project, isDirty: false })
  await expect(
    prepareProWorkspaceOperation(store, project.id, null, { kind: 'material-delete', id: 'png' }),
  ).rejects.toThrow(/faisca/)
  expect(store.getState().project).toBe(project)
  const changed = assets.map((a) =>
    a.id === 'png' ? { ...a, dataUrl: 'data:image/png;base64,AAAA' } : a,
  )
  expect(() => store.getState().reconcileProAssets(project.id, assets, changed)).toThrow(/faisca/)
  expect(
    store.getState().reconcileProFiles(project.id, project.tree, project.tree, undefined, {
      assets: changed,
      coverAssetName: null,
    }),
  ).toMatch(/faisca/)
  expect(store.getState().project).toBe(project)
})

test('renomear recursos Raylib usados pela cena conserva os caminhos físicos e o programa', async () => {
  const { assets } = await exemplo(),
    doc = documentFixture('python', 'classic')
  if (doc.programmingLanguage !== 'python' || doc.kind !== 'classic') throw Error('fixture')
  const paths = assets.map((a) => ({
      ...a,
      proPath: `cenarios/${a.name}.${a.kind === 'scene3d' ? 'json' : a.kind === 'scene3d-data' ? 'bin' : 'png'}`,
    })),
    project = {
      ...doc,
      assets: paths,
      coverAssetName: undefined,
      installedExtensions: [{ ...RAYLIB_3D_EXTENSION, installedAt: 1 }],
    },
    store = createProjectStore()
  store.setState({ project, isDirty: false })
  for (const asset of paths) {
    expect(store.getState().renameAsset(asset.id, `novo-${asset.name}`)).toBeNull()
    expect(store.getState().project!.assets!.find((a) => a.id === asset.id)?.proPath).toBe(
      asset.proPath,
    )
  }
  expect(store.getState().project!.files).toEqual(doc.files)
  await assertScene3DAssets(store.getState().project!.assets!)
})

test('trazer um mapa do Pinta não sobrescreve uma textura fixada por uma revisão 3D', async () => {
  const { assets } = await exemplo(),
    store = createProjectStore(),
    atuais = assets.map((a) =>
      a.id === 'png' ? { ...a, libId: 'personal:desenho', libOrigin: 'pinta' as const } : a,
    ),
    project = { ...createEmptyProject('cena-pinta', 'Faísca'), assets: atuais }
  store.setState({ project, isDirty: false })
  const scene = {
    version: 1,
    id: 'desenho',
    name: 'Horta',
    tileSize: 16,
    cols: 1,
    rows: 1,
    tilesets: [
      {
        id: 'ts',
        name: 'Peças',
        image: 'data:image/png;base64,AAAA',
        columns: 1,
        count: 1,
        solid: [],
        platform: [],
      },
    ],
    layers: [
      { id: 'chao', name: 'Chão', kind: 'tiles', visible: true, tilesetId: 'ts', cells: [0] },
    ],
  }
  expect(
    store.getState().importPintaMapBundle({
      id: 'desenho',
      name: 'horta',
      dataUrl: 'data:image/png;base64,AAAA',
      scene,
    }),
  ).toMatch(/faisca/)
  expect(store.getState().project).toBe(project)
  expect(store.getState().isDirty).toBe(false)
})
