import {
  AnimationClip,
  Bone,
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  MeshStandardMaterial,
  NumberKeyframeTrack,
  QuaternionKeyframeTrack,
  Skeleton,
  SkinnedMesh,
  VectorKeyframeTrack,
} from 'three'

/** Fixture próprio, sem arte licenciada: ultrapassa uma parte e move corpo, osso e morph. */
export function modeloAnimavelDeEnsaio(n = 65_001) {
  const g = new BufferGeometry()
    .setAttribute(
      'position',
      new Float32BufferAttribute(
        Float32Array.from({ length: n * 3 }, (_, i) => {
          const v = Math.floor(i / 3),
            c = v % 3
          return i % 3 === 0
            ? Math.floor(v / 3) / 1000 + (c === 1 ? 0.0005 : 0)
            : i % 3 === 2 && c === 2
              ? 0.0005
              : 0
        }),
        3,
      ),
    )
    .setAttribute(
      'indiceOriginal',
      new Float32BufferAttribute(
        Float32Array.from({ length: n }, (_, i) => i),
        1,
      ),
    )
    .setAttribute('skinIndex', new BufferAttribute(new Uint16Array(n * 4), 4))
    .setAttribute(
      'skinWeight',
      new Float32BufferAttribute(
        Float32Array.from({ length: n * 4 }, (_, i) => (i % 4 === 0 ? 1 : 0)),
        4,
      ),
    )
  g.morphAttributes.position = [
    new Float32BufferAttribute(
      Float32Array.from({ length: n * 3 }, (_, i) => (i % 3 === 1 ? 0.25 : 0)),
      3,
    ),
  ]
  g.morphTargetsRelative = true
  const material = new MeshStandardMaterial(),
    malha = new SkinnedMesh(g, material),
    osso = new Bone(),
    raiz = new Group()
  malha.name = 'Corpo'
  osso.name = 'Osso'
  malha.add(osso)
  raiz.add(malha)
  raiz.updateMatrixWorld(true)
  malha.bind(new Skeleton([osso]))
  const clip = new AnimationClip('Gesto', 1, [
    new VectorKeyframeTrack(`${malha.uuid}.position`, [0, 1], [0, 0, 0, 1, 0, 0]),
    new QuaternionKeyframeTrack(
      `${osso.uuid}.quaternion`,
      [0, 1],
      [0, 0, 0, 1, 0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)],
    ),
    new NumberKeyframeTrack(`${malha.uuid}.morphTargetInfluences`, [0, 1], [0, 1]),
  ])
  return { raiz, malha, clip, g, material }
}
