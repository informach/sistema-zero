import { describe, expect, test } from 'bun:test'
import { publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  discoveryGuidance,
  type ExperimentationActivity,
  LIGHTHOUSE_NOT_GOALS,
  openScene,
  type SceneAction,
  type SceneState,
  sceneStart,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { SceneActivityView } from '../src/components/scene-activity'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { PortaDoNao } from '../src/components/scene-door-not'

/**
 * "A pergunta com o não" (A Ilha do Farol, aula 3, parte 3, 02/11/2026): só a ideia, sem bloco, Se,
 * então, senão nem variável; cada situação só se revela depois de testada; o destaque é o gesto da fala.
 */
const activity: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'lighthouse-key',
  cenario: 'farol',
  setup: { freeExploration: true, goals: [...LIGHTHOUSE_NOT_GOALS] },
}
const start = sceneStart(activity)
const play = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const TESTAR: SceneAction = { type: 'try-lighthouse-door' }
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
      <PortaDoNao />
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const destaques = (html: string) =>
  [...html.matchAll(/data-tom="gesto"[^>]*>(.*?)<\/button>/g)].map((m) => texto(m[1] ?? '').trim())

describe('a pergunta com o não', () => {
  test('abre com a pergunta sem o não, a porta trancada e Testar a porta em destaque', () => {
    const html = tela(openScene(start))
    const lido = texto(html)
    expect(lido).toContain('🔒 Porta trancada')
    expect(lido).toContain('Dar a chave ao personagem')
    expect(lido).toContain('Pôr o não na pergunta')
    expect(lido).toContain('Testar a porta')
    expect(lido).toContain('Com a chave, compare as duas perguntas.')
    expect(lido).toContain('Sem a chave, compare as duas perguntas.')
    expect(lido).toContain('0 de 2 descobertas')
    expect(html).toContain('data-tranca="trancada"')
    expect(destaques(html)).toEqual(['Testar a porta'])
  })

  test('⚠️⚠️ só a ideia: nenhum bloco, Se, então, senão, variável nem temChave', () => {
    for (const s of [
      openScene(start),
      play([TESTAR]),
      play([TESTAR, { type: 'door-question', not: true }, TESTAR]),
    ]) {
      const lido = texto(tela(s))
      expect(lido).not.toMatch(
        /\bbloco|\bregra\b|\bentão\b|\bsenão\b|temChave|ganhou|variável|código/i,
      )
    }
  })

  test('cada situação só se revela depois de testada', () => {
    const inicio = texto(tela(openScene(start)))
    expect(inicio.match(/Teste para descobrir/g)?.length).toBe(4)
    expect(inicio).not.toMatch(/a porta abriu|ficou fechada/)
    const uma = tela(play([TESTAR]))
    expect(texto(uma)).toContain('Sim: a porta abriu')
    expect(texto(uma).match(/Teste para descobrir/g)?.length).toBe(3)
    expect(uma.match(/data-resposta="sim"/g)?.length).toBe(1)
  })

  test('o destaque segue a fala: testado, pôr o não; uma chave vista, trocar a chave', () => {
    expect(destaques(tela(play([TESTAR])))).toEqual(['Pôr o não na pergunta'])
    expect(destaques(tela(play([TESTAR, { type: 'door-question', not: true }])))).toEqual([
      'Testar a porta',
    ])
    const umaChave = play([TESTAR, { type: 'door-question', not: true }, TESTAR])
    expect(destaques(tela(umaChave))).toEqual(['Dar a chave ao personagem'])
    expect(texto(tela(umaChave))).toContain('1 de 2 descobertas')
  })
})

describe('a porta escolhe a tela pelo caso', () => {
  const render = (a: ExperimentationActivity) => {
    const content = publicInteractiveBlock({
      kind: 'interactive',
      required: true,
      semPerguntaFinal: true,
      title: 'A porta',
      instructions: 'Teste a porta.',
      hints: [],
      activity: a,
    })
    return renderToStaticMarkup(
      <SceneActivityView
        block={{ id: 'experiencia-porta', kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={a}
      />,
    )
  }
  test('as metas do não abrem a pergunta com o não; o Farol segue com a porta de sempre', () => {
    expect(render(activity)).toContain('Pôr o não na pergunta')
    const farol = render({
      ...activity,
      setup: { freeExploration: true, goals: ['locked-without-key', 'opened-with-key'] },
    })
    // ⭐ 08/11/2026: no Farol a porta pergunta quando o personagem chega nela (andar livre).
    expect(farol).toContain('Jogar de novo')
    expect(farol).not.toContain('Pôr o não na pergunta')
  })
})
