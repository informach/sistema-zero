import { afterEach, describe, expect, test } from 'bun:test'
import { type InteractiveBlock, publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  openScene,
  SCENE_MODELS,
  SCENE_QUESTIONS,
  type SceneActivity,
  type SceneId,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { ExplorationPieces } from '@sistemazero/member-shell/components/exploration-pieces'
import { ExplorationStage } from '@sistemazero/member-shell/components/exploration-stage'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

/**
 * O full review de EXPERIÊNCIA do conjunto das 45 cenas (16/09/2026), pelo player de verdade.
 *
 * Relatório: `tmp/storyboard/implementacao/full-review-experiencia.md`; os consertos em
 * `consertos-full-exp.md`. A medida de caixa no Chromium (o vão e o pulo em px) está no relatório; aqui
 * vai o que o happy-dom alcança, cada teste reprovando sem o conserto dele.
 */

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function bloco(activity: SceneActivity, extra: Partial<InteractiveBlock> = {}): InteractiveBlock {
  const modelo = SCENE_MODELS[activity.scene]
  return {
    kind: 'interactive',
    title: modelo.title,
    instructions: modelo.instruction,
    hints: [],
    required: false,
    activity,
    ...extra,
  }
}
/** O caminho da CRIANÇA (a projeção pública: previsão e pergunta do modelo), na prévia sem servidor. */
function abrir(conteudo: InteractiveBlock) {
  return render(
    <InteractiveLessonBlock
      block={{
        id: 'b',
        blockRevision: 'r',
        kind: 'interactive',
        sortOrder: 0,
        content: publicInteractiveBlock(conteudo),
      }}
      previewContent={conteudo}
    />,
  )
}
/** Escolhe a primeira opção da previsão (a do bloco, ou a do modelo). */
async function palpitar(scene: SceneId, rotulo?: string) {
  fireEvent.click(
    await screen.findByRole('button', {
      name: rotulo ?? (SCENE_QUESTIONS[scene].prediction.choices[0]?.label as string),
    }),
  )
  await waitFor(() => expect(screen.getByText('Seu palpite:')).toBeTruthy())
}
const naFaixa = (nome: string) =>
  [...document.querySelectorAll('dt')].find((dt) => dt.textContent === nome)?.nextElementSibling
    ?.textContent ?? ''

describe('A1 · a pilha da layers como o painel Camadas do Pinta (Meu Jeito Aula 5)', () => {
  const pedraEChama = {
    hero: { name: 'pedra', gender: 'f' as const },
    scenery: { name: 'chama', gender: 'f' as const },
  }
  const camadas: SceneActivity = {
    type: 'experimentation',
    scene: 'layers',
    pilha: 'camadas',
    cast: pedraEChama,
  }

  test('⚠️⚠️ a da FRENTE em cima, com os botões do Pinta, e "Uma camada para trás" na chama leva a pedra para a frente', async () => {
    abrir(bloco(camadas))
    await palpitar('layers', 'Atrás da chama')
    const lista = document.querySelector('ol[data-pilha]')
    expect(lista?.getAttribute('data-pilha')).toBe('camadas')
    expect(screen.getByText('Camadas')).toBeTruthy()
    // Na abertura a chama cobre a pedra: a chama está EM CIMA da lista.
    const linhas = () => [...(lista?.querySelectorAll('li') ?? [])].map((li) => li.dataset.peca)
    expect(linhas()).toEqual(['floresta', 'dino'])
    expect(naFaixa('na frente')).toBe('a chama')
    expect(naFaixa('atrás')).toBe('a pedra')
    expect(screen.queryByRole('button', { name: /^Descer / })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Uma camada para trás: Chama' }))
    await waitFor(() => expect(linhas()).toEqual(['dino', 'floresta']))
    expect(naFaixa('na frente')).toBe('a pedra')
    expect(
      screen.getByText(
        'A de cima fica na frente. Arraste uma forma ou use Uma camada para a frente e Uma camada para trás.',
      ),
    ).toBeTruthy()
    // O "Conferir" diz o gesto do Pinta, e nunca "o fim da ordem de desenhar".
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }))
    const resposta = await screen.findByText(/^Ainda não\. Tente:/)
    expect(resposta.textContent).toContain('uma camada para a frente')
    expect(resposta.textContent).not.toMatch(/ordem de desenhar|fim da lista/)
  })

  test('sem a pilha, a lista de blocos do Estúdio de sempre (Corre Dino Aula 2)', async () => {
    abrir(bloco({ type: 'experimentation', scene: 'layers' }))
    await palpitar('layers')
    expect(document.querySelector('ol[data-pilha]')?.getAttribute('data-pilha')).toBe('blocos')
    expect(screen.getByRole('button', { name: 'Descer Dino para o 2º lugar' })).toBeTruthy()
    expect(naFaixa('1º a desenhar')).toBe('o Dino')
  })
})

describe('M1 · a pista congela no clique e vira "Feito" quando a meta dela cai', () => {
  test('⚠️⚠️ stage-size: "Aperte o botão da borda" some quando a borda liga, e a pista seguinte fala da largura', async () => {
    abrir(bloco({ type: 'experimentation', scene: 'stage-size' }))
    await palpitar('stage-size')
    fireEvent.click(screen.getByRole('button', { name: 'Uma pista' }))
    const caixa = () => document.querySelector('[data-pista]')
    await waitFor(() => expect(caixa()?.textContent).toContain('Aperte o botão da borda.'))
    fireEvent.click(screen.getByRole('button', { name: 'A borda da tela: escondida' }))
    await waitFor(() => expect(caixa()?.getAttribute('data-pista')).toBe('feita'))
    expect(caixa()?.textContent).toBe('✓ Feito! Se precisar, peça outra pista.')
    expect(caixa()?.textContent).not.toContain('Aperte o botão da borda.')
    fireEvent.click(screen.getByRole('button', { name: 'Uma pista' }))
    await waitFor(() =>
      expect(caixa()?.textContent).toContain(
        'Com a borda à vista, diminua a largura e olhe a borda.',
      ),
    )
  })
})

describe('M2 · os avisos da descoberta ficam SOBRE o palco, sem vão reservado no fluxo', () => {
  const PALPITE: NonNullable<InteractiveBlock['prediction']> = {
    context: {
      label: 'Bastidores e tela do jogo',
      explanation:
        'Nesta experiência, vamos comparar o que existe nos bastidores com o que aparece na tela do jogo.',
    },
    prompt: 'Você cria e não liga o desenho. O que aparece?',
    choices: [
      { id: 'aparece', label: 'O Dino aparece', shows: 'Olhe a tela: ela ficou vazia.' },
      { id: 'vazia', label: 'A tela fica vazia' },
    ],
    correctChoiceId: 'vazia',
    revealOn: 'hidden',
  }

  test('⚠️⚠️ nenhum lugar reservado para avisos; o selo e o palpite retomado entram DENTRO da moldura do palco, e o ✕ os tira', async () => {
    const { container } = abrir(
      bloco({ type: 'experimentation', scene: 'world' }, { prediction: PALPITE }),
    )
    await palpitar('world', 'O Dino aparece')
    expect(container.querySelector('[data-lugar-reservado="avisos"]')).toBeNull()
    fireEvent.click(await screen.findByRole('button', { name: '＋ Criar Dino' }))
    const retomado = 'Você achou: O Dino aparece. Olhe a tela: ela ficou vazia.'
    await waitFor(() => expect(screen.getByText(retomado)).toBeTruthy())
    const avisos = container.querySelector<HTMLElement>('[data-avisos-sobre-o-palco]')
    expect(avisos).not.toBeNull()
    // Sobreposto: absoluto, dentro do lugar do palco (irmão do desenho), e o toque atravessa.
    for (const c of ['absolute', 'bottom-2', 'pointer-events-none'])
      expect(avisos?.className.split(/\s+/)).toContain(c)
    expect(avisos?.parentElement?.querySelector('[data-mundo], svg')).not.toBeNull()
    expect(avisos?.textContent).toContain('Descoberta 1 de 2')
    // Nada entre o palco e a bancada além da frase da situação.
    expect(container.querySelector('[data-lugar-reservado="avisos"]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar o aviso' }))
    await waitFor(() => expect(screen.queryByText(retomado)).toBeNull())
  })
})

/**
 * Um `ResizeObserver` que a gente dispara e uma medida de caixa pelo TEXTO: o happy-dom não faz layout.
 * ⚠️ Restaurados no fim de cada teste (o `bun:test` não isola globais entre arquivos).
 */
function medidasFalsas(alturaPeloTexto: (texto: string) => number) {
  const roOriginal = globalThis.ResizeObserver
  const medidaOriginal = HTMLElement.prototype.getBoundingClientRect
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const altura = alturaPeloTexto(this.textContent ?? '')
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      width: 600,
      height: altura,
      right: 600,
      bottom: altura,
      toJSON: () => ({}),
    }
  }
  return () => {
    globalThis.ResizeObserver = roOriginal
    HTMLElement.prototype.getBoundingClientRect = medidaOriginal
  }
}

describe('M3 · a faixa e a frase reservam a MAIOR altura que a cena atinge, antes do gesto', () => {
  test('⚠️⚠️ world: a faixa já nasce com a altura de "o Dino" (duas linhas), e não cresce no toque de Criar', async () => {
    // A faixa da abertura diz "bastidores: vazio"; o roteiro do modelo cria o Dino. Na medida falsa, a
    // faixa com o Dino tem duas linhas (69) e a de abertura, uma (41): é o pulo de 28 px do review.
    const restaurar = medidasFalsas((texto) =>
      texto.includes('bastidores') ? (texto.includes('o Dino') ? 69 : 41) : 20,
    )
    try {
      const { container } = abrir(bloco({ type: 'experimentation', scene: 'world' }))
      await palpitar('world')
      const faixa = () => container.querySelector<HTMLElement>('[data-lugar-reservado="faixa"]')
      await waitFor(() => expect(faixa()?.style.minHeight).toBe('69px'))
      expect(naFaixa('bastidores')).toBe('vazio')
    } finally {
      restaurar()
    }
  })

  test('⚠️ a frase da situação reserva a mais longa do roteiro (o "Avançar 1 quadro" não desce)', async () => {
    const restaurar = medidasFalsas((texto) => (texto.length > 45 ? 40 : 20))
    try {
      const { container } = abrir(bloco({ type: 'experimentation', scene: 'draw-loop' }))
      await palpitar('draw-loop')
      const frase = () => container.querySelector<HTMLElement>('[data-lugar-reservado="situacao"]')
      await waitFor(() => expect(frase()?.style.minHeight).toBe('40px'))
    } finally {
      restaurar()
    }
  })
})

describe('M4 · layers: "Descobertas 2 de 3" até a terceira troca, sem "2 de 2" parado', () => {
  test('⚠️⚠️ duas trocas mostram 2 de 3 e o "Conferir" pede a terceira; a terceira conclui', async () => {
    abrir(bloco({ type: 'experimentation', scene: 'layers' }))
    await palpitar('layers')
    for (let i = 0; i < 2; i++)
      fireEvent.click(await screen.findByRole('button', { name: /^Descer / }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('2'))
    expect(screen.getByRole('meter').getAttribute('aria-valuemax')).toBe('3')
    expect(screen.queryByText('Descobertas 2 de 2')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }))
    expect(
      await screen.findByText(
        'Ainda não. Tente: leve o Dino de novo para o fim da ordem de desenhar.',
      ),
    ).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: /^Descer / }))
    expect((await screen.findAllByText('Você descobriu!')).length).toBeGreaterThan(0)
  })
})

describe('M6 · a prévia segura mostra a cena sem antecipar a descoberta', () => {
  const noop = () => {}

  test('layers: os desenhos aparecem separados e a bancada ainda não existe', () => {
    const activity: SceneActivity = { type: 'experimentation', scene: 'layers' }
    const estado = openScene({ scene: 'layers' })
    const { container } = render(
      <ExplorationStage
        activity={activity}
        state={estado}
        preview={{ initial: true, conceal: ['layers-order'] }}
      />,
    )
    expect(container.querySelector('desc')?.textContent).toBe(
      'O Dino e a floresta aparecem separados. Você vai descobrir qual fica na frente.',
    )
    expect(container.textContent).not.toContain('A floresta fica na frente')
    expect(screen.queryByRole('button', { name: /^Descer / })).toBeNull()
  })

  test('camera-3d: a prévia não conta as cores nem entrega a regra do cubo', () => {
    const activity: SceneActivity = { type: 'experimentation', scene: 'camera-3d' }
    const estado = openScene({ scene: 'camera-3d' })
    const { container, rerender } = render(
      <ExplorationStage
        activity={activity}
        state={estado}
        preview={{ initial: true, conceal: ['camera-colors'] }}
      />,
    )
    expect(container.textContent).not.toMatch(/cores?\b|mesma cor/)
    rerender(<ExplorationStage activity={activity} state={estado} dispatch={() => {}} />)
    expect(container.textContent).toContain('Lados opostos têm a mesma cor.')
  })

  test('cleanup: "Fora da tela, no grupo" só com o primeiro cacto na prateleira', () => {
    const activity: SceneActivity = { type: 'experimentation', scene: 'cleanup' }
    const start = { scene: 'cleanup' as const }
    const antes = openScene(start)
    const { container, rerender } = render(
      <ExplorationStage activity={activity} state={antes} dispatch={noop} />,
    )
    expect(container.textContent).not.toContain('Fora da tela, no grupo')
    expect(container.textContent).not.toContain('Bastidores: o grupo')
    let depois = antes
    for (let t = 0; t < 400 && depois.crowd.born - depois.crowd.removed <= 3; t++)
      depois = stepScene(start, depois, { type: 'advance', seconds: 0.05 })
    for (let t = 0; t < 400 && depois.crowd.born - depois.crowd.removed - 3 < 1; t++)
      depois = stepScene(start, depois, { type: 'advance', seconds: 0.05 })
    rerender(<ExplorationStage activity={activity} state={depois} dispatch={noop} />)
    expect(container.textContent).toContain('Fora da tela, no grupo')
  })

  test('aim: "caminho reto" só depois do primeiro tiro', () => {
    const activity: SceneActivity = { type: 'experimentation', scene: 'aim' }
    const start = { scene: 'aim' as const }
    const antes = openScene(start)
    const { container, rerender } = render(
      <ExplorationStage activity={activity} state={antes} dispatch={noop} />,
    )
    expect(container.textContent).not.toContain('caminho reto')
    const atirou = stepScene(start, antes, { type: 'shoot' })
    rerender(<ExplorationStage activity={activity} state={atirou} dispatch={noop} />)
    expect(container.textContent).toContain('caminho reto')
  })
})

describe('M8 · lives: a peça que muda de caixa, e não o fio', () => {
  test('⚠️⚠️ "Perder uma vida" vai para "Quando bater" pelo "Colocar aqui", sem "Desligar fio" na tela', async () => {
    abrir(bloco({ type: 'experimentation', scene: 'lives' }))
    await palpitar('lives')
    expect(screen.queryByText(/Desligar fio/)).toBeNull()
    const quandoBater = screen.getByRole('group', { name: 'Quando bater' })
    fireEvent.click(within(quandoBater).getByRole('button', { name: /Colocar aqui/ }))
    await waitFor(() =>
      expect(
        within(screen.getByRole('group', { name: 'Quando bater' })).getByRole('button', {
          name: 'Perder uma vida',
        }),
      ).toBeTruthy(),
    )
  })

  test('no Desafio (ponto pelo acerto) a caixa "Quando o tiro acertar" mostra Somar ponto, sem ser gesto', () => {
    const activity: SceneActivity = { type: 'experimentation', scene: 'lives' }
    render(
      <ExplorationPieces
        activity={activity}
        state={openScene({ scene: 'lives' })}
        dispatch={() => {}}
        more={false}
        pontoPorAcerto
      />,
    )
    const acerto = screen.getByRole('group', { name: 'Quando o tiro acertar' })
    expect(acerto.textContent).toContain('Somar ponto')
    expect(within(acerto).queryByRole('button')).toBeNull()
    expect(screen.getByRole('group', { name: 'Quando bater' })).toBeTruthy()
  })
})

describe('M9 · jump-sound: o Dino tocável tem foco visível e área de toque de 100', () => {
  test('⚠️⚠️ outline-hidden com focus-visible:outline-solid (nunca outline-none), fora do Tab e com a área de 100 × 100', () => {
    const activity: SceneActivity = { type: 'experimentation', scene: 'jump-sound' }
    const { container } = render(
      <ExplorationStage
        activity={activity}
        state={openScene({ scene: 'jump-sound' })}
        dispatch={() => {}}
      />,
    )
    const dino = container.querySelector<SVGGElement>('g[role="button"]')
    const classes = dino?.getAttribute('class')?.split(/\s+/) ?? []
    expect(classes).not.toContain('outline-none')
    expect(classes).toContain('outline-hidden')
    expect(classes).toContain('focus-visible:outline-solid')
    // B16: a bancada tem os mesmos dois gestos; o Dino não é uma segunda parada do Tab.
    expect(dino?.getAttribute('tabindex')).toBe('-1')
    const area = dino?.querySelector('rect[data-area-do-toque]')
    expect(area?.getAttribute('width')).toBe('100')
    expect(area?.getAttribute('height')).toBe('100')
  })
})

describe('B6 · a N-ésima bolinha acende com a N-ésima descoberta', () => {
  test('world: criando com o desenho ligado cai a SEGUNDA meta, e acende a PRIMEIRA bolinha', async () => {
    const { container } = abrir(bloco({ type: 'experimentation', scene: 'world' }))
    await palpitar('world')
    fireEvent.click(screen.getByRole('button', { name: /Desenhar o Dino na tela/ }))
    fireEvent.click(screen.getByRole('button', { name: '＋ Criar Dino' }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('1'))
    const bolinhas = [...container.querySelectorAll('[role="meter"] > span.rounded-full')]
    expect(bolinhas.map((b) => b.className.includes('bg-primary'))).toEqual([true, false])
    await act(async () => {})
  })
})
