import { GlbBinary } from '../export/GlbBinary'
import { encodeGlbContainer } from '../export/glbContainer'

/** glTF-only case: two joints also carry rigid meshes; a separate bound mesh has a rigid child. */
export function makeGltfJointMeshFixture(nodeCount = 5) {
  const binary = new GlbBinary(),
    position = binary.floats(Float32Array.of(0, 0, 0, 1, 0, 0, 0, 1, 0), 'VEC3', true, 34962),
    joints = binary.joints(Uint16Array.of(0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0)),
    weights = binary.floats(
      Float32Array.of(1, 0, 0, 0, 1, 0, 0, 0, 0.25, 0.75, 0, 0),
      'VEC4',
      false,
      34962,
    ),
    time = binary.floats(Float32Array.of(0, 1), 'SCALAR', true),
    jointMotion = binary.floats(Float32Array.of(0, 1, 0, 1, 2, 0), 'VEC3'),
    meshMotion = binary.floats(Float32Array.of(100, 20, 30, -40, 50, 60), 'VEC3')
  const nodes: Record<string, unknown>[] = [
    { name: 'Raiz', children: [1, 3], translation: [1, 2, 3], scale: [-2, 1, 0.5] },
    { name: 'Osso com forma', children: [2], mesh: 0, translation: [0, 1, 0] },
    {
      name: 'Ponta com forma',
      mesh: 0,
      translation: [0, 1, 0],
      rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2],
    },
    { name: 'Pele', mesh: 1, skin: 0, children: [4], translation: [100, 20, 30] },
    { name: 'Acessório rígido', mesh: 0, translation: [0.25, 0, 0] },
  ]
  for (let i = nodes.length; i < nodeCount; i++) nodes.push({})
  return encodeGlbContainer(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: binary.byteLength }],
      bufferViews: binary.views,
      accessors: binary.accessors,
      meshes: [
        { primitives: [{ attributes: { POSITION: position } }] },
        {
          primitives: [
            { attributes: { POSITION: position, JOINTS_0: joints, WEIGHTS_0: weights } },
          ],
        },
      ],
      nodes,
      skins: [{ joints: [1, 2], skeleton: 1 }],
      animations: [
        {
          samplers: [
            { input: time, output: jointMotion },
            { input: time, output: meshMotion },
          ],
          channels: [
            { sampler: 0, target: { node: 1, path: 'translation' } },
            { sampler: 1, target: { node: 3, path: 'translation' } },
          ],
        },
      ],
      scenes: [{ nodes: [0, ...Array.from({ length: nodes.length - 5 }, (_, i) => i + 5)] }],
      scene: 0,
    },
    binary.segments,
  )
}
