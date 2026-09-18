import { describe, expect, test } from 'bun:test'
import { publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  chaveDeVoz,
  SCENE_MODELS,
  SCENE_QUESTIONS,
  type SceneId,
  textosFalaveisDaCena,
} from '@sistemazero/core/learning/scene'
import { DialogueBlockView } from '@sistemazero/member-shell/components/dialogue-block'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * ⭐⭐ O CONTRATO entre o gerador da voz (admin) e o player: o áudio gravado é encontrado.
 *
 * ⚠️⚠️ A chave do dicionário é o TEXTO FALADO, então gerador e player precisam produzir a mesma
 * string, caractere por caractere. Nada avisa quando eles divergem: o dicionário simplesmente não
 * responde, a fala cai na voz do navegador e ninguém vê erro nenhum — o defeito mais caro desta
 * feature, porque parece que "a voz não foi gerada". Este teste monta o dicionário com a MESMA
 * função que o botão do admin usa (`textosFalaveisDaCena`) e prova que o clique toca o MP3.
 *
 * ⚠️ Mora no community-kids (e não no member-shell) porque o contrato atravessa os dois pacotes e o
 * teste de contrato mora no consumidor — a mesma régua do resto da casa.
 */

/** O `<audio>` do hook: registra o que tocou e nunca toca de verdade (happy-dom não toca mídia). */
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
  const restaurar = () => {
    globalThis.Audio = original
  }
  return { tocados, restaurar }
}

/** A voz do navegador, para provar que ela NÃO foi usada quando o Zappy cobre a fala. */
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

const URL_DA_FALA = (i: number) => `https://cdn.test/aulas/voz/${i}.mp3`

/**
 * O bloco como o admin o grava: o dicionário sai de `textosFalaveisDaCena` sobre a PROJEÇÃO
 * PÚBLICA — exatamente o que o `voz-zappy-button.tsx` faz.
 */
function blocoComVoz(scene: SceneId, tipo: 'experimentation' | 'demonstration') {
  const modelo = SCENE_MODELS[scene]
  const cru = {
    kind: 'interactive' as const,
    title: modelo.title,
    instructions: modelo.instruction,
    hints: [],
    required: false,
    activity: { type: tipo, scene },
  }
  const publico = publicInteractiveBlock(cru)
  const textos = textosFalaveisDaCena(publico)
  const vozes = Object.fromEntries(textos.map((t, i) => [chaveDeVoz(t), URL_DA_FALA(i)]))
  return {
    bloco: {
      id: 'discovery',
      blockRevision: 'revision',
      kind: 'interactive',
      sortOrder: 0,
      content: { ...publico, activity: { ...publico.activity, vozes } },
    },
    textos,
    vozes,
  }
}

describe('a voz do Zappy chega ao player', () => {
  test('⭐⭐ experimentação: os "Ouvir" tocam os MP3s gerados, e NÃO a voz do navegador', async () => {
    const audio = audioFalso()
    const sintese = sinteseFalsa()
    try {
      const { bloco, textos } = blocoComVoz('world', 'experimentation')
      expect(textos.length).toBeGreaterThan(0)
      render(
        <InteractiveLessonBlock block={bloco as never} previewContent={bloco.content as never} />,
      )
      // Antes de escolher há dois balões: o contexto e, depois da prévia, a pergunta com as
      // escolhas. A instrução gravada da aula ainda não foi mostrada para a criança.
      const ouvirDoPalpite = await screen.findAllByRole('button', { name: 'Ouvir' })
      expect(ouvirDoPalpite).toHaveLength(2)
      fireEvent.click(ouvirDoPalpite[0] as HTMLButtonElement)
      await waitFor(() => expect(audio.tocados.length).toBeGreaterThan(0))
      expect(audio.tocados[0]).toBe(URL_DA_FALA(1))
      fireEvent.click(ouvirDoPalpite[1] as HTMLButtonElement)
      await waitFor(() => expect(audio.tocados.length).toBeGreaterThan(1))
      expect(audio.tocados[1]).toBe(URL_DA_FALA(2))
      fireEvent.click(
        screen.getByRole('button', {
          name: SCENE_QUESTIONS.world.prediction.choices[0]?.label as string,
        }),
      )
      fireEvent.click(await screen.findByRole('button', { name: 'Ouvir' }))
      await waitFor(() => expect(audio.tocados.length).toBeGreaterThan(2))
      expect(audio.tocados[2]).toBe(URL_DA_FALA(0))
      // ⚠️⚠️ O anti-vácuo desta suíte: se o dicionário não respondesse, a fala cairia na síntese e
      // o teste acima continuaria verde com zero MP3 tocado — por isso a voz do navegador precisa
      // ter ficado CALADA.
      expect(sintese.falas).toEqual([])
    } finally {
      audio.restaurar()
      sintese.restaurar()
      cleanup()
    }
  })

  /**
   * ⚠️ A demonstração TAMBÉM fala na voz do Zappy — e o motivo não é óbvio: na PARTE 1 a legenda
   * da cena é a própria instrução do professor (a legenda da parte só entra DEPOIS de ela tocar,
   * porque descreve o resultado). É exatamente o momento em que a criança aperta "Ouvir" para saber
   * o que vai acontecer.
   */
  test('⭐ demonstração: depois do palpite, a instrução da parte 1 fala na voz do Zappy', async () => {
    const audio = audioFalso()
    const sintese = sinteseFalsa()
    try {
      const { bloco } = blocoComVoz('world', 'demonstration')
      render(
        <InteractiveLessonBlock block={bloco as never} previewContent={bloco.content as never} />,
      )
      fireEvent.click(
        await screen.findByRole('button', {
          name: SCENE_QUESTIONS.world.prediction.choices[0]?.label as string,
        }),
      )
      fireEvent.click(await screen.findByRole('button', { name: 'Ouvir' }))
      await waitFor(() => expect(audio.tocados.length).toBeGreaterThan(0))
      expect(audio.tocados[0]).toBe(URL_DA_FALA(0))
      expect(sintese.falas).toEqual([])
    } finally {
      audio.restaurar()
      sintese.restaurar()
      cleanup()
    }
  })

  /**
   * A pista não entra na fala da instrução. Assim, pedir ajuda não troca a voz do Zappy pela voz do
   * navegador nem faz o botão repetir texto de outra etapa.
   */
  test('⚠⚠ com a pista pedida, "Ouvir" continua sendo só a instrução gravada', async () => {
    const audio = audioFalso()
    const sintese = sinteseFalsa()
    try {
      const { bloco } = blocoComVoz('world', 'experimentation')
      render(
        <InteractiveLessonBlock block={bloco as never} previewContent={bloco.content as never} />,
      )
      // A pista só existe depois do palpite, junto da descoberta aberta.
      const opcoes = await screen.findAllByRole('button')
      const palpite = opcoes.find((b) => (b.textContent ?? '').startsWith('Nos bastidores'))
      if (palpite) fireEvent.click(palpite)
      fireEvent.click(await screen.findByRole('button', { name: 'Uma pista' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Ouvir' }))
      await waitFor(() => expect(audio.tocados.length).toBeGreaterThan(0))
      expect(audio.tocados).toEqual([URL_DA_FALA(0)])
      expect(sintese.falas).toEqual([])
    } finally {
      audio.restaurar()
      sintese.restaurar()
      cleanup()
    }
  })

  /**
   * ⭐ O balão do Zappy é o MAIOR volume da plataforma (91 blocos nos 27 manifestos v6) e o caso mais
   * óbvio de todos: é ele quem está falando.
   *
   * ⚠⚠ Aqui NÃO há queda para a voz do navegador, e é deliberado: sem áudio o botão nem aparece.
   * Na instrução da cena o botão é muleta de quem ainda não lê e qualquer voz serve; no balão ele é
   * a voz do PERSONAGEM, e a do sistema seria outro personagem falando no lugar dele.
   */
  test('⭐ balão do Zappy: toca o MP3, e sem dicionário não oferece botão', async () => {
    const audio = audioFalso()
    const sintese = sinteseFalsa()
    try {
      const texto = 'Oi! Eu sou o Zappy. Vamos criar um jogo?'
      const url = 'https://cdn.test/aulas/voz/zappy.mp3'
      render(
        <DialogueBlockView
          content={{ kind: 'dialogue', text: texto, vozes: { [chaveDeVoz(texto)]: url } }}
        />,
      )
      fireEvent.click(await screen.findByRole('button', { name: 'Ouvir' }))
      await waitFor(() => expect(audio.tocados).toEqual([url]))
      expect(sintese.falas).toEqual([])
      cleanup()

      // Sem dicionário: o texto continua lá, o botão não.
      render(<DialogueBlockView content={{ kind: 'dialogue', text: texto }} />)
      expect(screen.getByText(texto)).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Ouvir' })).toBeNull()
    } finally {
      audio.restaurar()
      sintese.restaurar()
      cleanup()
    }
  })
})
