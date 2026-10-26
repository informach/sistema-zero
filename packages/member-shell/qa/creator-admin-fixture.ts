import type { CreatorMasteryReviewDetail } from '@sistemazero/core/journey'
import type { GallerySubmission } from '@sistemazero/core/learning'
import { assetToJson, createAsset, sanitizePintaAsset } from '@sistemazero/pinta/assets'
import { documentFixture } from '../../studio/src/state/fixtures/projectDocuments'
import { creatorSceneFixture } from './creator-journey-fixtures'

/** Synthetic artwork and identities; the rubric is the actual editorial seed. */
export function creatorAdminFixture(): CreatorMasteryReviewDetail {
  const area = creatorSceneFixture('adult', 'mastery').curriculum.masteries.find(
    (item) => item.id === 'arte2d',
  )!
  const asset = createAsset({
    kind: 'vector-background',
    name: 'Jardim · estudo de cenário',
    width: 480,
    height: 360,
  })
  if (asset.kind === 'vector-background') {
    asset.shapes.push(
      ...[
        { x: 0, y: 0, w: 480, h: 360, fill: '#dbe8ff', rx: 0 },
        { x: 0, y: 260, w: 480, h: 100, fill: '#567f52', rx: 0 },
        { x: 65, y: 100, w: 120, h: 160, fill: '#2f684d', rx: 50 },
        { x: 310, y: 185, w: 68, h: 75, fill: '#f2be4f', rx: 8 },
      ].map((shape, index) => ({
        ...shape,
        id: `preview-shape-${index}`,
        type: 'rect' as const,
        stroke: null,
        opacity: 1,
        rotation: 0,
      })),
    )
  }
  const id = '20000000-0000-4000-8000-000000000001'
  return {
    userId: id,
    accountId: id,
    audience: 'adult',
    areaTitle: area.title,
    definition: area.levels[0]!,
    evidence: {
      payload: { project: asset },
      revision: 'preview-1',
      createdAt: '2026-10-25T12:00:00Z',
    },
    submission: {
      id,
      evidenceId: id,
      evidenceTitle: 'Meu jardim · personagens e cenário',
      masteryId: area.id,
      level: 1,
      policyVersion: 1,
      rubricVersion: area.levels[0]!.rubric.version,
      submittedAt: '2026-10-25T12:00:00Z',
      message:
        'Testei as cores dos objetos para que a chave apareça no cenário. Quero revisar a leitura durante a partida.',
      status: 'pending',
      feedback: null,
      criteria: [],
      credits: [],
      reviewedAt: null,
    },
  }
}

/** Frozen local copies for exercising the actual gallery viewer without private storage. */
export function creatorAdminGalleryFixture() {
  const detail = creatorAdminFixture()
  const original = sanitizePintaAsset((detail.evidence.payload as { project: unknown }).project)
  if (!original) throw new Error('Preview artwork missing')
  const collectible = createAsset({
    kind: 'vector-background',
    name: 'Chave dourada',
    width: 128,
    height: 128,
  })
  if (collectible.kind === 'vector-background')
    collectible.shapes.push(
      {
        id: 'key-ring',
        type: 'rect',
        x: 12,
        y: 32,
        w: 45,
        h: 45,
        rx: 20,
        fill: '#f2be4f',
        stroke: null,
        opacity: 1,
        rotation: 0,
      },
      {
        id: 'key-stem',
        type: 'rect',
        x: 45,
        y: 48,
        w: 65,
        h: 14,
        rx: 3,
        fill: '#f2be4f',
        stroke: null,
        opacity: 1,
        rotation: 0,
      },
      {
        id: 'key-tooth',
        type: 'rect',
        x: 90,
        y: 48,
        w: 14,
        h: 30,
        rx: 2,
        fill: '#f2be4f',
        stroke: null,
        opacity: 1,
        rotation: 0,
      },
    )
  const copies = [
    { id: 'scenario', title: 'Cenário do jardim', project: original },
    {
      id: 'collectible',
      title: 'Chave que aparece no cenário',
      project: collectible,
    },
  ]
  const snapshot: GallerySubmission = {
    kind: 'gallery-delivery',
    version: 1,
    tool: 'pinta',
    requestId: '20000000-0000-4000-8000-000000000004',
    items: copies.map((copy) => ({
      itemId: copy.id,
      name: copy.title,
      revision: 1,
      kind: 'vector-background',
      storageKey: `local-preview/${copy.id}`,
      parts: [],
    })),
  }
  detail.evidence.payload = { project: snapshot }
  return { detail, copies: copies.map((copy) => ({ ...copy, json: assetToJson(copy.project) })) }
}

/** A structural Python snapshot for source inspection; it grants no runtime authorization. */
export function creatorAdminPythonFixture(): CreatorMasteryReviewDetail {
  const detail = creatorAdminFixture()
  const area = creatorSceneFixture('adult', 'mastery').curriculum.masteries.find(
    (area) => area.id === 'python2d',
  )!
  const project = documentFixture('python', 'pro')
  project.assets = []
  delete project.coverAssetName
  detail.areaTitle = area.title
  detail.definition = area.levels[0]!
  detail.submission.masteryId = 'python2d'
  detail.submission.evidenceTitle = 'Meu jogo Python · versão preservada'
  detail.submission.message = 'Separei o cálculo no arquivo helper.py e testei a entrada do jogo.'
  detail.evidence.payload = { project }
  return detail
}
