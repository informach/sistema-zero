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
import { LivreWeaponSwap, proximoGestoDaArma } from '../src/components/scene-livre/weapon-swap'

/**
 * A troca de arma (Poder "Troca de arma" do Construtor, Nave contra Asteroides, 28/11/2026): só a
 * ideia, sem bloco nem Se; cada linha de "Uma arma que muda o tiro" só aparece depois do teste dela;
 * o destaque é o gesto da fala do Zappy.
 */
const activity: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'weapon-swap',
  cast: { hero: { name: 'nave', gender: 'f' }, obstacle: { name: 'asteroide', gender: 'm' } },
  cenario: 'nave',
  setup: {
    freeExploration: true,
    goals: ['locked', 'unlocked-swap', 'shot-follows', 'new-match-laser'],
  },
}
const start = sceneStart(activity)
const play = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const PEGAR: SceneAction = { type: 'weapon-pickup' }
const E: SceneAction = { type: 'weapon-key-e' }
const ESPACO: SceneAction = { type: 'weapon-fire' }
const NOVA: SceneAction = { type: 'weapon-new-match' }
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
      <LivreWeaponSwap />
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const destaques = (html: string) =>
  [...html.matchAll(/data-tom="gesto"[^>]*>(.*?)<\/button>/g)].map((m) => texto(m[1] ?? '').trim())
const TUDO = [E, PEGAR, ESPACO, E, ESPACO, NOVA]

describe('a troca de arma', () => {
  test('abre com o laser, o item à vista e os controles com os nomes da aula', () => {
    const html = tela(openScene(start))
    const lido = texto(html)
    expect(lido).toContain('A troca de arma')
    expect(lido).toContain('Arma: laser')
    expect(lido).toContain('Plasma trancado')
    for (const rotulo of ['Pegar o item de plasma', 'Apertar E', 'Apertar Espaço', 'Nova partida'])
      expect(lido).toContain(rotulo)
    expect(lido).toContain('0 de 4 descobertas')
    expect(destaques(html)).toEqual(['Apertar E'])
    expect(html).toContain('data-item-plasma')
    expect(html).not.toContain('data-tiro=')
    // Sem nada para recomeçar, a Nova partida fica fechada.
    expect(html).toMatch(/aria-disabled="true"[^>]*>(?:<[^>]+>)*[^<]*Nova partida/)
  })

  test('o tiro de cada arma no palco: o laser em poucas marcas, o plasma em muitas', () => {
    const laser = tela(play([ESPACO]))
    expect(laser).toContain('data-tiro="laser"')
    const plasma = tela(play([PEGAR, E, ESPACO]))
    expect(plasma).toContain('data-tiro="plasma"')
    expect(plasma).not.toContain('data-item-plasma')
    expect(texto(plasma)).toContain('Arma: plasma')
    const marcas = (html: string) => html.match(/data-marca-do-tiro/g)?.length ?? 0
    expect(marcas(laser)).toBeLessThan(marcas(plasma))
    expect(laser).toContain('data-chegou')
  })

  test('⚠️⚠️ só a ideia: nenhum bloco, Se, então, senão, variável nem código', () => {
    for (const s of [openScene(start), play([E]), play([PEGAR, E, ESPACO]), play(TUDO)]) {
      const lido = texto(tela(s))
      expect(lido).not.toMatch(/\bbloco|\bregra\b|\bentão\b|\bsenão\b|\bSe\b|variável|código/)
    }
  })

  test('cada caso de "Uma arma que muda o tiro" só se revela depois de testado', () => {
    const inicio = texto(tela(openScene(start)))
    expect(inicio).toContain('Uma arma que muda o tiro')
    expect(inicio.match(/Teste para descobrir/g)?.length).toBe(4)
    expect(inicio).not.toMatch(/Nada mudou|trocou de laser|fino e rápido|voltou para laser/)
    const trancado = texto(tela(play([E])))
    expect(trancado).toContain('Nada mudou: a Arma continuou laser')
    expect(trancado.match(/Teste para descobrir/g)?.length).toBe(3)
    const fim = texto(tela(play(TUDO)))
    expect(fim).not.toContain('Teste para descobrir')
    expect(fim).toContain('4 de 4 descobertas')
  })

  test('o destaque segue a fala', () => {
    expect(destaques(tela(play([E])))).toEqual(['Pegar o item de plasma'])
    expect(destaques(tela(play([E, PEGAR])))).toEqual(['Apertar E'])
    // Com o plasma: o Espaço; depois de disparar o plasma, trocar de volta ao laser.
    expect(destaques(tela(play([E, PEGAR, E])))).toEqual(['Apertar Espaço'])
    expect(destaques(tela(play([E, PEGAR, E, ESPACO])))).toEqual(['Apertar E'])
    // Começou pelo item: a Nova partida tranca o plasma para o teste do E sem o item.
    expect(destaques(tela(play([PEGAR])))).toEqual(['Nova partida'])
    expect(destaques(tela(play(TUDO)))).toEqual([])
  })

  test('a régua do destaque, sem a tela', () => {
    const w = openScene(start).weaponSwap
    expect(proximoGestoDaArma('weapon-swap-complete', w)).toBeNull()
    expect(proximoGestoDaArma('weapon-swap-start', w)).toBe('e')
    expect(proximoGestoDaArma('weapon-swap-ask-relock', { ...w, unlocked: true })).toBe('nova')
    expect(
      proximoGestoDaArma('weapon-swap-shots-then-newmatch', {
        weapon: 'plasma',
        unlocked: true,
        fired: ['laser', 'plasma'],
      }),
    ).toBe('nova')
  })
})

describe('a cena entra pela tela livre', () => {
  test('o bloco com exploração livre abre a troca de arma', () => {
    const content = publicInteractiveBlock({
      kind: 'interactive',
      required: true,
      semPerguntaFinal: true,
      title: 'A troca de arma',
      instructions: 'Teste a arma.',
      hints: [],
      activity,
    })
    const html = renderToStaticMarkup(
      <SceneActivityView
        block={{ id: 'experiencia-arma', kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={activity}
      />,
    )
    expect(html).toContain('Apertar Espaço')
  })
})
