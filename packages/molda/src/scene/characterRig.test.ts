import { expect, test } from 'bun:test'
import { validateBytes } from 'gltf-validator'
import type { Vec3 } from '../core/model'
import { encodeSceneGlb } from '../export/sceneGlb'
import { makeCharacterFixture } from '../testing/characterFixture'
import { readCharacterMotionData } from './characterMotionLibrary'
import {
  CHARACTER_MOTION_INFO,
  CHARACTER_MOTIONS,
  characterMotionFromClip,
  createCharacterMotion,
  isCharacterMotionClip,
} from './characterMotions'
import {
  buildCharacterRig,
  CHARACTER_JOINT_ROLES,
  CHARACTER_ROLES,
  characterMarkSequence,
  characterRigTarget,
  characterSkinWeights,
  findCharacterRigs,
  layoutCharacterSkeleton,
  removeCharacterBones,
  removeCharacterRig,
} from './characterRig'
import { addScenePrimitive, renameSceneNode } from './commands'
import { indexSceneDocument } from './documentIndex'
import { transformPoint } from './matrix'
import { setScenePieceCoordinates } from './pieceCoordinates'
import { readSceneDocument } from './readDocument'
import { prepareSceneAnimation } from './sampleAnimation'
import { SceneValidationError } from './validation'

let ids = 0
const nextId = () => `id-${++ids}`

function rigged() {
  const { document, group, marks } = makeCharacterFixture()
  const layout = layoutCharacterSkeleton(document, [group], marks, true)
  const built = buildCharacterRig(document, [group], layout, nextId)
  return { ...built, layout, group, source: document }
}

test('com espelho são 5 pontos; sem espelho, o outro braço e a outra perna também', () => {
  expect(characterMarkSequence(true)).toEqual(['chin', 'groin', 'elbow', 'wrist', 'knee'])
  expect(characterMarkSequence(false)).toHaveLength(8)
})

test('o encaixe espelha o lado marcado e põe a esquerda do personagem no +X', () => {
  const { document, group, marks } = makeCharacterFixture()
  const layout = layoutCharacterSkeleton(document, [group], marks, true)
  expect(layout.forearmL[0]).toBeCloseTo(0.62, 9)
  expect(layout.forearmR[0]).toBeCloseTo(-0.62, 9)
  expect(layout.shinR[0]).toBeCloseTo(-0.12, 9)
  // Profundidade: o meio do corpo naquela altura; a ponta do pé vai até a frente do pé.
  expect(layout.chest[2]).toBeCloseTo(0, 9)
  expect(layout.toeL[2]).toBeCloseTo(0.2, 9)
  expect(layout.footL[1]).toBeGreaterThan(0)
  expect(layout.headTip[1]).toBeCloseTo(2, 9)
  // O ombro não passa do pescoço e fica entre o centro e o cotovelo.
  expect(layout.upperArmL[1]).toBeLessThanOrEqual(layout.neck[1])
  expect(layout.upperArmL[0]).toBeGreaterThan(0)
  expect(layout.upperArmL[0]).toBeLessThan(0.62)
})

test('pontos impossíveis viram mensagem, não esqueleto torto', () => {
  const { document, group, marks } = makeCharacterFixture()
  const upside = [marks[1]!, marks[0]!, ...marks.slice(2)]
  expect(() => layoutCharacterSkeleton(document, [group], upside, true)).toThrow(
    SceneValidationError,
  )
  expect(() => layoutCharacterSkeleton(document, [group], marks.slice(0, 4), true)).toThrow(
    SceneValidationError,
  )
  const sameSide = [...marks, marks[2]!, marks[3]!, marks[4]!]
  expect(() => layoutCharacterSkeleton(document, [group], sameSide, false)).toThrow(
    SceneValidationError,
  )
})

test('montar cria os 24 ossos, liga todas as peças e o arquivo continua válido', () => {
  const { document, rootId, pieces } = rigged()
  expect(pieces).toBe(9)
  expect(readSceneDocument(JSON.parse(JSON.stringify(document))).status).toBe('valid')
  expect(document.skins).toHaveLength(9)
  for (const skin of document.skins!) {
    expect(skin.joints).toHaveLength(CHARACTER_JOINT_ROLES.length)
    for (const rows of Object.values(skin.weights))
      expect(rows.reduce((sum, row) => sum + row.weight, 0)).toBeCloseTo(1, 9)
  }
  const rigs = findCharacterRigs(document)
  expect(rigs).toHaveLength(1)
  expect(rigs[0]!.rootId).toBe(rootId)
  expect([...rigs[0]!.joints.keys()].sort()).toEqual([...CHARACTER_ROLES].sort())
  const name = (role: (typeof CHARACTER_ROLES)[number]) =>
    document.nodes.find((node) => node.id === rigs[0]!.joints.get(role))!.name
  expect(name('handL')).toBe('Mão esquerda')
  expect(name('footR')).toBe('Pé direito')
  expect(rigs[0]!.front[2]).toBeGreaterThan(0.99)
  expect(rigs[0]!.left[0]).toBeGreaterThan(0.99)
})

test('o esqueleto fica dentro do grupo do personagem e as juntas ganham cortes', () => {
  const { document, group, source } = rigged()
  const hips = findCharacterRigs(document)[0]!.rootId
  expect(document.nodes.find((node) => node.id === hips)!.parentId).toBe(group)
  const index = indexSceneDocument(document)
  const leg = document.nodes.find((node) => node.name === 'perna esquerda')!
  const geometry = leg.kind === 'mesh' ? index.geometries.get(leg.geometryId)! : null
  expect(geometry!.kind).toBe('mesh')
  const before = indexSceneDocument(source)
  const original = source.nodes.find((node) => node.name === 'perna esquerda')!
  expect(original.kind === 'mesh' && before.geometries.get(original.geometryId)!.kind).toBe('box')
  // Joelho e quadril cortam a perna: mais que os 8 cantos da caixa.
  expect(Object.keys(geometry!.kind === 'mesh' ? geometry!.vertices : {}).length).toBeGreaterThan(8)
})

test('renomear um osso não quebra o reconhecimento; apagar uma junta, sim', () => {
  const { document } = rigged()
  const rig = findCharacterRigs(document)[0]!
  const renamed = renameSceneNode(document, rig.joints.get('shinL')!, 'Joelho torto')
  expect(findCharacterRigs(renamed)).toHaveLength(1)
  const broken = {
    ...document,
    nodes: document.nodes.filter((node) => node.id !== rig.joints.get('toeL')),
  }
  expect(findCharacterRigs(broken)).toHaveLength(0)
})

test('cada ponto segue o próprio osso e só mistura perto da junta', () => {
  const joints = new Map(
    CHARACTER_ROLES.map((role, i) => [role, { id: role, position: [0, -i, 0] as Vec3 }]),
  )
  // Corrente reta só para conferir a regra: thighL (índice 11) → shinL (12) → footL (13).
  const at = (role: string) => joints.get(role as never)!.position
  const mid: Vec3 = [0, (at('thighL')[1] + at('shinL')[1]) / 2, 0.01]
  const knee: Vec3 = [0, at('shinL')[1], 0.01]
  const weights = characterSkinWeights(
    [
      ['mid', mid],
      ['knee', knee],
    ],
    joints,
  )
  expect(weights.mid!.map((row) => row.jointId)).toContain('thighL')
  expect(weights.knee!).toHaveLength(2)
  for (const row of weights.knee!) expect(row.weight).toBeCloseTo(0.5, 6)
})

function soles(document: Parameters<typeof findCharacterRigs>[0]) {
  const rig = findCharacterRigs(document)[0]!
  return { rig, toe: rig.joints.get('toeL')!, toeR: rig.joints.get('toeR')! }
}

for (const kind of CHARACTER_MOTIONS)
  test(`movimento "${kind}": válido, emenda no fim e o pé não atravessa o chão`, () => {
    const { document } = rigged()
    const next = createCharacterMotion(
      document,
      [],
      { kind, name: kind, duration: 1, amount: 1 },
      nextId,
    )
    expect(readSceneDocument(JSON.parse(JSON.stringify(next))).status).toBe('valid')
    const clip = next.animations!.at(-1)!
    expect(clip.loop).toBe(CHARACTER_MOTION_INFO[kind].loop)
    expect(clip.space).toBe('local-delta')
    expect(clip.tracks).toHaveLength(CHARACTER_JOINT_ROLES.length + 1)
    // Repetindo, emenda no fim; uma vez só (sentar, cair, susto), termina na última pose.
    if (clip.loop)
      for (const track of clip.tracks)
        expect(track.keys.at(-1)!.value).toEqual(track.keys[0]!.value)
    const { toe, toeR } = soles(next)
    const sampler = prepareSceneAnimation(next, clip.id)
    let lowest = Infinity
    for (let i = 0; i <= 20; i++) {
      const pose = sampler.sample((i / 20) * clip.duration, false)
      for (const id of [toe, toeR])
        lowest = Math.min(lowest, transformPoint(pose.worldMatrices.get(id)!, [0, 0, 0])[1])
    }
    // A ponta do pé fica 0,02 da perna acima da sola; nunca afunda abaixo do chão.
    expect(lowest).toBeGreaterThan(-0.01)
    if (kind !== 'jump') expect(lowest).toBeLessThan(0.05)
  })

test('parado: os pés ficam plantados enquanto o quadril balança e respira', () => {
  const { document } = rigged()
  for (const amount of [0.5, 1, 1.5]) {
    const next = createCharacterMotion(
      document,
      [],
      { kind: 'idle', name: 'Parado', duration: 3, amount },
      nextId,
    )
    const clip = next.animations!.at(-1)!
    const rig = findCharacterRigs(next)[0]!
    const sampler = prepareSceneAnimation(next, clip.id)
    const where = (time: number, role: 'footL' | 'footR' | 'toeL' | 'toeR' | 'hips') =>
      transformPoint(
        sampler.sample(time, false).worldMatrices.get(rig.joints.get(role)!)!,
        [0, 0, 0],
      )
    const start = (['footL', 'footR', 'toeL', 'toeR'] as const).map((role) => where(0, role))
    let drift = 0
    let hipsTravel = 0
    const hips = where(0, 'hips')
    for (let i = 1; i <= 36; i++) {
      const time = (i / 36) * clip.duration
      ;(['footL', 'footR', 'toeL', 'toeR'] as const).forEach((role, index) => {
        const now = where(time, role)
        drift = Math.max(
          drift,
          Math.hypot(...now.map((value, axis) => value - start[index]![axis]!)),
        )
      })
      const moved = where(time, 'hips')
      hipsTravel = Math.max(
        hipsTravel,
        Math.hypot(...moved.map((value, axis) => value - hips[axis]!)),
      )
    }
    // O corpo mexe de verdade, mas tornozelos e pontas dos pés não saem do lugar (boneco de 2).
    expect(hipsTravel).toBeGreaterThan(0.01)
    expect(drift).toBeLessThan(0.002)
  }
})

for (const kind of ['walk', 'run'] as const)
  test(`${kind}: o pé apoiado não escorrega (andando de verdade) e vai para trás igual (no lugar)`, () => {
    const { document } = rigged()
    const sample = (inPlace: boolean) => {
      const next = createCharacterMotion(
        document,
        [],
        { kind, name: kind, duration: 1, amount: 1, inPlace },
        nextId,
      )
      const clip = next.animations!.at(-1)!
      const rig = findCharacterRigs(next)[0]!
      const sampler = prepareSceneAnimation(next, clip.id)
      return (time: number, role: 'footL' | 'hips') =>
        transformPoint(
          sampler.sample(time, false).worldMatrices.get(rig.joints.get(role)!)!,
          [0, 0, 0],
        )
    }
    // Apoio do pé esquerdo: de u = 0 até 0,6 (andar) ou 0,35 (correr); o calcanhar sai no fim.
    const stance = kind === 'walk' ? 0.6 : 0.35
    const times = Array.from({ length: 7 }, (_, i) => 0.02 + (i / 6) * (0.75 * stance - 0.02))
    const walking = sample(false)
    const start = walking(times[0]!, 'footL')
    for (const time of times) {
      const foot = walking(time, 'footL')
      expect(Math.hypot(...foot.map((value, axis) => value - start[axis]!))).toBeLessThan(0.004)
    }
    // O corpo anda de verdade para a frente (+Z).
    expect(walking(0.9, 'hips')[2] - walking(0.1, 'hips')[2]).toBeGreaterThan(0.3)
    // No lugar: o mesmo pé vai para trás em velocidade constante, no chão, e o quadril não sai.
    const still = sample(true)
    const z = times.map((time) => still(time, 'footL')[2])
    const steps = z.slice(1).map((value, i) => value - z[i]!)
    const mean = steps.reduce((sum, value) => sum + value, 0) / steps.length
    expect(mean).toBeLessThan(0)
    for (const step of steps) expect(Math.abs(step - mean)).toBeLessThan(0.05 * Math.abs(mean))
    for (const time of times)
      expect(Math.abs(still(time, 'footL')[1] - still(times[0]!, 'footL')[1])).toBeLessThan(0.004)
    expect(Math.abs(still(0.9, 'hips')[2] - still(0.1, 'hips')[2])).toBeLessThan(0.05)
  })

test('braços: num tronco largo o braço caído passa do lado, e o ajuste junta ou afasta', () => {
  const { document: source, group, marks } = makeCharacterFixture()
  // Tronco mais largo que o começo dos braços: com o ângulo fixo de antes, a mão entrava nele.
  const trunk = source.nodes.find((node) => node.name === 'tronco')!.id
  const wide = setScenePieceCoordinates(source, trunk, 'dimensions', [0.9, 0.65, 0.24])
  const { document } = buildCharacterRig(
    wide,
    [group],
    layoutCharacterSkeleton(wide, [group], marks, true),
    nextId,
  )
  const elbow = (arms?: number) => {
    const next = createCharacterMotion(
      document,
      [],
      { kind: 'idle', name: 'Parado', duration: 3, amount: 1, arms },
      nextId,
    )
    const clip = next.animations!.at(-1)!
    const rig = findCharacterRigs(next)[0]!
    const pose = prepareSceneAnimation(next, clip.id).sample(0, false)
    return transformPoint(pose.worldMatrices.get(rig.joints.get('forearmL')!)!, [0, 0, 0])
  }
  // Meia-largura do tronco 0,45 e meia-grossura do braço 0,06: o cotovelo passa do lado.
  expect(elbow()[0]).toBeGreaterThan(0.51)
  expect(elbow(20)[0]).toBeGreaterThan(elbow()[0])
  expect(elbow(-10)[0]).toBeLessThan(elbow()[0])
  expect(() => elbow(40)).toThrow(SceneValidationError)
})

test('meus movimentos: um movimento guardado volta igual no mesmo personagem e serve em outro', () => {
  const { document } = rigged()
  const walking = createCharacterMotion(
    document,
    [],
    { kind: 'walk', name: 'Meu andar', duration: 1, amount: 1.2 },
    nextId,
  )
  const source = walking.animations!.at(-1)!
  const data = characterMotionFromClip(walking, source.id, [])
  // O que vai para a biblioteca passa pela mesma conferência de quem lê do disco.
  const read = readCharacterMotionData(JSON.parse(JSON.stringify(data)))
  expect(read.keys).toHaveLength(data.keys.length)
  expect(read.steps).toBe(data.steps)
  expect(data.name).toBe('Meu andar')
  const again = createCharacterMotion(
    document,
    [],
    { kind: 'custom', data, name: data.name, duration: 1, amount: 1 },
    nextId,
  )
  const copy = again.animations!.at(-1)!
  const rig = findCharacterRigs(walking)[0]!
  const before = prepareSceneAnimation(walking, source.id)
  const after = prepareSceneAnimation(again, copy.id)
  // Nos quadros guardados, cada osso fica no mesmo lugar (boneco de 2 de altura).
  for (const step of [0, 3, 6, 12, 18]) {
    const time = step / data.steps
    const a = before.sample(time, false).worldMatrices
    const b = after.sample(time, false).worldMatrices
    for (const role of CHARACTER_JOINT_ROLES) {
      const id = rig.joints.get(role)!
      const pa = transformPoint(a.get(id)!, [0, 0, 0])
      const pb = transformPoint(b.get(id)!, [0, 0, 0])
      expect(Math.hypot(...pa.map((value, axis) => value - pb[axis]!))).toBeLessThan(0.01)
    }
  }
  // Em outro personagem (tronco largo), o movimento guardado também vale.
  const { document: source2, group, marks } = makeCharacterFixture()
  const trunk = source2.nodes.find((node) => node.name === 'tronco')!.id
  const wide = setScenePieceCoordinates(source2, trunk, 'dimensions', [0.7, 0.65, 0.24])
  const { document: other } = buildCharacterRig(
    wide,
    [group],
    layoutCharacterSkeleton(wide, [group], marks, true),
    nextId,
  )
  const applied = createCharacterMotion(
    other,
    [],
    { kind: 'custom', data, name: data.name, duration: 1, amount: 1 },
    nextId,
  )
  expect(readSceneDocument(JSON.parse(JSON.stringify(applied))).status).toBe('valid')
  expect(applied.animations!.at(-1)!.name).toBe('Meu andar')
  expect(() => readCharacterMotionData({ ...data, keys: [] })).toThrow(SceneValidationError)
})

test('dois personagens: cada um tem o seu Andando, reconhecido pelos ossos que ele mexe', () => {
  const first = rigged().document
  const walk = createCharacterMotion(
    first,
    [],
    { kind: 'walk', name: 'Andando', duration: 1, amount: 1 },
    nextId,
  )
  const clip = walk.animations!.at(-1)!
  const joints = new Set(findCharacterRigs(walk)[0]!.joints.values())
  expect(isCharacterMotionClip(clip, 'Andando', joints)).toBe(true)
  // Um "Andando 2" (nome repetido) do mesmo esqueleto também é dele; outros ossos, não.
  expect(isCharacterMotionClip({ ...clip, name: 'Andando 2' }, 'Andando', joints)).toBe(true)
  expect(isCharacterMotionClip({ ...clip, name: 'Andando rápido' }, 'Andando', joints)).toBe(false)
  expect(isCharacterMotionClip(clip, 'Andando', new Set(['outro-osso']))).toBe(false)
})

test('andar: os pés se alternam e o braço vai contra a perna do mesmo lado', () => {
  const { document } = rigged()
  const next = createCharacterMotion(
    document,
    [],
    { kind: 'walk', name: 'Andando', duration: 1, amount: 1 },
    nextId,
  )
  const clip = next.animations!.at(-1)!
  const rig = findCharacterRigs(next)[0]!
  const pose = prepareSceneAnimation(next, clip.id).sample(0.25, false)
  const z = (role: Parameters<typeof rig.joints.get>[0]) =>
    transformPoint(pose.worldMatrices.get(rig.joints.get(role)!)!, [0, 0, 0])[2]
  expect(z('footL')).toBeGreaterThan(z('footR'))
  expect(z('handL')).toBeLessThan(z('handR'))
  // Os braços em T descem para perto do corpo.
  const hand = transformPoint(pose.worldMatrices.get(rig.joints.get('handL')!)!, [0, 0, 0])
  expect(hand[1]).toBeLessThan(1.2)
})

test('guardar de novo troca o movimento no lugar: mesmo id, nome e posição na lista', () => {
  const { document: built } = rigged()
  let document = createCharacterMotion(
    built,
    [],
    { kind: 'walk', name: 'Andando', duration: 1, amount: 1 },
    nextId,
  )
  document = createCharacterMotion(
    document,
    [],
    { kind: 'run', name: 'Correndo', duration: 0.7, amount: 1 },
    nextId,
  )
  const [walk, run] = document.animations!
  const next = createCharacterMotion(
    document,
    [],
    { kind: 'walk', name: 'Andando', duration: 0.5, amount: 1.5, replaces: walk!.id },
    nextId,
  )
  expect(next.animations!.map((clip) => [clip.id, clip.name])).toEqual([
    [walk!.id, 'Andando'],
    [run!.id, 'Correndo'],
  ])
  expect(next.animations![0]!.duration).toBe(0.5)
  expect(next.animations![0]!.tracks).not.toEqual(walk!.tracks)
  expect(next.animations![1]).toBe(run)
  expect(readSceneDocument(JSON.parse(JSON.stringify(next))).status).toBe('valid')
  expect(() =>
    createCharacterMotion(
      document,
      [],
      { kind: 'walk', name: 'Andando', duration: 1, amount: 1, replaces: 'sumiu' },
      nextId,
    ),
  ).toThrow(SceneValidationError)
})

test('sem esqueleto de personagem, o movimento pede para montar antes', () => {
  const { document } = makeCharacterFixture()
  expect(() =>
    createCharacterMotion(document, [], { kind: 'walk', name: 'x', duration: 1, amount: 1 }),
  ).toThrow(SceneValidationError)
})

test('o personagem com todos os movimentos prontos exporta um GLB sem erros', async () => {
  let { document } = rigged()
  for (const kind of CHARACTER_MOTIONS)
    document = createCharacterMotion(
      document,
      [],
      { kind, name: kind, duration: 1, amount: 1 },
      nextId,
    )
  const { bytes } = encodeSceneGlb(document, { allowLosses: true })
  const report = (await validateBytes(bytes, { format: 'glb', maxIssues: 100 })) as {
    issues: { numErrors: number }
    info: { animationCount: number }
  }
  expect(report.issues.numErrors).toBe(0)
  expect(report.info.animationCount).toBe(CHARACTER_MOTIONS.length)
})

test('para outros programas, os ossos saem com os nomes padrão (Mixamo) e o GLB continua válido', async () => {
  const { document: built } = rigged()
  const document = createCharacterMotion(
    built,
    [],
    { kind: 'walk', name: 'Andando', duration: 1, amount: 1 },
    nextId,
  )
  const json = (bytes: Uint8Array) => {
    const view = new DataView(bytes.buffer, bytes.byteOffset)
    return JSON.parse(
      new TextDecoder().decode(bytes.subarray(20, 20 + view.getUint32(12, true))),
    ) as {
      nodes: Array<{ name: string }>
      animations: Array<{ channels: Array<{ target: { node: number } }> }>
    }
  }
  const plain = encodeSceneGlb(document, { allowLosses: true })
  const named = encodeSceneGlb(document, { allowLosses: true, standardBones: true })
  const names = json(named.bytes).nodes.map((node) => node.name)
  for (const expected of [
    'mixamorig:Hips',
    'mixamorig:Spine',
    'mixamorig:Spine1',
    'mixamorig:Neck',
    'mixamorig:Head',
    'mixamorig:LeftArm',
    'mixamorig:RightForeArm',
    'mixamorig:LeftUpLeg',
    'mixamorig:RightLeg',
    'mixamorig:LeftFoot',
    'mixamorig:RightToeBase',
  ])
    expect(names.filter((name) => name === expected)).toHaveLength(1)
  // Os nomes do original não vão junto, e o movimento continua apontando para os mesmos nós.
  expect(names).not.toContain('Quadril')
  expect(json(named.bytes).animations).toEqual(json(plain.bytes).animations)
  expect(json(plain.bytes).nodes.map((node) => node.name)).toContain('Quadril')
  const report = (await validateBytes(named.bytes, { format: 'glb', maxIssues: 100 })) as {
    issues: { numErrors: number }
  }
  expect(report.issues.numErrors).toBe(0)
})

test('montar de novo troca os ossos antigos, sem apagar peças, e leva os movimentos deles', () => {
  const first = rigged()
  const { group, layout } = first
  const walking = createCharacterMotion(
    first.document,
    [],
    { kind: 'walk', name: 'Andando', duration: 1, amount: 1 },
    nextId,
  )
  const old = findCharacterRigs(walking)[0]!
  // Um chapéu-espada pendurado na mão antiga continua na criação.
  const sword = addScenePrimitive(walking, 'box', 'espada', nextId)
  const swordId = sword.nodes.at(-1)!.id
  const withSword = {
    ...sword,
    nodes: sword.nodes.map((node) =>
      node.id === swordId ? { ...node, parentId: old.joints.get('handL')! } : node,
    ),
  }
  expect(characterRigTarget(withSword, [group]).replaced).toBe(9)
  const { document } = buildCharacterRig(withSword, [group], layout, nextId)
  expect(readSceneDocument(JSON.parse(JSON.stringify(document))).status).toBe('valid')
  const rigs = findCharacterRigs(document)
  expect(rigs).toHaveLength(1)
  expect(rigs[0]!.rootId).not.toBe(old.rootId)
  // As 9 peças e a espada, que também está no grupo do personagem, seguem os ossos novos.
  expect(document.skins).toHaveLength(10)
  expect(document.animations ?? []).toEqual([])
  expect(document.nodes.some((node) => node.id === swordId)).toBe(true)
  // A mão antiga fica só como apoio da espada; os outros ossos antigos saem.
  expect(document.nodes.some((node) => node.id === old.joints.get('handL'))).toBe(true)
  expect(document.nodes.some((node) => node.id === old.joints.get('footR'))).toBe(false)
})

test('remover ossos tira o esqueleto, os vínculos e os movimentos, mas deixa as peças', () => {
  const { document: built, group, source } = rigged()
  const walking = createCharacterMotion(
    built,
    [],
    { kind: 'walk', name: 'Andando', duration: 1, amount: 1 },
    nextId,
  )
  const clean = removeCharacterBones(walking, [group])
  expect(findCharacterRigs(clean)).toHaveLength(0)
  expect(clean.skins).toEqual([])
  expect(clean.animations).toEqual([])
  expect(clean.nodes.map((node) => node.name).sort()).toEqual(
    source.nodes.map((node) => node.name).sort(),
  )
  expect(() => removeCharacterBones(clean, [group])).toThrow(SceneValidationError)
})

test('tirar o esqueleto pelo personagem não depende da escolha (em Animar, um osso)', () => {
  const { document: built, source } = rigged()
  const walking = createCharacterMotion(
    built,
    [],
    { kind: 'walk', name: 'Andando', duration: 1, amount: 1 },
    nextId,
  )
  const rig = findCharacterRigs(walking)[0]!
  const clean = removeCharacterRig(walking, rig)
  expect(findCharacterRigs(clean)).toHaveLength(0)
  expect(clean.skins).toEqual([])
  expect(clean.animations).toEqual([])
  expect(clean.nodes.map((node) => node.name).sort()).toEqual(
    source.nodes.map((node) => node.name).sort(),
  )
  expect(() => removeCharacterRig(clean, rig)).toThrow(SceneValidationError)
})
