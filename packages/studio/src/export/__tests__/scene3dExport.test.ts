import { expect, test } from 'bun:test'
import { createEmptyProject } from '../../core/project'
import type { Asset3DManifestEntry } from '../../core/projectAssets'
import {
  resolverAssetsDoTransporte3D,
  type TransporteDeCenas3D,
} from '../../core/scene3d/transporte'
import { convertClassicToProTree } from '../../state/convertToPro'
import { criarTransporteDeEnsaio } from '../../testing/scene3dTransportFixture'
import { SCENE3D_RUNTIME } from '../../three/scene3dRuntime.generated'
import { THREE_VERSION } from '../../three/threeRuntimeContract'
import { buildClassicFileMap, buildProFileMap } from '../fileMap'
import { identityMinifiers } from '../minify'

test('export clássico conserva IDs/bytes e instala o carregador antes do motor e do programa', async () => {
  const plano = await criarTransporteDeEnsaio(),
    projeto = {
      ...createEmptyProject('export', 'Cena'),
      assets: plano.assets,
      installedExtensions: [{ id: 'world-3d', version: '0.1.0', installedAt: 0 }],
    },
    { files, imports } = await buildClassicFileMap(projeto, identityMinifiers),
    html = String(files['public/index.html']),
    janela = {} as {
      __SZGAME_CENAS_3D: TransporteDeCenas3D
      __SZGAME_ASSETS: Record<string, string>
      __SZGAME_ASSETS_3D: Record<string, Asset3DManifestEntry>
    }
  expect(files['public/sz-ext/molda-cenarios.js'] === SCENE3D_RUNTIME).toBe(true)
  expect(imports.three).toContain(THREE_VERSION)
  expect(html.indexOf('sz-assets.js')).toBeLessThan(html.indexOf('sz-ext/molda-cenarios.js'))
  expect(html.indexOf('sz-ext/molda-cenarios.js')).toBeLessThan(html.indexOf('sz-ext/world-3d.js'))
  new Function('window', String(files['public/sz-assets.js']))(janela)
  const restaurados = resolverAssetsDoTransporte3D(
    janela.__SZGAME_CENAS_3D,
    janela.__SZGAME_ASSETS,
    janela.__SZGAME_ASSETS_3D,
  )
  expect(restaurados.map((a) => [a.id, a.dataUrl]).sort()).toEqual(
    plano.assets.map((a) => [a.id, a.dataUrl]).sort(),
  )
  expect(String(files['public/sw.js'])).toContain('sz-ext/molda-cenarios.js')
})

test('conversão Pro preserva o módulo e materializa os mesmos canais sem base64 na árvore autoral', async () => {
  const plano = await criarTransporteDeEnsaio(),
    base = createEmptyProject('p', 'Cena Pro'),
    original = {
      ...base,
      files: { ...base.files, 'script.js': 'console.log("Cena Pro");' },
      assets: plano.assets,
    },
    tree = await convertClassicToProTree(original),
    arquivo = tree['src/converted/sz-ext/molda-cenarios.js'],
    pkg = tree['package.json'],
    { files } = await buildProFileMap(
      {
        ...original,
        kind: 'pro',
        tree,
        proMeta: {
          origin: { projectId: original.id, revision: 1 },
          devScript: 'dev',
          templateId: 'vanilla-vite',
        },
      },
      { purpose: 'source' },
    )
  expect(arquivo?.kind === 'file' && arquivo.content === SCENE3D_RUNTIME).toBe(true)
  expect(pkg?.kind === 'file' && JSON.parse(pkg.content).dependencies.three).toBe(THREE_VERSION)
  expect(tree['public/sz-assets.js']).toBeUndefined()
  expect(new TextDecoder().decode(files['public/sz-assets.js'] as Uint8Array)).toContain(
    '__SZGAME_CENAS_3D',
  )
  expect(original.assets).toBe(plano.assets)
})

test('um cenário importado em projeto ainda sem programa pode virar Pro sem aviso de script inexistente', async () => {
  const plano = await criarTransporteDeEnsaio(),
    tree = await convertClassicToProTree({
      ...createEmptyProject('vazio', 'Cena'),
      assets: plano.assets,
    })
  expect(tree['src/converted/sz-ext/molda-cenarios.js']?.kind).toBe('file')
})
