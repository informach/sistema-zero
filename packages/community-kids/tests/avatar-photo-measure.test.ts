import { describe, expect, test } from 'bun:test'
import * as THREE from 'three'
import { measureCharacter } from '../src/components/kids/avatar3d/measure'
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
