import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expectSameFixture } from './fixtureCompare'
import { readGlb } from './glbRead'
import { reflectFixtureGlbV } from './glbReflectUv'
import { expectValidGlb } from './gltfValidation'
import { makeSceneStudioContract } from './sceneStudioContract'
import { makeSceneStudioFlipbookContract } from './sceneStudioFlipbookContract'
import { makeSceneStudioSkinContract } from './sceneStudioSkinContract'

/**
 * ⚠️ O golden é do chunk BIN, não do arquivo inteiro. O chunk JSON carrega Float64 vindos de
 * `Math.atan2`/`sin`/`cos`, cuja precisão é definida pela implementação: o mesmo GLB gerado no
 * Windows e no Linux difere no último bit ali, e um hash do arquivo inteiro nunca poderia
 * passar nos dois. O BIN é Float32 — o arredondamento absorve a diferença — e é exatamente
 * onde a reflexão de V escreve, então é ele que este golden precisa prender.
 */
function expectLegacyUvGolden(dataUrl: string, golden: string) {
  // Buffer is deliberately accepted too: Uint8Array.slice would alias this source.
  const bytes: Uint8Array = Buffer.from(dataUrl.split(',')[1]!, 'base64'),
    before = new Uint8Array(bytes),
    reflected = reflectFixtureGlbV(bytes)
  expect(new Bun.CryptoHasher('sha256').update(readGlb(reflected).bin).digest('hex')).toBe(golden)
  expect(bytes).toEqual(before)
  expect(reflected.buffer).not.toBe(bytes.buffer)
}

test('the actual Studio GLB fixture stays byte-identical to native export and its pose oracle, and passes Khronos', async () => {
  const fixture = makeSceneStudioContract()
  const recorded = JSON.parse(
    readFileSync(
      resolve(
        import.meta.dir,
        '../../../../packages/studio/src/official-extensions/game-3d-advanced/__tests__/fixtures/molda-articulated.json',
      ),
      'utf8',
    ),
  )
  expectSameFixture(fixture, recorded)
  expectLegacyUvGolden(
    fixture.dataUrl,
    'f6c8c436f96ca8a58ffbb1040b6071e91d71ee4ea666a8aa4e9348f5c8bfadc0',
  )
  const bytes = new Uint8Array(Buffer.from(fixture.dataUrl.split(',')[1]!, 'base64'))
  await expectValidGlb(bytes)
  expect(fixture.stats).toMatchObject({
    nodes: 13,
    renderedParts: 2,
    meshes: 1,
    clips: 2,
    animationChannels: 8,
  })
  expect(fixture.clips[0]!.end).not.toEqual(fixture.clips[1]!.end)
  expect(
    fixture.clips.every((clip) => JSON.stringify(clip.end) !== JSON.stringify(fixture.rest)),
  ).toBe(true)
})

test('the Studio skin fixture stays byte-identical to native export and its CPU point oracle', async () => {
  const fixture = makeSceneStudioSkinContract(),
    recorded = JSON.parse(
      readFileSync(
        resolve(
          import.meta.dir,
          '../../../../packages/studio/src/official-extensions/game-3d-advanced/__tests__/fixtures/molda-skinned.json',
        ),
        'utf8',
      ),
    )
  expectSameFixture(fixture, recorded)
  expectLegacyUvGolden(
    fixture.dataUrl,
    '1d56115bb6d29e13f03b2c3d534d9a480082b7508b84d1faae9826cb8a2a27f9',
  )
  const bytes = new Uint8Array(Buffer.from(fixture.dataUrl.split(',')[1]!, 'base64'))
  await expectValidGlb(bytes, Array(3).fill('NODE_SKINNED_MESH_NON_ROOT'))
  expect(fixture.stats).toMatchObject({
    nodes: 30,
    bones: 6,
    meshes: 1,
    renderedParts: 3,
    clips: 2,
    animationChannels: 12,
  })
  expect(fixture.rest.every((part) => part.points.length === 6)).toBe(true)
  for (const clip of fixture.clips) expect(clip.end).not.toEqual(fixture.rest)
  expect(fixture.clips[0]!.end).not.toEqual(fixture.clips[1]!.end)
})

// A fixture da pintura animada nasceu SEM esta guarda, ao contrário das duas irmãs: o
// produtor e a cópia congelada podiam divergir com as duas suítes verdes, que é exatamente
// o que a reflexão de V do lote 187 teria feito.
test('the Studio flipbook fixture stays byte-identical to native export, and passes Khronos', async () => {
  const fixture = makeSceneStudioFlipbookContract(),
    recorded = JSON.parse(
      readFileSync(
        resolve(
          import.meta.dir,
          '../../../../packages/studio/src/official-extensions/game-3d-advanced/__tests__/fixtures/molda-flipbook.json',
        ),
        'utf8',
      ),
    )
  expectSameFixture(fixture, recorded)
  const bytes = new Uint8Array(Buffer.from(fixture.dataUrl.split(',')[1]!, 'base64'))
  await expectValidGlb(bytes)
  // A tinta anda: é isso que o relatório de destino precisa enxergar como movimento.
  expect(fixture.stats).toMatchObject({ animatedPaints: 1, clips: 0 })
})
