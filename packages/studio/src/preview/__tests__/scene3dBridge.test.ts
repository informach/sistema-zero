import { expect, test } from 'bun:test'
import { asset3DManifest, assetManifest } from '../../core/projectAssets'
import {
  criarTransporteDeCenas3D,
  resolverAssetsDoTransporte3D,
} from '../../core/scene3d/transporte'
import { criarTransporteDeEnsaio } from '../../testing/scene3dTransportFixture'
import { buildAssetsRuntime } from '../assetsBridge'

test('a ponte usa os canais existentes e referencia os mesmos bytes por ID, sem repetir GLBs', async () => {
  const plano = await criarTransporteDeEnsaio(),
    transporte = criarTransporteDeCenas3D(plano.assets)!,
    fonte = buildAssetsRuntime(
      assetManifest(plano.assets),
      {},
      {},
      asset3DManifest(plano.assets),
      transporte,
    ),
    win: Pick<Window, '__SZGAME_CENAS_3D' | '__SZGAME_ASSETS' | '__SZGAME_ASSETS_3D'> = {}
  new Function('window', fonte)(win)
  const assets = resolverAssetsDoTransporte3D(
    win.__SZGAME_CENAS_3D!,
    win.__SZGAME_ASSETS!,
    win.__SZGAME_ASSETS_3D!,
  )
  expect(assets.map((a) => a.id).sort()).toEqual(plano.assets.map((a) => a.id).sort())
  for (const a of assets) expect(a.dataUrl).toBe(plano.assets.find((p) => p.id === a.id)!.dataUrl)
  for (const a of plano.assets.filter((a) => a.kind === 'model3d'))
    expect(fonte.split(a.dataUrl).length - 1).toBe(1)
  expect(() => buildAssetsRuntime({}, {}, {}, {}, transporte)).toThrow(/recurso/)
})

test('o caminho antigo permanece byte idêntico quando não há cenário', () => {
  expect(buildAssetsRuntime()).toBe(buildAssetsRuntime({}, {}, {}, {}, undefined))
  expect(buildAssetsRuntime()).not.toContain('__SZGAME_CENAS_3D')
})

test('nomes de modelo que coincidem com propriedades do protótipo continuam resolvendo pelo ID', async () => {
  const plano = await criarTransporteDeEnsaio(),
    modelo = plano.assets.find((a) => a.kind === 'model3d')!
  modelo.name = '__proto__'
  const transporte = criarTransporteDeCenas3D(plano.assets)!,
    modelos = asset3DManifest(plano.assets)
  expect(Object.hasOwn(modelos, '__proto__')).toBe(true)
  expect(() =>
    buildAssetsRuntime(assetManifest(plano.assets), {}, {}, modelos, transporte),
  ).not.toThrow()
})
