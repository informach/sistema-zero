import { describe, expect, test } from 'bun:test'
import { isInteractiveBlock, isLearningManifest } from '../index'
import { isSceneAction, type SceneAction, sceneStepLabel, sceneStepSeconds } from './actions'
import { sceneDefaultGoalIds, sceneGoalIds, sceneModel } from './catalog'
import {
  lighthouseWalkOut,
  openScene,
  sceneClockReachedStop,
  sceneClockShouldStop,
  stepScene,
} from './engine'
import { evaluateExperimentation, sceneGoals, sceneSuccess } from './evaluate'
import { isExperimentationActivity, isSceneSetup, sceneTargets } from './index'
import { sceneReadout, sceneSituation } from './readout'
import {
  hydrateSceneState,
  isSceneState,
  LIGHTHOUSE_WALK,
  lighthouseWalkMaxX,
  lighthouseWalkOutSeenX,
  type SceneStart,
  type SceneState,
} from './state'

/**
 * A cena do Dia 1 do Desafio do Farol (05/10/2026): o andar quadro a quadro, a velocidade e o limite da
 * tela. Cada meta cai com o que ela afirma à vista, e NÃO cai por quem só mexeu.
 */
const start = { scene: 'lighthouse-walk' } as const
const QUADRO: SceneAction = { type: 'advance', seconds: 1 / 30 }
const quadros = (n: number): SceneAction[] => Array.from({ length: n }, () => QUADRO)
const play = (actions: SceneAction[], from?: SceneState, setup: SceneStart = start) =>
  actions.reduce((state, action) => stepScene(setup, state, action), from ?? openScene(setup))
const viu = (s: SceneState, meta: string) => s.evidence.discoveries.includes(meta)
const SETA: SceneAction = { type: 'hold-arrow', held: true }
const SOLTA: SceneAction = { type: 'hold-arrow', held: false }
const LIMITE: SceneAction = { type: 'keep-on-screen', enabled: true }

const CASOS = {
  andar: ['still-without-arrow', 'moves-each-frame'],
  velocidade: ['step-speed-3', 'step-speed-1'],
  limite: ['left-the-screen', 'stayed-inside'],
} as const

describe('lighthouse-walk: o mundo', () => {
  test('abre perto do meio, parado, com a seta solta, velocidade 3 e sem o limite', () => {
    const s = openScene(start)
    expect(s.walk).toEqual({
      frame: 0,
      x: LIGHTHOUSE_WALK.start,
      arrow: false,
      speed: 3,
      keepInside: false,
      trail: [LIGHTHOUSE_WALK.start],
      idle: 0,
      run: 0,
    })
    expect(s.evidence.discoveries).toEqual([])
    expect(isSceneState(s)).toBe(true)
  })

  test('as ações são desta cena, e a velocidade só pode ser 1 ou 3', () => {
    expect(isSceneAction(SETA, 'lighthouse-walk')).toBe(true)
    expect(isSceneAction({ type: 'walk-speed', speed: 1 }, 'lighthouse-walk')).toBe(true)
    expect(isSceneAction({ type: 'walk-speed', speed: 2 }, 'lighthouse-walk')).toBe(false)
    expect(isSceneAction({ type: 'walk-speed', speed: '3' }, 'lighthouse-walk')).toBe(false)
    expect(isSceneAction({ type: 'hold-arrow', held: 'sim' }, 'lighthouse-walk')).toBe(false)
    expect(isSceneAction(LIMITE, 'lighthouse-walk')).toBe(true)
    expect(isSceneAction({ type: 'restart-walk' }, 'lighthouse-walk')).toBe(true)
    for (const outra of ['lighthouse-key', 'velocity', 'hold-vs-press'] as const) {
      expect(isSceneAction(SETA, outra)).toBe(false)
      expect(isSceneAction({ type: 'restart-walk' }, outra)).toBe(false)
    }
  })

  test('o passo do relógio se chama "Avançar 1 quadro" e anda UM quadro', () => {
    expect(sceneStepLabel('lighthouse-walk')).toBe('Avançar 1 quadro')
    expect(sceneStepSeconds('lighthouse-walk')).toBeCloseTo(1 / 30, 9)
    const s = play([SETA, { type: 'advance', seconds: sceneStepSeconds('lighthouse-walk') ?? 0 }])
    expect(s.walk.frame).toBe(1)
    expect(s.walk.x).toBe(LIGHTHOUSE_WALK.start + 3)
  })

  test('a cada quadro: com a seta, x += velocidade; sem a seta, o x fica; o quadro conta sempre', () => {
    const parado = play(quadros(4))
    expect(parado.walk.frame).toBe(4)
    expect(parado.walk.x).toBe(LIGHTHOUSE_WALK.start)
    const andando = play([SETA, ...quadros(4)])
    expect(andando.walk.x).toBe(LIGHTHOUSE_WALK.start + 12)
    const devagar = play([{ type: 'walk-speed', speed: 1 }, SETA, ...quadros(4)])
    expect(devagar.walk.x).toBe(LIGHTHOUSE_WALK.start + 4)
    // O rastro: uma marca por quadro, a de agora por último, e o espaçamento é a velocidade.
    expect(andando.walk.trail.slice(-3)).toEqual([
      LIGHTHOUSE_WALK.start + 6,
      LIGHTHOUSE_WALK.start + 9,
      LIGHTHOUSE_WALK.start + 12,
    ])
    expect(devagar.walk.trail.slice(-2)).toEqual([
      LIGHTHOUSE_WALK.start + 3,
      LIGHTHOUSE_WALK.start + 4,
    ])
    const longe = play([SETA, ...quadros(80)])
    expect(longe.walk.trail).toHaveLength(LIGHTHOUSE_WALK.trail)
    expect(longe.walk.trail.at(-1)).toBe(longe.walk.x)
    expect(isSceneState(longe)).toBe(true)
  })

  test('na ordem do jogo: primeiro move, depois o limite prende o personagem inteiro na tela', () => {
    const preso = play([LIMITE, SETA, ...quadros(120)])
    expect(preso.walk.x).toBe(lighthouseWalkMaxX())
    expect(lighthouseWalkMaxX()).toBe(LIGHTHOUSE_WALK.screen - LIGHTHOUSE_WALK.hero)
    const solto = play([SETA, ...quadros(120)])
    expect(solto.walk.x).toBe(LIGHTHOUSE_WALK.start + 360)
    // Ligar o limite com o personagem fora: o quadro seguinte o traz de volta, mesmo com a seta solta.
    const volta = play([SOLTA, LIMITE, QUADRO], solto)
    expect(volta.walk.x).toBe(lighthouseWalkMaxX())
  })

  test('Recomeçar volta ao começo e zera o quadro, mas mantém as escolhas e as descobertas', () => {
    const antes = play([{ type: 'walk-speed', speed: 1 }, LIMITE, SETA, ...quadros(5)])
    const depois = stepScene(start, antes, { type: 'restart-walk' })
    expect(depois.walk).toEqual({
      frame: 0,
      x: LIGHTHOUSE_WALK.start,
      arrow: true,
      speed: 1,
      keepInside: true,
      trail: [LIGHTHOUSE_WALK.start],
      idle: 0,
      run: 0,
    })
    expect(depois.evidence.discoveries).toEqual(antes.evidence.discoveries)
    expect(isSceneState(depois)).toBe(true)
  })

  test('o caso escolhe a velocidade e o limite, nunca onde o personagem parte', () => {
    // ⚠️ O Recomeçar volta ao começo de fábrica: um caso que abrisse noutro lugar (ou fora da tela)
    // não teria volta, e derrubaria `left-the-screen` sem a criança ver ninguém sair.
    expect(isSceneSetup({ actions: [{ type: 'advance', seconds: 1 }] }, 'lighthouse-walk')).toBe(
      false,
    )
    expect(isSceneSetup({ actions: [SETA] }, 'lighthouse-walk')).toBe(false)
    expect(isSceneSetup({ actions: [SOLTA] }, 'lighthouse-walk')).toBe(false)
    const caso = { actions: [{ type: 'walk-speed', speed: 1 } as const, LIMITE] }
    expect(isSceneSetup(caso, 'lighthouse-walk')).toBe(true)
    // A recusa é desta cena: o `advance` segue valendo no caso das outras.
    expect(isSceneSetup({ actions: [{ type: 'advance', seconds: 1 }] }, 'velocity')).toBe(true)
    const s = openScene({ ...start, setup: caso })
    expect(s.walk).toMatchObject({ x: LIGHTHOUSE_WALK.start, speed: 1, keepInside: true, frame: 0 })
    expect(s.evidence.discoveries).toEqual([])
  })

  test('hidrata retrato antigo sem o grupo novo e recusa grupo incoerente', () => {
    const velho = JSON.parse(JSON.stringify(openScene({ scene: 'lighthouse-key' })))
    delete velho.walk
    expect(isSceneState(hydrateSceneState(velho))).toBe(true)
    const torto = JSON.parse(JSON.stringify(openScene(start)))
    torto.walk.speed = 2
    expect(isSceneState(torto)).toBe(false)
    const rastro = JSON.parse(JSON.stringify(play([SETA, QUADRO])))
    rastro.walk.trail = [LIGHTHOUSE_WALK.start]
    expect(isSceneState(rastro)).toBe(false)
  })

  test('⚠️ recusa contadores que passam do quadro (retrato que o motor não alcança)', () => {
    const dois = play([SETA, QUADRO, QUADRO])
    expect(isSceneState(dois)).toBe(true)
    expect(dois.walk).toMatchObject({ frame: 2, run: 2, idle: 0 })
    const com = (walk: Partial<SceneState['walk']>) => ({
      ...dois,
      walk: { ...dois.walk, ...walk },
    })
    // Parado há mais quadros do que passaram.
    expect(isSceneState(com({ idle: 3 }))).toBe(false)
    // Subindo há mais quadros do que passaram.
    expect(isSceneState(com({ run: 3 }))).toBe(false)
    // Mais marcas do que quadros (mais a de partida).
    expect(isSceneState(com({ trail: [200, 205, 208, 211, 214] }))).toBe(false)
    // No limite, vale.
    expect(isSceneState(com({ idle: 2, run: 2, trail: [208, 211, 214] }))).toBe(true)
  })
})

describe('lighthouse-walk: cada meta cai com o que afirma, e não cai por engano', () => {
  test('still-without-arrow: um quadro com a seta solta e o x igual', () => {
    expect(
      viu(play([SOLTA, LIMITE, { type: 'walk-speed', speed: 1 }]), 'still-without-arrow'),
    ).toBe(false)
    expect(viu(play([QUADRO]), 'still-without-arrow')).toBe(true)
    // Com a seta segurada, não.
    expect(viu(play([SETA, ...quadros(3)]), 'still-without-arrow')).toBe(false)
    // O limite trazendo o personagem de volta MUDA o x: não é "ficou parado".
    const fora = play([SETA, ...quadros(100)])
    const puxado = play([SOLTA, LIMITE, QUADRO], fora)
    expect(puxado.walk.x).not.toBe(fora.walk.x)
    expect(viu(puxado, 'still-without-arrow')).toBe(false)
  })

  test('moves-each-frame: DOIS quadros seguidos com a seta e o x subindo', () => {
    expect(viu(play([SETA]), 'moves-each-frame')).toBe(false)
    // Um quadro só é um passo, não "a cada quadro".
    expect(viu(play([SETA, QUADRO]), 'moves-each-frame')).toBe(false)
    expect(viu(play([SETA, QUADRO, QUADRO]), 'moves-each-frame')).toBe(true)
    // Um quadro sem subir no meio quebra a sequência.
    expect(viu(play([SETA, QUADRO, SOLTA, QUADRO, SETA, QUADRO]), 'moves-each-frame')).toBe(false)
    // O Recomeçar leva o x para trás: a sequência recomeça.
    expect(viu(play([SETA, QUADRO, { type: 'restart-walk' }, QUADRO]), 'moves-each-frame')).toBe(
      false,
    )
    // Preso na borda pelo limite, ele não anda: a meta não cai ali (o retrato já na borda, sem
    // nenhuma descoberta, como a criança o teria depois de uma sessão salva).
    const naBorda = play([LIMITE, SETA, ...quadros(70)])
    const limpo: SceneState = {
      ...naBorda,
      walk: { ...naBorda.walk, run: 0 },
      evidence: { ...naBorda.evidence, discoveries: [] },
    }
    expect(limpo.walk.x).toBe(lighthouseWalkMaxX())
    const travado = play([QUADRO, QUADRO, QUADRO], limpo)
    expect(travado.walk.x).toBe(lighthouseWalkMaxX())
    expect(travado.walk.run).toBe(0)
    expect(viu(travado, 'moves-each-frame')).toBe(false)
    expect(viu(travado, 'stayed-inside')).toBe(true)
  })

  test('step-speed-3 e step-speed-1: o x aumentou EXATAMENTE a velocidade', () => {
    const tres = play([SETA, QUADRO])
    expect(viu(tres, 'step-speed-3')).toBe(true)
    expect(viu(tres, 'step-speed-1')).toBe(false)
    const um = play([{ type: 'walk-speed', speed: 1 }, SETA, QUADRO])
    expect(viu(um, 'step-speed-1')).toBe(true)
    expect(viu(um, 'step-speed-3')).toBe(false)
    // Só escolher a velocidade, sem quadro com a seta, não é ver o passo.
    expect(viu(play([{ type: 'walk-speed', speed: 1 }, ...quadros(3)]), 'step-speed-1')).toBe(false)
    // Com o limite cortando o passo (415 + 3 vira 416), o passo de 3 não aconteceu.
    const quase = play([
      LIMITE,
      { type: 'walk-speed', speed: 1 },
      SETA,
      ...quadros(lighthouseWalkMaxX() - 1 - LIGHTHOUSE_WALK.start),
    ])
    expect(quase.walk.x).toBe(lighthouseWalkMaxX() - 1)
    expect(viu(quase, 'step-speed-1')).toBe(true)
    const cortado = play([{ type: 'walk-speed', speed: 3 }, QUADRO], quase)
    expect(cortado.walk.x).toBe(lighthouseWalkMaxX())
    expect(viu(cortado, 'step-speed-3')).toBe(false)
  })

  test('left-the-screen: sem o limite, só quando METADE da caixa passou da borda', () => {
    // 2 da caixa para fora é margem transparente do desenho: ainda não "saiu".
    const encostando = play([SETA, ...quadros(70)])
    expect(encostando.walk.x + LIGHTHOUSE_WALK.hero).toBeGreaterThan(LIGHTHOUSE_WALK.screen)
    expect(viu(encostando, 'left-the-screen')).toBe(false)
    const saindo = play([SETA, ...quadros(80)])
    expect(saindo.walk.x).toBe(
      LIGHTHOUSE_WALK.screen - LIGHTHOUSE_WALK.hero + LIGHTHOUSE_WALK.outSeen,
    )
    expect(viu(saindo, 'left-the-screen')).toBe(true)
    // Com o limite, nunca.
    expect(viu(play([LIMITE, SETA, ...quadros(200)]), 'left-the-screen')).toBe(false)
  })

  test('left-the-screen pede a TRAVESSIA no quadro, e não o estado de estar fora', () => {
    // Um retrato que já abre fora da tela (sem descobertas): mais quadros não derrubam a meta,
    // porque ninguém viu o personagem passar da borda.
    const fora = play([SETA, ...quadros(100)])
    const limpo: SceneState = { ...fora, evidence: { ...fora.evidence, discoveries: [] } }
    expect(limpo.walk.x).toBeGreaterThan(lighthouseWalkOutSeenX())
    expect(viu(play(quadros(20), limpo), 'left-the-screen')).toBe(false)
    // Voltando para dentro e saindo de novo, cai.
    const volta = play([LIMITE, QUADRO, { type: 'keep-on-screen', enabled: false }], limpo)
    expect(viu(volta, 'left-the-screen')).toBe(false)
    expect(viu(play(quadros(15), volta), 'left-the-screen')).toBe(true)
  })

  test('stayed-inside: com o limite, o personagem JÁ na borda e mais um quadro com a seta', () => {
    // Chegar à borda não basta: é o quadro SEGUINTE, com ele tentando andar, que mostra o limite.
    const chegou = play([LIMITE, SETA, ...quadros(70)])
    expect(chegou.walk.x).toBe(lighthouseWalkMaxX())
    expect(viu(chegou, 'stayed-inside')).toBe(false)
    const ficou = stepScene(start, chegou, QUADRO)
    expect(ficou.walk.x).toBe(lighthouseWalkMaxX())
    expect(viu(ficou, 'stayed-inside')).toBe(true)
    // Na borda com a seta solta, o limite não segurou nada.
    expect(viu(play([SOLTA, ...quadros(3)], chegou), 'stayed-inside')).toBe(false)
    // Sem o limite, não.
    expect(viu(play([SETA, ...quadros(200)]), 'stayed-inside')).toBe(false)
  })

  test('cada caso conclui com o seu par, e o par de outro caso não conclui ninguém', () => {
    const andar = play([QUADRO, SETA, QUADRO, QUADRO])
    const velocidade = play([SETA, QUADRO, { type: 'walk-speed', speed: 1 }, QUADRO])
    const limite = play([SETA, ...quadros(90), LIMITE, { type: 'restart-walk' }, ...quadros(71)])
    const passou = (s: SceneState, alvo: readonly string[]) =>
      evaluateExperimentation('lighthouse-walk', s, true, undefined, alvo).passed
    expect(passou(andar, CASOS.andar)).toBe(true)
    expect(passou(velocidade, CASOS.velocidade)).toBe(true)
    expect(passou(limite, CASOS.limite)).toBe(true)
    expect(passou(play([SETA, QUADRO]), CASOS.velocidade)).toBe(false)
    expect(passou(play([SETA, ...quadros(90)]), CASOS.limite)).toBe(false)
    expect(passou(play([QUADRO]), CASOS.andar)).toBe(false)
    expect(passou(play([QUADRO, SETA, QUADRO]), CASOS.andar)).toBe(false)
  })
})

describe('lighthouse-walk: o Rodar para sozinho', () => {
  const tique = (antes: SceneState) => {
    const depois = stepScene(start, antes, { type: 'advance', seconds: 0.04 })
    return { depois, parou: sceneClockShouldStop('lighthouse-walk', antes, depois) }
  }
  const rodar = (s: SceneState, maxTiques = 500) => {
    let estado = s
    for (let i = 0; i < maxTiques; i++) {
      const { depois, parou } = tique(estado)
      estado = depois
      if (parou) return { estado, tiques: i + 1 }
    }
    return { estado, tiques: Number.POSITIVE_INFINITY }
  }

  test('sem o limite, para quando o personagem sai INTEIRO da tela', () => {
    const { estado, tiques } = rodar(play([SETA]))
    expect(estado.walk.x).toBeGreaterThanOrEqual(LIGHTHOUSE_WALK.screen)
    expect(lighthouseWalkOut(estado)).toBe(true)
    expect(sceneClockReachedStop('lighthouse-walk', estado)).toBe(true)
    // Três segundos e pouco de Rodar, como a instrução promete ("poucos segundos").
    expect(tiques * 0.04).toBeGreaterThan(2.5)
    expect(tiques * 0.04).toBeLessThan(3.5)
    // Com o limite ligado depois, ainda há o que ver: o próximo quadro o traz de volta.
    expect(lighthouseWalkOut(stepScene(start, estado, LIMITE))).toBe(false)
  })

  test('com o x parado (seta solta, ou o limite na borda), para a cada 2 s, e Rodar de novo roda mais 2 s', () => {
    const parado = rodar(openScene(start))
    expect(parado.estado.walk.frame).toBe(LIGHTHOUSE_WALK.idleStop)
    expect(parado.estado.walk.x).toBe(LIGHTHOUSE_WALK.start)
    const deNovo = rodar(parado.estado)
    expect(deNovo.estado.walk.frame).toBe(LIGHTHOUSE_WALK.idleStop * 2)
    const naBorda = rodar(play([LIMITE, SETA]))
    expect(naBorda.estado.walk.x).toBe(lighthouseWalkMaxX())
    expect(viu(naBorda.estado, 'stayed-inside')).toBe(true)
    expect(naBorda.estado.walk.idle).toBe(LIGHTHOUSE_WALK.idleStop)
  })

  test('ligar a seta no meio da espera recomeça a conta', () => {
    const quase = play(quadros(LIGHTHOUSE_WALK.idleStop - 5))
    const ligada = stepScene(start, quase, SETA)
    expect(ligada.walk.idle).toBe(0)
    expect(tique(ligada).parou).toBe(false)
  })
})

describe('lighthouse-walk: o modelo e os três usos do Dia 1', () => {
  test('título, grupo, missão de fábrica (o andar) e as metas só do caso', () => {
    const m = sceneModel('lighthouse-walk')
    expect(m.title).toBe('Como o personagem anda')
    expect(m.group).toBe('motion')
    expect(sceneDefaultGoalIds('lighthouse-walk')).toEqual([...CASOS.andar])
    expect(sceneGoalIds('lighthouse-walk')).toEqual([
      ...CASOS.andar,
      ...CASOS.velocidade,
      ...CASOS.limite,
    ])
    const rotulos = Object.fromEntries(m.goals.map((g) => [g.id, g.label]))
    expect(rotulos).toEqual({
      'still-without-arrow': 'Sem a seta, o sprite ficou parado',
      'moves-each-frame': 'Com a seta, o sprite andou a cada quadro',
      'step-speed-3': 'Com velocidade 3, ele andou 3 a cada quadro',
      'step-speed-1': 'Com velocidade 1, ele andou 1 a cada quadro',
      'left-the-screen': 'Sem o limite, o sprite saiu da tela',
      'stayed-inside': 'Com o limite, o sprite ficou inteiro na tela',
    })
  })

  test('⚠️ o pedido diz o gesto com o nome do botão, e nunca o resultado', () => {
    const RESULTADO = /parad|andou|saiu|ficou|inteiro|fora da tela|passou/i
    const BOTOES = [
      'Segurar a seta para a direita',
      'Avançar 1 quadro',
      'Rodar',
      'Velocidade 1',
      'Velocidade 3',
      'Manter dentro da tela',
      'Recomeçar',
    ]
    for (const g of sceneModel('lighthouse-walk').goals) {
      expect(g.pedido, g.id).not.toMatch(RESULTADO)
      expect(
        BOTOES.some((b) => g.pedido.includes(b)),
        g.id,
      ).toBe(true)
    }
  })

  test('cada caso tem a sua frase de sucesso', () => {
    const geral = sceneModel('lighthouse-walk').success
    expect(sceneSuccess('lighthouse-walk', undefined, CASOS.velocidade)).toContain('velocidade')
    expect(sceneSuccess('lighthouse-walk', undefined, CASOS.velocidade)).not.toBe(geral)
    expect(sceneSuccess('lighthouse-walk', undefined, CASOS.limite)).toContain(
      'Manter dentro da tela',
    )
  })

  test('⚠️⚠️ os três blocos do Dia 1 são válidos, no bloco e no manifesto', () => {
    const blocos = Object.entries(CASOS).map(([chave, goals]) => ({
      key: `experiencia-${chave}`,
      content: {
        kind: 'interactive' as const,
        required: true,
        title: 'Como o personagem anda',
        semPerguntaFinal: true as const,
        instructions: 'Avance os quadros e olhe o x.',
        hints: [],
        activity: {
          type: 'experimentation' as const,
          scene: 'lighthouse-walk' as const,
          cenario: 'farol' as const,
          setup: { goals: [...goals] },
        },
      },
    }))
    for (const { content } of blocos) {
      expect(isSceneSetup(content.activity.setup, 'lighthouse-walk')).toBe(true)
      expect(isExperimentationActivity(content.activity)).toBe(true)
      expect(isInteractiveBlock(content)).toBe(true)
      expect(sceneTargets(content.activity)).toEqual(content.activity.setup.goals)
      expect(
        sceneGoals(
          'lighthouse-walk',
          openScene(start),
          undefined,
          content.activity.setup.goals,
        ).map((g) => g.id),
      ).toEqual(content.activity.setup.goals)
    }
    const manifesto = {
      version: 5,
      courseSlug: 'desafio-primeiro-jogo',
      lessonSlug: 'dia-1',
      title: 'Dia 1',
      blocks: blocos,
      sections: blocos.map((b) => ({
        key: b.key.replace('experiencia-', ''),
        title: b.content.title,
        intent: 'exploration',
        objective: '',
        blockKeys: [b.key],
        workspaceKey: null,
        externalTool: null,
        pendingMedia: [],
        completion: { version: 1, blockIds: [b.key] },
      })),
    }
    expect(isLearningManifest(manifesto)).toBe(true)
    // Meta de outra cena recusa o caso (a régua estrita de quem publica).
    expect(isSceneSetup({ goals: ['locked-without-key'] }, 'lighthouse-walk')).toBe(false)
  })

  test('a faixa mostra quadro, x e velocidade; a frase não diz se ele anda ou fica parado', () => {
    const s = play([{ type: 'walk-speed', speed: 1 }, SETA, ...quadros(2)])
    expect(sceneReadout('lighthouse-walk', s).map((l) => [l.label, l.value])).toEqual([
      ['quadro', '2'],
      ['x', String(LIGHTHOUSE_WALK.start + 2)],
      ['velocidade', '1'],
    ])
    const aberta = sceneSituation('lighthouse-walk', openScene(start))
    expect(aberta).toBe('No quadro 0, o x é 208. A seta para a direita está solta.')
    expect(aberta).not.toMatch(/personagem|nave/i)
    expect(aberta).not.toMatch(/parad|anda/i)
    expect(sceneSituation('lighthouse-walk', play([SETA, ...quadros(100)]))).toContain(
      'passou inteiro da borda da tela',
    )
  })
})
