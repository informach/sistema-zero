import { afterEach, describe, expect, test } from 'bun:test'
import type { InteractiveBlock } from '@sistemazero/core/learning'
import { HUNT_BASE, SCENE_MODELS, type SceneId } from '@sistemazero/core/learning/scene'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * O núcleo do Iniciante 2D pelo caminho do ALUNO (lote 5 do Raio-X, G5): o gesto na bancada e no palco,
 * com o player de verdade em volta.
 *
 * ⚠️ O que se confere aqui é o que a renderização estática do member-shell não alcança: o gesto que
 * SOLTA o tempo (o ▶ vira "Parar o tempo"), o "Andar" que leva o Dino para fora da tela, a paleta e as
 * letras do mapa, e as setas que abrem a correção.
 */

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function content(scene: SceneId): InteractiveBlock {
  const modelo = SCENE_MODELS[scene]
  return {
    kind: 'interactive',
    title: modelo.title,
    instructions: modelo.instruction,
    hints: [],
    required: false,
    activity: { type: 'experimentation', scene },
  }
}
function abrir(scene: SceneId) {
  const c = content(scene)
  return render(
    <InteractiveLessonBlock
      block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
      previewContent={c}
    />,
  )
}
const tempoSolto = () => screen.findByRole('button', { name: 'Parar o tempo' })

describe('⚠️⚠️ o gesto que só se vê com o tempo passando SOLTA o ▶', () => {
  test('hold-vs-press: segurar a tecla', async () => {
    abrir('hold-vs-press')
    fireEvent.pointerDown(await screen.findByRole('button', { name: 'A tecla: solta' }))
    expect(await tempoSolto()).toBeTruthy()
  })

  test('enemy-type: fazer nascer', async () => {
    abrir('enemy-type')
    fireEvent.click(await screen.findByRole('button', { name: 'Fazer nascer mais um' }))
    expect(await tempoSolto()).toBeTruthy()
  })

  test('contact: encostar', async () => {
    abrir('contact')
    fireEvent.click(await screen.findByRole('button', { name: 'Encostar o cacto no Dino' }))
    expect(await tempoSolto()).toBeTruthy()
  })

  test('cooldown e aim: atirar', async () => {
    abrir('cooldown')
    fireEvent.click(await screen.findByRole('button', { name: 'Atirar' }))
    expect(await tempoSolto()).toBeTruthy()
    cleanup()
    abrir('aim')
    fireEvent.click(await screen.findByRole('button', { name: 'Atirar' }))
    expect(await tempoSolto()).toBeTruthy()
  })

  test('group-loop: medir os três, escolher o mais perto, e ligar o laço', async () => {
    abrir('group-loop')
    const laco = await screen.findByRole('button', { name: 'O laço: desligado' })
    expect(laco.getAttribute('aria-disabled')).toBe('true')
    for (const n of [1, 2, 3])
      fireEvent.click(screen.getByRole('button', { name: `Medir o ${n}º` }))
    const distancias: readonly number[] = HUNT_BASE
    const perto = distancias.indexOf(Math.min(...distancias)) + 1
    fireEvent.click(screen.getByRole('button', { name: `Escolher o ${perto}º` }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'O laço: desligado' }).getAttribute('aria-disabled'),
      ).toBeNull(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'O laço: desligado' }))
    expect(await screen.findByRole('button', { name: 'O laço: ligado' })).toBeTruthy()
    expect(await tempoSolto()).toBeTruthy()
  })
})

describe('camera', () => {
  test('⚠️⚠️ "Andar" leva o Dino para fora da tela parada, e a câmera traz a janela junto', async () => {
    const { container } = abrir('camera')
    const direita = await screen.findByRole('button', { name: 'Andar com o Dino para a direita' })
    // O Dino abre em 200: oito passos de 40 passam da borda de 480.
    for (let i = 0; i < 8; i++) fireEvent.click(direita, { detail: 0 })
    await waitFor(() => expect(container.querySelector('[data-seta-da-borda]')).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'A câmera segue o Dino: não' }))
    await waitFor(() => expect(container.querySelector('[data-seta-da-borda]')).toBeNull())
    const janela = () => container.querySelector('[data-janela]')?.getAttribute('data-janela')
    const antes = janela()
    fireEvent.click(direita, { detail: 0 })
    await waitFor(() => expect(janela()).not.toBe(antes))
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('3')
  })
})

describe('diagonal', () => {
  test('⚠️⚠️ andar reto, depois na diagonal, abre a correção, e com ela a diagonal para no círculo', async () => {
    const { container } = abrir('diagonal')
    const correcao = await screen.findByRole('button', {
      name: 'A correção da diagonal: desligada',
    })
    expect(correcao.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Seta para a direita' }))
    fireEvent.click(screen.getByRole('button', { name: 'Andar 1 segundo' }))
    await waitFor(() => expect(container.querySelector('[data-rastro]')).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'Seta para baixo' }))
    expect(
      screen.getByRole('button', { name: 'Seta para baixo' }).getAttribute('aria-pressed'),
    ).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Andar 1 segundo' }))
    await waitFor(() =>
      expect(container.querySelector('[data-fantasma-da-andada="reto"]')).not.toBeNull(),
    )
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: 'A correção da diagonal: desligada' })
          .getAttribute('aria-disabled'),
      ).toBeNull(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'A correção da diagonal: desligada' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Andar 1 segundo' }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('3'))
  })
})

describe('tilemap', () => {
  test('⚠️⚠️ a paleta escolhe a letra, e a casa do TEXTO é o botão que a escreve', async () => {
    const { container } = abrir('tilemap')
    const moedas = () => container.querySelectorAll('[data-peca="o"]').length
    const antes = moedas()
    fireEvent.click(await screen.findByRole('button', { name: 'o moeda' }))
    expect(screen.getByRole('button', { name: 'o moeda' }).getAttribute('aria-current')).toBe(
      'true',
    )
    for (const casa of [4, 5, 6])
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Linha 3, casa ${casa}: `) }))
    await waitFor(() => expect(moedas()).toBe(antes + 3))
    // Trocou letras e escreveu a fileira de moedas: duas descobertas.
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('2'))
    // As setas andam entre as casas (um só no Tab).
    const casa = screen.getByRole('button', { name: /^Linha 1, casa 1: / })
    expect(casa.getAttribute('tabindex')).toBe('0')
    fireEvent.keyDown(casa, { key: 'ArrowDown' })
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /^Linha 2, casa 1: / }).getAttribute('tabindex'),
      ).toBe('0'),
    )
  })
})

/**
 * O relógio do player na mão: o `requestAnimationFrame` só roda quando o teste manda (mesmo molde do
 * `lesson-experimentation.test.tsx`).
 */
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
const descobertas = () => screen.getByRole('meter').getAttribute('aria-valuenow')

describe('consertos do review da onda B do lote 5 (G5): os gestos de verdade', () => {
  test('⚠️⚠️ hold-vs-press (MÉDIO-2): pelo LEITOR DE TELA o toque rápido e a segurada longa são alcançáveis', async () => {
    const relogio = relogioManual()
    try {
      abrir('hold-vs-press')
      const tecla = await screen.findByRole('button', { name: 'A tecla: solta' })
      // O clique do leitor de tela (sem tecla e sem ponteiro) SEGURA sem soltar o ▶.
      fireEvent.click(tecla, { detail: 0 })
      expect(await screen.findByRole('button', { name: 'A tecla: segurada' })).toBeTruthy()
      // (Booleano: o elemento inteiro no recado de falha trava a saída do teste.)
      expect(Boolean(screen.queryByRole('button', { name: 'Parar o tempo' }))).toBe(false)
      expect(
        screen.getByText(
          'Tecla segurada. Ative de novo para soltar, ou solte o tempo e conte até três.',
        ),
      ).toBeTruthy()
      // O NVDA leva o foco junto quando anda: perder o foco não solta a tecla do leitor.
      fireEvent.blur(screen.getByRole('button', { name: 'A tecla: segurada' }))
      expect(screen.getByRole('button', { name: 'A tecla: segurada' })).toBeTruthy()
      // Um segundo inteiro entre as duas ativações, como quem usa leitor de tela: o tempo parado não anda.
      await relogio.tocar(60)
      fireEvent.click(screen.getByRole('button', { name: 'A tecla: segurada' }), { detail: 0 })
      await waitFor(() => expect(descobertas()).toBe('1'))
      // A segurada longa: segura pelo leitor, solta o tempo pelo ▶, conta até três e solta.
      fireEvent.click(screen.getByRole('button', { name: 'A tecla: solta' }), { detail: 0 })
      fireEvent.click(await screen.findByRole('button', { name: 'Soltar o tempo' }))
      await relogio.tocar(90)
      fireEvent.click(screen.getByRole('button', { name: 'A tecla: segurada' }), { detail: 0 })
      await waitFor(() => expect(descobertas()).toBe('3'))
    } finally {
      relogio.restaurar()
    }
  })

  test('⚠️ hold-vs-press e camera (MÉDIO): o toque longo não abre o menu do sistema', async () => {
    abrir('hold-vs-press')
    const tecla = await screen.findByRole('button', { name: 'A tecla: solta' })
    // `false` = o `contextmenu` foi cancelado.
    expect(fireEvent.contextMenu(tecla)).toBe(false)
    expect(tecla.className).toContain('touch-none')
    cleanup()
    abrir('camera')
    const andar = await screen.findByRole('button', { name: 'Andar com o Dino para a direita' })
    expect(fireEvent.contextMenu(andar)).toBe(false)
  })

  test('⚠️⚠️ aim (ALTO): o alvo se arrasta com o DEDO e com o MOUSE, e para no cancelamento', async () => {
    // O desenho ocupa 560 × 300 px a partir do canto: um pixel do ponteiro é uma unidade do desenho.
    const rectOriginal = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = () =>
      ({ left: 0, top: 0, x: 0, y: 0, width: 560, height: 300, right: 560, bottom: 300 }) as DOMRect
    try {
      const { container } = abrir('aim')
      const alvo = () => container.querySelector('desc')?.textContent ?? ''
      await waitFor(() => expect(alvo()).toContain('O alvo está em x 380, y 220.'))
      const alca = () => container.querySelector('[data-alca-do-alvo]') as HTMLElement
      expect(alca().style.touchAction).toBe('none')
      const arrastar = (tipo: string, id: number, de: [number, number], ate: [number, number]) => {
        const base = { pointerId: id, pointerType: tipo, bubbles: true }
        fireEvent.pointerDown(alca(), { ...base, clientX: de[0], clientY: de[1] })
        fireEvent.pointerMove(alca(), { ...base, clientX: (de[0] + ate[0]) / 2, clientY: de[1] })
        fireEvent.pointerMove(alca(), { ...base, clientX: ate[0], clientY: ate[1] })
        fireEvent.pointerUp(alca(), { ...base, clientX: ate[0], clientY: ate[1] })
      }
      // O dedo: o alvo vai de (380, 220) para onde o dedo soltou, de 10 em 10.
      arrastar('touch', 1, [420, 235], [200, 100])
      await waitFor(() => expect(alvo()).toContain('O alvo está em x 160, y 90.'))
      // O mouse: o mesmo gesto, e o `click` que o navegador manda depois não desfaz nada.
      arrastar('mouse', 2, [200, 105], [300, 200])
      fireEvent.click(alca())
      await waitFor(() => expect(alvo()).toContain('O alvo está em x 260, y 190.'))
      // Um toque PARADO (2 px de tremida) não empurra o alvo: sem a folga, ele iria para x 270.
      arrastar('touch', 3, [304, 205], [306, 206])
      expect(alvo()).toContain('O alvo está em x 260, y 190.')
      // Cancelado, o arrasto acaba: o ponteiro que continua se movendo não leva mais o alvo.
      const base = { pointerId: 4, pointerType: 'touch', bubbles: true }
      fireEvent.pointerDown(alca(), { ...base, clientX: 300, clientY: 205 })
      fireEvent.pointerMove(alca(), { ...base, clientX: 360, clientY: 205 })
      await waitFor(() => expect(alvo()).toContain('O alvo está em x 320, y 190.'))
      fireEvent.pointerCancel(alca(), base)
      fireEvent.pointerMove(alca(), { ...base, clientX: 120, clientY: 60 })
      expect(alvo()).toContain('O alvo está em x 320, y 190.')
      // A folga da borda: arrastar para o canto não leva o alvo para fora da tela do jogo.
      arrastar('mouse', 5, [360, 205], [0, 0])
      await waitFor(() => expect(alvo()).toContain('O alvo está em x 20, y 20.'))
    } finally {
      HTMLElement.prototype.getBoundingClientRect = rectOriginal
    }
  })
})
