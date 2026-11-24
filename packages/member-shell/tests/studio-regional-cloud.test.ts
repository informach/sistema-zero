import { expect, test } from 'bun:test'
import { regionalSceneMaterial } from '../../studio/src/testing/pintaRegionalMaterialFixture'
import { buildStudioCloudSnapshot } from '../src/lib/studio-cloud'

test('um cenário regional admitido viaja na conta sem perder o PNG ou o marcador', async () => {
  const asset = await regionalSceneMaterial()
  const snapshot = await buildStudioCloudSnapshot({
    id: 'regional-project',
    name: 'Vila regional',
    kind: 'classic',
    formatVersion: 2,
    updatedAt: 0,
    assets: [asset],
  })
  expect(JSON.parse(snapshot.json)).toMatchObject({
    format: 'sz-studio-parts',
    version: 2,
    requirements: { envelopeVersion: 2, projectFormat: 2, materials: 'pinta-region-5' },
    program: { id: 'regional-project', assets: [] },
  })
  const [part] = snapshot.parts ?? []
  if (!part) throw new Error('O material regional não pode desaparecer do snapshot.')
  expect(JSON.parse(await part.text())).toEqual(asset)
})

test('a edição seguinte não troca os bytes ou a identidade da revisão em envio', async () => {
  const asset = await regionalSceneMaterial()
  const original = structuredClone(asset)
  const pending = buildStudioCloudSnapshot({
    id: 'captured-project',
    name: 'Vila regional',
    formatVersion: 2,
    updatedAt: 0,
    assets: [asset],
  })
  asset.name = 'outro-cenario'
  asset.dataUrl = 'data:image/png;base64,mudou'
  const snapshot = await pending
  const [part] = snapshot.parts ?? []
  if (!part) throw new Error('O material capturado precisa viajar com o programa.')
  expect(JSON.parse(await part.text())).toEqual(original)
})

test('marcador divergente não vira snapshot regional com aparência de sucesso', async () => {
  const asset = await regionalSceneMaterial()
  await expect(
    buildStudioCloudSnapshot({
      id: 'invalid-project',
      name: 'Vila regional',
      formatVersion: 2,
      updatedAt: 0,
      assets: [{ ...asset, regional: { ...asset.regional, sha256: '0'.repeat(64) } }],
    }),
  ).rejects.toThrow('Os dados do PNG diferem')
})
