import { describe, expect, test } from 'bun:test'
import {
  type ExperimentationActivity,
  openScene,
  type SceneStart,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  Caderninho,
  type Cartao,
  casaTecla,
  DiscoveryContext,
  type FalaDaDescoberta,
  Frame,
  TECLAS,
} from '../src/components/scene-discovery-frame'

/**
 * A moldura das experiências livres (08/11/2026): estrelas, cartões SÓ de leitura (a criança
 * explora na ordem que quiser), a ideia dentro do balão do Zappy no fim e o recomeçar com
 * confirmação. As 60 telas antigas vestem a mesma moldura pela API de antes.
 */
const activity: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'found-counter',
  cenario: 'jardim',
  setup: { freeExploration: true, goals: ['first-find', 'second-find'] },
}
const start: SceneStart = { scene: 'found-counter', setup: activity.setup }
const comDescobertas = (ids: string[]): SceneState => {
  const s = openScene(start)
  return { ...s, evidence: { ...s.evidence, discoveries: ids } }
}
const CARTOES: Cartao[] = [
  { id: 'first-find', emoji: '🔎', pergunta: 'O que muda ao achar alguém?', descoberta: 'soma 1' },
  { id: 'second-find', emoji: '➕', pergunta: 'E ao achar outro?', descoberta: 'soma de novo' },
]

const falas: Array<{ text: string; opcoes?: FalaDaDescoberta }> = []
const tela = (state: SceneState, extra: Partial<Parameters<typeof Frame>[0]> = {}) =>
  renderToStaticMarkup(
    <DiscoveryContext.Provider
      value={{
        activity,
        state,
        dispatch: () => {},
        running: false,
        setRunning: () => {},
        instruction: '',
        dialogue: (text: string, opcoes?: FalaDaDescoberta): ReactNode => {
          falas.push({ text, opcoes })
          return <div data-fala>{opcoes?.corpo ?? text}</div>
        },
        tools: <span>FERRAMENTAS-ANTIGAS</span>,
        continuar: <span>CONTINUAR</span>,
      }}
    >
      <Frame
        title="Achados"
        kind="achados"
        activity={activity}
        state={state}
        text="Ache alguém!"
        reset={() => {}}
        cartoes={CARTOES}
        ideia="O jogo guarda os achados."
        ponte="um número vai guardar quantos a pessoa achou."
        stage={<svg aria-hidden />}
        {...extra}
      />
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) =>
  html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

describe('a moldura das experiências livres', () => {
  test('uma estrela por cartão; a contagem é dita ao leitor de tela', () => {
    const html = tela(comDescobertas(['first-find']))
    expect(html.match(/class="sz-discovery-estrela"/g)?.length).toBe(2)
    expect(html).toContain('data-feito="true"')
    expect(texto(html)).toContain('1 de 2 descobertas')
  })

  test('os cartões são só de leitura: nada de botão nem cursor de mão', () => {
    const html = tela(comDescobertas(['first-find']))
    const cartoes = html.slice(html.indexOf('sz-discovery-cartoes'), html.indexOf('</ul>'))
    expect(cartoes).not.toContain('<button')
    expect(texto(cartoes)).toContain('Descobri: soma 1')
    expect(texto(cartoes)).toContain('Ainda não testado')
  })

  test('com tudo descoberto, o balão vira a ideia com "No seu jogo:" e o Ouvir lê as duas', () => {
    falas.length = 0
    const html = tela(comDescobertas(['first-find', 'second-find']))
    expect(texto(html)).toContain('A ideia que você descobriu')
    expect(texto(html)).toContain('No seu jogo: um número vai guardar')
    const ultima = falas.at(-1)
    expect(ultima?.opcoes?.pose).toBe('celebrating')
    expect(ultima?.opcoes?.textos).toEqual([
      'O jogo guarda os achados.',
      'No seu jogo: um número vai guardar quantos a pessoa achou.',
    ])
  })

  test('durante um desafio extra (mostrarIdeia falso) o balão segue com a fala', () => {
    const html = tela(comDescobertas(['first-find', 'second-find']), { mostrarIdeia: false })
    expect(texto(html)).not.toContain('A ideia que você descobriu')
    expect(texto(html)).toContain('Ache alguém!')
  })

  test('a voz não toca sozinha antes do primeiro gesto da criança', () => {
    falas.length = 0
    tela(comDescobertas([]))
    expect(falas.at(-1)?.opcoes?.falarSozinho).toBe(false)
  })

  test('o recomeçar e o som ficam na linha de cima; as telas novas mostram só o continuar', () => {
    const html = tela(comDescobertas([]))
    expect(texto(html)).toContain('Recomeçar experiência')
    expect(html).toContain('aria-pressed="true"')
    expect(texto(html)).toContain('CONTINUAR')
    expect(texto(html)).not.toContain('FERRAMENTAS-ANTIGAS')
  })

  test('as telas antigas: os goals viram cartões e o "Descobri!" não usa o rótulo do catálogo', () => {
    const html = tela(comDescobertas(['first-find']), {
      cartoes: undefined,
      ideia: undefined,
      goals: ['Ache um personagem.', 'Ache outro.'],
      completed: [true, false],
      done: 1,
      children: <button type="button">CONTROLE-ANTIGO</button>,
    })
    const lido = texto(html)
    expect(lido).toContain('Ache um personagem. Descobri!')
    expect(lido).toContain('CONTROLE-ANTIGO')
    expect(lido).toContain('FERRAMENTAS-ANTIGAS')
  })
})

describe('as peças com a forma do que imitam', () => {
  test('a seta e a letra do WASD acionam a mesma tecla', () => {
    expect(casaTecla({ key: 'ArrowRight', code: 'ArrowRight' }, TECLAS.direita.teclas)).toBe(true)
    expect(casaTecla({ key: 'd', code: 'KeyD' }, TECLAS.direita.teclas)).toBe(true)
    // No ABNT o `key` pode ser outro; a posição (`code`) é a mesma.
    expect(casaTecla({ key: 'ç', code: 'KeyD' }, TECLAS.direita.teclas)).toBe(true)
    expect(casaTecla({ key: 'a', code: 'KeyA' }, TECLAS.direita.teclas)).toBe(false)
  })

  test('o caderninho escreve SIM ou NÃO', () => {
    expect(texto(renderToStaticMarkup(<Caderninho sim />))).toContain('Tem a chave? SIM')
    expect(texto(renderToStaticMarkup(<Caderninho sim={false} lapis />))).toContain('NÃO')
  })
})
