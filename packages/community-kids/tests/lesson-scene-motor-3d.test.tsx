import { afterEach, describe, expect, test } from 'bun:test'
import type { InteractiveBlock } from '@sistemazero/core/learning'
import { SCENE_MODELS, type SceneId } from '@sistemazero/core/learning/scene'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * O motor e o 3D pelo caminho do ALUNO (consertos dos reviews da onda B do lote 5 do Raio-X, G6): o player
 * de verdade em volta da bancada. Relatório: `tmp/storyboard/implementacao/consertos-5b-g6.md`.
 *
 * ⚠️ O que se confere aqui é o que a renderização estática do member-shell não alcança: o deslizante que
 * só manda o valor quando a mão SOLTA, o ▶ que para sozinho na batida e a chave que abre com a meta.
 */

const rafOriginal = window.requestAnimationFrame
const cafOriginal = window.cancelAnimationFrame
afterEach(() => {
  cleanup()
  localStorage.clear()
  window.requestAnimationFrame = rafOriginal
  window.cancelAnimationFrame = cafOriginal
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
const medidor = () => screen.getByRole('meter').getAttribute('aria-valuenow')

/** O relógio do navegador na mão: cada volta é um quadro de 60 Hz. */
const relogio = () => {
  let fila: FrameRequestCallback[] = []
  window.requestAnimationFrame = (cb) => {
    fila.push(cb)
    return fila.length
  }
  window.cancelAnimationFrame = () => {}
  let agora = 0
  return async (quadros: number) => {
    for (let i = 0; i < quadros; i++) {
      agora += 1000 / 60
      const chamados = fila
      fila = []
      await act(async () => {
        for (const cb of chamados) cb(agora)
      })
    }
  }
}

describe('⚠️⚠️ o deslizante só conta quando a mão SOLTA (MÉDIO-3 do review de correção)', () => {
  test('camera-3d: arrastar a volta passando por "de frente" não derruba a meta de uma cor só', async () => {
    abrir('camera-3d')
    const volta = (await screen.findByRole('slider', {
      name: 'volta da câmera',
    })) as HTMLInputElement
    await waitFor(() => expect(medidor()).toBe('0'))
    // A volta 1 é de frente (uma cor, o `revealOn` da previsão); a 6 é um canto (duas cores).
    fireEvent.change(volta, { target: { value: '0' } })
    fireEvent.change(volta, { target: { value: '5' } })
    // O número à vista acompanha o dedo, e o motor ainda não recebeu nada.
    expect(volta.getAttribute('aria-valuetext')).toBe('6 de 8')
    expect(medidor()).toBe('0')
    fireEvent.pointerUp(volta)
    // Soltou num canto: só "duas cores" caiu, e não "uma cor só", que foi só passagem.
    await waitFor(() => expect(medidor()).toBe('1'))
    expect(screen.queryByText(/A câmera está bem de frente/)).toBeNull()
    // A seta do teclado é um gesto inteiro: o valor vai ao soltar a tecla.
    fireEvent.change(volta, { target: { value: '0' } })
    fireEvent.keyUp(volta, { key: 'ArrowLeft' })
    await waitFor(() => expect(medidor()).toBe('2'))
  })

  test('pick-ray: arrastar a mira passando por "uma cobre a outra" não acende nada', async () => {
    abrir('pick-ray')
    const lados = (await screen.findByRole('slider', {
      name: 'a mira, para os lados',
    })) as HTMLInputElement
    const altura = screen.getByRole('slider', { name: 'a mira, para cima e para baixo' })
    await waitFor(() => expect(medidor()).toBe('0'))
    // A mira abre embaixo de tudo (240, 235): primeiro para a direita, longe das caixas, e depois sobe.
    fireEvent.change(lados, { target: { value: '460' } })
    fireEvent.pointerUp(lados)
    await waitFor(() => expect(lados.value).toBe('460'))
    fireEvent.change(altura, { target: { value: '155' } })
    fireEvent.pointerUp(altura)
    await waitFor(() => expect((altura as HTMLInputElement).value).toBe('155'))
    expect(medidor()).toBe('0')
    // Em x 330, y 155 a caixa B cobre a A (a meta que responde a previsão); em 460 não há caixa.
    fireEvent.change(lados, { target: { value: '330' } })
    fireEvent.change(lados, { target: { value: '460' } })
    fireEvent.pointerUp(lados)
    await waitFor(() => expect(lados.value).toBe('460'))
    expect(medidor()).toBe('0')
    expect(await screen.findByText('Nada no caminho: a reta foi até o fim.')).toBeTruthy()
    // Soltando ONDE uma cobre a outra, aí sim.
    fireEvent.change(lados, { target: { value: '330' } })
    fireEvent.pointerUp(lados)
    await waitFor(() => expect(medidor()).toBe('1'))
  })
})

describe('circle-collision: o ▶ para sozinho na batida (MÉDIO do review de experiência)', () => {
  test('⚠️⚠️ com o tempo solto, os dois param encostando e o ▶ volta a "Soltar o tempo"', async () => {
    const tocar = relogio()
    abrir('circle-collision')
    fireEvent.click(await screen.findByRole('button', { name: 'Soltar o tempo' }))
    expect(await screen.findByRole('button', { name: 'Parar o tempo' })).toBeTruthy()
    // 140 → 60 a 20 por segundo são 4 s; o relógio anda mais que isso.
    await tocar(60 * 6)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Soltar o tempo' })).toBeTruthy())
    expect(
      await screen.findByText(
        'Distância 60. Raios 30 + 30 = 60. A fila dos raios alcançou o outro centro.',
      ),
    ).toBeTruthy()
    // Apertar ▶ de novo, encostados, não mexe em nada e para na hora.
    fireEvent.click(screen.getByRole('button', { name: 'Soltar o tempo' }))
    await tocar(30)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Soltar o tempo' })).toBeTruthy())
    expect(screen.getAllByText(/Distância 60\./).length).toBeGreaterThan(0)
  })
})

describe('pool: a chave da reciclagem abre com os 3 cactos (MÉDIO do review de experiência)', () => {
  test('⚠️ fechada com o motivo, no Tab, e aberta depois de 3 cactos passarem', async () => {
    const tocar = relogio()
    abrir('pool')
    const chave = await screen.findByRole('button', { name: 'Reciclar quem saiu: desligado' })
    expect(chave.getAttribute('aria-disabled')).toBe('true')
    const motivo = document.getElementById(chave.getAttribute('aria-describedby') ?? '')
    expect(motivo?.textContent).toBe('Abre depois que 3 cactos passarem.')
    // Fechada não liga.
    fireEvent.click(chave)
    expect(screen.getByRole('button', { name: 'Reciclar quem saiu: desligado' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Soltar o tempo' }))
    await tocar(60 * 4)
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: 'Reciclar quem saiu: desligado' })
          .getAttribute('aria-disabled'),
      ).toBeNull(),
    )
  })
})
