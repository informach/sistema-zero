import { afterEach, describe, expect, test } from 'bun:test'
import { type InteractiveBlock, publicInteractiveBlock } from '@sistemazero/core/learning'
import { SCENE_MODELS, type SceneActivity } from '@sistemazero/core/learning/scene'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { LugarReservado } from '@sistemazero/member-shell/components/scene-lugar-reservado'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * Os consertos da MOLDURA do review da onda B do lote 5 do Raio-X (16/09/2026), pelo player de verdade.
 *
 * Relatório: `tmp/storyboard/implementacao/consertos-5b-moldura.md`. T1: concluir não congela o mundo.
 * T2: os avisos e a frase embaixo do palco nunca empurram a bancada no meio do gesto (aqui por estado e
 * com o `ResizeObserver` falso; a medida de caixa no Chromium está no relatório). T4: o anel de foco do
 * "Agora explique" com respiro. Cada teste reprova sem o conserto dele (conferido desfazendo).
 */

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function bloco(
  activity: SceneActivity,
  prediction?: InteractiveBlock['prediction'],
): InteractiveBlock {
  const modelo = SCENE_MODELS[activity.scene]
  return {
    kind: 'interactive',
    title: modelo.title,
    instructions: modelo.instruction,
    hints: [],
    required: false,
    activity,
    ...(prediction ? { prediction } : {}),
  }
}
/** A prévia do professor: o player inteiro, com o avaliador de verdade e sem servidor. */
function abrir(conteudo: InteractiveBlock, publico = false) {
  return render(
    <InteractiveLessonBlock
      block={{
        id: 'b',
        blockRevision: 'r',
        kind: 'interactive',
        sortOrder: 0,
        content: publico ? publicInteractiveBlock(conteudo) : conteudo,
      }}
      previewContent={conteudo}
    />,
  )
}
/** O relógio do navegador na mão: cada `tocar(n)` roda `n` quadros a 60 Hz. */
function relogioManual() {
  const rafOriginal = window.requestAnimationFrame
  const cafOriginal = window.cancelAnimationFrame
  const fila = new Map<number, FrameRequestCallback>()
  let proximo = 0
  let agora = 0
  window.requestAnimationFrame = (cb) => {
    proximo += 1
    fila.set(proximo, cb)
    return proximo
  }
  window.cancelAnimationFrame = (id) => {
    fila.delete(id)
  }
  return {
    async tocar(quadros: number) {
      for (let i = 0; i < quadros; i++) {
        agora += 1000 / 60
        const chamados = [...fila.values()]
        fila.clear()
        await act(async () => {
          for (const cb of chamados) cb(agora)
        })
      }
    },
    restaurar() {
      window.requestAnimationFrame = rafOriginal
      window.cancelAnimationFrame = cafOriginal
    },
  }
}
/** O valor de uma medida da faixa de estado, pelo nome. */
const naFaixa = (nome: string) =>
  [...document.querySelectorAll('dt')].find((dt) => dt.textContent === nome)?.nextElementSibling
    ?.textContent ?? ''

describe('T1 · concluir NÃO para o relógio: o que a criança devia olhar continua acontecendo', () => {
  test('⚠️⚠️ spawn (missão de uma meta): a parede cai com o ▶ andando, e segue crescendo depois de "Você descobriu!"', async () => {
    const relogio = relogioManual()
    try {
      abrir(bloco({ type: 'experimentation', scene: 'spawn', setup: { goals: ['every-frame'] } }))
      fireEvent.click(await screen.findByRole('button', { name: 'Soltar o tempo' }))
      // Um segundo inteiro com "a cada quadro" é a meta; 80 quadros a 60 Hz passam dele.
      await relogio.tocar(80)
      // ⚠️ `findAll`: a mesma frase também está na região de anúncios (sr-only).
      expect((await screen.findAllByText('Você descobriu!')).length).toBeGreaterThan(0)
      // Sem o conserto a conclusão desligava o ▶ aqui ("Soltar o tempo") e a parede congelava.
      expect(screen.getByRole('button', { name: 'Parar o tempo' })).toBeTruthy()
      const antes = Number(naFaixa('nasceram'))
      await relogio.tocar(12)
      expect(Number(naFaixa('nasceram'))).toBeGreaterThan(antes)
      // E ela continua podendo parar quando quiser.
      fireEvent.click(screen.getByRole('button', { name: 'Parar o tempo' }))
      expect(await screen.findByRole('button', { name: 'Soltar o tempo' })).toBeTruthy()
    } finally {
      relogio.restaurar()
    }
  })
})

/**
 * Um `ResizeObserver` que a gente dispara: o happy-dom não faz layout, então quem diz a altura é o teste.
 * ⚠️ Restaurado no fim de cada teste (o `bun:test` não isola globais entre arquivos).
 */
function observadorFalso() {
  const original = globalThis.ResizeObserver
  const vivos = new Map<Element, ResizeObserverCallback>()
  class Falso {
    constructor(private readonly cb: ResizeObserverCallback) {}
    observe(el: Element) {
      vivos.set(el, this.cb)
    }
    unobserve(el: Element) {
      vivos.delete(el)
    }
    disconnect() {
      for (const [el, cb] of vivos) if (cb === this.cb) vivos.delete(el)
    }
  }
  globalThis.ResizeObserver = Falso as unknown as typeof ResizeObserver
  return {
    /** O navegador mediu `el` com esta caixa de conteúdo. */
    medir(el: Element, width: number, height: number) {
      const cb = vivos.get(el)
      if (!cb) throw new Error('elemento sem observador')
      act(() => {
        cb([{ target: el, contentRect: { width, height } } as ResizeObserverEntry], {} as never)
      })
    },
    restaurar() {
      globalThis.ResizeObserver = original
    },
  }
}

describe('T2 · o lugar que só cresce (a peça da moldura)', () => {
  test('⚠️⚠️ o conteúdo encolhe e o lugar NÃO; muda a largura e a conta recomeça', () => {
    const ro = observadorFalso()
    try {
      const { container } = render(
        <LugarReservado marca="teste">
          <p>frase</p>
        </LugarReservado>,
      )
      const fora = container.querySelector<HTMLElement>('[data-lugar-reservado="teste"]')
      const dentro = fora?.firstElementChild as HTMLElement
      if (!fora) throw new Error('sem lugar')
      ro.medir(dentro, 600, 44)
      expect(fora.style.minHeight).toBe('44px')
      // O "trocar" saiu, a frase voltou a uma linha: o lugar segura os 44.
      ro.medir(dentro, 600, 20)
      expect(fora.style.minHeight).toBe('44px')
      ro.medir(dentro, 600, 64)
      expect(fora.style.minHeight).toBe('64px')
      // Girou o celular: a altura de antes era de outra quebra de linha.
      ro.medir(dentro, 390, 40)
      expect(fora.style.minHeight).toBe('40px')
    } finally {
      ro.restaurar()
    }
  })

  test('⚠️⚠️ o molde reserva a altura do aviso ANTES de ele aparecer, e nunca fica no documento', () => {
    const ro = observadorFalso()
    const medidaOriginal = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      // O molde (e só ele) tem 96px: o selo e a frase do palpite juntos.
      const altura = this.textContent?.includes('Você achou') ? 96 : 0
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
    try {
      const { container } = render(
        <LugarReservado marca="avisos" molde={<p>Você achou: a resposta.</p>} chave="1">
          {null}
        </LugarReservado>,
      )
      const fora = container.querySelector<HTMLElement>('[data-lugar-reservado="avisos"]')
      expect(fora?.style.minHeight).toBe('96px')
      // A resposta do palpite não fica escondida no DOM (a busca por texto a acharia).
      expect(screen.queryByText(/Você achou/)).toBeNull()
      // O aviso de verdade vem e vai: o lugar não encolhe.
      ro.medir(fora?.firstElementChild as HTMLElement, 600, 0)
      expect(fora?.style.minHeight).toBe('96px')
    } finally {
      HTMLElement.prototype.getBoundingClientRect = medidaOriginal
      ro.restaurar()
    }
  })
})

describe('T2 · no player, nada acima da bancada entra ou sai do fluxo no meio do gesto', () => {
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

  test('⚠️⚠️ os avisos NÃO reservam lugar: entram SOBRE o palco e saem no gesto seguinte; o palpite e a frase seguem nos lugares que só crescem', async () => {
    // ⚠️ Mudou de propósito (full review de experiência, M2): o lugar reservado dos avisos ficava VAZIO
    // logo depois do palpite (36 a 140 px de buraco entre o palco e a bancada). Os avisos passaram a ser
    // sobrepostos ao pé do palco, e nada entra ou sai do fluxo por causa deles.
    const { container } = abrir(bloco({ type: 'experimentation', scene: 'world' }, PALPITE), true)
    const lugar = () => container.querySelector('[data-lugar-reservado="avisos"]')
    const sobre = () => container.querySelector('[data-avisos-sobre-o-palco]')
    fireEvent.click(await screen.findByRole('button', { name: 'O Dino aparece' }))
    await waitFor(() => expect(screen.getByText('Seu palpite:')).toBeTruthy())
    expect(lugar()).toBeNull()
    expect(sobre()).toBeNull()
    expect(screen.queryByText(/Você achou/)).toBeNull()
    // A linha do palpite e a frase da situação moram nos lugares que só crescem.
    const linha = screen.getByText('Seu palpite:').closest('[data-lugar-reservado="palpite"]')
    expect(linha).not.toBeNull()
    expect(
      container.querySelector('[data-lugar-reservado="situacao"] p[role="status"]'),
    ).not.toBeNull()

    // O gesto que responde o palpite: o selo e a frase entram SOBRE o palco.
    fireEvent.click(await screen.findByRole('button', { name: '＋ Criar Dino' }))
    const retomado = 'Você achou: O Dino aparece. Olhe a tela: ela ficou vazia.'
    await waitFor(() => expect(screen.getByText(retomado)).toBeTruthy())
    expect(lugar()).toBeNull()
    expect(sobre()?.contains(screen.getByText('Descoberta 1 de 2'))).toBe(true)
    expect(sobre()?.className.split(/\s+/)).toContain('absolute')
    // O mesmo lugar da linha do palpite (agora no passado, sem o "trocar").
    expect(screen.getByText('Seu palpite:').closest('[data-lugar-reservado="palpite"]')).toBe(linha)

    // O gesto seguinte tira os avisos.
    fireEvent.click(screen.getByRole('button', { name: /Desenhar o Dino na tela/ }))
    await waitFor(() => expect(screen.queryByText(retomado)).toBeNull())
    expect(sobre()).toBeNull()
  })
})

describe('T4 · o anel de foco do "Agora explique" tem respiro', () => {
  test('⚠️ a pergunta e a faixa ganham folga sem sair do alinhamento', async () => {
    const relogio = relogioManual()
    try {
      abrir(
        bloco({ type: 'experimentation', scene: 'spawn', setup: { goals: ['every-frame'] } }),
        true,
      )
      fireEvent.click(await screen.findByRole('button', { name: 'Uma parede de cactos' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Soltar o tempo' }))
      await relogio.tocar(80)
      const legenda = (await screen.findByText('Agora explique')).closest('legend')
      expect(legenda?.hasAttribute('data-anel-com-respiro')).toBe(true)
      const classes = legenda?.className.split(/\s+/) ?? []
      // Folga dos dois lados e embaixo, e a margem negativa que devolve o texto ao lugar.
      for (const c of ['px-2', 'py-1', '-mx-2', 'w-[calc(100%+1rem)]', 'focus:ring-2'])
        expect(classes).toContain(c)
      const faixa = document.querySelector('p[data-anel-com-respiro]')
      for (const c of ['px-2', '-mx-2', 'focus:ring-2'])
        expect(faixa?.className.split(/\s+/)).toContain(c)
    } finally {
      relogio.restaurar()
    }
  })
})
