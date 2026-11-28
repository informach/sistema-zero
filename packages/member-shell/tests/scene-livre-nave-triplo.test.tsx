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
import { LivreSpreadShot, proximoGestoDoTiro } from '../src/components/scene-livre/spread-shot'

/**
 * O tiro triplo (Poder "Tiro triplo" do Construtor, Nave contra Asteroides, 28/11/2026): só a
 * ideia, sem bloco nem Se; cada linha de "Um tiro, três caminhos" só aparece depois do teste dela; o
 * destaque é o gesto da fala do Zappy.
 */
const activity: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'spread-shot',
  cenario: 'nave',
  setup: {
    freeExploration: true,
    goals: ['single-one', 'triple-stacked', 'triple-spread', 'deviation-matters'],
  },
}
const start = sceneStart(activity)
const play = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const TRIPLO = (on: boolean): SceneAction => ({ type: 'spread-triple', on })
const DESVIO = (deviation: 0 | 1 | 2): SceneAction => ({ type: 'spread-deviation', deviation })
const DISPARAR: SceneAction = { type: 'spread-fire' }
const CHEGAREM: SceneAction = { type: 'spread-arrive' }
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
      <LivreSpreadShot />
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const destaques = (html: string) =>
  [...html.matchAll(/data-tom="gesto"[^>]*>(.*?)<\/button>/g)].map((m) => texto(m[1] ?? '').trim())
const SIMPLES = [DISPARAR, CHEGAREM]
const JUNTOS = [TRIPLO(true), DISPARAR, CHEGAREM]
const LEQUE = [DESVIO(2), DISPARAR, CHEGAREM]
const ENTRE = [DESVIO(1), DISPARAR, CHEGAREM]
const TUDO = [...SIMPLES, ...JUNTOS, ...LEQUE, ...ENTRE]

describe('o tiro triplo', () => {
  test('abre com o tiro simples, as três pedras e os controles com os nomes da aula', () => {
    const html = tela(openScene(start))
    const lido = texto(html)
    expect(lido).toContain('O leque de tiros')
    expect(lido).toContain('Lasers no ar 0')
    expect(lido).toContain('Pedras acertadas 0')
    expect(lido).toContain('Desvio 0')
    expect(lido).toContain('Tiro triplo desligado')
    for (const rotulo of [
      'Tiro triplo',
      'Desvio 0',
      'Desvio 1',
      'Desvio 2',
      'Disparar',
      'Ver os lasers chegarem',
      'Voltar ao começo',
    ])
      expect(lido).toContain(rotulo)
    expect(lido).toContain(
      'Cada laser anda 7 para cima a cada quadro. O desvio é o quanto os lasers dos lados andam para o lado.',
    )
    expect(lido).toContain('0 de 4 descobertas')
    expect(destaques(html)).toEqual(['Disparar'])
    // O Tiro triplo é um interruptor, e o desvio, uma escolha.
    expect(html).toMatch(/aria-pressed="false"[^>]*>(?:<[^>]+>)*[^<]*Tiro triplo/)
    expect(html).toMatch(/aria-pressed="true"[^>]*>Desvio 0/)
    expect(html).not.toContain('data-laser-no-ar')
    expect(html).not.toContain('data-caminho')
  })

  test('os lasers no ar e o caminho de cada laser depois de chegar', () => {
    const noAr = tela(play([TRIPLO(true), DESVIO(2), DISPARAR]))
    expect(noAr.match(/data-laser-no-ar=/g)?.length).toBe(3)
    expect(texto(noAr)).toContain('Lasers no ar 3')
    // Uma rajada de cada vez: o Disparar fecha até os lasers chegarem.
    expect(noAr).toMatch(/aria-disabled="true"[^>]*>(?:<[^>]+>)*[^<]*Disparar/)
    expect(destaques(noAr)).toEqual(['Ver os lasers chegarem'])
    const chegou = tela(play([TRIPLO(true), ...LEQUE]))
    expect(chegou).not.toContain('data-laser-no-ar')
    for (const caminho of ['pedra-0', 'pedra-1', 'pedra-2'])
      expect(chegou).toContain(`data-caminho="${caminho}"`)
    expect(texto(chegou)).toContain('Pedras acertadas 3')
    const entre = tela(play([TRIPLO(true), ...ENTRE]))
    expect(entre.match(/data-caminho="saiu"/g)?.length).toBe(2)
    expect(entre).toContain('data-caminho="pedra-1"')
    // Sem lasers no ar, "Ver os lasers chegarem" fica fechado.
    expect(tela(openScene(start))).toMatch(
      /aria-disabled="true"[^>]*>(?:<[^>]+>)*[^<]*Ver os lasers chegarem/,
    )
  })

  test('⚠️⚠️ só a ideia: nenhum bloco, Se, então, senão, variável nem código', () => {
    for (const s of [openScene(start), play(SIMPLES), play([...SIMPLES, DISPARAR]), play(TUDO)]) {
      const lido = texto(tela(s))
      expect(lido).not.toMatch(/\bbloco|\bregra\b|\bentão\b|\bsenão\b|\bSe\b|variável|código/)
    }
  })

  test('cada caso de "Um tiro, três caminhos" só se revela depois de testado', () => {
    const inicio = texto(tela(openScene(start)))
    expect(inicio).toContain('Um tiro, três caminhos')
    expect(inicio.match(/Teste para descobrir/g)?.length).toBe(4)
    expect(inicio).not.toMatch(/um laser só|pareciam um só|em leque|entre as pedras/)
    const simples = texto(tela(play(SIMPLES)))
    expect(simples).toContain('Saiu um laser só, reto até a pedra do meio')
    expect(simples.match(/Teste para descobrir/g)?.length).toBe(3)
    expect(simples).not.toContain('pareciam um só')
    const fim = texto(tela(play(TUDO)))
    expect(fim).not.toContain('Teste para descobrir')
    expect(fim).toContain('4 de 4 descobertas')
  })

  test('o destaque segue a fala', () => {
    // Depois do tiro simples, a fala convida ao Tiro triplo com Desvio 0.
    expect(destaques(tela(play(SIMPLES)))).toEqual(['Tiro triplo'])
    expect(destaques(tela(play([...SIMPLES, TRIPLO(true)])))).toEqual(['Disparar'])
    // Visto o Desvio 0: escolher o Desvio 2.
    expect(destaques(tela(play([...SIMPLES, ...JUNTOS])))).toEqual(['Desvio 2'])
    // Visto o leque: o Desvio 1.
    expect(destaques(tela(play([...SIMPLES, ...JUNTOS, ...LEQUE])))).toEqual(['Desvio 1'])
    // Começou pelo Tiro triplo: desligar para o tiro simples.
    expect(destaques(tela(play(JUNTOS)))).toEqual(['Tiro triplo'])
    // Tudo visto: nada em destaque.
    expect(destaques(tela(play(TUDO)))).toEqual([])
  })

  test('a régua do destaque, sem a tela', () => {
    const sp = openScene(start).spreadShot
    expect(proximoGestoDoTiro('spread-shot-complete', sp)).toBeNull()
    expect(proximoGestoDoTiro('spread-shot-start', { ...sp, triple: true })).toBe('triplo')
    expect(proximoGestoDoTiro('spread-shot-ask-spread', { ...sp, triple: true })).toBe(2)
    expect(
      proximoGestoDoTiro('spread-shot-stacked-then-matters', {
        ...sp,
        triple: true,
        deviation: 1,
      }),
    ).toBe('disparar')
    expect(
      proximoGestoDoTiro('spread-shot-in-air', {
        ...sp,
        lasers: [{ x: 400, y: 440, vx: 0 }],
      }),
    ).toBe('chegar')
  })
})

describe('a cena entra pela tela livre', () => {
  test('o bloco com exploração livre abre o tiro triplo', () => {
    const content = publicInteractiveBlock({
      kind: 'interactive',
      required: true,
      semPerguntaFinal: true,
      title: 'O leque de tiros',
      instructions: 'Teste o tiro triplo.',
      hints: [],
      activity,
    })
    const html = renderToStaticMarkup(
      <SceneActivityView
        block={{ id: 'experiencia-tiro-triplo', kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={activity}
      />,
    )
    expect(html).toContain('Ver os lasers chegarem')
  })
})
