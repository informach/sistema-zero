import { describe, expect, test } from 'bun:test'
import type { SceneAction, SceneId } from './actions'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import { sceneReadout, sceneSituation } from './readout'
import type { SceneState } from './state'

/**
 * As dez cenas do MOTOR, do 3D e do ateliê (15/09/2026).
 *
 * As 35 anteriores são todas de uma tela 2D só. Estas cobrem o que aparece quando o jogo cresce
 * — o nascedouro que vaza, o cérebro de cada personagem, o tempo medido em segundos e a colisão
 * escrita à mão — e a porta do 3D, que é o degrau onde a trilha mais perde criança: o eixo que
 * falta, a câmera que decide o que se vê, o modelo por baixo da roupa e a mira que para na
 * primeira coisa.
 *
 * O que a varredura de `scene.test.ts` já garante para TODAS as cenas (o caminho de sucesso
 * fecha as metas, o texto veste o elenco, a faixa cabe em três leituras) não se repete aqui:
 * este arquivo cobre o que é PRÓPRIO de cada uma.
 */

function rodar(scene: SceneId, acoes: SceneAction[]): SceneState {
  return acoes.reduce((estado, acao) => stepScene({ scene }, estado, acao), openScene({ scene }))
}
const descobertas = (s: SceneState) => s.evidence.discoveries
const passo: SceneAction = { type: 'advance', seconds: 1 }

describe('pool: o contador que só sobe', () => {
  test('sem reciclagem, os vivos ficam em 1 e os criados sobem a cada passo', () => {
    const s = rodar('pool', [passo, passo, passo])
    expect(s.nursery.alive).toBe(1)
    expect(s.nursery.created).toBe(3)
    expect(descobertas(s)).toContain('grows')
  })

  test('⚠️ com a reciclagem, o mesmo corpo volta: o contador de criados PARA', () => {
    const s = rodar('pool', [
      passo,
      passo,
      passo,
      { type: 'connect', port: 'recycle', enabled: true },
      passo,
      passo,
      passo,
      passo,
    ])
    expect(s.nursery.created).toBe(3)
    expect(descobertas(s)).toContain('steady')
  })

  test('⚠️ mexer no fio zera o relógio do nascedouro: "parou de crescer" não vem de graça', () => {
    // Sem isso os três passos SEM reciclagem contariam, e a meta cairia no primeiro toque —
    // a criança ganharia a descoberta antes de ver o contador parado.
    const s = rodar('pool', [
      passo,
      passo,
      passo,
      { type: 'connect', port: 'recycle', enabled: true },
      passo,
    ])
    expect(s.nursery.ticks).toBe(1)
    expect(descobertas(s)).not.toContain('steady')
  })
})

describe('entity-state: cada um com o seu cérebro', () => {
  test('⚠️⚠️ com os três no MESMO estado, UM toque não fecha meta nenhuma', () => {
    // A diversidade é medida ANTES da mudança. Medida depois, a própria mudança satisfazia o
    // guard: um toque a partir dos três parados fechava DUAS metas, e "cada um ficou no seu
    // próprio estado" caía com dois dos três ainda iguais.
    const s = rodar('entity-state', [{ type: 'brain', id: 1, state: 'mirar' }])
    expect(s.brains.states).toEqual(['mirar', 'parado', 'parado'])
    expect(descobertas(s)).not.toContain('own')
    expect(descobertas(s)).not.toContain('independent')
  })

  test('⚠️ "cada um no SEU estado" pede os TRÊS diferentes — dois iguais não valem', () => {
    // ⚠️ `parado` também é um estado: dois toques já deixam os três distintos (mirar, atirar,
    // parado), e ISSO vale. O que não vale é dois no mesmo.
    const repetido = rodar('entity-state', [
      { type: 'brain', id: 1, state: 'mirar' },
      { type: 'brain', id: 2, state: 'mirar' },
    ])
    expect(repetido.brains.states).toEqual(['mirar', 'mirar', 'parado'])
    expect(descobertas(repetido)).not.toContain('own')

    const distintos = rodar('entity-state', [
      { type: 'brain', id: 1, state: 'mirar' },
      { type: 'brain', id: 2, state: 'atirar' },
    ])
    expect(descobertas(distintos)).toContain('own')
  })

  test('o relógio mostra o que cada um faz', () => {
    const s = rodar('entity-state', [
      { type: 'brain', id: 1, state: 'mirar' },
      { type: 'brain', id: 2, state: 'atirar' },
      passo,
    ])
    expect(descobertas(s)).toContain('acts')
    expect(s.caption).toContain('soltou um tiro')
  })

  test('mexer no 3º não mexe nos outros dois, e é aí que a independência conta', () => {
    const s = rodar('entity-state', [
      { type: 'brain', id: 1, state: 'mirar' },
      { type: 'brain', id: 3, state: 'recarregar' },
    ])
    expect(s.brains.states[0]).toBe('mirar')
    expect(s.brains.states[1]).toBe('parado')
    expect(descobertas(s)).toContain('independent')
  })
})

describe('delta-time: o mesmo jogo em dois computadores', () => {
  test('contando QUADROS, a máquina rápida dispara na frente', () => {
    const s = rodar('delta-time', [passo, passo])
    expect(s.machines.fastX).toBeGreaterThan(s.machines.slowX)
    expect(descobertas(s)).toContain('apart')
  })

  test('⚠️ trocar para SEGUNDOS recomeça as duas do mesmo lugar, senão a comparação mentiria', () => {
    const s = rodar('delta-time', [passo, passo, { type: 'count', kind: 'seconds' }])
    expect(s.machines.fastX).toBe(s.machines.slowX)
    expect(s.machines.elapsed).toBe(0)
  })

  test('contando tempo, as duas chegam juntas', () => {
    const s = rodar('delta-time', [passo, passo, { type: 'count', kind: 'seconds' }, passo])
    expect(s.machines.fastX).toBe(s.machines.slowX)
    expect(descobertas(s)).toContain('together')
  })

  test('⚠️⚠️ "chegaram juntas" pede ter visto as duas se AFASTAREM', () => {
    // O contraste é a lição inteira. Trocando para segundos de saída, a meta caía sobre duas
    // máquinas que nunca estiveram separadas.
    const semContraste = rodar('delta-time', [{ type: 'count', kind: 'seconds' }, passo, passo])
    expect(semContraste.machines.fastX).toBe(semContraste.machines.slowX)
    expect(descobertas(semContraste)).toHaveLength(0)
  })
})

describe('circle-collision: a conta que decide a batida', () => {
  test('a batida acontece quando a distância fica menor que a soma dos raios', () => {
    const s = rodar('circle-collision', [passo, passo, passo, passo])
    expect(s.circles.distance).toBeLessThanOrEqual(s.circles.a + s.circles.b)
    expect(descobertas(s)).toContain('touch')
  })

  test('⚠️ a descoberta da CONTA é o mesmo lugar deixar de ser batida quando o raio encolhe', () => {
    // Com a distância PARADA, só o raio mudou — é o único jeito de a criança ver que quem
    // decide é a conta, e não o desenho.
    const s = rodar('circle-collision', [
      passo,
      passo,
      passo,
      passo,
      { type: 'radius', which: 'a', value: 10 },
    ])
    expect(s.circles.distance).toBeGreaterThan(s.circles.a + s.circles.b)
    expect(descobertas(s)).toContain('formula')
  })

  test('⚠️⚠️ a meta da CONTA continua alcançável depois de o relógio encostar os dois', () => {
    // O relógio só APROXIMA. Sem um jeito de afastar, sete segundos de ▶ zeravam a distância e
    // a meta virava impossível para sempre — com a pista 3 mandando fazer exatamente o que já
    // não funcionava, e nada na tela dizendo para recomeçar.
    const grudados = rodar(
      'circle-collision',
      Array.from({ length: 8 }, () => passo),
    )
    expect(grudados.circles.distance).toBe(0)
    expect(descobertas(grudados)).not.toContain('formula')

    // 50 fica DENTRO da soma de fábrica (60), então encolher um raio inverte o veredito.
    const afastou = stepScene({ scene: 'circle-collision' }, grudados, {
      type: 'approach',
      distance: 50,
    })
    const encolheu = stepScene({ scene: 'circle-collision' }, afastou, {
      type: 'radius',
      which: 'a',
      value: 10,
    })
    expect(descobertas(encolheu)).toContain('formula')
  })

  test('⚠️ mudar o raio SEM trocar o resultado não é descoberta nenhuma', () => {
    const s = rodar('circle-collision', [{ type: 'radius', which: 'b', value: 20 }])
    expect(descobertas(s)).not.toContain('formula')
  })
})

describe('axis-z: o eixo que faltava', () => {
  test('⚠️ mexer nos três eixos de uma vez não registra nada: não dá para saber qual fez o quê', () => {
    const s = rodar('axis-z', [{ type: 'place3d', x: 40, y: 40, z: 40 }])
    expect(s.space.moved).toHaveLength(0)
    expect(descobertas(s)).not.toContain('depth')
  })

  test('⚠️ a sombra só é descoberta para quem a viu SE SEPARAR do objeto', () => {
    // Com um caso que já abre com ele no ar, qualquer gesto (mexer só no x) fechava a meta.
    const caso = openScene({
      scene: 'axis-z',
      setup: { actions: [{ type: 'place3d', x: 0, y: 60, z: 0 }] },
    })
    const s = stepScene({ scene: 'axis-z' }, caso, { type: 'place3d', x: 40, y: 60, z: 0 })
    expect(s.space.y).toBe(60)
    expect(descobertas(s)).not.toContain('shadow')
  })

  test('o z leva para longe, e o y maior é mais ALTO', () => {
    const s = rodar('axis-z', [
      { type: 'place3d', x: 0, y: 0, z: 80 },
      { type: 'place3d', x: 0, y: 70, z: 80 },
    ])
    expect(s.space.moved).toEqual(['z', 'y'])
    expect(descobertas(s)).toContain('depth')
    expect(descobertas(s)).toContain('up')
    expect(descobertas(s)).toContain('shadow')
  })

  test('⚠️ BAIXAR o y não é a descoberta: a cena existe para desfazer o y do 2D, que cresce para baixo', () => {
    // O caso já abre com ele no ar, para que DESCER seja a primeira coisa que a criança faz.
    const caso = openScene({
      scene: 'axis-z',
      setup: { actions: [{ type: 'place3d', x: 0, y: 60, z: 0 }] },
    })
    const s = stepScene({ scene: 'axis-z' }, caso, { type: 'place3d', x: 0, y: 10, z: 0 })
    expect(descobertas(s)).not.toContain('up')
    expect(descobertas(s)).toContain('shadow')
  })
})

describe('camera-3d: o que se vê depende de onde a câmera está', () => {
  test('de frente aparece uma cor, do canto duas, e por cima três', () => {
    const uma = rodar('camera-3d', [{ type: 'orbit', yaw: 0, pitch: 1 }])
    const duas = rodar('camera-3d', [
      { type: 'orbit', yaw: 0, pitch: 1 },
      { type: 'orbit', yaw: 1, pitch: 1 },
    ])
    const tres = rodar('camera-3d', [{ type: 'orbit', yaw: 1, pitch: 2 }])
    expect(uma.caption).toContain('1 cor')
    expect(descobertas(uma)).toContain('one-face')
    expect(descobertas(duas)).toContain('two-faces')
    expect(tres.caption).toContain('3 cor')
  })

  test('⚠️⚠️ a cena ABRE mostrando duas cores, e por isso "girou até ver duas" pede GIRAR', () => {
    // `orbit(1,1)` é a posição de partida: sem o guard, a meta caía numa ação que não mexe nada.
    const parado = rodar('camera-3d', [{ type: 'orbit', yaw: 1, pitch: 1 }])
    expect(descobertas(parado)).toHaveLength(0)
  })

  test('um toque devolve a vista de sempre', () => {
    const s = rodar('camera-3d', [{ type: 'orbit', yaw: 3, pitch: 2 }, { type: 'recenter' }])
    expect(s.orbit).toMatchObject({ yaw: 1, pitch: 1, returned: true })
    expect(descobertas(s)).toContain('back')
  })

  test('⚠️ "voltar à vista de sempre" sem nunca ter saído dela não é descoberta', () => {
    const s = rodar('camera-3d', [{ type: 'recenter' }])
    expect(descobertas(s)).not.toContain('back')
    expect(s.caption).toContain('já estava')
  })

  test('⚠️ a faixa e o motor contam as MESMAS faces (são duas cópias da regra)', () => {
    for (let yaw = 0; yaw <= 7; yaw += 1)
      for (let pitch = 0; pitch <= 2; pitch += 1) {
        const s = rodar('camera-3d', [{ type: 'orbit', yaw, pitch }])
        const naFaixa = sceneReadout('camera-3d', s).find((l) => l.label === 'cores à vista')
        expect(s.caption).toContain(`${naFaixa?.value} cor`)
      }
  })
})

describe('mesh: por baixo da roupa', () => {
  test('⚠️ "a textura é a roupa" só conta DEPOIS de ver os pontos', () => {
    const s = rodar('mesh', [{ type: 'wireframe', on: false }])
    expect(descobertas(s)).not.toContain('skin')
  })

  test('o raio-X mostra os pontos, e desligar devolve a roupa', () => {
    const s = rodar('mesh', [
      { type: 'wireframe', on: true },
      { type: 'wireframe', on: false },
    ])
    expect(s.model.wire).toBe(false)
    expect(descobertas(s)).toContain('points')
    expect(descobertas(s)).toContain('skin')
  })

  test('girar o modelo não é girar a câmera: aqui o que muda é o modelo', () => {
    const s = rodar('mesh', [{ type: 'orbit', yaw: 4, pitch: 1 }])
    expect(s.model.yaw).toBe(4)
    expect(s.orbit.yaw).toBe(1)
  })
})

describe('pick-ray: a mira que para na primeira', () => {
  test('mirar numa caixa sozinha acende ela, e SÓ isso', () => {
    // ⚠️ "A reta parou na primeira caixa do caminho" é sobre OCLUSÃO: onde há uma caixa só,
    // não há o que provar. Enquanto as três eram disjuntas, a meta caía em qualquer acerto.
    const s = rodar('pick-ray', [{ type: 'point', x: 110, y: 120 }])
    expect(s.ray.hit).toBe(3)
    expect(descobertas(s)).toEqual(['face'])
  })

  test('⚠️⚠️ só na faixa em que uma caixa COBRE a outra é que a oclusão conta', () => {
    const cobertura = rodar('pick-ray', [{ type: 'point', x: 330, y: 145 }])
    expect(cobertura.ray.hit).toBe(2)
    expect(descobertas(cobertura)).toContain('first')

    // O pedaço exposto da caixa da FRENTE acende ela, mas não há nada atrás ali.
    const soAFrente = rodar('pick-ray', [{ type: 'point', x: 420, y: 210 }])
    expect(soAFrente.ray.hit).toBe(2)
    expect(descobertas(soAFrente)).not.toContain('first')

    // E o pedaço exposto da de trás acende a de trás.
    const soAtras = rodar('pick-ray', [{ type: 'point', x: 250, y: 90 }])
    expect(soAtras.ray.hit).toBe(1)
  })

  test('mirar no vazio não acende nada', () => {
    const s = rodar('pick-ray', [{ type: 'point', x: 20, y: 260 }])
    expect(s.ray.hit).toBe(0)
    expect(descobertas(s)).toHaveLength(0)
    expect(sceneSituation('pick-ray', { ...s, caption: '' })).toContain('vazio')
  })
})

describe('fill-stroke: a cor de dentro e a linha de fora', () => {
  test('cada parte sobrevive sozinha', () => {
    const soMiolo = rodar('fill-stroke', [{ type: 'ink', part: 'stroke', on: false }])
    expect(descobertas(soMiolo)).toContain('only-fill')
    const soLinha = rodar('fill-stroke', [{ type: 'ink', part: 'fill', on: false }])
    expect(descobertas(soLinha)).toContain('only-stroke')
  })

  test('⚠️ "os dois juntos" só conta depois de ter visto UM sozinho', () => {
    // A forma NASCE com miolo e contorno: sem esta regra, a meta cairia sem a criança mexer
    // em nada, e a cena não teria ensinado que são dois desenhos.
    const semNada = rodar('fill-stroke', [])
    expect(descobertas(semNada)).not.toContain('both')
    const depois = rodar('fill-stroke', [
      { type: 'ink', part: 'stroke', on: false },
      { type: 'ink', part: 'stroke', on: true },
    ])
    expect(descobertas(depois)).toContain('both')
  })

  test('sem miolo e sem contorno não sobra desenho, e a cena DIZ isso', () => {
    const s = rodar('fill-stroke', [
      { type: 'ink', part: 'fill', on: false },
      { type: 'ink', part: 'stroke', on: false },
    ])
    expect(sceneSituation('fill-stroke', { ...s, caption: '' })).toContain('não sobrou desenho')
  })
})

describe('shading: a luz dá volume', () => {
  test('a segunda cor dá volume, e tirar ela devolve o adesivo', () => {
    const s = rodar('shading', [
      { type: 'shade', on: true },
      { type: 'shade', on: false },
    ])
    expect(descobertas(s)).toContain('volume')
    expect(descobertas(s)).toContain('flat')
  })

  test('⚠️⚠️ a forma NASCE chapada: desligar a sombra de saída não muda um pixel', () => {
    // A meta é uma COMPARAÇÃO ("parece um adesivo"), e ela caía sobre um nada.
    const s = rodar('shading', [{ type: 'shade', on: false }])
    expect(descobertas(s)).toHaveLength(0)
  })

  test('⚠️ trocar o lado da luz com a sombra DESLIGADA não mostra nada', () => {
    const s = rodar('shading', [{ type: 'light', side: 'right' }])
    expect(s.light.sides).toHaveLength(0)
    expect(descobertas(s)).not.toContain('side')
  })

  test('com a sombra ligada, trocar o lado da luz muda o lado da sombra', () => {
    const s = rodar('shading', [
      { type: 'shade', on: true },
      { type: 'light', side: 'right' },
    ])
    expect(s.light.sides).toEqual(['left', 'right'])
    expect(descobertas(s)).toContain('side')
  })
})

describe('⚠️⚠️ o caso do professor abre um mundo COERENTE', () => {
  test('os contadores dos cactos falam dos cactos que ficaram', () => {
    // Zerando só os números e deixando a população, `outside = born − removed − vivos` virava
    // NEGATIVO: a cena que existe para comparar "na tela" com "nos bastidores" abria com os dois
    // números se desmentindo ("−2 de 6 já saíram").
    const caso = openScene({
      scene: 'cleanup',
      setup: { actions: [{ type: 'advance', seconds: 3 }] },
    })
    expect(caso.crowd.born).toBe(caso.crowd.cacti.length)
    expect(caso.crowd.removed).toBe(0)
    const depois = [
      { type: 'connect' as const, port: 'cleanup' as const, enabled: true },
      passo,
      passo,
      passo,
      passo,
    ].reduce((e, a) => stepScene({ scene: 'cleanup' }, e, a), caso)
    expect(depois.crowd.removed).toBeGreaterThanOrEqual(0)
  })

  test('as duas raquetes voltam junto com o contador de apertos', () => {
    const caso = openScene({
      scene: 'hold-vs-press',
      setup: { actions: Array.from({ length: 8 }, () => ({ type: 'press' as const })) },
    })
    expect(caso.input.presses).toBe(0)
    expect(caso.input.pressX).toBe(caso.input.holdX)
  })
})

describe('⚠️ toda cena nova tem caminho de passar, e ele passa pelas metas', () => {
  const motor: SceneId[] = [
    'pool',
    'entity-state',
    'delta-time',
    'circle-collision',
    'axis-z',
    'camera-3d',
    'mesh',
    'pick-ray',
    'fill-stroke',
    'shading',
  ]
  for (const scene of motor)
    test(`${scene}: abre sem nenhuma meta fechada`, () => {
      // A outra metade — que existe caminho para fechar TODAS — é o que o `scenePaths` de
      // `tests/fixtures` garante, na varredura de `scene.test.ts`.
      const inicial = openScene({ scene })
      expect(descobertas(inicial)).toHaveLength(0)
      expect(evaluateExperimentation(scene, inicial).passed).toBe(false)
    })
})
