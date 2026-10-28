import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ilha } from '@sistemazero/arquipelago-contracts'
import { CylinderGeometry, Group, Mesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { aplicarSuave, caixaNoMundo, separarCopas, tapa, usarSuave } from '../src/mundo/copas'
import { prepararIlha } from '../src/mundo/ilha-completa'
import { distanciaDaCamera, pesoNoAlto } from '../src/sistemas/camera'

async function bosque() {
  const buf = readFileSync(join(import.meta.dir, '..', 'src', 'assets', 'ilhas', 'bosque.glb'))
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return (await new GLTFLoader().parseAsync(ab, '')).scene
}

describe('a câmera não atravessa parede', () => {
  test('encosta na hora e só volta aos poucos', () => {
    // Bateu a 3: vai a 3 no mesmo quadro.
    expect(distanciaDaCamera(9, 9, 3, 1 / 60, 3, 1.2)).toBe(3)
    // Saiu da frente: anda um pouco por quadro, sem passar do desejado.
    const depois = distanciaDaCamera(3, 9, 9, 1 / 60, 3, 1.2)
    expect(depois).toBeGreaterThan(3)
    expect(depois).toBeLessThan(3.5)
    expect(distanciaDaCamera(8.99, 9, 20, 10, 3, 1.2)).toBeCloseTo(9, 3)
    // A parede tem prioridade mesmo quando está mais perto que a distância de conforto.
    expect(distanciaDaCamera(5, 9, 0.2, 1 / 60, 3, 0.4)).toBe(0.2)
    // A folga descontada da sonda pode produzir um valor negativo: nunca atravessa o alvo.
    expect(distanciaDaCamera(5, 9, -0.1, 1 / 60, 3, 0.4)).toBe(0)
  })

  test('no chão vale 0, num deque vale 1', () => {
    expect(pesoNoAlto(0, 2.5)).toBe(0)
    expect(pesoNoAlto(1, 2.5)).toBe(0)
    expect(pesoNoAlto(4, 2.5)).toBe(1)
    expect(pesoNoAlto(2, 2.5)).toBeGreaterThan(0)
    expect(pesoNoAlto(2, 2.5)).toBeLessThan(1)
  })

  test('o guarda-corpo invisível segura o corpo, mas não a câmera', () => {
    expect(soParaOCorpo('col-guarda-12')).toBe(true)
    expect(soParaOCorpo('col-ponte-lado-3')).toBe(true)
    expect(soParaOCorpo('col-ponte-3')).toBe(false)
    expect(soParaOCorpo('col-cil-tronco-1')).toBe(false)
  })
})

describe('o que tapa a câmera esmaece', () => {
  test('copas, troncos e o telhado, cada um com materiais só dele e cópias transparentes', async () => {
    const cena = await bosque()
    const p = prepararIlha(cena, ilha('bosque'))
    // 13 copas (2 delas na ponta de campo do lado de fora), os 5 troncos das árvores grandes e o
    // telhado da casa na árvore.
    expect(p.copas).toHaveLength(19)
    expect(p.copas.filter((c) => c.ehCopa)).toHaveLength(13)
    const materiais = p.copas.flatMap((c) => c.materiais)
    expect(new Set(materiais).size).toBe(materiais.length)
    for (const c of p.copas) {
      for (const s of c.suaves) {
        expect(s.transparent).toBe(true)
        expect(s.depthWrite).toBe(false)
        expect(s.alphaHash).toBe(false)
        expect(p.materiais).not.toContain(s)
      }
    }
    // A copa fica no alto: as das árvores grandes passam dos 7 de altura.
    const altas = p.copas.filter((c) => c.ehCopa && caixaNoMundo(c).max.y > 7)
    expect(altas.length).toBeGreaterThanOrEqual(5)
  })

  test('esmaecida usa as cópias transparentes; de volta, os mesmos materiais opacos de antes', async () => {
    const cena = await bosque()
    const [copa] = prepararIlha(cena, ilha('bosque')).copas
    if (!copa) throw new Error('sem copa')
    const antes = copa.malhas.map((m) => m.malha.material)
    usarSuave(copa, true)
    aplicarSuave(copa, 0.25)
    for (const m of copa.malhas) expect(m.malha.material).toBe(m.suave)
    for (const s of copa.suaves) expect(s.opacity).toBeCloseTo(0.25)
    usarSuave(copa, false)
    expect(copa.malhas.map((m) => m.malha.material)).toEqual(antes)
  })

  test('só tapa a peça que corta o caminho da câmera até o avatar (pela malha, não pela caixa)', () => {
    const tronco = new Mesh(new CylinderGeometry(0.5, 0.5, 6, 12))
    tronco.name = 'tronco-1'
    tronco.position.set(0, 3, 0)
    const g = new Group()
    g.add(tronco)
    const [peca] = separarCopas(g)
    if (!peca) throw new Error('sem peça')
    const cabeca = new Vector3(0, 2, 3)
    expect(tapa(peca, [cabeca], new Vector3(0, 2, -3))).toBe(true)
    expect(tapa(peca, [cabeca], new Vector3(3, 2, 3))).toBe(false)
    // Só os pés atrás do tronco também conta.
    const pes = new Vector3(0.2, 0.3, 2)
    expect(tapa(peca, [new Vector3(3, 5, 3), pes], new Vector3(-0.2, 0.3, -3))).toBe(true)
    // A câmera antes do tronco não é tapada por ele.
    expect(tapa(peca, [cabeca], new Vector3(0, 2, 1))).toBe(false)
  })
})
