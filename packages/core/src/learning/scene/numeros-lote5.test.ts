import { describe, expect, test } from 'bun:test'
import type { SceneAction, SceneId, SceneSetup } from './actions'
import { openScene, stepScene } from './engine'
import { sceneSituation } from './readout'
import {
  hydrateSceneState,
  isSceneState,
  LUGARES_NAO_SORTEADOS,
  PLACAR_NAO_VISTO,
  type SceneState,
  sceneAreaPercent,
  sceneAreaWidth,
  VELOCITY_TRAIL_MAX,
} from './state'

/**
 * O redesenho do Corre Dino, segunda metade, e dos números (lote 5 do Raio-X, G3, 16/09/2026):
 * `restart`, `hitbox`, `score`, `random`, `acceleration`, `velocity`, `variable` e `lives`.
 *
 * ⚠️ A régua é a da casa: a meta só cai quando a criança VIU o que ela afirma. Cada `describe` cobra
 * o gesto que derruba a meta e o meio gesto que NÃO derruba. O pedido seguido ao pé da letra mora em
 * `pedidos-no-motor.test.ts`.
 */

const FATIA = 0.05

function crianca(scene: SceneId, setup?: SceneSetup) {
  const start = setup ? { scene, setup } : { scene }
  let estado: SceneState = openScene(start)
  const api = {
    get estado() {
      return estado
    },
    faz(...acoes: SceneAction[]) {
      for (const a of acoes) estado = stepScene(start, estado, a)
      return api
    },
    tempo(segundos: number) {
      for (let i = 0; i < Math.round(segundos / FATIA); i++)
        estado = stepScene(start, estado, { type: 'advance', seconds: FATIA })
      return api
    },
    viu: (meta: string) => estado.evidence.discoveries.includes(meta),
  }
  return api
}

const toque: SceneAction = { type: 'start', input: 'tap' }
const lugar = (unit: number): SceneAction => ({
  type: 'sample',
  kind: 'position',
  unit,
  guided: false,
})
const velocidade = (unit: number): SceneAction => ({
  type: 'sample',
  kind: 'velocity',
  unit,
  guided: false,
})

describe('restart: o toque no fim, e a pista que ele deixa', () => {
  test('⚠️⚠️ tocar na tela começa a partida e um cacto chega: o fim é visto, não apertado', () => {
    const c = crianca('restart')
    c.faz(toque)
    expect(c.estado.match.screen).toBe('playing')
    expect(c.viu('ended')).toBe(false)
    c.tempo(1)
    expect(c.estado.match.screen).toBe('playing')
    c.tempo(2)
    expect(c.estado.match.screen).toBe('end')
    expect(c.viu('ended')).toBe(true)
    // No fim o relógio não mexe mais nos cactos.
    const cactos = c.estado.crowd.cacti.map((k) => k.x)
    c.tempo(1)
    expect(c.estado.crowd.cacti.map((k) => k.x)).toEqual(cactos)
  })

  test('⚠️⚠️ "Ir para o início" deixa os cactos, e a partida seguinte começa com eles', () => {
    const c = crianca('restart').faz(toque).tempo(3).faz(toque)
    expect(c.estado.match.screen).toBe('start')
    expect(c.estado.crowd.cacti.length).toBeGreaterThan(0)
    // Voltar ao início sozinho não é a descoberta: ela é a partida nova COM os cactos da velha.
    expect(c.viu('screen-only')).toBe(false)
    c.faz(toque)
    expect(c.viu('screen-only')).toBe(true)
    expect(sceneSituation('restart', c.estado)).not.toMatch(/ponto/)
  })

  test('⚠️⚠️ "Reiniciar o jogo" limpa a pista, e só vale DEPOIS de ter visto a herança', () => {
    // Sem a comparação, a pista vazia do Reiniciar não prova nada.
    const direto = crianca('restart')
      .faz(toque)
      .tempo(3)
      .faz({ type: 'connect', port: 'restart', enabled: true }, toque)
    expect(direto.estado.crowd.cacti).toEqual([])
    expect(direto.estado.match.screen).toBe('start')
    direto.faz(toque)
    expect(direto.viu('restarted')).toBe(false)

    const c = crianca('restart').faz(toque).tempo(3).faz(toque, toque).tempo(3)
    expect(c.estado.match.screen).toBe('end')
    c.faz({ type: 'connect', port: 'restart', enabled: true }, toque)
    expect(c.estado.crowd.cacti).toEqual([])
    expect(c.viu('restarted')).toBe(false)
    c.faz(toque)
    expect(c.viu('restarted')).toBe(true)
  })

  test('tocar JOGANDO não faz nada (no jogo, é o pulo)', () => {
    const c = crianca('restart').faz(toque).tempo(0.5)
    const antes = c.estado
    c.faz(toque)
    expect(c.estado.match).toEqual(antes.match)
  })
})

describe('hitbox: a área GRANDE bate antes dos desenhos, e diminuir para 80% conserta', () => {
  test('a cena abre com a área em 130% e o Dino em 64', () => {
    const c = crianca('hitbox')
    expect(sceneAreaPercent(c.estado.contact.width)).toBe(130)
    expect(sceneAreaWidth(80)).toBe(51.2)
  })

  test('⚠️⚠️ BATEU só é descoberta com um VÃO à vista entre os desenhos', () => {
    const colado = crianca('hitbox').faz({ type: 'move', distance: 25 })
    expect(colado.estado.caption).toBe('BATEU! Os desenhos também se encostam.')
    expect(colado.viu('contact')).toBe(false)
    const longe = crianca('hitbox').faz({ type: 'move', distance: 60 })
    expect(longe.viu('contact')).toBe(false)
    const c = crianca('hitbox').faz({ type: 'move', distance: 50 })
    expect(c.viu('contact')).toBe(true)
    expect(c.estado.caption).toBe('BATEU! Os desenhos ainda têm um vão de 10.')
  })

  test('⚠️⚠️ o contraste pede DIMINUIR a área no mesmo lugar, depois de ter visto a batida', () => {
    // Diminuir sem ter visto BATEU não é contraste nenhum.
    const cedo = crianca('hitbox').faz(
      { type: 'move', distance: 50 },
      { type: 'move', distance: 140 },
      { type: 'resize', width: sceneAreaWidth(80) },
    )
    expect(cedo.viu('area-contrast')).toBe(false)
    // Aumentar a área até bater era o roteiro antigo, na direção contrária à da aula.
    const aumentando = crianca('hitbox').faz(
      { type: 'resize', width: sceneAreaWidth(50) },
      { type: 'move', distance: 50 },
      { type: 'resize', width: sceneAreaWidth(150) },
    )
    expect(aumentando.viu('area-contrast')).toBe(false)
    const c = crianca('hitbox').faz(
      { type: 'move', distance: 50 },
      { type: 'resize', width: sceneAreaWidth(80) },
    )
    expect(c.viu('area-contrast')).toBe(true)
    expect(c.estado.caption).toBe('A área do Dino ficou em 80%. Não bateu.')
  })
})

describe('score: ver o erro primeiro, depois mudar a peça de lugar', () => {
  test('⚠️⚠️ com a peça solta o placar cresce no INÍCIO, e é isso que a meta afirma', () => {
    const c = crianca('score')
    expect(c.estado.match.seen).toEqual([...PLACAR_NAO_VISTO])
    c.tempo(0.9)
    expect(c.viu('score-idle-wrong')).toBe(false)
    c.tempo(1.2)
    expect(c.viu('score-idle-wrong')).toBe(true)
    expect(c.estado.match.seen[0]).toBeGreaterThan(0)
  })

  test('⚠️⚠️ "o início esperou" é COMPARAÇÃO: sem ter visto a peça solta somar, não cai', () => {
    const direto = crianca('score')
      .faz({ type: 'connect', port: 'condition', enabled: true })
      .tempo(2.1)
    expect(direto.estado.match.points).toBe(0)
    expect(direto.viu('score-start')).toBe(false)
    const c = crianca('score')
      .tempo(2.1)
      .faz({ type: 'connect', port: 'condition', enabled: true })
      .tempo(1.1)
    expect(c.viu('score-start')).toBe(true)
  })
})

describe('random: o sorteio é de verdade, e pode repetir', () => {
  test('⚠️⚠️ o número vem do GESTO e vira um lugar de 500 a 560, de 10 em 10', () => {
    const c = crianca('random')
    expect(c.estado.speed.spots).toEqual([...LUGARES_NAO_SORTEADOS])
    c.faz(lugar(0))
    expect(c.estado.speed.samples.x).toBe(500)
    c.faz(lugar(0.999))
    expect(c.estado.speed.samples.x).toBe(560)
    expect(c.viu('positions')).toBe(true)
    expect(c.viu('repeat')).toBe(false)
    // O mesmo número no gesto dá o mesmo lugar: o servidor refaz o mesmo mundo.
    c.faz(lugar(0.02))
    expect(c.estado.speed.spots[0]).toBe(2)
    expect(c.viu('repeat')).toBe(true)
  })

  test('⚠️ um sorteio só NÃO fecha "lugares diferentes"', () => {
    const c = crianca('random').faz(lugar(0.3))
    expect(c.viu('positions')).toBe(false)
  })

  test('⚠️⚠️ oito sorteios quaisquer repetem com certeza (é o que o pedido promete)', () => {
    const c = crianca('random').faz(...[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 0.99].map(lugar))
    expect(c.viu('repeat')).toBe(true)
  })

  test('as raias: −5 e −6 correm 1 segundo, e a meta pede as duas na pista', () => {
    const c = crianca('random').faz(velocidade(0.2), velocidade(0.1))
    expect(c.viu('velocities')).toBe(false)
    c.faz(velocidade(0.8))
    expect(c.viu('velocities')).toBe(true)
    const [cinco, seis] = [-5, -6].map((v) => c.estado.crowd.cacti.find((k) => k.velocity === v))
    expect(cinco?.x).toBe(350)
    expect(seis?.x).toBe(320)
    c.faz(velocidade(0.1), velocidade(0.1), velocidade(0.1))
    expect(c.estado.crowd.cacti.length).toBe(4)
  })

  test('⚠️ o caso do professor não pré-semeia o sorteio da criança', () => {
    const c = crianca('random', { actions: [lugar(0.3), lugar(0.3)] })
    expect(c.estado.speed.spots).toEqual([...LUGARES_NAO_SORTEADOS])
    c.faz(lugar(0.3))
    expect(c.viu('repeat')).toBe(false)
  })
})

describe('acceleration: um relógio de 5 segundos e a condição Se velocidade > −9', () => {
  const cinco = (unit = 0): SceneAction => velocidade(unit)

  test('⚠️⚠️ com a condição ligada a base PARA em −9, e a parada só é vista depois de tentar', () => {
    const c = crianca('acceleration')
    expect(c.estado.speed.limited).toBe(true)
    c.faz(cinco(), cinco(), cinco(), cinco())
    expect(c.estado.speed.base).toBe(-9)
    expect(c.viu('base-limit')).toBe(false)
    c.faz(cinco())
    expect(c.estado.speed.base).toBe(-9)
    expect(c.viu('base-limit')).toBe(true)
    expect(c.estado.crowd.cacti.map((k) => k.velocity)).toEqual([-6, -7, -8, -9, -9])
  })

  test('⚠️⚠️ parada em −9, o sorteio ainda tira 1: e o motor GARANTE o −10 depois de três em −9', () => {
    const c = crianca('acceleration').faz(cinco(), cinco(), cinco(), cinco(), cinco(), cinco())
    expect(c.viu('variation-limit')).toBe(false)
    c.faz(cinco())
    expect(c.estado.crowd.cacti.at(-1)?.velocity).toBe(-10)
    expect(c.viu('variation-limit')).toBe(true)
    // Os velhos guardam o número com que nasceram.
    expect(c.estado.crowd.cacti.slice(0, 3).map((k) => k.velocity)).toEqual([-6, -7, -8])
  })

  test('⚠️ sem a condição a base passa de −9, e ligar de novo NÃO a puxa de volta', () => {
    const c = crianca('acceleration').faz({ type: 'connect', port: 'limit', enabled: false })
    c.faz(cinco(), cinco(), cinco(), cinco())
    expect(c.viu('past-limit')).toBe(false)
    c.faz(cinco())
    expect(c.estado.speed.base).toBe(-10)
    expect(c.viu('past-limit')).toBe(true)
    c.faz({ type: 'connect', port: 'limit', enabled: true }, cinco())
    expect(c.estado.speed.base).toBe(-10)
  })

  test('⚠️ o ▶ não mexe mais nesta cena: o relógio é o de 5 segundos', () => {
    const c = crianca('acceleration').faz(cinco())
    const antes = c.estado
    c.faz({ type: 'advance', seconds: 1 })
    expect(c.estado.speed).toEqual(antes.speed)
  })
})

describe('velocity: um quadro é uma soma, com o rastro e a tela de verdade', () => {
  test('⚠️⚠️ o rastro guarda um pontinho por quadro, e a velocidade anterior vira cinza', () => {
    const c = crianca('velocity').faz({ type: 'velocity', vx: 5, vy: 0 }).tempo(0.2)
    expect(c.estado.drive.trailX).toEqual([60, 65])
    expect(c.estado.drive.steps).toBe(1)
    expect(c.estado.caption).toBe('Um quadro: o x foi de 60 para 65.')
    c.tempo(2)
    expect(c.estado.drive.trailX.length).toBe(VELOCITY_TRAIL_MAX)
    const rastro = c.estado.drive.trailX
    c.faz({ type: 'velocity', vx: -6, vy: 0 })
    expect(c.estado.drive.prevX).toEqual(rastro)
    expect(c.estado.drive.trailX).toEqual([c.estado.drive.x])
    expect(c.estado.drive.steps).toBe(0)
  })

  test('⚠️⚠️ o y pode ser NEGATIVO (a pedra nasce acima da tela), até a borda de fora', () => {
    const c = crianca('velocity', {
      actions: [
        { type: 'velocity', vx: 10, vy: -5 },
        { type: 'advance', seconds: 3.6 },
        { type: 'velocity', vx: 0, vy: -5 },
        { type: 'advance', seconds: 3.4 },
        { type: 'velocity', vx: 0, vy: 0 },
      ],
    })
    expect([c.estado.drive.x, c.estado.drive.y]).toEqual([240, -40])
    // O caso não deixa rastro de um lugar onde a criança nunca esteve.
    expect(c.estado.drive.trailY).toEqual([-40])
    expect(c.estado.drive.prevY).toEqual([])
    c.faz({ type: 'velocity', vx: 0, vy: -9 }).tempo(3)
    expect(c.estado.drive.y).toBe(-60)
    expect(c.estado.caption).toBe('Chegou na borda: não dá para ir mais para lá.')
    c.faz({ type: 'velocity', vx: 0, vy: 3 }).tempo(1)
    expect(c.estado.caption).toMatch(/Desceu\.$/)
  })
})

describe('variable: criar a caixa, somar sem mostrar, mostrar', () => {
  test('⚠️⚠️ somar antes de a caixa existir não muda nada, e é dito', () => {
    const c = crianca('variable').faz({ type: 'change', by: 1 })
    expect(c.estado.box.changes).toBe(0)
    expect(c.estado.caption).toBe('Ainda não existe caixa. Guarde um número primeiro.')
    expect(c.viu('changed-hidden')).toBe(false)
  })

  test('⚠️⚠️ guardar 0 CRIA a caixa (o primeiro bloco do jogo), e três acertos somam 3 sem a tela', () => {
    const c = crianca('variable')
    expect(c.estado.box.created).toBe(false)
    c.faz({ type: 'store', value: 0 })
    expect(c.estado.box.created).toBe(true)
    expect(c.viu('stored')).toBe(true)
    expect(c.viu('changed-hidden')).toBe(false)
    c.faz({ type: 'change', by: 1 }, { type: 'change', by: 1 }, { type: 'change', by: 1 })
    expect([c.estado.box.value, c.estado.box.changes, c.estado.box.shown]).toEqual([3, 3, false])
    expect(c.viu('changed-hidden')).toBe(true)
    c.faz({ type: 'show', on: true })
    expect(c.estado.box.value).toBe(3)
  })

  test('⚠️ o deslizante no batente reenvia o MESMO valor: não é mudança', () => {
    const c = crianca('variable').faz({ type: 'store', value: 0 }, { type: 'store', value: 0 })
    expect(c.estado.box.changes).toBe(0)
    expect(c.viu('changed-hidden')).toBe(false)
  })
})

describe('lives: o ACERTO muda o placar, a BATIDA muda os corações', () => {
  test('⚠️⚠️ o tiro soma 1 no placar e as vidas ficam (o ponto do Desafio)', () => {
    const c = crianca('lives').faz({ type: 'shoot' })
    expect(c.estado.lifeline).toMatchObject({ points: 1, lives: 3, shots: 1, last: 'tiro' })
    expect(c.estado.caption).toBe(
      'O tiro acertou um cacto: o placar foi para 1, e as vidas continuam em 3.',
    )
  })

  test('⚠️⚠️ com o ponto do tiro, a batida tira um coração e o placar fica', () => {
    const c = crianca('lives').faz(
      { type: 'shoot' },
      { type: 'connect', port: 'life', enabled: true },
      { type: 'collide' },
    )
    expect(c.estado.lifeline).toMatchObject({ points: 1, lives: 2, last: 'batida' })
    expect(c.viu('life-lost')).toBe(true)
    expect(c.viu('points-stay')).toBe(true)
    c.faz({ type: 'collide' }, { type: 'collide' })
    expect(c.viu('over')).toBe(true)
    // Sem vidas, nem o tiro soma.
    c.faz({ type: 'shoot' })
    expect(c.estado.lifeline.points).toBe(1)
  })
})

describe('retratos guardados antes do lote 5 abrem', () => {
  test('⚠️⚠️ os campos novos são completados campo a campo, e a caixa com número já existe', () => {
    const base = crianca('variable').faz(
      { type: 'store', value: 0 },
      { type: 'store', value: 7 },
    ).estado
    const antigo = JSON.parse(JSON.stringify(base))
    delete antigo.match.seen
    delete antigo.match.cleared
    delete antigo.speed.spots
    delete antigo.drive.trailX
    delete antigo.drive.trailY
    delete antigo.drive.prevX
    delete antigo.drive.prevY
    delete antigo.drive.steps
    delete antigo.box.created
    delete antigo.lifeline.shots
    delete antigo.lifeline.last
    expect(isSceneState(antigo)).toBe(false)
    const hidratado = hydrateSceneState(antigo) as SceneState
    expect(isSceneState(hidratado)).toBe(true)
    expect(hidratado.box.created).toBe(true)
    expect(hidratado.match.seen).toEqual([...PLACAR_NAO_VISTO])
    expect(hidratado.speed.spots).toEqual([...LUGARES_NAO_SORTEADOS])
    expect(hidratado.drive.trailX).toEqual([hidratado.drive.x])
    expect(hidratado.lifeline).toMatchObject({ shots: 0, last: 'nada' })
  })
})
