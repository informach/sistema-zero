import { describe, expect, test } from 'bun:test'
import { publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  chaveDeVoz,
  SCENE_MODELS,
  SCENE_QUESTIONS,
  textosFalaveisDaCena,
} from '@sistemazero/core/learning/scene'
import { DialogueBlockView } from '@sistemazero/member-shell/components/dialogue-block'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { LessonPlayerProvider } from '@sistemazero/member-shell/components/lesson-player-context'
import { useZappyFala } from '@sistemazero/member-shell/components/zappy-fala-context'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * ⭐⭐ A BOCA do Zappy obedece ao botão "Ouvir" (17/09/2026).
 *
 * O estado "está falando" nasce no member-shell (`useSceneVoice`) e o mascote é asset do KIDS,
 * injetado no balão por SLOT — entre os dois há um contexto. Este teste prova a LIGAÇÃO ponta a
 * ponta, que é o que quebra em silêncio: se o provider sair de lugar, o Zappy volta a animar
 * sozinho e nenhum outro teste reclama.
 *
 * ⚠️ A sonda entra no lugar do mascote de propósito: assim o teste lê o contexto direto, sem
 * depender do falso global do `mascot-rive-canvas`. O elo kids (a régua `tocandoDoZappy` e a prop
 * que chega ao canvas) é cobrado em `mascot-rive.test.tsx`.
 */
function Sonda() {
  const fala = useZappyFala()
  return (
    <span
      data-sonda="zappy"
      data-pode-falar={String(fala?.podeFalar)}
      data-falando={String(fala?.falando)}
    />
  )
}

const sonda = () => document.querySelector('[data-sonda="zappy"]')
const estado = () => ({
  podeFalar: sonda()?.getAttribute('data-pode-falar'),
  falando: sonda()?.getAttribute('data-falando'),
})

/** O `<audio>` do hook, com o `onended` à mão: é assim que o fim do MP3 chega ao player. */
function audioFalso() {
  const instancias: { src: string; onended: (() => void) | null }[] = []
  class AudioFalso {
    src = ''
    onended: (() => void) | null = null
    onerror: (() => void) | null = null
    constructor() {
      instancias.push(this as unknown as { src: string; onended: (() => void) | null })
    }
    play() {
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
    terminar: () => instancias.at(-1)?.onended?.(),
    restaurar: () => {
      globalThis.Audio = original
    },
  }
}

/** A narração escolhida na autoria usa o elemento `<audio>` do balão, não `new Audio()`. */
function audioDoElementoFalso() {
  const tocados: string[] = []
  let ultimo: HTMLMediaElement | null = null
  const playOriginal = HTMLMediaElement.prototype.play
  const pauseOriginal = HTMLMediaElement.prototype.pause
  HTMLMediaElement.prototype.play = function () {
    ultimo = this
    tocados.push(this.getAttribute('src') ?? '')
    this.dispatchEvent(new Event('play'))
    return Promise.resolve()
  }
  HTMLMediaElement.prototype.pause = function () {
    this.dispatchEvent(new Event('pause'))
  }
  return {
    tocados,
    terminar: () => ultimo?.dispatchEvent(new Event('ended')),
    restaurar: () => {
      HTMLMediaElement.prototype.play = playOriginal
      HTMLMediaElement.prototype.pause = pauseOriginal
    },
  }
}

const TEXTO = 'Oi! Eu sou o Zappy. Vamos criar um jogo?'
const URL_MP3 = 'https://cdn.test/aulas/voz/zappy.mp3'

describe('o balão de fala rege a boca do mascote', () => {
  test('⭐⭐ com voz gravada: "Ouvir" acende, o fim do MP3 apaga', async () => {
    const audio = audioFalso()
    try {
      render(
        <DialogueBlockView
          content={{ kind: 'dialogue', text: TEXTO, vozes: { [chaveDeVoz(TEXTO)]: URL_MP3 } }}
          mascot={<Sonda />}
        />,
      )
      expect(estado()).toEqual({ podeFalar: 'true', falando: 'false' })

      fireEvent.click(await screen.findByRole('button', { name: 'Ouvir' }))
      await waitFor(() => expect(estado().falando).toBe('true'))

      act(() => {
        audio.terminar()
      })
      await waitFor(() => expect(estado().falando).toBe('false'))
    } finally {
      audio.restaurar()
      cleanup()
    }
  })

  test('⭐ "Parar" no meio apaga na hora', async () => {
    const audio = audioFalso()
    try {
      render(
        <DialogueBlockView
          content={{ kind: 'dialogue', text: TEXTO, vozes: { [chaveDeVoz(TEXTO)]: URL_MP3 } }}
          mascot={<Sonda />}
        />,
      )
      fireEvent.click(await screen.findByRole('button', { name: 'Ouvir' }))
      await waitFor(() => expect(estado().falando).toBe('true'))
      fireEvent.click(await screen.findByRole('button', { name: 'Parar' }))
      await waitFor(() => expect(estado().falando).toBe('false'))
    } finally {
      audio.restaurar()
      cleanup()
    }
  })

  test('⭐ a narração escolhida na autoria também rege a boca e para ao terminar', async () => {
    const audio = audioDoElementoFalso()
    try {
      render(
        <DialogueBlockView
          content={{ kind: 'dialogue', text: TEXTO }}
          speech={{ texts: [TEXTO], audioUrl: URL_MP3, fallbackToBrowser: true }}
          mascot={<Sonda />}
        />,
      )
      fireEvent.click(await screen.findByRole('button', { name: 'Ouvir' }))
      await waitFor(() => expect(audio.tocados).toEqual([URL_MP3]))
      expect(estado().falando).toBe('true')

      act(() => {
        audio.terminar()
      })
      await waitFor(() => expect(estado().falando).toBe('false'))
    } finally {
      audio.restaurar()
      cleanup()
    }
  })

  /**
   * ⚠️⚠️ O anti-vácuo, e a decisão dela: balão SEM botão "Ouvir" não é balão parado — é o Zappy
   * animando como sempre animou. `podeFalar` falso é o que devolve o mascote ao regime livre; se
   * alguém trocar por "regido sempre que houver contexto", este teste reprova.
   */
  test('⚠️ sem dicionário: não há botão, e o mascote não é regido', () => {
    try {
      render(<DialogueBlockView content={{ kind: 'dialogue', text: TEXTO }} mascot={<Sonda />} />)
      expect(screen.queryByRole('button', { name: 'Ouvir' })).toBeNull()
      expect(estado()).toEqual({ podeFalar: 'false', falando: 'false' })
    } finally {
      cleanup()
    }
  })
})

describe('a instrução da cena rege a boca pelo renderInstruction', () => {
  /** O bloco como o admin o grava: dicionário montado com a MESMA função do botão da autoria. */
  function blocoDeCena() {
    const modelo = SCENE_MODELS.world
    const publico = publicInteractiveBlock({
      kind: 'interactive' as const,
      title: modelo.title,
      instructions: modelo.instruction,
      hints: [],
      required: false,
      activity: { type: 'experimentation' as const, scene: 'world' as const },
    })
    const vozes = Object.fromEntries(
      textosFalaveisDaCena(publico).map((t, i) => [chaveDeVoz(t), `https://cdn.test/voz/${i}.mp3`]),
    )
    return {
      id: 'discovery',
      blockRevision: 'revision',
      kind: 'interactive',
      sortOrder: 0,
      content: { ...publico, activity: { ...publico.activity, vozes } },
    }
  }

  /**
   * Aqui o balão vem da função do KIDS (`renderInstruction`), exatamente como no app. Depois do
   * palpite, o botão da instrução precisa reger o mesmo mascote e parar no fim da fala.
   */
  test('⭐⭐ o "Ouvir" da instrução acende o mascote do balão', async () => {
    const audio = audioFalso()
    const fetchOriginal = globalThis.fetch
    globalThis.fetch = (() =>
      Promise.resolve(new Response('{}', { status: 200 }))) as unknown as typeof fetch
    try {
      const bloco = blocoDeCena()
      render(
        <LessonPlayerProvider
          value={{
            lessonId: 'lesson',
            courseSlug: 'course',
            viewerId: 'child-a',
            viewerWatermark: null,
            initialPositionSeconds: null,
            renderInstruction: (texto, _pose, speech) => (
              <DialogueBlockView
                content={{ kind: 'dialogue', text: texto }}
                speech={speech}
                mascot={<Sonda />}
              />
            ),
          }}
        >
          <InteractiveLessonBlock block={bloco as never} previewContent={bloco.content as never} />
        </LessonPlayerProvider>,
      )
      await waitFor(() => expect(sonda()).not.toBeNull())
      expect(estado()).toEqual({ podeFalar: 'true', falando: 'false' })

      fireEvent.click(
        await screen.findByRole('button', {
          name: SCENE_QUESTIONS.world.prediction.choices[0]?.label as string,
        }),
      )
      await screen.findByText('Seu palpite:')
      fireEvent.click(await screen.findByRole('button', { name: 'Ouvir' }))
      await waitFor(() => expect(estado().falando).toBe('true'))

      act(() => {
        audio.terminar()
      })
      await waitFor(() => expect(estado().falando).toBe('false'))
    } finally {
      globalThis.fetch = fetchOriginal
      audio.restaurar()
      cleanup()
    }
  })
})
