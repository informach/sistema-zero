import { expect, test } from 'bun:test'
import { validateBytes } from 'gltf-validator'
import { AnimationMixer, LoopOnce, Mesh, type Object3D, SkinnedMesh } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { encodeGlbContainer } from '../export/glbContainer'
import { encodeSceneGlb } from '../export/sceneGlb'
import { list, record } from '../scene/validation'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneAssistedSkinFixture } from '../testing/sceneAssistedSkin'
import { readGltfAccessors } from './gltfAccessors'
import { prepareGltfAnimationChannel } from './gltfAnimationSample'
import { readGltfAnimations } from './gltfAnimations'
import type { GltfAnimationPath, GltfInterpolation } from './gltfAnimationTypes'
import { readGltfBuffers } from './gltfBuffers'
import { readGltfEnvelope } from './gltfEnvelope'
import { readGltfGraph } from './gltfGraph'
import { GltfInputError } from './gltfInput'
import { readGltfMeshes } from './gltfMeshes'
import { readGltfSkins } from './gltfSkins'

function parse(bytes: Uint8Array) {
  const envelope = readGltfEnvelope(bytes),
    resources = readGltfBuffers(envelope)
  if (resources.status !== 'ready') throw new Error('Unexpected missing resources')
  const json = envelope.json,
    accessors = readGltfAccessors(json.accessors, resources)
  const { meshes, viewUses: meshUses } = readGltfMeshes(
    json.meshes,
    accessors,
    Array.isArray(json.materials) ? json.materials.length : 0,
  )
  const graph = readGltfGraph(json, meshes, {
    skins: Array.isArray(json.skins) ? json.skins.length : 0,
    cameras: 0,
  })
  const skins = readGltfSkins(json.skins, graph, accessors, meshUses)
  return {
    accessors,
    animations: readGltfAnimations(json.animations, { graph, meshes, skins, accessors, meshUses }),
  }
}
function dispose(scene: Object3D) {
  scene.traverse((node) => {
    if (node instanceof Mesh) {
      node.geometry.dispose()
      for (const material of Array.isArray(node.material) ? node.material : [node.material])
        material.dispose()
    }
    if (node instanceof SkinnedMesh) node.skeleton.dispose()
  })
}

function bundle(
  property: GltfAnimationPath,
  interpolation: GltfInterpolation,
  componentType: 5120 | 5121 | 5122 | 5123 | 5126 = 5126,
  sparse = false,
) {
  const segments: Uint8Array[] = [],
    bufferViews: Record<string, unknown>[] = [],
    accessors: Record<string, unknown>[] = []
  let byteLength = 0
  const addView = (data: ArrayBufferView, target?: number) => {
    const index = bufferViews.length
    bufferViews.push({
      buffer: 0,
      byteOffset: byteLength,
      byteLength: data.byteLength,
      ...(target ? { target } : {}),
    })
    segments.push(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
    byteLength += Math.ceil(data.byteLength / 4) * 4
    return index
  }
  const times = new Float32Array([0.125, 2.25])
  accessors.push({
    bufferView: addView(times),
    componentType: 5126,
    count: 2,
    type: 'SCALAR',
    min: [0.125],
    max: [2.25],
  })
  const width = property === 'rotation' ? 4 : property === 'weights' ? 2 : 3,
    unit =
      componentType === 5120
        ? 127
        : componentType === 5121
          ? 255
          : componentType === 5122
            ? 32767
            : componentType === 5123
              ? 65535
              : 1,
    values: number[] = []
  for (let key = 0; key < 2; key++) {
    if (interpolation === 'CUBICSPLINE') values.push(...Array<number>(width).fill(0))
    values.push(
      ...(property === 'rotation'
        ? key
          ? [0, 0, unit, 0]
          : [0, 0, 0, unit]
        : Array.from({ length: width }, (_, c) => (key + c) * unit)),
    )
    if (interpolation === 'CUBICSPLINE') values.push(...Array<number>(width).fill(0))
  }
  const data =
    componentType === 5120
      ? Int8Array.from(values)
      : componentType === 5121
        ? Uint8Array.from(values)
        : componentType === 5122
          ? Int16Array.from(values)
          : componentType === 5123
            ? Uint16Array.from(values)
            : Float32Array.from(values)
  const count = property === 'weights' ? values.length : values.length / width,
    type = property === 'weights' ? 'SCALAR' : `VEC${width}`
  accessors.push({
    componentType,
    count,
    type,
    ...(componentType === 5126 ? {} : { normalized: true }),
    ...(sparse
      ? {
          sparse: {
            count,
            indices: {
              bufferView: addView(Uint8Array.from({ length: count }, (_, i) => i)),
              componentType: 5121,
            },
            values: { bufferView: addView(data) },
          },
        }
      : { bufferView: addView(data) }),
  })
  if (property === 'weights')
    accessors.push({
      bufferView: addView(new Float32Array(9), 34962),
      componentType: 5126,
      count: 3,
      type: 'VEC3',
      min: [0, 0, 0],
      max: [0, 0, 0],
    })
  const json = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'Moving part', ...(property === 'weights' ? { mesh: 0 } : {}) }],
    ...(property === 'weights'
      ? {
          meshes: [
            {
              primitives: [
                { attributes: { POSITION: 2 }, targets: [{ POSITION: 2 }, { POSITION: 2 }] },
              ],
            },
          ],
        }
      : {}),
    buffers: [{ byteLength }],
    bufferViews,
    accessors,
    animations: [
      {
        name: 'Curve',
        samplers: [{ input: 0, output: 1, interpolation }],
        channels: [{ sampler: 0, target: { node: 0, path: property } }],
      },
    ],
  }
  return { json, segments, times, data, bytes: () => encodeGlbContainer(json, segments) }
}

test('real GLBs preserve all core curves, sparse data, and quantized rotations against Khronos and Three', async () => {
  for (const property of ['translation', 'rotation', 'scale', 'weights'] as const)
    for (const method of ['LINEAR', 'STEP', 'CUBICSPLINE'] as const)
      for (const sparse of [false, true]) {
        const fixture = bundle(property, method, 5126, sparse),
          bytes = fixture.bytes(),
          before = new Uint8Array(bytes)
        await expectValidGlb(bytes)
        const parsed = parse(bytes),
          loaded = await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer, '')
        try {
          const clip = parsed.animations[0]!,
            track = loaded.animations[0]!.tracks[0]!
          expect(clip.samplers[0]!.interpolation).toBe(method)
          expect(clip.channels[0]!.target).toEqual({ kind: 'node', node: 0, path: property })
          expect(Array.from(parsed.accessors[0]!.values)).toEqual(Array.from(track.times))
          expect(Array.from(parsed.accessors[1]!.values)).toEqual(Array.from(track.values))
          expect(Array.from(track.values)).toEqual(Array.from(fixture.data))
          expect(bytes).toEqual(before)
        } finally {
          for (const scene of loaded.scenes) dispose(scene)
        }
      }
  for (const component of [5120, 5121, 5122, 5123] as const) {
    const fixture = bundle('rotation', 'LINEAR', component),
      bytes = fixture.bytes()
    await expectValidGlb(bytes)
    const parsed = parse(bytes),
      loaded = await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer, '')
    try {
      expect(Array.from(parsed.accessors[1]!.values, Math.fround)).toEqual(
        Array.from(loaded.animations[0]!.tracks[0]!.values),
      )
    } finally {
      for (const scene of loaded.scenes) dispose(scene)
    }
  }
})

test('real malformed animation data is rejected by both readers with structured diagnostics', async () => {
  for (const problem of [
    'times',
    'quaternion',
    'count',
    'matrix',
    'stride',
    'duplicate',
  ] as const) {
    const fixture = bundle('rotation', 'LINEAR')
    const codes = {
      times: 'ACCESSOR_ANIMATION_INPUT_NON_INCREASING',
      quaternion: 'ACCESSOR_ANIMATION_SAMPLER_OUTPUT_NON_NORMALIZED_QUATERNION',
      count: 'ANIMATION_SAMPLER_OUTPUT_ACCESSOR_INVALID_COUNT',
      matrix: 'ANIMATION_CHANNEL_TARGET_NODE_MATRIX',
      stride: 'ANIMATION_SAMPLER_ACCESSOR_WITH_BYTESTRIDE',
      duplicate: 'ANIMATION_DUPLICATE_TARGETS',
    }
    if (problem === 'times') {
      fixture.times[1] = 0.125
      fixture.json.accessors[0]!.max = [0.125]
    }
    if (problem === 'quaternion') fixture.data[3] = 0
    if (problem === 'count') fixture.json.accessors[1]!.count = 1
    if (problem === 'matrix')
      Object.assign(fixture.json.nodes[0]!, {
        matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      })
    if (problem === 'stride') fixture.json.bufferViews[1]!.byteStride = 16
    if (problem === 'duplicate')
      fixture.json.animations[0]!.channels.push({
        sampler: 0,
        target: { node: 0, path: 'rotation' },
      })
    const bytes = fixture.bytes()
    expect(() => parse(bytes)).toThrow(GltfInputError)
    const report = record(await validateBytes(bytes, { format: 'glb', maxIssues: 100 }), 'report'),
      issues = record(report.issues, 'issues'),
      messages = list(issues.messages, 'messages', 100).map((v) => record(v, 'message'))
    expect(messages.some((entry) => entry.code === codes[problem])).toBe(true)
  }
})

test('native assisted/mirrored exports retain every animation reference and sample array', async () => {
  for (const space of ['local', 'local-delta'] as const) {
    const { document } = makeSceneAssistedSkinFixture(space),
      bytes = encodeSceneGlb(document, { allowLosses: true }).bytes,
      before = new Uint8Array(bytes)
    await expectValidGlb(bytes, Array(3).fill('NODE_SKINNED_MESH_NON_ROOT'))
    const parsed = parse(bytes),
      loaded = await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer, '')
    try {
      expect(parsed.animations.length).toBe(loaded.animations.length)
      for (const [i, clip] of parsed.animations.entries()) {
        expect(clip.channels.length).toBe(loaded.animations[i]!.tracks.length)
        for (const [j, channel] of clip.channels.entries()) {
          const sampler = clip.samplers[channel.sampler]!,
            track = loaded.animations[i]!.tracks[j]!
          expect(Array.from(parsed.accessors[sampler.input]!.values)).toEqual(
            Array.from(track.times),
          )
          expect(Array.from(parsed.accessors[sampler.output]!.values)).toEqual(
            Array.from(track.values),
          )
        }
      }
      expect(bytes).toEqual(before)
    } finally {
      for (const scene of loaded.scenes) dispose(scene)
    }
  }
})

test('prepared glTF samples agree with the real Three mixer on all core curves and seek order', async () => {
  for (const property of ['translation', 'rotation', 'scale', 'weights'] as const)
    for (const method of ['LINEAR', 'STEP', 'CUBICSPLINE'] as const) {
      const fixture = bundle(property, method),
        bytes = fixture.bytes(),
        parsed = parse(bytes),
        loaded = await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer, ''),
        mixer = new AnimationMixer(loaded.scene),
        action = mixer.clipAction(loaded.animations[0]!)
      action.setLoop(LoopOnce, 1)
      action.clampWhenFinished = true
      const target = loaded.scene.children[0]!,
        prepared = prepareGltfAnimationChannel(parsed.animations[0]!, 0, parsed.accessors)
      try {
        for (const time of [0, 0.125, 0.25, 1, 2, 2.25, 3, 0.6, 2.25, 0.125]) {
          action.reset().play()
          mixer.setTime(time)
          const actual = prepared.sample(time)
          let expected: readonly number[]
          if (property === 'weights') {
            if (!(target instanceof Mesh) || !target.morphTargetInfluences)
              throw new Error('Missing morph target mesh')
            expected = target.morphTargetInfluences
          } else
            expected =
              property === 'translation'
                ? target.position.toArray()
                : property === 'rotation'
                  ? target.quaternion.toArray()
                  : target.scale.toArray()
          expect(actual.length).toBe(expected.length)
          for (let i = 0; i < actual.length; i++) expect(actual[i]).toBeCloseTo(expected[i]!, 6)
        }
      } finally {
        mixer.stopAllAction()
        mixer.uncacheRoot(loaded.scene)
        for (const scene of loaded.scenes) dispose(scene)
      }
    }
})
