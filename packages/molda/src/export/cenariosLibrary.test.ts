import { expect, test } from 'bun:test'
import { sceneToJson } from '../scene/documentJson'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { assetToJson } from './assetJson'
import { exportMoldaJsonForCenarios } from './cenariosLibrary'
import { exportLoadedSceneForStudio } from './studioLibrary'

const contexto = { namespace: 'crianca-a', storageRevision: 1 }

test('a cópia usa o snapshot escolhido e recusa troca de identidade', async () => {
  const modelo = makeModel()
  const json = JSON.stringify(assetToJson(modelo))
  const copia = await exportMoldaJsonForCenarios(json, modelo.id, contexto)
  expect(copia.ok && copia.asset.kind).toBe('model3d')
  expect(await exportMoldaJsonForCenarios(json, 'outro-modelo', contexto)).toEqual({
    ok: false,
    reason: 'encode-failed',
  })
  expect(await exportMoldaJsonForCenarios('{quebrou', modelo.id, contexto)).toEqual({
    ok: false,
    reason: 'encode-failed',
  })
})

test('orçamento de Cenários não abre o orçamento do Estúdio por meio do cache', async () => {
  const cena = { ...makeSceneGlbFixture(60, 2, 3, 0), id: 'cenario-grande' }
  const copia = await exportMoldaJsonForCenarios(
    JSON.stringify(sceneToJson(cena)),
    cena.id,
    contexto,
  )
  expect(copia.ok).toBe(true)
  expect(await exportLoadedSceneForStudio(cena, contexto)).toEqual({
    ok: false,
    reason: 'asset-too-big',
  })
})

test('mudanças da cópia exigem o aceite da revisão e do destino exatos', async () => {
  const cena = migrateLegacyModel(makeModel()).document
  cena.nodes[0]!.hidden = true
  const json = JSON.stringify(sceneToJson(cena))
  const primeira = await exportMoldaJsonForCenarios(json, cena.id, contexto)
  expect(!primeira.ok && primeira.reason).toBe('needs-review')
  if (primeira.ok || primeira.reason !== 'needs-review') throw Error('A cópia precisa de revisão')
  expect(
    (
      await exportMoldaJsonForCenarios(json, cena.id, {
        ...contexto,
        acceptedReview: primeira.review.token,
      })
    ).ok,
  ).toBe(true)
  const nova = await exportMoldaJsonForCenarios(json, cena.id, {
    ...contexto,
    storageRevision: 2,
    acceptedReview: primeira.review.token,
  })
  expect(!nova.ok && nova.reason).toBe('needs-review')
})
