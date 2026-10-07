import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { gradeLearningQuiz } from '@sistemazero/core/learning'
import { falasDoQuiz, vozesPublicasDoQuiz } from '@sistemazero/core/learning/scene'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { KidsQuiz } from '../src/components/kids/kids-quiz'

/**
 * ⭐⭐ A voz do Zappy no QUIZ, de ponta a ponta: o dicionário é montado com a MESMA função que o
 * botão do admin usa (`falasDoQuiz`), o GET leva só o que `vozesPublicasDoQuiz` deixa sair, e o
 * MP3 da explicação chega na resposta do envio. Se o gerador e o player divergirem num caractere,
 * o Zappy fica calado sem erro nenhum — é isso que este teste impede.
 */

afterEach(() => cleanup())

function audioFalso() {
  const tocados: string[] = []
  class AudioFalso {
    src = ''
    onended: (() => void) | null = null
    onerror: (() => void) | null = null
    play() {
      tocados.push(this.src)
      return Promise.resolve()
    }
    pause() {}
    load() {}
    removeAttribute() {
      this.src = ''
    }
  }
  const original = globalThis.Audio
  globalThis.Audio = AudioFalso as unknown as typeof Audio
  return {
    tocados,
    restaurar: () => {
      globalThis.Audio = original
    },
  }
}

function sinteseFalsa() {
  const janela = window as unknown as Record<string, unknown>
  const vozOriginal = janela.speechSynthesis
  const falaOriginal = janela.SpeechSynthesisUtterance
  const falas: string[] = []
  class Fala {
    lang = ''
    voice: unknown = null
    onend: (() => void) | null = null
    onerror: (() => void) | null = null
    constructor(public text: string) {}
  }
  janela.speechSynthesis = {
    getVoices: () => [{ lang: 'pt-BR', name: 'Luciana' }],
    cancel: () => {},
    speak: (f: Fala) => falas.push(f.text),
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  janela.SpeechSynthesisUtterance = Fala
  return {
    falas,
    restaurar: () => {
      janela.speechSynthesis = vozOriginal
      janela.SpeechSynthesisUtterance = falaOriginal
    },
  }
}

const autoral = {
  kind: 'quiz' as const,
  passingScore: 100,
  questions: [
    {
      id: 'q1',
      prompt: 'O que faz o **Dino** cair?',
      choices: [
        { id: 'a', label: 'A gravidade' },
        { id: 'b', label: 'A cor' },
      ],
      correctChoiceIds: ['a'],
      explanation: 'A gravidade puxa o Dino para baixo.',
    },
  ],
}
const url = (slot: string) => `https://cdn.test/aulas/voz/${slot}.mp3`
const vozes = Object.fromEntries(falasDoQuiz(autoral).map((f) => [f.key, url(f.slot)]))
/** O bloco como o GET o entrega: sem gabarito, e só com a voz das perguntas. */
const publico = {
  kind: 'quiz' as const,
  passingScore: 100,
  questions: autoral.questions.map(({ id, prompt, choices }) => ({ id, prompt, choices })),
  vozes: vozesPublicasDoQuiz({ ...autoral, vozes }),
}

describe('a voz do Zappy no quiz', () => {
  test('⭐⭐ a pergunta toca o MP3 do Zappy, e a explicação toca o MP3 que veio na correção', async () => {
    const audio = audioFalso()
    const sintese = sinteseFalsa()
    const nota = gradeLearningQuiz({ ...autoral, vozes }, { q1: ['b'] })
    const fetch = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ ...nota, attemptsCount: 1, retryAvailableAt: null, gamification: null }),
    )
    try {
      expect(JSON.stringify(publico)).not.toContain(url('explanation'))
      render(<KidsQuiz blockId="quiz" content={publico} quizState={null} />)
      fireEvent.click(screen.getByRole('button', { name: 'Começar!' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Ouvir' }))
      await waitFor(() => expect(audio.tocados).toEqual([url('question')]))

      fireEvent.click(screen.getByRole('radio', { name: /A cor/ }))
      fireEvent.click(screen.getByRole('button', { name: 'Responder!' }))
      fireEvent.click(
        await screen.findByRole('button', { name: 'Ouvir a explicação da pergunta 1' }),
      )
      await waitFor(() => expect(audio.tocados).toEqual([url('question'), url('explanation')]))
      expect(sintese.falas).toEqual([])
    } finally {
      fetch.mockRestore()
      audio.restaurar()
      sintese.restaurar()
    }
  })

  test('sem voz gravada, o navegador lê a pergunta com as letras das cartas', async () => {
    const audio = audioFalso()
    const sintese = sinteseFalsa()
    try {
      render(
        <KidsQuiz blockId="quiz" content={{ ...publico, vozes: undefined }} quizState={null} />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Começar!' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Ouvir' }))
      expect(sintese.falas.join(' ')).toBe(
        'O que faz o Dino cair? Letra A: A gravidade. Letra B: A cor.',
      )
      expect(audio.tocados).toEqual([])
    } finally {
      audio.restaurar()
      sintese.restaurar()
    }
  })
})
