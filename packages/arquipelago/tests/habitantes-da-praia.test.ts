import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { AnimationMixer, Box3, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { colisoresDoHabitante } from '../src/mundo/habitantes-da-praia-colisao'
import { alturaDaIlha, chaoEm, PIER } from '../src/mundo/medidas'
import {
  ACENO_DO_NICO,
  criarEstadoDoNico,
  HABITANTES_DA_PRAIA,
  type HabitanteDaPraia,
  olharDoNico,
  passoDoNico,
} from '../src/sistemas/habitantes-da-praia'

describe('o Nico na praia', () => {
  test('acena ao chegar perto, termina e não repete enquanto a criança fica ali', () => {
    const s = criarEstadoDoNico()
    expect(passoDoNico(s, 1, 100, 2, false)).toBe('parado')
    expect(passoDoNico(s, 0.1, 4, 2, false)).toBe('acenar')
    expect(passoDoNico(s, 1.9, 4, 2, false)).toBe('acenar')
    expect(passoDoNico(s, 0.2, 4, 2, false)).toBe('parado')
    expect(passoDoNico(s, 20, 4, 2, false)).toBe('parado')
    passoDoNico(s, 0.1, 100, 2, false)
    expect(passoDoNico(s, 0.1, 4, 2, false)).toBe('acenar')
  })

  test('sair e voltar rapidamente não repete o aceno', () => {
    const s = criarEstadoDoNico()
    passoDoNico(s, 0.1, 4, 2, false)
    passoDoNico(s, 3, 100, 2, false)
    expect(passoDoNico(s, 0.1, 4, 2, false)).toBe('parado')
  })

  test('pausa preserva tempo, proximidade e aceno; duração respeita movimento reduzido', () => {
    const s = criarEstadoDoNico()
    passoDoNico(s, 0.1, 4, 4, false)
    const antes = { ...s }
    expect(passoDoNico(s, 100, 100, 4, true)).toBe('acenar')
    expect(s).toEqual(antes)
    expect(passoDoNico(s, 3, 4, 4, false)).toBe('acenar')
    expect(passoDoNico(s, 1.1, 4, 4, false)).toBe('parado')
  })
})

for (const nome of Object.keys(HABITANTES_DA_PRAIA) as HabitanteDaPraia[]) {
  test(`${nome}: GLB real, clipes completos, cópia independente e colisor menor que o desenho`, async () => {
    const pasta = nome === 'nico' ? 'personagens' : 'lumis'
    const buf = readFileSync(`${import.meta.dir}/../src/assets/${pasta}/${nome}.glb`)
    const gltf = await new GLTFLoader().parseAsync(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      '',
    )
    const esperados =
      nome === 'nico'
        ? ['parado', 'andar', 'falar', 'acenar', 'feliz']
        : ['parado', 'andar', 'pular', 'trabalhar', 'feliz']
    expect(gltf.animations.map((a) => a.name).sort()).toEqual(esperados.sort())
    const copia = clone(gltf.scene)
    const mixer = new AnimationMixer(copia)
    for (const clipe of gltf.animations) {
      expect(clipe.duration).toBeGreaterThan(0)
      expect(clipe.tracks.length).toBeGreaterThan(0)
      const acao = mixer.clipAction(clipe).play()
      mixer.update(clipe.duration / 2)
      const caixa = new Box3().setFromObject(copia)
      expect(caixa.isEmpty()).toBe(false)
      expect(Number.isFinite(caixa.max.y)).toBe(true)
      acao.stop()
    }
    mixer.uncacheRoot(copia)
    expect(copia.children[0]).not.toBe(gltf.scene.children[0])

    const lugar = HABITANTES_DA_PRAIA[nome]
    const tamanho = new Box3()
      .setFromObject(gltf.scene)
      .getSize(new Vector3())
      .multiplyScalar(lugar.escala)
    const lista = colisoresDoHabitante(nome)
    expect(lista).toHaveLength(1)
    const c = lista[0]
    if (c?.forma !== 'cilindro') throw new Error('O corpo precisa de um cilindro simples')
    expect(soParaOCorpo(c.nome)).toBe(true)
    expect(c.raio * 2).toBeLessThan(Math.min(tamanho.x, tamanho.z))
    expect(c.meiaAltura * 2).toBeLessThan(tamanho.y)
    expect(c.posicao[1] - c.meiaAltura).toBe(0)
    expect(chaoEm(lugar.x, lugar.z)).toBe('areia')
    expect(alturaDaIlha(lugar.x, lugar.z)).toBeGreaterThan(0.25)
    expect(Math.hypot(lugar.x - PIER.x, lugar.z - PIER.z)).toBeGreaterThan(3)
  })
}

describe('o olhar do Nico', () => {
  const { x, z, giro } = HABITANTES_DA_PRAIA.nico
  test('vira para a criança perto e volta ao descanso longe', () => {
    expect(olharDoNico({ x, z: z - 3 })).toBeCloseTo(Math.PI, 6)
    expect(olharDoNico({ x: x + 3, z })).toBeCloseTo(Math.PI / 2, 6)
    expect(olharDoNico({ x: x + ACENO_DO_NICO.olharDe + 1, z })).toBe(giro)
    expect(olharDoNico({ x, z })).toBe(giro)
  })
})
