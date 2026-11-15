import { expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { AnimationMixer, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ampliarPassada } from '../src/personagem/passada'
import { acharPernas } from '../src/personagem/pes-no-chao'
import { PoseLimpa } from '../src/personagem/pose-limpa'
import { CICLO_DE_CORRER, ciclosPorSegundo, LOCOMOCAO_DO_MUNDO } from '../src/sistemas/locomocao'
import {
  amplitudeDoPasso,
  RITMOS_DA_AVENTURA,
  ritmoDaAventura,
} from '../src/sistemas/ritmo-da-aventura'

test('o perfil de exploração ganha velocidade sem mudar escala e sincroniza a passada ampliada', () => {
  const p = RITMOS_DA_AVENTURA.explorar
  expect(p.andar).toBeGreaterThan(RITMOS_DA_AVENTURA.referencia.andar)
  expect(p.correr).toBeGreaterThan(RITMOS_DA_AVENTURA.referencia.correr)
  const medidas = {
    escala: 1,
    andar: p.andar,
    correr: p.correr,
    passo: { amplitude: p.passada, cadencia: p.cadencia },
  }
  const passadaNativa = CICLO_DE_CORRER.passada / LOCOMOCAO_DO_MUNDO.escala
  expect(ciclosPorSegundo(p.correr, medidas) * passadaNativa * p.passada).toBeCloseTo(p.correr, 5)
  expect(amplitudeDoPasso(0, p.andar, p.passada)).toBe(1)
  expect(amplitudeDoPasso(100, p.andar, p.passada)).toBe(p.passada)
  expect(ritmoDaAventura('inexistente')).toBe('explorar')
  for (const ritmo of [RITMOS_DA_AVENTURA.explorar, RITMOS_DA_AVENTURA.agil]) {
    const v = ritmo.correr * 1.1,
      m = {
        escala: 1,
        andar: ritmo.andar,
        correr: ritmo.correr,
        passo: { amplitude: ritmo.passada, cadencia: ritmo.cadencia },
      }
    expect(ciclosPorSegundo(v, m) * passadaNativa * ritmo.passada).toBeCloseTo(v, 5)
  }
})

const arquivo = resolve(
  process.env.AVATAR_QA_DIR ?? '../../output/morada-avatar-qa',
  AVATAR_CATALOG.base.skeleton.game.file,
)
test.skipIf(!existsSync(arquivo))(
  'clipes reais: passada alcança o alvo, preserva ossos e não acumula na pausa',
  async () => {
    const b = readFileSync(arquivo),
      g = await new GLTFLoader().parseAsync(
        b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
        '',
      )
    const pernas = acharPernas(g.scene)!
    const ossos = [pernas.quadril, ...pernas.esquerda, ...pernas.direita]
    for (const [id, fator] of [
      ['andar_frente', 1.25],
      ['correr_frente', 1.25],
      ['andar_frente', 1.3],
      ['correr_frente', 1.3],
    ] as const) {
      const mixer = new AnimationMixer(g.scene)
      mixer.clipAction(g.animations.find((c) => c.name === id)!).play()
      const limpa = new PoseLimpa(ossos)
      for (let i = 0; i < 60; i++) {
        mixer.setTime(i / 60)
        limpa.antes()
        g.scene.updateMatrixWorld(true)
        const comprimentos = ossos.map((o) => o.position.length())
        const escalas = ossos.map((o) => o.scale.clone())
        expect(ampliarPassada(pernas, g.scene, fator)).toBeLessThan(0.005)
        for (let j = 1; j < ossos.length; j++)
          expect(ossos[j]!.position.length()).toBeCloseTo(comprimentos[j]!, 7)
        for (let j = 0; j < ossos.length; j++)
          expect(ossos[j]!.scale.equals(escalas[j]!)).toBe(true)
        limpa.depois()
      }
      const pe = pernas.esquerda[2]!,
        antes = pe.getWorldPosition(new Vector3())
      for (let i = 0; i < 100; i++) {
        limpa.antes()
        ampliarPassada(pernas, g.scene, fator)
        limpa.depois()
      }
      expect(pe.getWorldPosition(new Vector3()).distanceTo(antes)).toBeLessThan(0.00001)
      limpa.soltar()
      mixer.stopAllAction()
      mixer.uncacheRoot(g.scene)
    }
  },
)
