import { describe, expect, test } from 'bun:test'
import {
  AnimationClip,
  AnimationMixer,
  Bone,
  Group,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
} from 'three'
import { PoseLimpa } from '../src/personagem/pose-limpa'

/** Um osso com um clipe que o mixer toca (com o tempo posto à mão, como no jogo). */
function montar() {
  const raiz = new Group()
  const osso = new Bone()
  osso.name = 'Hips'
  raiz.add(osso)
  const clipe = new AnimationClip('andar', 1, [
    new VectorKeyframeTrack('Hips.position', [0, 1], [0, 1, 0, 0, 1.2, 0]),
    new QuaternionKeyframeTrack('Hips.quaternion', [0, 1], [0, 0, 0, 1, 0, 0, 0, 1]),
  ])
  const mixer = new AnimationMixer(raiz)
  const acao = mixer.clipAction(clipe)
  acao.play()
  acao.setEffectiveTimeScale(0)
  return { osso, mixer, acao }
}

/** O ajuste depois da pose, como o dos pés: desce o osso um tanto. */
const descer = (osso: Bone) => {
  osso.position.y -= 0.1
}

describe('a pose limpa', () => {
  test('o mixer parado não reescreve o osso: sem a pose limpa, o ajuste se acumula', () => {
    const { osso, mixer } = montar()
    mixer.update(0)
    for (let i = 0; i < 5; i++) {
      mixer.update(0)
      descer(osso)
    }
    // É o defeito que o review achou: cinco quadros parados, cinco ajustes somados.
    expect(osso.position.y).toBeCloseTo(1 - 0.5, 6)
  })

  test('com a pose limpa, cada quadro parte da pose do mixer, parado ou andando', () => {
    const { osso, mixer, acao } = montar()
    const limpa = new PoseLimpa([osso])
    mixer.update(0)
    for (let i = 0; i < 5; i++) {
      mixer.update(0)
      limpa.antes()
      descer(osso)
      limpa.depois()
    }
    expect(osso.position.y).toBeCloseTo(0.9, 6)
    // O mixer escreve uma pose nova (o tempo andou): o ajuste parte dela.
    acao.time = 0.5
    mixer.update(0)
    limpa.antes()
    descer(osso)
    limpa.depois()
    expect(osso.position.y).toBeCloseTo(1.1 - 0.1, 6)
  })

  test('soltar devolve a pose do mixer (a lanterna guardada abre a mão)', () => {
    const { osso, mixer } = montar()
    const limpa = new PoseLimpa([osso])
    mixer.update(0)
    limpa.antes()
    descer(osso)
    limpa.depois()
    mixer.update(0)
    limpa.soltar()
    expect(osso.position.y).toBeCloseTo(1, 6)
  })
})
