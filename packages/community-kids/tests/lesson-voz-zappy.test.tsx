import { describe, expect, test } from 'bun:test'
import { publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  chaveDeVoz,
  SCENE_MODELS,
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
  test('⭐⭐ experimentação: o "Ouvir" toca o MP3 gerado, e NÃO a voz do navegador', async () => {
    const audio = audioFalso()
    const sintese = sinteseFalsa()
    try {
      const { bloco, textos } = blocoComVoz('world', 'experimentation')
      expect(textos.length).toBeGreaterThan(0)
      render(
        <InteractiveLessonBlock block={bloco as never} previewContent={bloco.content as never} />,
      )
      fireEvent.click(await screen.findByRole('button', { name: 'Ouvir' }))
      await waitFor(() => expect(audio.tocados.length).toBeGreaterThan(0))
      // ⚠️ A fila inteira, na ordem: é o que prova que cada trecho foi ENCONTRADO no dicionário.
      expect(audio.tocados[0]).toBe(URL_DA_FALA(0))
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
  test('⭐ demonstração: a parte 1 fala a instrução do professor na voz do Zappy', async () => {
    const audio = audioFalso()
    const sintese = sinteseFalsa()
    try {
      const { bloco } = blocoComVoz('world', 'demonstration')
      render(
        <InteractiveLessonBlock block={bloco as never} previewContent={bloco.content as never} />,
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
   * ⚠⚠ A REGRA DO TUDO OU NADA, no caminho real que a produz: a criança pede uma pista, o motor a
   * monta na hora a partir do estado, e esse trecho nunca terá áudio gravado. A leitura INTEIRA sai
   * na voz do navegador — nunca o Zappy dizendo a instrução e a voz do sistema emendando a pista.
   *
   * Este é o teste que MORDE se alguém trocar a regra por "toca o que tiver": o `tocados` vazio é a
   * asserção, e ela falha no instante em que a fila passar a ser parcial.
   */
  test('⚠⚠ com a pista pedida, a fala INTEIRA cai para a voz do navegador', async () => {
    const audio = audioFalso()
    const sintese = sinteseFalsa()
    try {
      const { bloco } = blocoComVoz('world', 'experimentation')
      render(
        <InteractiveLessonBlock block={bloco as never} previewContent={bloco.content as never} />,
      )
      // ⚠️ O palpite pendente FECHA o rodapé inteiro ("Uma pista" incluso): sem responder, o clique
      // abaixo seria mudo e o teste passaria pelo motivo errado.
      const opcoes = await screen.findAllByRole('button')
      const palpite = opcoes.find((b) => (b.textContent ?? '').startsWith('Nos bastidores'))
      if (palpite) fireEvent.click(palpite)
      fireEvent.click(await screen.findByRole('button', { name: 'Uma pista' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Ouvir' }))
      await waitFor(() => expect(sintese.falas.length).toBeGreaterThan(0))
      expect(audio.tocados).toEqual([])
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
