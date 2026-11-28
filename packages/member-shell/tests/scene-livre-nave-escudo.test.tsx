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
import { LivreTimedShield, proximoGestoDoEscudo } from '../src/components/scene-livre/timed-shield'

/**
 * O escudo temporário (Poder "Escudo temporário" do Construtor, Nave contra Asteroides, 28/11/2026):
 * só a ideia, sem bloco nem Se; cada linha de "O escudo com prazo" só aparece depois do teste dela; o
 * destaque é o gesto da fala do Zappy.
 */
const activity: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'timed-shield',
  cenario: 'nave',
  setup: {
    freeExploration: true,
    goals: ['hit-costs', 'shield-protects', 'shield-ends', 'shield-renews'],
  },
}
const start = sceneStart(activity)
const play = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const PEGAR: SceneAction = { type: 'pick-shield' }
const SEGUNDO: SceneAction = { type: 'tick-second' }
const PEDRA: SceneAction = { type: 'next-rock' }
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
      <LivreTimedShield />
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const destaques = (html: string) =>
  [...html.matchAll(/data-tom="gesto"[^>]*>(.*?)<\/button>/g)].map((m) => texto(m[1] ?? '').trim())
const TUDO = [PEDRA, PEGAR, PEDRA, SEGUNDO, SEGUNDO, PEDRA, PEGAR, SEGUNDO, PEGAR]

describe('o escudo temporário', () => {
  test('abre no segundo 0, com 3 vidas e o Escudo em 0, e os quatro botões', () => {
    const html = tela(openScene(start))
    const lido = texto(html)
    expect(lido).toContain('O escudo que acaba')
    expect(lido).toContain('Segundo 0')
    expect(lido).toContain('Vidas 3')
    expect(lido).toContain('Escudo 0')
    for (const rotulo of [
      'Pegar o item do escudo',
      'Avançar 1 segundo',
      'Avançar até a próxima pedra',
      'Voltar ao começo',
    ])
      expect(lido).toContain(rotulo)
    expect(lido).toContain(
      'As pedras batem nos segundos 2, 5, 8 e 11. O Escudo conta para trás, um segundo de cada vez.',
    )
    expect(lido).toContain('0 de 4 descobertas')
    expect(destaques(html)).toEqual(['Avançar até a próxima pedra'])
    // Sem escudo não há bolha; o item do escudo é enfeite do palco.
    expect(html).not.toContain('data-bolha=')
    expect(html).toContain('data-item-do-escudo')
  })

  test('com o Escudo maior que 0, a bolha aparece em volta da nave e pisca no último segundo', () => {
    expect(tela(play([PEGAR]))).toContain('data-bolha="5"')
    const ultimo = tela(play([PEGAR, ...Array.from({ length: 4 }, () => SEGUNDO)]))
    expect(ultimo).toContain('data-bolha="1"')
    expect(ultimo).toContain('animate-pulse')
    expect(tela(play([PEGAR, SEGUNDO]))).not.toContain('animate-pulse')
  })

  test('⚠️⚠️ só a ideia: nenhum bloco, Se, então, senão, variável nem código', () => {
    for (const s of [openScene(start), play([PEDRA]), play([PEGAR, PEDRA]), play(TUDO)]) {
      const lido = texto(tela(s))
      expect(lido).not.toMatch(/\bbloco|\bregra\b|\bentão\b|\bsenão\b|\bSe\b|variável|código/)
    }
  })

  test('cada caso de "O escudo com prazo" só se revela depois de testado', () => {
    const inicio = texto(tela(openScene(start)))
    expect(inicio).toContain('O escudo com prazo')
    expect(inicio.match(/Teste para descobrir/g)?.length).toBe(4)
    expect(inicio).not.toMatch(/perdeu uma vida|só saiu|voltou a 5/)
    const semEscudo = texto(tela(play([PEDRA])))
    expect(semEscudo).toContain('A pedra bateu e a nave perdeu uma vida')
    expect(semEscudo.match(/Teste para descobrir/g)?.length).toBe(3)
    expect(semEscudo).not.toContain('A pedra só saiu: as vidas ficaram iguais')
    const fim = texto(tela(play(TUDO)))
    expect(fim).not.toContain('Teste para descobrir')
    expect(fim).toContain('4 de 4 descobertas')
  })

  test('o destaque segue a fala', () => {
    // Depois da batida sem escudo, a fala convida a pegar o item.
    expect(destaques(tela(play([PEDRA])))).toEqual(['Pegar o item do escudo'])
    // Com o escudo ligado e a proteção ainda por ver: a próxima pedra.
    expect(destaques(tela(play([PEDRA, PEGAR])))).toEqual(['Avançar até a próxima pedra'])
    // Viu a proteção: deixar o Escudo chegar a 0, um segundo de cada vez.
    expect(destaques(tela(play([PEDRA, PEGAR, PEDRA])))).toEqual(['Avançar 1 segundo'])
    // Começou pegando o item: voltar ao começo para a batida sem escudo.
    expect(destaques(tela(play([PEGAR])))).toEqual(['Voltar ao começo'])
    // Tudo visto: nada em destaque.
    expect(destaques(tela(play(TUDO)))).toEqual([])
  })

  test('a régua do destaque, sem a tela', () => {
    const t = openScene(start).timedShield
    expect(proximoGestoDoEscudo('timed-shield-complete', t)).toBeNull()
    expect(proximoGestoDoEscudo('timed-shield-ends-then-renews', t)).toBe('pegar')
    expect(proximoGestoDoEscudo('timed-shield-renews-then-restart', t)).toBe('voltar')
    expect(proximoGestoDoEscudo('timed-shield-start', { ...t, lives: 0 })).toBe('voltar')
  })

  test('sem vidas, os botões que avançam fecham', () => {
    const html = tela(play([PEDRA, PEDRA, PEDRA]))
    for (const rotulo of [
      'Pegar o item do escudo',
      'Avançar 1 segundo',
      'Avançar até a próxima pedra',
    ])
      expect(html).toMatch(new RegExp(`aria-disabled="true"[^>]*>(?:<[^>]+>)*[^<]*${rotulo}`))
  })
})

describe('a cena entra pela tela livre', () => {
  test('o bloco com exploração livre abre o escudo temporário', () => {
    const content = publicInteractiveBlock({
      kind: 'interactive',
      required: true,
      semPerguntaFinal: true,
      title: 'O escudo que acaba',
      instructions: 'Teste o escudo.',
      hints: [],
      activity,
    })
    const html = renderToStaticMarkup(
      <SceneActivityView
        block={{ id: 'experiencia-escudo', kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={activity}
      />,
    )
    expect(html).toContain('Pegar o item do escudo')
  })
})
