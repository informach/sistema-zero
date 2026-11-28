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
import { LivreBossHealth, proximoGestoDoChefao } from '../src/components/scene-livre/boss-health'

/**
 * O chefão com resistência (Poder "Chefão com resistência" do Construtor, Nave contra Asteroides,
 * 28/11/2026): só a ideia, sem bloco nem Se; cada linha de "Um chefão que aguenta vários lasers" só
 * aparece depois do teste dela; o destaque é o gesto da fala do Zappy.
 */
const activity: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'boss-health',
  cast: { hero: { name: 'nave', gender: 'f' }, obstacle: { name: 'chefão', gender: 'm' } },
  cenario: 'nave',
  setup: {
    freeExploration: true,
    goals: ['one-not-enough', 'count-down', 'falls-at-zero', 'falls-once'],
  },
}
const start = sceneStart(activity)
const play = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const DISPARAR: SceneAction = { type: 'boss-fire' }
const GUARDA = (on: boolean): SceneAction => ({ type: 'boss-guard', on })
const QUADRO: SceneAction = { type: 'boss-frame' }
const RECOMECAR: SceneAction = { type: 'boss-restart' }
const lasers = (n: number) => Array.from({ length: n }, () => DISPARAR)
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
      <LivreBossHealth />
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const destaques = (html: string) =>
  [...html.matchAll(/data-tom="gesto"[^>]*>(.*?)<\/button>/g)].map((m) => texto(m[1] ?? '').trim())
const TUDO = [...lasers(5), QUADRO, GUARDA(true), ...lasers(5), QUADRO]

describe('o chefão com resistência', () => {
  test('abre com o chefão inteiro e os controles com os nomes da aula', () => {
    const html = tela(openScene(start))
    const lido = texto(html)
    expect(lido).toContain('A resistência do chefão')
    expect(lido).toContain('Vida do chefão 5')
    expect(lido).toContain('Placar 0')
    expect(lido).toContain('Guarda do prêmio Desligada')
    for (const rotulo of [
      'Disparar',
      'Guarda do prêmio',
      'Ligada',
      'Desligada',
      'Avançar um quadro',
      'Recomeçar a partida',
    ])
      expect(lido).toContain(rotulo)
    expect(lido).toContain('0 de 4 descobertas')
    expect(destaques(html)).toEqual(['Disparar'])
    expect(html).toMatch(/aria-pressed="true"[^>]*>Desligada/)
    // Sem nada para recomeçar, o botão fica fechado.
    expect(html).toMatch(/aria-disabled="true"[^>]*>(?:<[^>]+>)*[^<]*Recomeçar a partida/)
    expect(html).toContain('data-chefao="5"')
    expect(html).toContain('data-barra-de-vida="5"')
    // O chefão do elenco é um asteroide gigante, nunca o cacto do papel.
    expect(html).toContain('data-figure="asteroide"')
    expect(html).not.toContain('data-figure="cacto"')
  })

  test('a barra, o laser, a queda e o placar no palco', () => {
    const um = tela(play([DISPARAR]))
    expect(um).toContain('data-barra-de-vida="4"')
    expect(um.match(/data-gomo="cheio"/g)?.length).toBe(4)
    expect(um).toContain('data-laser-acertou')
    const caiu = tela(play(lasers(5)))
    expect(caiu).toContain('data-chefao="caiu"')
    expect(texto(caiu)).toContain('Placar 10')
    expect(caiu).toMatch(/aria-disabled="true"[^>]*>(?:<[^>]+>)*[^<]*Disparar/)
    // Sem a guarda, o placar sobe a cada quadro; com a guarda, fica.
    expect(texto(tela(play([...lasers(5), QUADRO, QUADRO])))).toContain('Placar 30')
    expect(texto(tela(play([GUARDA(true), ...lasers(5), QUADRO, QUADRO])))).toContain('Placar 10')
  })

  test('⚠️⚠️ só a ideia: nenhum bloco, Se, então, senão, variável nem código', () => {
    for (const s of [openScene(start), play([DISPARAR]), play(lasers(5)), play(TUDO)]) {
      const lido = texto(tela(s))
      expect(lido).not.toMatch(/\bbloco|\bregra\b|\bentão\b|\bsenão\b|\bSe\b|variável|código/)
    }
  })

  test('cada caso de "Um chefão que aguenta vários lasers" só se revela depois de testado', () => {
    const inicio = texto(tela(openScene(start)))
    expect(inicio).toContain('Um chefão que aguenta vários lasers')
    expect(inicio.match(/Teste para descobrir/g)?.length).toBe(4)
    expect(inicio).not.toMatch(/continuou lá|desceu 1|ganhou 10|uma vez só/)
    const um = texto(tela(play([DISPARAR])))
    expect(um).toContain('A vida foi de 5 para 4, e o chefão continuou lá')
    expect(um.match(/Teste para descobrir/g)?.length).toBe(3)
    const fim = texto(tela(play(TUDO)))
    expect(fim).not.toContain('Teste para descobrir')
    expect(fim).toContain('4 de 4 descobertas')
  })

  test('o destaque segue a fala', () => {
    expect(destaques(tela(play([DISPARAR])))).toEqual(['Disparar'])
    // Caído sem a guarda: avançar um quadro.
    expect(destaques(tela(play(lasers(5))))).toEqual(['Avançar um quadro'])
    // Visto o placar sem a guarda: ligar a guarda; com ela ligada, disparar até a queda.
    expect(destaques(tela(play([...lasers(5), QUADRO])))).toEqual(['Ligada'])
    expect(destaques(tela(play([...lasers(5), QUADRO, GUARDA(true)])))).toEqual(['Disparar'])
    expect(destaques(tela(play(TUDO)))).toEqual([])
  })

  test('a régua do destaque, sem a tela', () => {
    const b = openScene(start).bossHealth
    expect(proximoGestoDoChefao('boss-health-complete', b)).toBeNull()
    expect(proximoGestoDoChefao('boss-health-over', b)).toBe('recomecar')
    expect(proximoGestoDoChefao('boss-health-ask-one', { ...b, life: 3 })).toBe('recomecar')
    expect(proximoGestoDoChefao('boss-health-ask-count', { ...b, life: 0 })).toBe('recomecar')
    expect(
      proximoGestoDoChefao('boss-health-ask-once', { ...b, guard: true, seenGuarded: true }),
    ).toBe('desligada')
    expect(proximoGestoDoChefao('boss-health-ask-once', { ...b, life: 0, framesAfter: 20 })).toBe(
      'recomecar',
    )
    expect(play([...lasers(2), RECOMECAR]).bossHealth.life).toBe(5)
  })
})

describe('a cena entra pela tela livre', () => {
  test('o bloco com exploração livre abre o chefão com resistência', () => {
    const content = publicInteractiveBlock({
      kind: 'interactive',
      required: true,
      semPerguntaFinal: true,
      title: 'A resistência do chefão',
      instructions: 'Teste o chefão.',
      hints: [],
      activity,
    })
    const html = renderToStaticMarkup(
      <SceneActivityView
        block={{ id: 'experiencia-chefao', kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={activity}
      />,
    )
    expect(html).toContain('Avançar um quadro')
  })
})
