import { describe, expect, test } from 'bun:test'
import type { SceneAction, SceneId } from './actions'
import { sceneDefaultGoalIds } from './catalog'
import { facesAVista, openScene, PICK_BOXES, scenePickPath, stepScene } from './engine'
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

describe('pool: quantos cactos o jogo já fabricou', () => {
  test('sem reciclagem, um cacto na tela por vez e os fabricados sobem a cada travessia', () => {
    const s = rodar('pool', [passo, passo, passo])
    expect(s.nursery.alive).toBe(1)
    expect(s.nursery.created).toBe(3)
    expect(s.nursery.onScreen).toBe(3)
    expect(descobertas(s)).toContain('grows')
  })

  test('⚠️ com a reciclagem, o mesmo número volta: o contador de fabricados PARA', () => {
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
    expect(s.nursery.onScreen).toBe(3)
    expect(s.nursery.last).toBe('voltou')
    expect(descobertas(s)).toContain('steady')
  })

  test('⚠️ mexer na chave zera o relógio da reciclagem: "parou" não vem de graça', () => {
    // Sem isso os três segundos SEM reciclagem contariam, e a meta cairia logo depois do toque.
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): a cena anda a 10 quadros por segundo, e um passo de
    // 1 s são 10 quadros.
    const s = rodar('pool', [
      passo,
      passo,
      passo,
      { type: 'connect', port: 'recycle', enabled: true },
      passo,
    ])
    expect(s.nursery.ticks).toBe(10)
    expect(descobertas(s)).not.toContain('steady')
  })
})

describe('entity-state: o que cada torre está fazendo', () => {
  test('⚠️⚠️ com as três no MESMO estado, UM toque não fecha meta nenhuma', () => {
    // A diversidade é medida ANTES da mudança. Medida depois, a própria mudança satisfazia o
    // guard: um toque a partir das três paradas fechava DUAS metas.
    const s = rodar('entity-state', [{ type: 'brain', id: 1, state: 'mirar' }])
    expect(s.brains.states).toEqual(['mirar', 'parado', 'parado'])
    expect(descobertas(s)).not.toContain('own')
    expect(descobertas(s)).not.toContain('independent')
  })

  test('⚠️ "cada uma no SEU estado" pede as TRÊS diferentes — duas iguais não valem', () => {
    // ⚠️ `parado` também é um estado: dois toques já deixam as três distintas (mirar, atirar,
    // parado), e ISSO vale. O que não vale é duas no mesmo.
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

  test('o relógio mostra o que cada torre faz, uma frase por torre', () => {
    const s = rodar('entity-state', [
      { type: 'brain', id: 1, state: 'mirar' },
      { type: 'brain', id: 2, state: 'atirar' },
      passo,
    ])
    expect(descobertas(s)).toContain('acts')
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): as torres, uma frase para cada uma.
    expect(s.caption).toBe('A 1ª virou para o alvo. A 2ª soltou um tiro. A 3ª não fez nada.')
  })

  test('mexer na 3ª não mexe nas outras duas, e é aí que a independência conta', () => {
    // ⚠️ Mudou de propósito (review do lote 2): a independência só conta DEPOIS de o relógio andar.
    const semTempo = rodar('entity-state', [
      { type: 'brain', id: 1, state: 'mirar' },
      { type: 'brain', id: 3, state: 'recarregar' },
    ])
    expect(descobertas(semTempo)).not.toContain('independent')
    const s = rodar('entity-state', [
      { type: 'brain', id: 1, state: 'mirar' },
      passo,
      { type: 'brain', id: 3, state: 'recarregar' },
    ])
    expect(s.brains.states).toEqual(['mirar', 'parado', 'recarregar'])
    expect(descobertas(s)).toContain('independent')
    // ⚠️ Mudou de propósito (lote 5): só a torre que mudou, e no feminino. "As outras continuam como
    // estavam" era a resposta da previsão escrita no primeiro gesto.
    expect(s.caption).toBe('A 3ª torre agora está recarregando.')
  })

  test('⭐⭐ com o estado no JOGO, mandar uma torre muda as três, e as metas de "cada uma" não caem', () => {
    const s = rodar('entity-state', [
      { type: 'brain', id: 1, state: 'mirar' },
      { type: 'brain', id: 2, state: 'atirar' },
      { type: 'brain-scope', shared: true },
    ])
    // Um estado só: as três seguem o da 1ª, na hora.
    expect(s.brains.states).toEqual(['mirar', 'mirar', 'mirar'])
    const atiram = stepScene({ scene: 'entity-state' }, s, {
      type: 'brain',
      id: 2,
      state: 'atirar',
    })
    expect(atiram.brains.states).toEqual(['atirar', 'atirar', 'atirar'])
    expect(descobertas(atiram)).toContain('shared')
    expect(atiram.caption).toBe('As três torres agora estão atirando.')
    // O mesmo estado de novo não é "mudaram juntas".
    const nada = rodar('entity-state', [
      { type: 'brain-scope', shared: true },
      { type: 'brain', id: 1, state: 'parado' },
    ])
    expect(descobertas(nada)).not.toContain('shared')
    // Voltar para "em cada uma" não mexe em nada, e cada torre volta a ter o seu.
    const volta = stepScene({ scene: 'entity-state' }, atiram, {
      type: 'brain-scope',
      shared: false,
    })
    expect(volta.brains.states).toEqual(['atirar', 'atirar', 'atirar'])
    const so = stepScene({ scene: 'entity-state' }, volta, {
      type: 'brain',
      id: 3,
      state: 'parado',
    })
    expect(so.brains.states).toEqual(['atirar', 'atirar', 'parado'])
  })
})

describe('delta-time: o mesmo jogo em dois computadores', () => {
  test('⭐ a corrida começa na LARGADA, em 0, e cada quadro desenhado é uma pegada', () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): os dois começavam em 40, e a faixa dizia "andou 40".
    const inicio = openScene({ scene: 'delta-time' })
    expect(inicio.machines).toMatchObject({ fastX: 0, slowX: 0, fastFrames: 0, slowFrames: 0 })
    const s = rodar('delta-time', [passo])
    // O rápido desenha um quadro a cada quadro da cena; o devagar, um a cada dois.
    expect(s.machines).toMatchObject({ fastFrames: 10, slowFrames: 5, fastX: 40, slowX: 20 })
  })

  test('a cada QUADRO, o rápido dispara na frente e chega; o devagar fica na metade', () => {
    const s = rodar('delta-time', [passo, passo])
    expect(s.machines.fastX).toBeGreaterThan(s.machines.slowX)
    expect(descobertas(s)).toContain('apart')
    const fim = rodar('delta-time', [passo, passo, passo, passo, passo])
    expect(fim.machines).toMatchObject({ fastX: 120, slowX: 60, fastFrames: 30, slowFrames: 15 })
    expect(sceneSituation('delta-time', { ...fim, caption: '' })).toBe(
      'O rápido chegou! O devagar está na metade do caminho.',
    )
  })

  test('⚠️⚠️ a corrida ACABA na chegada: o ▶ ligado não empurra ninguém para fora da pista', () => {
    // O desenho tinha teto e o número não: com o ▶ ligado os dois grudavam na borda e a faixa dizia
    // 1040 contra 540.
    const longe = rodar(
      'delta-time',
      Array.from({ length: 12 }, () => passo),
    )
    expect(longe.machines.fastX).toBe(120)
    expect(longe.machines.fastFrames).toBe(30)
    expect(longe.machines.elapsed).toBeCloseTo(3, 6)
  })

  test('⚠️ trocar como o Dino anda recomeça a corrida na largada', () => {
    const s = rodar('delta-time', [passo, passo, { type: 'count', kind: 'seconds' }])
    expect(s.machines).toMatchObject({ fastX: 0, slowX: 0, fastFrames: 0, slowFrames: 0 })
    expect(s.machines.elapsed).toBe(0)
  })

  test('a cada SEGUNDO, os dois chegam juntos, e o rápido desenhou o dobro de quadros', () => {
    const s = rodar('delta-time', [passo, passo, { type: 'count', kind: 'seconds' }, passo, passo])
    expect(s.machines.fastX).toBe(s.machines.slowX)
    // ⚠️ Mudou de propósito (lote 5): "chegaram juntos" é na CHEGADA, e não depois de um segundo.
    expect(descobertas(s)).not.toContain('together')
    const chegou = stepScene({ scene: 'delta-time' }, s, passo)
    expect(chegou.machines).toMatchObject({
      fastX: 120,
      slowX: 120,
      fastFrames: 30,
      slowFrames: 15,
    })
    expect(descobertas(chegou)).toContain('together')
    expect(sceneSituation('delta-time', { ...chegou, caption: '' })).toBe(
      'Chegaram juntos! O rápido desenhou o dobro de quadros.',
    )
  })

  test('⚠️⚠️ "chegaram juntos" pede ter visto os dois se AFASTAREM', () => {
    const semContraste = rodar('delta-time', [
      { type: 'count', kind: 'seconds' },
      passo,
      passo,
      passo,
    ])
    expect(semContraste.machines.fastX).toBe(semContraste.machines.slowX)
    expect(descobertas(semContraste)).toHaveLength(0)
  })
})

describe('circle-collision: quando dois círculos batem', () => {
  test('a batida acontece quando a distância fica igual ou menor que a soma dos raios', () => {
    const s = rodar('circle-collision', [passo, passo, passo, passo])
    expect(s.circles.distance).toBeLessThanOrEqual(s.circles.a + s.circles.b)
    expect(descobertas(s)).toContain('touch')
    // ⭐ Lote 5: a frase escreve a conta e o que a fila dos raios desenha.
    expect(sceneSituation('circle-collision', { ...s, caption: '' })).toBe(
      'Distância 60. Raios 30 + 30 = 60. A fila dos raios alcançou o outro centro.',
    )
  })

  test('⚠️ a descoberta da CONTA é o mesmo lugar deixar de ser batida quando o raio encolhe', () => {
    const s = rodar('circle-collision', [
      passo,
      passo,
      passo,
      passo,
      { type: 'radius', which: 'a', value: 10 },
    ])
    expect(s.circles.distance).toBeGreaterThan(s.circles.a + s.circles.b)
    expect(descobertas(s)).toContain('formula')
    expect(sceneSituation('circle-collision', { ...s, caption: '' })).toBe(
      'Distância 60. Raios 10 + 30 = 40.',
    )
  })

  test('⚠️⚠️ a meta da CONTA continua alcançável depois de o relógio encostar os dois', () => {
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): o relógio só aproxima ATÉ a
    // batida, então 8 s de ▶ param em 60, e não mais em 0. Sobrepostos, só pela medida da distância.
    const encostados = rodar(
      'circle-collision',
      Array.from({ length: 8 }, () => passo),
    )
    expect(encostados.circles.distance).toBe(60)
    const grudados = stepScene({ scene: 'circle-collision' }, encostados, {
      type: 'approach',
      distance: 0,
    })
    expect(descobertas(grudados)).not.toContain('formula')
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

  test('⚠️ a sombra só é descoberta para quem LEVANTOU o cubo: um caso que abre no ar não a entrega', () => {
    const caso = openScene({
      scene: 'axis-z',
      setup: { actions: [{ type: 'place3d', x: 0, y: 60, z: 0 }] },
    })
    const s = stepScene({ scene: 'axis-z' }, caso, { type: 'place3d', x: 40, y: 60, z: 0 })
    expect(s.space.y).toBe(60)
    expect(descobertas(s)).not.toContain('shadow')
  })

  test('⚠️⚠️ a sombra cai ANDANDO no chão com o cubo no ar, e não no mesmo toque do y', () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): `shadow` caía junto com `up`, com a sombra parada.
    const subiu = rodar('axis-z', [
      { type: 'place3d', x: 0, y: 0, z: -80 },
      { type: 'place3d', x: 0, y: 70, z: -80 },
    ])
    expect(subiu.space.moved).toEqual(['z', 'y'])
    expect(descobertas(subiu)).toEqual(['depth', 'up'])
    const andou = stepScene({ scene: 'axis-z' }, subiu, { type: 'place3d', x: 60, y: 70, z: -80 })
    expect(descobertas(andou)).toContain('shadow')
    // No chão, andar no x não é a sombra andando sozinha.
    const chao = rodar('axis-z', [
      { type: 'place3d', x: 0, y: 40, z: 0 },
      { type: 'place3d', x: 0, y: 0, z: 0 },
      { type: 'place3d', x: 40, y: 0, z: 0 },
    ])
    expect(descobertas(chao)).not.toContain('shadow')
  })

  test('⚠️ BAIXAR o y não é a descoberta: a cena existe para desfazer o y do 2D, que cresce para baixo', () => {
    const caso = openScene({
      scene: 'axis-z',
      setup: { actions: [{ type: 'place3d', x: 0, y: 60, z: 0 }] },
    })
    const s = stepScene({ scene: 'axis-z' }, caso, { type: 'place3d', x: 0, y: 10, z: 0 })
    expect(descobertas(s)).not.toContain('up')
    // ⚠️ Mudou de propósito (lote 5): mexer na altura não é mais a sombra; é o passo seguinte, no z.
    expect(descobertas(s)).not.toContain('shadow')
    const noZ = stepScene({ scene: 'axis-z' }, s, { type: 'place3d', x: 0, y: 10, z: -40 })
    expect(descobertas(noZ)).toContain('shadow')
  })

  test('a frase diz o que se vê, e a faixa só dá o sentido do eixo depois da meta', () => {
    const inicio = openScene({ scene: 'axis-z' })
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): a frase diz ONDE o cubo está na
    // profundidade (quem usa leitor de tela não recebia a descoberta do z), e o sentido do z na faixa é
    // "negativo é o fundo" (o rótulo saiu de dentro do desenho).
    expect(sceneSituation('axis-z', inicio)).toBe(
      'O cubo está no chão, no meio, com a sombra embaixo.',
    )
    expect(sceneReadout('axis-z', inicio).map((l) => l.label)).toEqual(['x', 'y', 'z'])
    const s = rodar('axis-z', [
      { type: 'place3d', x: 0, y: 0, z: -40 },
      { type: 'place3d', x: 0, y: 30, z: -40 },
    ])
    expect(sceneReadout('axis-z', s).map((l) => l.label)).toEqual([
      'x',
      'y (altura)',
      'z (negativo é o fundo)',
    ])
    // O negativo com o sinal de menos do conteúdo.
    expect(sceneReadout('axis-z', s)[2]?.value).toBe('−40')
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
    expect(facesAVista(uma.orbit.yaw, uma.orbit.pitch)).toBe(1)
    expect(descobertas(uma)).toContain('one-face')
    expect(descobertas(duas)).toContain('two-faces')
    expect(facesAVista(tres.orbit.yaw, tres.orbit.pitch)).toBe(3)
    // ⭐ Lote 5 do Raio-X: a terceira meta é achar as três cores.
    expect(descobertas(tres)).toEqual(['three-faces'])
    expect(uma.caption).toBe('')
  })

  test('⚠️⚠️ a cena ABRE mostrando duas cores, e por isso "girou até ver duas" pede GIRAR', () => {
    const parado = rodar('camera-3d', [{ type: 'orbit', yaw: 1, pitch: 1 }])
    expect(descobertas(parado)).toHaveLength(0)
  })

  test('um toque devolve a vista de sempre (a meta vale só num caso)', () => {
    const s = rodar('camera-3d', [{ type: 'orbit', yaw: 3, pitch: 2 }, { type: 'recenter' }])
    expect(s.orbit).toMatchObject({ yaw: 1, pitch: 1, returned: true })
    expect(descobertas(s)).toContain('back')
    // ⚠️ Mudou de propósito (lote 5): apertar o atalho não é meta de fábrica.
    expect(sceneDefaultGoalIds('camera-3d')).toEqual(['one-face', 'two-faces', 'three-faces'])
  })

  test('⚠️ "voltar à vista de sempre" sem nunca ter saído dela não é descoberta', () => {
    const s = rodar('camera-3d', [{ type: 'recenter' }])
    expect(descobertas(s)).not.toContain('back')
    expect(s.caption).toContain('já estava')
  })

  test('⚠️⚠️ a faixa e a frase NÃO contam as cores: contar é a tarefa da criança', () => {
    for (let yaw = 0; yaw <= 7; yaw += 1)
      for (let pitch = 0; pitch <= 2; pitch += 1) {
        const s = rodar('camera-3d', [{ type: 'orbit', yaw, pitch }])
        const faixa = sceneReadout('camera-3d', s)
        expect(faixa.map((l) => l.label)).not.toContain('cores à vista')
        const frase = sceneSituation('camera-3d', { ...s, caption: '' })
        expect(frase).not.toMatch(/\bcor(es)?\b/)
        // ⚠️ Mudou de propósito (lote 5): a volta se conta de 1 a 8, como na faixa e na bancada.
        expect(frase).toContain(`Volta ${yaw + 1} de 8.`)
        expect(faixa[0]?.value).toBe(`${yaw + 1} de 8`)
      }
  })
})

describe('mesh: o que tem embaixo da pele', () => {
  const ver = (level: 'nada' | 'metade' | 'tudo'): SceneAction => ({ type: 'see-points', level })

  test('⚠️ "a pele por cima dos pontos" só conta DEPOIS de ver os pontos', () => {
    const s = rodar('mesh', [ver('nada')])
    expect(descobertas(s)).toHaveLength(0)
  })

  test('⚠️⚠️ a metade mostra os pontos, e a pele por cima deles pede o SEGUNDO gesto', () => {
    // Com um gesto só, "metade" fecharia as duas metas juntas, e o palpite voltaria com a conclusão.
    const metade = rodar('mesh', [ver('metade')])
    expect(descobertas(metade)).toEqual(['points'])
    expect(sceneSituation('mesh', metade)).toBe(
      'A pele está transparente. Os pontos estão logo embaixo.',
    )
    const volta = stepScene({ scene: 'mesh' }, metade, ver('nada'))
    expect(descobertas(volta)).toEqual(['points', 'skin'])
    // Ou: primeiro tudo, e a metade por cima dos pontos já vistos.
    const doTudo = rodar('mesh', [ver('tudo'), ver('metade')])
    expect(descobertas(doTudo)).toEqual(['points', 'skin'])
  })

  test('girar o modelo não é girar a câmera, e com os pontos à vista a frase diz que eles giram', () => {
    const s = rodar('mesh', [{ type: 'orbit', yaw: 4, pitch: 1 }])
    expect(s.model.yaw).toBe(4)
    expect(s.orbit.yaw).toBe(1)
    // Só com a pele, dizer que há pontos girando seria a resposta da previsão.
    expect(s.caption).toBe('')
    const comPontos = rodar('mesh', [ver('tudo'), { type: 'orbit', yaw: 4, pitch: 1 }])
    expect(comPontos.caption).toBe('O modelo girou, e os pontos giraram junto.')
  })
})

describe('pick-ray: qual caixa a mira acende', () => {
  test('⚠️ a cena ABRE com a mira num lugar vazio, e a frase diz isso', () => {
    // A mira nascia dentro da caixa de trás, com a faixa dizendo "nada".
    const inicio = openScene({ scene: 'pick-ray' })
    expect(scenePickPath(inicio.ray.x, inicio.ray.y)).toEqual([])
    expect(sceneSituation('pick-ray', inicio)).toBe('Nada no caminho: a reta foi até o fim.')
  })

  test('mirar na caixa sozinha acende a caixa, e SÓ isso', () => {
    const s = rodar('pick-ray', [{ type: 'point', x: 100, y: 125 }])
    expect(s.ray.hit).toBe(PICK_BOXES.sozinha.id)
    expect(descobertas(s)).toEqual(['face'])
    expect(sceneSituation('pick-ray', s)).toBe('A reta saiu do seu olho e bateu na caixa C.')
  })

  test('⚠️⚠️ onde uma caixa COBRE a outra, acende a mais PERTO, e a meta é a outra', () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): a caixa acesa ali não fecha mais `face`, e o palpite
    // volta antes da conclusão.
    const cobertura = rodar('pick-ray', [{ type: 'point', x: 330, y: 155 }])
    expect(cobertura.ray.hit).toBe(PICK_BOXES.frente.id)
    expect(descobertas(cobertura)).toEqual(['first'])
    expect(sceneSituation('pick-ray', cobertura)).toBe(
      'A reta saiu do seu olho e bateu na caixa B. A caixa A ficou atrás.',
    )
    expect(sceneReadout('pick-ray', cobertura).map((l) => l.value)).toEqual(['2', 'caixa B'])

    // O pedaço exposto da caixa da FRENTE acende a da frente, sem nada atrás.
    const soAFrente = rodar('pick-ray', [{ type: 'point', x: 380, y: 195 }])
    expect(soAFrente.ray.hit).toBe(PICK_BOXES.frente.id)
    expect(descobertas(soAFrente)).toEqual(['face'])

    // E o pedaço exposto da de trás acende a de trás.
    const soAtras = rodar('pick-ray', [{ type: 'point', x: 250, y: 90 }])
    expect(soAtras.ray.hit).toBe(PICK_BOXES.atras.id)
  })

  test('⚠️⚠️ a caixa da frente é a MENOR: "escolhe a maior" é desmentida pelo palco', () => {
    const area = (c: { w: number; h: number }) => c.w * c.h
    expect(PICK_BOXES.frente.z).toBeLessThan(PICK_BOXES.atras.z)
    expect(area(PICK_BOXES.frente)).toBeLessThan(area(PICK_BOXES.atras))
  })

  test('mirar no vazio não acende nada', () => {
    const s = rodar('pick-ray', [
      { type: 'point', x: 100, y: 125 },
      { type: 'point', x: 440, y: 40 },
    ])
    expect(s.ray.hit).toBe(0)
    expect(sceneSituation('pick-ray', { ...s, caption: '' })).toBe(
      'Nada no caminho: a reta foi até o fim.',
    )
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
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): com as palavras do Pinta ("Sem cor", "a pedra").
    expect(sceneSituation('fill-stroke', { ...s, caption: '' })).toContain(
      'As duas partes em Sem cor: a pedra sumiu.',
    )
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
