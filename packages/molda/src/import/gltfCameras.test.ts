import { expect, test } from 'bun:test'
import { OrthographicCamera, PerspectiveCamera } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { encodeGlbContainer } from '../export/glbContainer'
import { expectValidGlb } from '../testing/gltfValidation'
import { readGltfCameras } from './gltfCameras'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'

const perspective = { type: 'perspective', perspective: { yfov: 0.8, znear: 0.125 } },
  orthographic = {
    name: '',
    type: 'orthographic',
    orthographic: { xmag: 2, ymag: 3, znear: 0, zfar: 100 },
  }

test('cameras preserve absent projection options and owned parameters without constructing matrices', () => {
  const source = [structuredClone(perspective), structuredClone(orthographic)],
    before = structuredClone(source),
    result = readGltfCameras(source)
  expect(result).toEqual([
    { kind: 'perspective', name: null, yfov: 0.8, znear: 0.125, zfar: null, aspectRatio: null },
    { kind: 'orthographic', name: '', xmag: 2, ymag: 3, znear: 0, zfar: 100 },
  ])
  result[0]!.znear = 2
  expect(source).toEqual(before)
  expect(readGltfCameras(undefined)).toEqual([])
  expect(
    readGltfCameras([
      {
        ...perspective,
        perspective: { yfov: 2 * Math.PI, znear: Number.MIN_VALUE, aspectRatio: 1e100 },
      },
      { ...orthographic, orthographic: { xmag: -2, ymag: -3, znear: 0, zfar: 1e200 } },
    ]),
  ).toEqual([
    {
      kind: 'perspective',
      name: null,
      yfov: 2 * Math.PI,
      znear: Number.MIN_VALUE,
      zfar: null,
      aspectRatio: 1e100,
    },
    { kind: 'orthographic', name: '', xmag: -2, ymag: -3, znear: 0, zfar: 1e200 },
  ])
})

test('camera shape, exclusive projections, near/far planes and nonzero magnifications are validated', () => {
  for (const value of [
    null,
    [],
    {},
    [null],
    new Array(1),
    [{}],
    [{ type: null }],
    [{ ...perspective, orthographic: orthographic.orthographic }],
    [{ type: 'perspective' }],
    [{ type: 'orthographic' }],
    [{ type: 'perspective', orthographic: orthographic.orthographic }],
    [{ type: 'orthographic', perspective: perspective.perspective }],
  ])
    expect(() => readGltfCameras(value)).toThrow(GltfInputError)
  for (const field of ['yfov', 'znear', 'zfar', 'aspectRatio'])
    for (const value of [null, 0, -1, NaN, Infinity, '1'])
      expect(() =>
        readGltfCameras([
          { ...perspective, perspective: { ...perspective.perspective, [field]: value } },
        ]),
      ).toThrow(GltfInputError)
  for (const value of [0.1, 0.125])
    expect(() =>
      readGltfCameras([
        { ...perspective, perspective: { ...perspective.perspective, zfar: value } },
      ]),
    ).toThrow(GltfInputError)
  for (const field of ['xmag', 'ymag'])
    for (const value of [0, -0, null, Infinity])
      expect(() =>
        readGltfCameras([
          { ...orthographic, orthographic: { ...orthographic.orthographic, [field]: value } },
        ]),
      ).toThrow(GltfInputError)
  for (const change of [{ znear: -1 }, { znear: 100 }, { zfar: 0 }, { zfar: undefined }])
    expect(() =>
      readGltfCameras([
        { ...orthographic, orthographic: { ...orthographic.orthographic, ...change } },
      ]),
    ).toThrow(GltfInputError)
  try {
    readGltfCameras([{ type: 'fisheye' }])
    throw new Error('Expected unsupported')
  } catch (error) {
    if (!(error instanceof GltfInputError)) throw error
    expect(error.reason).toBe('unsupported')
  }
})

test('camera budget accepts its exact limit and rejects excess before opening entries', () => {
  expect(readGltfCameras(Array(GLTF_INPUT_LIMITS.cameras).fill(perspective))).toHaveLength(
    GLTF_INPUT_LIMITS.cameras,
  )
  const source = new Array(GLTF_INPUT_LIMITS.cameras + 1)
  Object.defineProperty(source, 0, {
    get() {
      throw new Error('Must not open entries')
    },
  })
  try {
    readGltfCameras(source)
    throw new Error('Expected budget')
  } catch (error) {
    if (!(error instanceof GltfInputError)) throw error
    expect(error.reason).toBe('budget')
  }
})

test('core camera parameters agree with real GLB validation and independent Three cameras', async () => {
  const cameras = [
    perspective,
    { ...perspective, perspective: { ...perspective.perspective, zfar: 300, aspectRatio: 1.75 } },
    orthographic,
  ]
  const bytes = encodeGlbContainer(
    {
      asset: { version: '2.0' },
      cameras,
      nodes: cameras.map((_, camera) => ({ camera })),
      scene: 0,
      scenes: [{ nodes: [0, 1, 2] }],
    },
    [],
  )
  await expectValidGlb(bytes)
  const parsed = readGltfCameras(cameras),
    loaded = await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer, '')
  for (const [i, source] of parsed.entries()) {
    const camera = loaded.cameras[i]!
    if (source.kind === 'perspective') {
      if (!(camera instanceof PerspectiveCamera)) throw new Error('Expected perspective')
      expect(camera.fov).toBeCloseTo((source.yfov * 180) / Math.PI, 12)
      expect(camera.near).toBe(source.znear)
      if (source.zfar !== null) expect(camera.far).toBe(source.zfar)
      if (source.aspectRatio !== null) expect(camera.aspect).toBe(source.aspectRatio)
    } else {
      if (!(camera instanceof OrthographicCamera)) throw new Error('Expected orthographic')
      expect([
        camera.left,
        camera.right,
        camera.bottom,
        camera.top,
        camera.near,
        camera.far,
      ]).toEqual([-source.xmag, source.xmag, -source.ymag, source.ymag, source.znear, source.zfar])
    }
  }
  for (const scene of loaded.scenes) scene.clear()
})
