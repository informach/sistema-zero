import { expect, test } from 'bun:test'
import { criarTransporteDeEnsaio as exemplo } from '../../testing/scene3dTransportFixture'
import { asset3DManifest, assetManifest, type ProjectAsset } from '../projectAssets'
import { pacoteDeCena3D } from '../scene3d/referencias'
import { criarTransporteDeCenas3D, resolverAssetsDoTransporte3D } from '../scene3d/transporte'

test('transporte conserva o grafo por ID e os campos reais, sem copiar modelos/imagens para outro canal', async () => {
  const plano = await exemplo(),
    transporte = criarTransporteDeCenas3D(plano.assets)!,
    imagens = assetManifest(plano.assets),
    modelos = asset3DManifest(plano.assets),
    reconstruidos = resolverAssetsDoTransporte3D(transporte, imagens, modelos),
    primario = plano.assets.find((a) => a.id === plano.assetId)!,
    lido = reconstruidos.find((a) => a.id === plano.assetId)!,
    original = pacoteDeCena3D(primario, plano.assets),
    resolvido = pacoteDeCena3D(lido, reconstruidos)
  expect(transporte.artefatos.some((a) => a.kind === 'scene3d-data')).toBe(true)
  expect(transporte.artefatos.every((a) => a.kind === 'scene3d' || a.kind === 'scene3d-data')).toBe(
    true,
  )
  expect(transporte.referencias.every((a) => !('dataUrl' in a))).toBe(true)
  expect(JSON.stringify(resolvido.cena)).toBe(JSON.stringify(original.cena))
  expect([...resolvido.arquivos]).toEqual([...original.arquivos])
  expect(modelos[primario.name]).toBeUndefined()
  for (const a of plano.assets.filter((a) => a.kind === 'model3d' || a.kind === 'image'))
    expect(JSON.stringify(transporte).includes(a.dataUrl)).toBe(false)
})

test('recusa canais incompletos, tipo trocado e referências adulteradas sem entregar meia cena', async () => {
  const plano = await exemplo(),
    transporte = criarTransporteDeCenas3D(plano.assets)!,
    imagens = assetManifest(plano.assets),
    modelos = asset3DManifest(plano.assets)
  expect(() => resolverAssetsDoTransporte3D(transporte, {}, modelos)).toThrow(/recurso/)
  expect(() => resolverAssetsDoTransporte3D(transporte, imagens, {})).toThrow(/recurso/)
  const modelo = transporte.referencias.find((r) => r.kind === 'model3d')!
  expect(() =>
    resolverAssetsDoTransporte3D(transporte, imagens, {
      ...modelos,
      [modelo.name]: { ...modelos[modelo.name]!, kind: 'environment3d' },
    }),
  ).toThrow(/recurso/)
  const semCampo = {
    ...transporte,
    artefatos: transporte.artefatos.filter((a) => a.kind !== 'scene3d-data'),
  }
  expect(() => resolverAssetsDoTransporte3D(semCampo, imagens, modelos)).toThrow(/precisa/)
})

test('jogos comuns e campos órfãos não carregam o runtime de cenários', () => {
  const campo: ProjectAsset = {
    id: 'sem-cena',
    name: 'dados',
    source: 'upload',
    kind: 'scene3d-data',
    originalFileName: 'dados.bin',
    dataUrl: 'data:application/octet-stream;base64,AAAAAA==',
    dado3d: { papel: 'alturas' },
  }
  expect(criarTransporteDeCenas3D([])).toBeUndefined()
  expect(criarTransporteDeCenas3D([campo])).toBeUndefined()
})
