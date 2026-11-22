import { expect, test } from 'bun:test'
import { automapFixture } from '../testing/automapFixture'
import { assetToJson } from './assetJson'
import { inspectPintaCausalDocument, verifyWorkshopRuleSheets } from './pintaCausalManifest'
import { provePintaCausalConsumerRemaps } from './pintaCausalTransition'
import { attachWorkshopBook, pintaWorkshopAssetToJson } from './workshopDocument'

test('o servidor verifica slots que só existem no exemplo, a impressão da folha e alterações na regra', async () => {
  const { map, sheet, book } = await automapFixture()
  const asset = attachWorkshopBook(map, book)!
  const spec = { kind: map.kind, itemId: map.id, formatVersion: 8, allowWorkshop: true }
  const text = pintaWorkshopAssetToJson(asset)!
  const before = inspectPintaCausalDocument(text, spec)!
  expect(before.manifest.refs[0]?.indices).toBe('01' + '00'.repeat(31))
  const sheetDoc = inspectPintaCausalDocument(assetToJson(sheet), {
    kind: sheet.kind,
    itemId: sheet.id,
    formatVersion: 6,
  })!
  const signature = (await verifyWorkshopRuleSheets(sheetDoc))!.sheet!.ruleSheetSha256
  expect(before.manifest.refs[0]?.ruleSheetSha256).toBe(signature)
  expect(inspectPintaCausalDocument(text, { ...spec, formatVersion: 7 })).toBeNull()
  expect(inspectPintaCausalDocument(text, { ...spec, allowWorkshop: false })).toBeNull()
  expect(
    inspectPintaCausalDocument(
      pintaWorkshopAssetToJson({ ...asset, updatedAt: asset.updatedAt + 10 })!,
      spec,
    )!.authorial,
  ).toEqual(before.authorial)
  const remap = [
    { sheetId: sheet.id, operation: { type: 'remap' as const, oldToNew: [1], count: 2 } },
  ]
  const after = structuredClone(asset)
  for (const rule of after.automapping.rules)
    for (const planes of [rule.input, ...rule.outputs])
      for (const plane of planes) {
        plane.cells = [1]
        plane.sha256 = 'a'.repeat(64)
      }
  expect(provePintaCausalConsumerRemaps(before, after, remap)).toEqual([
    { sheetId: sheet.id, mode: 'mapped' },
  ])
  after.automapping.rules[0]!.input[0]!.cells = [0]
  expect(provePintaCausalConsumerRemaps(before, after, remap)).toBeNull()
  expect(
    provePintaCausalConsumerRemaps(before, asset, [
      { sheetId: sheet.id, operation: { type: 'remap', oldToNew: [-1], count: 1 } },
    ]),
  ).toBeNull()
  const pinned = { ...asset, resources: [{ sourceId: 'fonte', capturedAt: 10, asset: sheet }] }
  const parsed = inspectPintaCausalDocument(pintaWorkshopAssetToJson(pinned)!, spec)!
  expect(parsed.manifest.refs).toEqual([])
  expect(await verifyWorkshopRuleSheets(parsed)).not.toBeNull()
  const badPin = structuredClone(pinned)
  badPin.resources[0]!.asset.tiles[0]!.data[0] = 3
  const badDoc = inspectPintaCausalDocument(pintaWorkshopAssetToJson(badPin)!, spec)!
  expect(await verifyWorkshopRuleSheets(badDoc)).toBeNull()
})
