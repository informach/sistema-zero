import { expect, test } from 'bun:test'
import { AnimationMixer, LoopOnce, Mesh, type Object3D, SkinnedMesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { GlbBinary } from '../export/GlbBinary'
import { encodeGlbContainer } from '../export/glbContainer'
import { encodeSceneGlb } from '../export/sceneGlb'
import { SCENE_LIMITS } from '../scene/limits'
import { transformPoint } from '../scene/matrix'
import { readSceneAnimations } from '../scene/readAnimation'
import { readSceneDocument } from '../scene/readDocument'
import { prepareSceneAnimation, sampleSceneAnimationTrack } from '../scene/sampleAnimation'
import { deformSceneSkin, prepareSceneSkin } from '../scene/skinPose'
import { makeGltfJointMeshFixture } from '../testing/gltfJointMesh'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneAssistedSkinFixture } from '../testing/sceneAssistedSkin'
import { prepareGltfAnimationChannel } from './gltfAnimationSample'
import type { GltfClipOptions } from './gltfClipTypes'
import { readGltfDocument } from './gltfDocument'
import { convertGltfHierarchy } from './gltfHierarchy'
import { GltfInputError } from './gltfInput'
import { convertGltfClips } from './gltfNativeClips'
import { convertGltfDocument } from './gltfNativeDocument'
import { selectGltfDocument } from './gltfSelection'

interface ClipFixture {
  name?: string
  times: number[]
  tracks: Array<{
    node: number | null
    property?: string
    method?: 'STEP' | 'LINEAR' | 'CUBICSPLINE'
    values: number[]
    quantized?: boolean
    times?: number[]
  }>
}
function stages(bytes: Uint8Array, scene?: number | null) {
  const result = readGltfDocument(bytes)
  if (result.status !== 'ready') throw new Error('Self-contained fixture expected')
  const source = result.document,
    selection = selectGltfDocument(source, scene === undefined ? source.graph.defaultScene : scene),
    hierarchy = convertGltfHierarchy(source, selection, {
      geometryIds: selection.variants.map((_, i) => `shape_${i}`),
      defaultMaterialId: 'default',
    })
  return {
    source,
    selection,
    hierarchy,
    convert: (options?: GltfClipOptions) => convertGltfClips(source, selection, hierarchy, options),
  }
}
function fixture(
  clips: ClipFixture[],
  options: {
    nodes?: Array<Record<string, unknown>>
    scenes?: Array<{ nodes: number[] }>
    scene?: number
  } = {},
) {
  const binary = new GlbBinary(),
    accessors: Array<Record<string, unknown>> = []
  function add(
    values: number[],
    type: 'SCALAR' | 'VEC3' | 'VEC4',
    input = false,
    quantized = false,
  ) {
    const data = quantized ? Int8Array.from(values) : Float32Array.from(values),
      width = type === 'SCALAR' ? 1 : type === 'VEC3' ? 3 : 4
    accessors.push({
      bufferView: binary.addView(new Uint8Array(data.buffer)),
      componentType: quantized ? 5120 : 5126,
      type,
      count: data.length / width,
      ...(input ? { min: [data[0]], max: [data[data.length - 1]] } : {}),
      ...(quantized ? { normalized: true } : {}),
    })
    return accessors.length - 1
  }
  const animations = clips.map((clip) => {
    const input = add(clip.times, 'SCALAR', true)
    return {
      ...(clip.name === undefined ? {} : { name: clip.name }),
      samplers: clip.tracks.map((track) => ({
        input: track.times ? add(track.times, 'SCALAR', true) : input,
        output: add(
          track.values,
          track.property === 'rotation' ? 'VEC4' : 'VEC3',
          false,
          track.quantized,
        ),
        interpolation: track.method ?? 'LINEAR',
      })),
      channels: clip.tracks.map((track, sampler) => ({
        sampler,
        target: {
          ...(track.node === null ? {} : { node: track.node }),
          path: track.property ?? 'translation',
        },
      })),
    }
  })
  const nodes =
    options.nodes ??
    Array.from(
      {
        length:
          Math.max(0, ...clips.flatMap((clip) => clip.tracks.map((track) => track.node ?? 0))) + 1,
      },
      () => ({}),
    )
  return stages(
    encodeGlbContainer(
      {
        asset: { version: '2.0' },
        buffers: [{ byteLength: binary.byteLength }],
        bufferViews: binary.views,
        accessors,
        nodes,
        animations,
        ...(options.scenes ? { scenes: options.scenes, scene: options.scene ?? 0 } : {}),
      },
      binary.segments,
    ),
  )
}
function fails(run: () => unknown, reason: GltfInputError['reason'], path?: string) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  if (!(error instanceof GltfInputError)) throw new Error('Expected structured error')
  expect(error.reason).toBe(reason)
  if (path) expect(error.path).toBe(path)
}

test('local clips preserve authored times, STEP/LINEAR, names, values and independent editable keys', () => {
  const f = fixture([
      {
        name: 'Mover',
        times: [0.1, 0.5, 2],
        tracks: [
          { node: 0, values: [1, -1, 10, 4, -4, 10, 10, -10, 10] },
          { node: 1, method: 'STEP', property: 'scale', values: [1, 2, -1, 2, 3, 0, -4, 5, 2] },
        ],
      },
    ]),
    before = structuredClone(f.source),
    result = f.convert({ fps: 7 })
  const clip = result.animations[0]!
  expect(clip).toMatchObject({
    id: 'gltf_clip_0',
    name: 'Mover',
    space: 'local',
    fps: 7,
    duration: 2,
    loop: false,
  })
  expect(clip.tracks[0]!.keys.map((key) => key.time)).toEqual([Math.fround(0.1), 0.5, 2])
  expect(result.issues).toEqual([])
  for (const [channel, track] of clip.tracks.entries()) {
    const sample = prepareGltfAnimationChannel(f.source.animations[0]!, channel, f.source.accessors)
    for (const time of [0, Math.fround(0.1), 0.25, 0.5, 1.23, 2, 3, 0.2])
      expect(Array.from(sampleSceneAnimationTrack(track, time))).toEqual(
        Array.from(sample.sample(time)),
      )
  }
  expect(readSceneAnimations(result.animations)).toEqual(result.animations)
  clip.tracks[0]!.keys[0]!.value[0] = 99
  expect(f.convert().animations[0]!.tracks[0]!.keys[0]!.value[0]).toBe(1)
  expect(f.source).toEqual(before)
  expect(f.convert({ loop: true }).animations[0]!.loop).toBe(true)
})

test('selected clips retain full source duration while outside-scene values are never read and unresolved omission is explicit', () => {
  const f = fixture(
    [
      {
        name: 'Selecionado',
        times: [0, 2],
        tracks: [
          { node: 0, values: [0, 0, 0, 2, 0, 0] },
          { node: 1, times: [0, 5], values: [0, 0, 0, 4, 0, 0] },
        ],
      },
      { name: 'Fora', times: [0, 5], tracks: [{ node: 1, values: [0, 0, 0, 5, 0, 0] }] },
      {
        name: 'Extensão',
        times: [0, 3],
        tracks: [{ node: null, property: 'custom', values: [0, 0, 0, 3, 0, 0] }],
      },
    ],
    { scenes: [{ nodes: [0] }, { nodes: [1] }] },
  )
  fails(f.convert, 'unsupported', 'animations[2].channels[0].target')
  for (const [index, accessor] of f.source.accessors.entries())
    if (!f.selection.dependencies.accessors.includes(index))
      Object.defineProperty(accessor, 'values', {
        get(): Float64Array {
          throw new Error('Unselected values read')
        },
      })
  const result = f.convert({ unresolved: 'omit' })
  expect(result.animations).toHaveLength(1)
  expect(result.animations[0]!.tracks).toHaveLength(1)
  expect(result.animations[0]!.duration).toBe(5)
  expect(result.issues.map((issue) => issue.code)).toEqual([
    'outside-scene-channel',
    'outside-scene-channel',
    'empty-clip-omitted',
    'unresolved-channel-omitted',
    'empty-clip-omitted',
  ])
})

test('cubic bake is explicit, includes every original off-grid time, and matches source at all samples', () => {
  const f = fixture([
    {
      name: 'Curva',
      times: [0.1, 0.3, 1.1],
      tracks: [
        {
          node: 0,
          method: 'CUBICSPLINE',
          values: [
            0, 0, 0, 0, 0, 0, 10, 2, -1, -2, 3, 1, 2, 1, -1, 1, -3, 4, 4, 2, 0, 4, 0, 2, 0, 0, 0,
          ],
        },
      ],
    },
  ])
  fails(f.convert, 'unsupported', 'animations[0].samplers[0].interpolation')
  const result = f.convert({ cubic: 'bake', fps: 4 }),
    track = result.animations[0]!.tracks[0]!,
    times = track.keys.map((key) => key.time),
    sample = prepareGltfAnimationChannel(f.source.animations[0]!, 0, f.source.accessors)
  expect(times).toEqual([Math.fround(0.1), 0.25, Math.fround(0.3), 0.5, 0.75, 1, Math.fround(1.1)])
  for (const key of track.keys) {
    expect(key.interpolation).toBe('linear')
    expect(Array.from(key.value)).toEqual(Array.from(sample.sample(key.time)))
  }
  expect(Array.from(sampleSceneAnimationTrack(track, 0.4))).not.toEqual(
    Array.from(sample.sample(0.4)),
  )
  expect(result.issues).toEqual([
    {
      code: 'cubic-resampled',
      path: 'animations[0].channels[0]',
      clipId: 'gltf_clip_0',
      count: 7,
      fps: 4,
    },
  ])
  expect(readSceneAnimations(result.animations)).toEqual(result.animations)
})

test('normalization preserves signs, is opt-in only where required, and never changes valid source keys', () => {
  const values = [64, 64, 64, 63, 0, 0, 0, -127],
    f = fixture([
      {
        name: 'Girar',
        times: [0, 1],
        tracks: [{ node: 0, property: 'rotation', quantized: true, values }],
      },
    ])
  fails(f.convert, 'unsupported', 'animations[0].channels[0]')
  const result = f.convert({ rotations: 'normalize' }),
    keys = result.animations[0]!.tracks[0]!.keys,
    expected = values.slice(0, 4).map((value) => value / Math.hypot(...values.slice(0, 4)))
  for (let i = 0; i < 4; i++) expect(keys[0]!.value[i]).toBeCloseTo(expected[i]!, 14)
  expect(keys[1]!.value).toEqual([0, 0, 0, -1])
  expect(result.issues[0]).toMatchObject({ code: 'rotation-keys-normalized', count: 1 })
  expect(result.issues[0]!.maximumNormError).toBeGreaterThan(1e-6)
  expect(f.source.accessors[1]!.values).toEqual(Float64Array.from(values, (value) => value / 127))
  expect(readSceneAnimations(result.animations)).toEqual(result.animations)
})

test('aggregate key and clip limits are checked before values, including exact limits and shared schedules', () => {
  const count = SCENE_LIMITS.animationKeys / 2,
    times = Array.from({ length: count }, (_, i) => i / 64),
    values = Array.from({ length: count * 3 }, (_, i) => i % 3),
    exact = fixture([
      {
        name: 'Limite',
        times,
        tracks: [
          { node: 0, values },
          { node: 1, values },
        ],
      },
    ])
  let inputReads = 0
  const input = exact.source.accessors[0]!.values
  Object.defineProperty(exact.source.accessors[0]!, 'values', {
    get() {
      inputReads++
      return input
    },
  })
  const converted = exact.convert()
  expect(inputReads).toBe(1)
  expect(converted.animations[0]!.tracks.reduce((n, track) => n + track.keys.length, 0)).toBe(
    SCENE_LIMITS.animationKeys,
  )
  expect(readSceneAnimations(converted.animations)[0]!.duration).toBe(times.at(-1)!)
  converted.animations[0]!.tracks[0]!.keys[0]!.value[0] = 7
  expect(converted.animations[0]!.tracks[1]!.keys[0]!.value[0]).toBe(0)
  const tooMany = fixture([
    {
      times: [...times, count / 64],
      tracks: [
        { node: 0, values: [...values, 0, 1, 2] },
        { node: 1, values: [...values, 0, 1, 2] },
      ],
    },
  ])
  for (const accessor of tooMany.source.accessors)
    Object.defineProperty(accessor, 'values', {
      get(): Float64Array {
        throw new Error('Values read before key budget')
      },
    })
  fails(tooMany.convert, 'budget', 'animations[0].channels[1]')
  for (const count of [SCENE_LIMITS.animationClips, SCENE_LIMITS.animationClips + 1]) {
    const f = fixture(
      Array.from({ length: count }, () => ({
        name: 'Pose',
        times: [0],
        tracks: [{ node: 0, values: [0, 0, 0] }],
      })),
    )
    if (count === SCENE_LIMITS.animationClips) expect(f.convert().animations).toHaveLength(count)
    else {
      for (const accessor of f.source.accessors)
        Object.defineProperty(accessor, 'values', {
          get(): Float64Array {
            throw new Error('Values read before clip budget')
          },
        })
      fails(f.convert, 'budget', 'animations')
    }
  }
})

test('track budget counts each target and clip, not just unique source samplers', () => {
  const tracks: ClipFixture['tracks'] = Array.from({ length: 512 }, (_, node) => [
      { node, property: 'translation', values: [0, 0, 0] },
      { node, property: 'scale', values: [1, 1, 1] },
    ]).flat(),
    clips = Array.from({ length: 4 }, () => ({ name: 'Pose', times: [0], tracks })),
    exact = fixture(clips)
  expect(exact.convert().animations.reduce((sum, clip) => sum + clip.tracks.length, 0)).toBe(
    SCENE_LIMITS.animationTracks,
  )
  const excess = fixture([...clips, { name: 'Outra', times: [0], tracks: [tracks[0]!] }])
  for (const accessor of excess.source.accessors)
    Object.defineProperty(accessor, 'values', {
      get(): Float64Array {
        throw new Error('Values read before track budget')
      },
    })
  fails(excess.convert, 'budget', 'animations[4].channels[0]')
})

test('cubic union is budgeted before outputs and never fabricates a quaternion at a zero curve sample', () => {
  const count = 32768,
    times = Array.from({ length: count }, (_, i) => i / 64),
    f = fixture([
      {
        name: 'Grande',
        times,
        tracks: [{ node: 0, method: 'CUBICSPLINE', values: Array<number>(count * 9).fill(0) }],
      },
    ])
  Object.defineProperty(f.source.accessors[1]!, 'values', {
    get(): Float64Array {
      throw new Error('Output read before exact union budget')
    },
  })
  fails(() => f.convert({ cubic: 'bake', fps: 120 }), 'budget', 'animations[0].channels[0]')
  const zero = fixture([
    {
      name: 'Nula',
      times: [0, 1],
      tracks: [
        {
          node: 0,
          property: 'rotation',
          method: 'CUBICSPLINE',
          values: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0],
        },
      ],
    },
  ])
  fails(
    () => zero.convert({ cubic: 'bake', fps: 2, rotations: 'normalize' }),
    'invalid',
    'animations[0].channels[0]',
  )
})

test('option boundaries and duration are explicit; no autoplay or time-range clipping is invented', () => {
  const f = fixture([
    { name: 'Tempo', times: [0, 600], tracks: [{ node: 0, values: [0, 0, 0, 1, 0, 0] }] },
  ])
  expect(f.convert({ fps: 120 }).animations[0]!.duration).toBe(600)
  const long = fixture([{ times: [0, 601], tracks: [{ node: 0, values: [0, 0, 0, 1, 0, 0] }] }])
  for (const accessor of long.source.accessors)
    Object.defineProperty(accessor, 'values', {
      get(): Float64Array {
        throw new Error('Duration gate must precede values')
      },
    })
  fails(long.convert, 'budget', 'animations[0]')
  for (const fps of [0, 121, 1.5, Number.NaN])
    fails(() => f.convert({ fps }), 'invalid', 'animation.fps')
  const missing = { ...f.hierarchy, nodeIds: new Map<number, string>() }
  fails(
    () => convertGltfClips(f.source, f.selection, missing),
    'invalid',
    'animations[0].channels[0].target',
  )
})

test('morph omission is explicit and never retargets weights to a node transform', () => {
  const seed = fixture([
      {
        name: 'Misto',
        times: [0, 1],
        tracks: [
          { node: 0, values: [0, 1, 0, 0, 0, 0] },
          { node: 1, values: [0, 0, 0, 1, 0, 0] },
        ],
      },
    ]),
    json = structuredClone(seed.source.source.json),
    accessors = json.accessors as Array<Record<string, unknown>>,
    animations = json.animations as Array<{ channels: Array<{ target: { path: string } }> }>
  accessors[1]!.type = 'SCALAR'
  accessors[1]!.count = 2
  accessors.push(
    ...Array.from({ length: 2 }, () => ({
      componentType: 5126,
      type: 'VEC3',
      count: 3,
      min: [0, 0, 0],
      max: [0, 0, 0],
    })),
  )
  animations[0]!.channels[0]!.target.path = 'weights'
  json.nodes = [{ mesh: 0 }, {}]
  json.meshes = [{ primitives: [{ attributes: { POSITION: 3 }, targets: [{ POSITION: 4 }] }] }]
  const f = stages(encodeGlbContainer(json, seed.source.resources.buffers))
  for (const index of [1, 3, 4])
    Object.defineProperty(f.source.accessors[index]!, 'values', {
      get(): Float64Array {
        throw new Error('Omitted morph or geometry values read')
      },
    })
  fails(f.convert, 'unsupported', 'animations[0].channels[0].target')
  const result = f.convert({ morphs: 'omit' })
  expect(result.animations[0]!.tracks.map((track) => [track.nodeId, track.channel])).toEqual([
    ['gltf_node_1', 'translation'],
  ])
  expect(result.issues).toEqual([
    {
      code: 'morph-channel-omitted',
      path: 'animations[0].channels[0].target',
      clipId: 'gltf_clip_0',
      count: 1,
    },
  ])
})

test('real imported clips drive converted hierarchy and skins with the same world poses as Three', async () => {
  const cases = [
    {
      bytes: makeGltfJointMeshFixture(),
      warnings: [
        'ANIMATION_CHANNEL_TARGET_NODE_SKIN',
        'NODE_SKINNED_MESH_NON_ROOT',
        'NODE_SKINNED_MESH_LOCAL_TRANSFORMS',
      ],
    },
    ...(['local', 'local-delta'] as const).map((space) => ({
      bytes: encodeSceneGlb(makeSceneAssistedSkinFixture(space).document, { allowLosses: true })
        .bytes,
      warnings: Array<string>(3).fill('NODE_SKINNED_MESH_NON_ROOT'),
    })),
  ]
  for (const { bytes, warnings } of cases) {
    await expectValidGlb(bytes, warnings)
    const f = stages(bytes),
      { document, report } = convertGltfDocument(
        f.source,
        f.selection.sceneIndex,
        { id: 'native-clips', name: 'Completo', createdAt: 1, updatedAt: 1 },
        { skinWeights: 'normalize' },
      ),
      loaded = await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer, ''),
      mixer = new AnimationMixer(loaded.scene),
      prepared = new Map(
        document.skins!.map((skin) => [skin.nodeId, prepareSceneSkin(document, skin)]),
      )
    expect(readSceneDocument(document).status).toBe('valid')
    expect(document.animations).toHaveLength(loaded.animations.length)
    expect(
      report.issues
        .filter((issue) => issue.stage === 'animations')
        .every((issue) => issue.detail.code.startsWith('name-')),
    ).toBe(true)
    expect(report.costs.skins).toBe(document.skins!.length)
    expect(report.costs.weightedVertices).toBe(
      [...prepared.values()].reduce((count, skin) => count + skin.vertexIds.length, 0),
    )
    try {
      for (const [index, clip] of document.animations!.entries()) {
        mixer.stopAllAction()
        const action = mixer.clipAction(loaded.animations[index]!).setLoop(LoopOnce, 1),
          sample = prepareSceneAnimation(document, clip.id)
        action.clampWhenFinished = true
        for (const time of [0, 0.375, 1.75, 2, 0.2]) {
          action.reset().play()
          mixer.setTime(time)
          loaded.scene.updateMatrixWorld(true)
          const pose = sample.sample(time, false)
          for (const instance of f.selection.instances) {
            const nodeId = f.hierarchy.meshNodeIds.get(instance.node)!,
              world = pose.worldMatrices.get(nodeId)!,
              geometry = document.geometries[instance.variant]!,
              skin = prepared.get(nodeId),
              positions = skin ? deformSceneSkin(skin, pose.worldMatrices) : null,
              loadedNode: Object3D = await loaded.parser.getDependency('node', instance.node),
              object =
                loadedNode instanceof Mesh
                  ? loadedNode
                  : loadedNode.children.find(
                      (child) =>
                        child instanceof Mesh &&
                        loaded.parser.associations.get(child)?.meshes === instance.mesh,
                    )
            if (!(object instanceof Mesh))
              throw new Error('Expected one fixture mesh per source node')
            if (geometry.kind !== 'mesh') throw new Error('Expected imported mesh geometry')
            expect(f.source.meshes[instance.mesh]!.primitives).toHaveLength(1)
            const vertexIds = Object.keys(geometry.vertices)
            expect(vertexIds).toHaveLength(object.geometry.getAttribute('position').count)
            for (const [vertex, id] of vertexIds.entries()) {
              const at = skin?.vertexIds.indexOf(id) ?? -1,
                point = positions
                  ? ([positions[at * 3]!, positions[at * 3 + 1]!, positions[at * 3 + 2]!] as [
                      number,
                      number,
                      number,
                    ])
                  : geometry.vertices[id]!,
                actual = transformPoint(world, point),
                expected = new Vector3().fromBufferAttribute(
                  object.geometry.getAttribute('position'),
                  vertex,
                )
              if (object instanceof SkinnedMesh) object.applyBoneTransform(vertex, expected)
              expected.applyMatrix4(object.matrixWorld)
              expect(new Vector3(...actual).distanceTo(expected)).toBeLessThan(1e-6)
            }
          }
        }
      }
    } finally {
      mixer.stopAllAction()
      mixer.uncacheRoot(loaded.scene)
      loaded.scene.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose()
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            material.dispose()
        }
        if (object instanceof SkinnedMesh) object.skeleton.dispose()
      })
    }
  }
})

test('zero-initialized time accessors use actual core time, not arbitrary declared extension bounds', () => {
  const result = readGltfDocument(
    new TextEncoder().encode(
      JSON.stringify({
        asset: { version: '2.0' },
        nodes: [{}],
        accessors: [
          { componentType: 5126, type: 'SCALAR', count: 1, min: [800], max: [900] },
          { componentType: 5126, type: 'VEC3', count: 1 },
        ],
        animations: [
          {
            name: 'Pose',
            samplers: [{ input: 0, output: 1 }],
            channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }],
          },
        ],
      }),
    ),
  )
  if (result.status !== 'ready') throw new Error('Self-contained source expected')
  const source = result.document,
    selection = selectGltfDocument(source, null),
    hierarchy = convertGltfHierarchy(source, selection, {
      geometryIds: [],
      defaultMaterialId: 'default',
    }),
    converted = convertGltfClips(source, selection, hierarchy)
  expect(converted.animations[0]!.duration).toBe(1 / 30)
  expect(converted.animations[0]!.tracks[0]!.keys).toEqual([
    { time: 0, value: [0, 0, 0], interpolation: 'linear' },
  ])
  expect(converted.issues).toEqual([
    {
      code: 'zero-duration-expanded',
      path: 'animations[0]',
      clipId: 'gltf_clip_0',
      count: 1,
      fps: 30,
    },
  ])
  expect(readSceneAnimations(converted.animations)).toEqual(converted.animations)
  expect(source.accessors[0]!.max).toEqual([900])
})
