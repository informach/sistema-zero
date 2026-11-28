import { describe, expect, test } from 'bun:test'
import { publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  discoveryGuidance,
  type ExperimentationActivity,
  openScene,
  type SceneAction,
  type SceneState,
  sceneStart,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { SceneActivityView } from '../src/components/scene-activity'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { LivreEnemyFire, proximoGestoDoInimigo } from '../src/components/scene-livre/enemy-fire'

/**
 * O inimigo que atira (Poder "Inimigo que atira" do Construtor, Nave contra Asteroides,
 * 28/11/2026): só a ideia, sem bloco nem Se; cada linha de "Um inimigo com tiros próprios" só
 * aparece depois do teste dela; o destaque é o gesto da fala do Zappy.
 */
const activity: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'enemy-fire',
  cenario: 'nave',
  setup: {
    freeExploration: true,
    goals: ['fixed-origin', 'enemy-origin', 'shot-hurts', 'restart-clears'],
  },
}
const start = sceneStart(activity)
const play = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const ORIGEM = (origin: 'middle' | 'enemy'): SceneAction => ({ type: 'enemy-origin', origin })
const NAVE = (x: 200 | 400 | 600): SceneAction => ({ type: 'enemy-ship', x })
const MEIO_SEGUNDO: SceneAction = { type: 'enemy-tick' }
const PROXIMO: SceneAction = { type: 'enemy-next-shot' }
const RECOMECAR: SceneAction = { type: 'enemy-restart' }
const tela = (state: SceneState) =>
  renderToStaticMarkup(
    <DiscoveryContext.Provider
      value={{
        activity,
        state,
        dispatch: () => {},
        running: false,
        setRunning: () => {},
        tick: () => {},
        instruction: discoveryGuidance(activity, state).text,
        dialogue: (text) => <p>{text}</p>,
        tools: null,
      }}
    >
      <LivreEnemyFire />
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const destaques = (html: string) =>
  [...html.matchAll(/data-tom="gesto"[^>]*>(.*?)<\/button>/g)].map((m) => texto(m[1] ?? '').trim())
const DOIS_DO_MEIO = [PROXIMO, PROXIMO]
const DOIS_DA_INIMIGA = [ORIGEM('enemy'), PROXIMO, PROXIMO]
const TUDO = [...DOIS_DO_MEIO, ...DOIS_DA_INIMIGA, RECOMECAR]

describe('o inimigo que atira', () => {
  test('abre com a nave no meio, três vidas e os controles com os nomes da aula', () => {
    const html = tela(openScene(start))
    const lido = texto(html)
    expect(lido).toContain('A inimiga que atira')
    expect(lido).toContain('Tiros no ar 0')
    expect(lido).toContain('Vidas 3')
    expect(lido).toContain('Origem no meio')
    expect(lido).toContain('Tempo 0 s')
    for (const rotulo of [
      'Origem do tiro',
      'No meio',
      'Na inimiga',
      'Nave à esquerda',
      'Nave no meio',
      'Nave à direita',
      'Avançar meio segundo',
      'Avançar até o próximo tiro',
      'Recomeçar a partida',
    ])
      expect(lido).toContain(rotulo)
    expect(lido).toContain(
      'A inimiga atira a cada um segundo e meio. Cada tiro desce até sair da tela ou encostar na nave.',
    )
    expect(lido).toContain('0 de 4 descobertas')
    expect(destaques(html)).toEqual(['Avançar até o próximo tiro'])
    expect(html).toMatch(/aria-pressed="true"[^>]*>No meio/)
    expect(html).toMatch(/aria-pressed="true"[^>]*>Nave no meio/)
    // Sem nada para recomeçar, o botão fica fechado.
    expect(html).toMatch(/aria-disabled="true"[^>]*>(?:<[^>]+>)*[^<]*Recomeçar a partida/)
    expect(html).not.toContain('data-tiro-inimigo')
    expect(html).toContain('data-inimiga="300"')
    expect(html).toContain('data-origem="meio"')
  })

  test('os tiros no palco nascem na origem escolhida', () => {
    const meio = tela(play(DOIS_DO_MEIO))
    expect(meio.match(/data-tiro-inimigo="middle"/g)?.length).toBe(2)
    expect(meio).toContain('data-inimiga="300"')
    expect(texto(meio)).toContain('Tempo 3 s')
    const inimiga = tela(play([ORIGEM('enemy'), PROXIMO]))
    expect(inimiga).toContain('data-tiro-inimigo="enemy"')
    expect(inimiga).toContain('data-origem="inimiga"')
    // O tiro que encosta: o anel na nave e uma vida a menos.
    const encostou = tela(play([...DOIS_DO_MEIO, MEIO_SEGUNDO]))
    expect(encostou).toContain('data-encostou')
    expect(texto(encostou)).toContain('Vidas 2')
    // Sem vidas, a partida acaba: o tempo fecha e o recomeço é o destaque.
    const fim = tela(play([...DOIS_DO_MEIO, ...Array.from({ length: 7 }, () => MEIO_SEGUNDO)]))
    expect(texto(fim)).toContain('Fim da partida')
    expect(fim).toMatch(/aria-disabled="true"[^>]*>(?:<[^>]+>)*[^<]*Avançar meio segundo/)
    expect(destaques(fim)).toEqual(['Recomeçar a partida'])
  })

  test('⚠️⚠️ só a ideia: nenhum bloco, Se, então, senão, variável nem código', () => {
    for (const s of [
      openScene(start),
      play(DOIS_DO_MEIO),
      play([...DOIS_DO_MEIO, PROXIMO]),
      play(TUDO),
    ]) {
      const lido = texto(tela(s))
      expect(lido).not.toMatch(/\bbloco|\bregra\b|\bentão\b|\bsenão\b|\bSe\b|variável|código/)
    }
  })

  test('cada caso de "Um inimigo com tiros próprios" só se revela depois de testado', () => {
    const inicio = texto(tela(openScene(start)))
    expect(inicio).toContain('Um inimigo com tiros próprios')
    expect(inicio.match(/Teste para descobrir/g)?.length).toBe(4)
    expect(inicio).not.toMatch(/mesmo lugar|onde a inimiga estava|perdeu uma vida|voltaram a 3/)
    const fixa = texto(tela(play(DOIS_DO_MEIO)))
    expect(fixa).toContain('Todo tiro saiu do mesmo lugar')
    expect(fixa.match(/Teste para descobrir/g)?.length).toBe(3)
    expect(fixa).not.toContain('onde a inimiga estava')
    const fim = texto(tela(play(TUDO)))
    expect(fim).not.toContain('Teste para descobrir')
    expect(fim).toContain('4 de 4 descobertas')
  })

  test('o destaque segue a fala', () => {
    // Visto o lugar fixo: trocar a origem para Na inimiga.
    expect(destaques(tela(play(DOIS_DO_MEIO)))).toEqual(['Na inimiga'])
    expect(destaques(tela(play([...DOIS_DO_MEIO, ORIGEM('enemy')])))).toEqual([
      'Avançar até o próximo tiro',
    ])
    // Começou pela origem Na inimiga: voltar ao No meio.
    expect(destaques(tela(play([ORIGEM('enemy')])))).toEqual(['No meio'])
    // As duas origens vistas com a nave longe dos tiros: levar a nave para baixo de um tiro.
    const fora = play([NAVE(200), ...DOIS_DO_MEIO, ...DOIS_DA_INIMIGA])
    expect(destaques(tela(fora))).toEqual(['Nave no meio'])
    // Com tiros no ar e o encosto visto: recomeçar.
    expect(destaques(tela(play([...DOIS_DO_MEIO, ...DOIS_DA_INIMIGA])))).toEqual([
      'Recomeçar a partida',
    ])
    expect(destaques(tela(play(TUDO)))).toEqual([])
  })

  test('a régua do destaque, sem a tela', () => {
    const f = openScene(start).enemyFire
    expect(proximoGestoDoInimigo('enemy-fire-complete', f)).toBeNull()
    expect(proximoGestoDoInimigo('enemy-fire-over', f)).toBe('recomecar')
    expect(proximoGestoDoInimigo('enemy-fire-hurts-then-over', f)).toBe('recomecar')
    expect(proximoGestoDoInimigo('enemy-fire-ask-hurts', f)).toBe('proximo-tiro')
    expect(
      proximoGestoDoInimigo('enemy-fire-ask-hurts', {
        ...f,
        shots: [{ x: 400, y: 150, origin: 'middle', from: 600 }],
      }),
    ).toBe('meio-segundo')
    expect(
      proximoGestoDoInimigo('enemy-fire-ask-hurts', {
        ...f,
        shots: [{ x: 600, y: 150, origin: 'enemy', from: 600 }],
      }),
    ).toBe(600)
    expect(proximoGestoDoInimigo('enemy-fire-ask-restart', f)).toBe('proximo-tiro')
  })
})

describe('a cena entra pela tela livre', () => {
  test('o bloco com exploração livre abre o inimigo que atira', () => {
    const content = publicInteractiveBlock({
      kind: 'interactive',
      required: true,
      semPerguntaFinal: true,
      title: 'A inimiga que atira',
      instructions: 'Teste a inimiga.',
      hints: [],
      activity,
    })
    const html = renderToStaticMarkup(
      <SceneActivityView
        block={{ id: 'experiencia-inimigo', kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={activity}
      />,
    )
    expect(html).toContain('Avançar até o próximo tiro')
  })
})
