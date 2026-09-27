import { expect, test } from 'bun:test'
import { encodeSceneGlb } from '../export/sceneGlb'
import { readSceneDocument } from '../scene/readDocument'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import {
  bbmodelAnimatedImportFixture,
  bbmodelAnimatedSource,
  BBMODEL_ANIMATED_TARGET as target,
} from '../testing/bbmodelAnimatedImportFixture'
import { directBbmodelImport } from '../testing/bbmodelImportFixture'
import { expectValidGlb } from '../testing/gltfValidation'
import { bbmodelImportReply, readBbmodelImportReply } from '../workers/bbmodelImportProtocol'
import { readBbmodelImportRequest } from '../workers/bbmodelImportRequest'

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s complete animated conversion reaches strict worker transport, native player and GLB', async (version) => {
  const input = bbmodelAnimatedImportFixture(bbmodelAnimatedSource(version)),
    before = structuredClone(input),
    result = directBbmodelImport(input),
    reply = readBbmodelImportReply(bbmodelImportReply(input, result), input)
  if (reply.type !== 'result' || reply.result.status !== 'ready')
    throw new Error('Ready result expected')
  expect(reply.result).toEqual(result)
  expect(reply.result).not.toBe(result)
  expect(readSceneDocument(reply.result.document).status).toBe('valid')
  const animation = result.document.animations?.[0],
    report = result.report.animations
  if (!animation || !report) throw new Error('Expected complete animation')
  expect(animation.id).toBe('bbmodel_clip_0')
  expect(report.source[0]).toMatchObject({ kind: 'prepared', sourceUuid: 'move' })
  expect(report.conversions[0]?.tracks.map((track) => track.sampling)).toEqual(['authored', 'grid'])
  expect(report.bounds[0]).toMatchObject({
    clipId: animation.id,
    method: 'conservative-local-trs',
    nodes: 2,
  })
  expect(result.report.issues.some((issue) => issue.detail.code === 'animations-omitted')).toBe(
    false,
  )
  expect(result.report.costs.clips).toBe(1)
  const player = prepareSceneAnimation(reply.result.document, animation.id)
  expect(player.sample(0).worldMatrices).not.toEqual(player.sample(0.5).worldMatrices)
  await expectValidGlb(encodeSceneGlb(reply.result.document).bytes)
  expect(input).toEqual(before)
  animation.name = 'Alterado após a resposta'
  const first = report.source[0]
  if (!first) throw new Error('Missing source clip')
  first.sourceUuid = 'outro'
  expect(reply.result.document.animations?.[0]?.name).toBe('Rodar')
  expect(reply.result.report.animations?.source[0]?.sourceUuid).toBe('move')
})

test('bbmodel controller omission is separate from clip conversion and static omission remains opaque', () => {
  const source = {
      ...bbmodelAnimatedSource(),
      animation_controllers: [{ plugin: { script: 'never_execute()' } }],
    },
    input = bbmodelAnimatedImportFixture(source)
  expect(() => directBbmodelImport(input)).toThrow()
  input.options.remainder = { animations: 'convert', controllers: 'omit' }
  const converted = directBbmodelImport(input)
  expect(converted.document.animations).toHaveLength(1)
  expect(converted.report.issues.filter((issue) => issue.stage === 'remainder')).toEqual([
    {
      stage: 'remainder',
      detail: { code: 'animation-controllers-omitted', path: 'animation_controllers', count: 1 },
    },
  ])
  expect(readBbmodelImportReply(bbmodelImportReply(input, converted), input).type).toBe('result')
  const opaque = bbmodelAnimatedImportFixture({
    ...source,
    animations: [{ broken: { x: 'do_not_execute()' } }],
  })
  opaque.options.remainder = { animations: 'omit' }
  const result = directBbmodelImport(opaque)
  expect(result.document.animations).toBeUndefined()
  expect(result.report.animations).toBeNull()
  expect(result.report.issues.filter((issue) => issue.stage === 'remainder')).toHaveLength(2)
  opaque.options.remainder = { animations: 'omit', controllers: 'reject' }
  expect(() => directBbmodelImport(opaque)).toThrow()
})

test('bbmodel conversion validates clip options even with static or absent animation sources', () => {
  const input = bbmodelAnimatedImportFixture({ ...bbmodelAnimatedSource(), animations: [] })
  input.options.clips = { fps: 0 }
  expect(() => directBbmodelImport(input)).toThrow()
  input.options.remainder = { animations: 'omit' }
  expect(() => directBbmodelImport(input)).toThrow()
  expect(() =>
    readBbmodelImportRequest({
      ...input,
      options: { ...input.options, remainder: { controllers: null } },
    }),
  ).toThrow()
  input.options.clips = {}
  input.options.remainder = { animations: 'convert' }
  const empty = directBbmodelImport(input)
  expect(empty.report.animations?.counts).toEqual({ clips: 0, tracks: 0, keys: 0 })
  expect(readBbmodelImportReply(bbmodelImportReply(input, empty), input).type).toBe('result')
  input.options.clips = { adaptation: 'reject' }
  input.bytes = bbmodelAnimatedImportFixture().bytes
  expect(() => directBbmodelImport(input)).toThrow()
})

test('bbmodel incompatible clip is omitted atomically while another clip remains playable', () => {
  const source = bbmodelAnimatedSource(),
    clip = source.animations[0]
  if (!clip) throw new Error('Missing fixture clip')
  const input = bbmodelAnimatedImportFixture({
    ...source,
    animations: [
      {
        ...clip,
        uuid: 'broken',
        animators: { [target]: { ...clip.animators[target], rotation_global: true } },
      },
      clip,
    ],
  })
  input.options.clips = { adaptation: 'continuous-sampled', unresolved: 'omit-clip' }
  const result = directBbmodelImport(input)
  expect(result.document.animations?.map((item) => item.id)).toEqual(['bbmodel_clip_1'])
  expect(result.report.animations?.source[0]).toMatchObject({
    kind: 'omitted',
    problem: { code: 'animator-mode', mode: 'global' },
  })
  expect(result.report.animations?.conversions[0]?.clip).toBe(1)
  expect(readBbmodelImportReply(bbmodelImportReply(input, result), input).type).toBe('result')
})

test('bbmodel animated world bounds fail before missing or invalid image resources can hide them', () => {
  const source = bbmodelAnimatedSource(),
    child = '00000002-0000-0000-0000-000000000000',
    input = bbmodelAnimatedImportFixture({
      ...source,
      groups: [
        { uuid: target, name: 'Pai' },
        { uuid: child, name: 'Filho' },
      ],
      outliner: [{ uuid: target, children: [{ uuid: child, children: ['cube'] }] }],
      elements: source.elements.map((element) => ({
        ...element,
        faces: { ...element.faces, north: { uv: [0, 0, 16, 16], texture: 0 } },
      })),
      textures: [{ uuid: 'paint', relative_path: 'missing.png', render_sides: 'double' }],
      animations: [
        {
          uuid: 'huge',
          length: 1,
          animators: Object.fromEntries(
            [target, child].map((id) => [
              id,
              {
                type: 'bone',
                keyframes: [
                  { channel: 'scale', time: 0, data_points: [{ x: 1e20, y: 1e20, z: 1e20 }] },
                ],
              },
            ]),
          ),
        },
      ],
    })
  expect(() => directBbmodelImport(input)).toThrow('Não foi possível garantir a faixa de desenho')
})
