import { describe, expect, test } from 'bun:test'
import * as THREE from 'three'
import { measureCharacter } from '../src/components/kids/avatar3d/measure'
import { framePhoto, PORTRAIT_SHARE } from '../src/components/kids/avatar3d/photo-framing'
import { allPartsSettled, visibleParts } from '../src/components/kids/avatar3d/visible-parts'
import { DEFAULT_AVATAR_SLOTS } from '../src/lib/avatar3d-catalog'

/**
 * A foto do avatar com a cabeça cortada (12/10/2026). Duas causas, medidas num ensaio com a cena
 * real: (1) a captura media o personagem pela caixa que o three GUARDA nas malhas com esqueleto,
 * e ela cobria só as pernas; (2) o "ficar em pé" media o corpo com só parte das peças na cena.
 */

/**
 * Um personagem de mentira montado como o do configurador: o grupo do personagem, o grupo do
 * Mixamo (centímetros, eixo Z para cima, girado e encolhido) e, dentro dele, o osso e a malha
 * presa a ele sem `bind()` (como o R3F faz ao receber `skeleton`). Um bastão de 1 de altura.
 */
function personagem() {
  const bone = new THREE.Bone()
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -100], 3))
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0], 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0], 4))
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial())
  const rig = new THREE.Group()
  rig.add(bone, mesh)
  mesh.skeleton = new THREE.Skeleton([bone])
  const mixamo = new THREE.Group()
  mixamo.rotation.x = Math.PI / 2
  mixamo.scale.setScalar(0.01)
  mixamo.add(rig)
  const char = new THREE.Group()
  char.add(mixamo)
  new THREE.Scene().add(char)
  char.updateMatrixWorld(true)
  return { char, bone }
}

const perto = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-6)

describe('measureCharacter: a caixa do personagem pela pose de agora', () => {
  test('mede a altura de verdade', () => {
    const { char } = personagem()
    const box = measureCharacter(char, new THREE.Box3())
    perto(box.min.y, 0)
    perto(box.max.y, 1)
  })

  test('acompanha os ossos depois da primeira medida (a caixa guardada não acompanha)', () => {
    const { char, bone } = personagem()
    // A primeira medida comum faz o three guardar a caixa da malha.
    new THREE.Box3().setFromObject(char)
    bone.position.z = -100 // o bastão sobe 1
    const box = measureCharacter(char, new THREE.Box3())
    perto(box.min.y, 1)
    perto(box.max.y, 2)
    // O motivo do conserto: a medida comum devolve a caixa guardada, de antes do osso mexer.
    char.updateMatrixWorld(true)
    const guardada = new THREE.Box3().setFromObject(char)
    perto(guardada.max.y, 1)
  })

  test('acompanha o personagem que mudou de lugar desde o último quadro', () => {
    const { char } = personagem()
    // O "ficar em pé" move o personagem e mede no MESMO quadro, sem desenhar no meio.
    char.position.y = 5
    const box = measureCharacter(char, new THREE.Box3())
    perto(box.min.y, 5)
    perto(box.max.y, 6)
  })
})

describe('framePhoto: a região fotografada cabe no quadrado recortado', () => {
  // Um personagem como o do ensaio: 2,2 de altura, com a frente 0,45 à frente do centro.
  const corpo = new THREE.Box3(
    new THREE.Vector3(-0.55, 0, -0.48),
    new THREE.Vector3(0.6, 2.2, 0.45),
  )
  const telas = [
    { width: 1200, height: 520 }, // computador: largo
    { width: 390, height: 430 }, // celular: quase quadrado
    { width: 390, height: 700 }, // celular: alto
    { width: 800, height: 800 },
  ]

  /** Os cantos da região em coordenadas do quadrado recortado (-1..1 = a borda da foto). */
  function noQuadrado(box: THREE.Box3, tela: { width: number; height: number }, portrait: boolean) {
    const cam = new THREE.PerspectiveCamera()
    framePhoto(cam, box, tela, portrait)
    const fundo = portrait ? box.max.y - (box.max.y - box.min.y) * PORTRAIT_SHARE : box.min.y
    const lado = Math.min(tela.width, tela.height)
    const pontos: { x: number; y: number }[] = []
    for (const x of [box.min.x, box.max.x])
      for (const y of [fundo, box.max.y])
        for (const z of [box.min.z, box.max.z]) {
          const p = new THREE.Vector3(x, y, z).project(cam)
          // NDC do canvas inteiro → fração do quadrado central.
          pontos.push({ x: (p.x * tela.width) / lado, y: (p.y * tela.height) / lado })
        }
    return pontos
  }

  for (const tela of telas) {
    test(`corpo inteiro numa tela ${tela.width}x${tela.height}: cabeça e pés com folga`, () => {
      const pts = noQuadrado(corpo, tela, false)
      for (const p of pts) {
        expect(Math.abs(p.y)).toBeLessThan(0.95)
        expect(Math.abs(p.x)).toBeLessThan(1)
      }
      // E ocupa a foto: o personagem não fica um pontinho.
      expect(Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y))).toBeGreaterThan(
        1.3,
      )
    })

    test(`retrato numa tela ${tela.width}x${tela.height}: o topo da cabeça com folga`, () => {
      const pts = noQuadrado(corpo, tela, true)
      for (const p of pts) expect(Math.abs(p.y)).toBeLessThan(0.95)
    })
  }
})

describe('as peças que o personagem mostra', () => {
  test('o conjunto inicial mostra cabeça, cabelo, rosto e roupa, sem as "nenhum"', () => {
    expect(visibleParts(DEFAULT_AVATAR_SLOTS).map(([cat]) => cat)).toEqual([
      'head',
      'hair',
      'eyes',
      'eyebrows',
      'nose',
      'top',
      'bottom',
      'shoes',
    ])
  })

  test('o chapéu esconde o cabelo e a roupa inteira esconde a de cima e a de baixo', () => {
    const cats = visibleParts({
      ...DEFAULT_AVATAR_SLOTS,
      hat: { asset: 'hat-01' },
      outfit: { asset: 'outfit-01' },
    }).map(([cat]) => cat)
    expect(cats).toContain('hat')
    expect(cats).toContain('outfit')
    expect(cats).not.toContain('hair')
    expect(cats).not.toContain('top')
    expect(cats).not.toContain('bottom')
  })

  test('só está tudo na cena quando cada peça mostrada chegou, e a peça certa', () => {
    const parts = visibleParts(DEFAULT_AVATAR_SLOTS)
    const settled = new Map(parts)
    expect(allPartsSettled(parts, settled)).toBe(true)
    settled.delete('head')
    expect(allPartsSettled(parts, settled)).toBe(false)
    // A cabeça anterior ainda na cena não conta: a troca está carregando.
    settled.set('head', 'head-99')
    expect(allPartsSettled(parts, settled)).toBe(false)
  })
})
