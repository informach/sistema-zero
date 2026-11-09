import { describe, expect, test } from 'bun:test'
import {
  type ExperimentationActivity,
  openScene,
  type SceneStart,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Door, Memory, Position } from '../src/components/scene-discovery-controls'
import {
  type Cartao,
  DiscoveryContext,
  type FalaDaDescoberta,
  Frame,
  Modulo,
} from '../src/components/scene-discovery-frame'
import { ProposedGarden } from '../src/components/scene-discovery-garden'
import { MoedasLivre } from '../src/components/scene-poder-moedas'
import { WalkNaBeirada } from '../src/components/scene-walk-beirada'
import { WalkEmCameraLenta } from '../src/components/scene-walk-camera-lenta'

/**
 * "Experiências numa tela só" (09/11/2026, Canvas aprovado por ela): com `arranjo="faisca"`, à
 * esquerda fica o JOGO (as estrelas, a cena e "Seus testes") e à direita a CRIANÇA (a fala do Zappy,
 * o painel dos controles e as descobertas). Sem o arranjo, as ~60 outras telas livres ficam como
 * eram. Aqui o "estreito" nunca é medido (sem ResizeObserver): vale o arranjo largo.
 */
const activity: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'coin-counter',
  cenario: 'farol',
  setup: { freeExploration: true },
}
const start: SceneStart = { scene: 'coin-counter', setup: activity.setup }
const inicio = openScene(start)

const falas: Array<{ text: string; opcoes?: FalaDaDescoberta }> = []
const tela = (
  state: SceneState,
  view: ReactElement,
  atividade: ExperimentationActivity = activity,
) =>
  renderToStaticMarkup(
    <DiscoveryContext.Provider
      value={{
        activity: atividade,
        state,
        dispatch: () => {},
        running: false,
        setRunning: () => {},
        tick: () => {},
        instruction: '',
        dialogue: (text: string, opcoes?: FalaDaDescoberta): ReactNode => {
          falas.push({ text, opcoes })
          return (
            <p data-fala data-pose={opcoes?.pose}>
              {text}
              {opcoes?.corpo}
            </p>
          )
        },
        tools: null,
        continuar: null,
      }}
    >
      {view}
    </DiscoveryContext.Provider>,
  )

/** O trecho do HTML de cada coluna do console. */
const colunas = (html: string) => {
  const visual = html.indexOf('sz-scene-console-visual')
  const acoes = html.indexOf('sz-scene-console-actions')
  expect(visual).toBeGreaterThan(-1)
  expect(acoes).toBeGreaterThan(visual)
  return { esquerda: html.slice(visual, acoes), direita: html.slice(acoes) }
}

const CARTOES: Cartao[] = [
  { id: 'a', emoji: '🪙', pergunta: 'O que muda?', descoberta: 'soma 1.' },
  { id: 'b', emoji: '🚶', pergunta: 'E longe?', descoberta: 'continua.' },
]
const comDescobertas = (ids: string[]): SceneState => ({
  ...inicio,
  evidence: { ...inicio.evidence, discoveries: ids },
})
const moldura = (state: SceneState, arranjo?: 'faisca', extras: Record<string, ReactNode> = {}) =>
  tela(
    state,
    <Frame
      title="Teste"
      kind="teste"
      activity={activity}
      state={state}
      text="Ande até a moeda."
      reset={() => {}}
      cartoes={CARTOES}
      fotos={[{ n: 1, titulo: 'Moeda 1', texto: 'moedas 0 → 1' }]}
      ideia="O jogo guarda quantas moedas foram pegas."
      ponte="um número vai contar as moedas."
      stage={<svg data-palco />}
      movimento={<div data-andar>setas</div>}
      controles={
        <>
          <Modulo titulo="A regra do baú" icone="🧩" largo>
            <span data-regra>Tem pelo menos 5 moedas?</span>
          </Modulo>
          <Modulo compacto titulo="O jogo guarda" icone="📓" dica="O baú olha aqui.">
            <span data-caderno>Quantas moedas? 0</span>
          </Modulo>
        </>
      }
      arranjo={arranjo}
      {...extras}
    />,
  )

describe('O arranjo do Faísca: a cena à esquerda, a criança à direita', () => {
  test('o painel dos controles mora na coluna da direita, depois da fala e antes das descobertas', () => {
    const { esquerda, direita } = colunas(moldura(inicio, 'faisca'))
    expect(esquerda).toContain('data-palco')
    expect(esquerda).not.toContain('data-andar')
    expect(esquerda).not.toContain('data-regra')
    const fala = direita.indexOf('sz-discovery-fala-bloco')
    const painel = direita.indexOf('sz-discovery-painel')
    const descobertas = direita.indexOf('sz-discovery-descobertas')
    expect(fala).toBeGreaterThan(-1)
    expect(painel).toBeGreaterThan(fala)
    expect(direita.indexOf('data-andar')).toBeGreaterThan(painel)
    expect(direita.indexOf('data-regra')).toBeGreaterThan(painel)
    expect(descobertas).toBeGreaterThan(painel)
  })

  test('"Seus testes" fica logo depois da cena, na coluna do jogo', () => {
    const { esquerda, direita } = colunas(moldura(inicio, 'faisca'))
    expect(esquerda).toContain('Seus testes')
    expect(esquerda.indexOf('Seus testes')).toBeGreaterThan(esquerda.indexOf('data-palco'))
    expect(direita).not.toContain('Seus testes')
  })

  test('a faixa "Z" só visual não existe no arranjo (o balão do Zappy é a fala, com o "Ouvir")', () => {
    expect(moldura(inicio, 'faisca')).not.toContain('sz-discovery-fala-celular')
    expect(moldura(inicio)).toContain('sz-discovery-fala-celular')
  })

  test('a pergunta grande mora na caixa do painel (entra na conta da altura no celular)', () => {
    const { direita } = colunas(
      moldura(inicio, 'faisca', { abaixoDoPalco: <div data-pergunta>O que mudou?</div> }),
    )
    const caixa = direita.indexOf('sz-discovery-painel-caixa')
    expect(caixa).toBeGreaterThan(-1)
    expect(direita.indexOf('data-pergunta')).toBeGreaterThan(direita.indexOf('data-regra'))
    expect(direita.indexOf('data-pergunta')).toBeLessThan(
      direita.indexOf('sz-discovery-descobertas'),
    )
  })

  test('a moldura diz o arranjo e a proporção do palco (o CSS dimensiona a cena por elas)', () => {
    const html = moldura(inicio, 'faisca')
    expect(html).toContain('data-arranjo="faisca"')
    expect(html).toContain('--sz-palco-aspecto:1.3333333333333333')
  })

  test('"Ainda não testado" fica só para o leitor de tela', () => {
    const html = moldura(inicio, 'faisca')
    expect(html).toMatch(/<small class="sr-only">Ainda não testado<\/small>/)
  })

  test('no fim, a fala vira a ideia (pose de festa) no mesmo lugar da coluna da direita', () => {
    falas.length = 0
    const { direita } = colunas(moldura(comDescobertas(['a', 'b']), 'faisca'))
    expect(direita).toContain('sz-discovery-fala-ideia')
    expect(direita).toContain('A ideia que você descobriu')
    expect(direita.indexOf('sz-discovery-fala-ideia')).toBeLessThan(
      direita.indexOf('sz-discovery-painel'),
    )
    expect(falas.at(-1)?.opcoes?.pose).toBe('celebrating')
  })
})

describe('Sem o arranjo, as outras telas livres ficam como eram', () => {
  test('o movimento e os controles continuam embaixo da cena, e os testes à direita', () => {
    const { esquerda, direita } = colunas(moldura(inicio))
    expect(esquerda).toContain('data-andar')
    expect(esquerda).toContain('data-regra')
    expect(esquerda).toContain('sz-discovery-deck')
    expect(esquerda).not.toContain('sz-discovery-painel')
    expect(direita).toContain('Seus testes')
    expect(moldura(inicio)).not.toContain('data-arranjo')
    expect(moldura(inicio)).toMatch(/<small>Ainda não testado<\/small>/)
  })

  test('abaixo do palco, a evidência e os controles antigos ficam onde estavam', () => {
    const { esquerda, direita } = colunas(
      moldura(inicio, undefined, {
        abaixoDoPalco: <div data-abaixo />,
        after: <div data-depois />,
        children: <div data-antigos />,
      }),
    )
    const ordem = ['data-palco', 'data-andar', 'data-abaixo', 'data-depois', 'data-regra']
    const posicoes = ordem.map((m) => esquerda.indexOf(m))
    expect(posicoes.every((p) => p > -1)).toBe(true)
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes)
    expect(direita.indexOf('data-antigos')).toBeGreaterThan(direita.indexOf('data-fala'))
    expect(direita.indexOf('data-antigos')).toBeLessThan(direita.indexOf('Suas descobertas'))
  })
})

describe('Modulo compacto', () => {
  test('sem o nome e a dica na tela, mas com os dois para o leitor de tela', () => {
    const html = renderToStaticMarkup(
      <Modulo compacto titulo="Partida" icone="🔄" dica="As moedas voltam.">
        <button type="button">Jogar de novo</button>
      </Modulo>,
    )
    expect(html).toContain('data-compacto="true"')
    expect(html).toContain('aria-label="Partida"')
    expect(html).toMatch(
      /<span class="sr-only"><span aria-hidden="true">🔄<\/span> Partida<\/span>/,
    )
    expect(html).toContain('<span class="sr-only">As moedas voltam.</span>')
    expect(html).not.toContain('sz-discovery-modulo-titulo')
  })

  test('o módulo de sempre segue com o nome e a dica visíveis', () => {
    const html = renderToStaticMarkup(
      <Modulo titulo="Andar" icone="🎮" dica="Segure as setas.">
        <span />
      </Modulo>,
    )
    expect(html).toContain('sz-discovery-modulo-titulo')
    expect(html).toContain('sz-discovery-modulo-dica')
    expect(html).not.toContain('data-compacto')
  })
})

describe('As telas do Faísca usam o arranjo', () => {
  test('as moedas: o painel à direita, com o caderninho, o sumiço e a partida compactos', () => {
    const html = tela(inicio, <MoedasLivre />)
    expect(html).toContain('data-arranjo="faisca"')
    const { direita } = colunas(html)
    expect(direita).toContain('sz-discovery-painel')
    expect((direita.match(/data-compacto="true"/g) ?? []).length).toBe(3)
  })
})

/**
 * As outras 7 experiências dos cursos do Faísca (09/11/2026: "pedi para aplicar em TODAS as
 * experiências do Faísca"): a Chave do Farol (o andar em câmera lenta, a beirada, a memória, a porta
 * e a posição) e o Cadê (o toque e os achados). Nada fica em cima da cena e os controles moram à
 * direita. A Nave (Construtor) usa as mesmas telas do andar e continua como era.
 */
const atividadeDe = (
  scene: ExperimentationActivity['scene'],
  cenario: ExperimentationActivity['cenario'],
  goals?: string[],
): ExperimentationActivity => ({
  type: 'experimentation',
  scene,
  cenario,
  setup: { freeExploration: true, ...(goals ? { goals } : {}) },
})
const telaDa = (a: ExperimentationActivity, view: ReactElement) =>
  tela(openScene({ scene: a.scene, setup: a.setup }), view, a)

describe('As 7 telas do Farol e do Cadê também usam o arranjo', () => {
  const casos: Array<[string, ExperimentationActivity, () => ReactElement]> = [
    [
      'o toque do Cadê',
      atividadeDe('touch-response', 'jardim'),
      () => <ProposedGarden part="touch" />,
    ],
    [
      'os achados do Cadê',
      atividadeDe('found-counter', 'jardim'),
      () => <ProposedGarden part="count" />,
    ],
    [
      'o andar em câmera lenta',
      atividadeDe('lighthouse-walk', 'farol', ['moves-each-frame', 'walked-real-speed']),
      () => <WalkEmCameraLenta />,
    ],
    [
      'a beirada',
      atividadeDe('lighthouse-walk', 'farol', ['left-the-screen', 'came-back-inside']),
      () => <WalkNaBeirada />,
    ],
    ['a memória', atividadeDe('collect-and-remember', 'farol'), () => <Memory />],
    ['a porta', atividadeDe('lighthouse-key', 'farol'), () => <Door />],
    ['a posição', atividadeDe('lighthouse-position', 'farol'), () => <Position />],
  ]
  for (const [nome, a, view] of casos)
    test(`${nome}: arranjo do Faísca, nada por cima da cena e o painel à direita`, () => {
      const html = telaDa(a, view())
      expect(html).toContain('data-arranjo="faisca"')
      expect(html).not.toContain('sz-discovery-sobre')
      const { esquerda, direita } = colunas(html)
      expect(esquerda).not.toContain('sz-discovery-painel')
      expect(direita).toContain('sz-discovery-painel')
      expect(direita.indexOf('sz-discovery-painel')).toBeGreaterThan(
        direita.indexOf('sz-discovery-fala-bloco'),
      )
    })

  test('a regra do toque mora no painel da direita, não em cima do jardim', () => {
    const { esquerda, direita } = colunas(
      telaDa(atividadeDe('touch-response', 'jardim'), <ProposedGarden part="touch" />),
    )
    expect(esquerda).not.toContain('Encaixar a regra do toque')
    expect(direita).toContain('Encaixar a regra do toque')
  })

  test('o andar do Farol: a seta é o movimento, a tira de quadros fica embaixo da cena', () => {
    const { esquerda, direita } = colunas(
      telaDa(
        atividadeDe('lighthouse-walk', 'farol', ['left-the-screen', 'came-back-inside']),
        <WalkNaBeirada />,
      ),
    )
    expect(direita).toContain('sz-discovery-movimento')
    expect(direita).toContain('Velocidade dos quadros')
    expect(direita).toContain('Cerca desligada')
    expect(esquerda.indexOf('sz-discovery-filme')).toBeGreaterThan(
      esquerda.indexOf('sz-discovery-palco'),
    )
    expect(direita).not.toContain('sz-discovery-filme')
  })

  test('a Nave (Construtor) usa as mesmas telas do andar e continua como era', () => {
    const html = telaDa(
      atividadeDe('lighthouse-walk', 'nave', ['moves-each-frame', 'walked-real-speed']),
      <WalkEmCameraLenta />,
    )
    expect(html).not.toContain('data-arranjo')
    const { esquerda } = colunas(html)
    expect(esquerda).toContain('sz-discovery-deck')
    expect(esquerda).toContain('sz-discovery-filme')
  })
})
