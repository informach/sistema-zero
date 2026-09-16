'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Setas, triângulos, marcas e emoji: a voz lê "triângulo preto apontando para a direita". */
const SIMBOLOS = /[←-⇿─-➿⬀-⯿\u{1F300}-\u{1FAFF}]/gu

/**
 * "🔊 Ouvir": a instrução e a pista na voz do navegador, para quem ainda não lê.
 *
 * ⭐ Decisão da dona (Raio-X, lote 2): nenhum uso de cena em aula tem `instructionAudioUrl`, então
 * o botão "Ouvir instrução" nunca aparecia e a criança que não lê não tinha caminho nenhum por
 * áudio. Sem áudio gravado, a síntese de voz do próprio navegador lê em pt-BR.
 *
 * ⚠️⚠️ NUNCA quebra e cai em SILÊNCIO sem voz em português: com vozes carregadas e nenhuma pt, a
 * fala sairia num sotaque inglês lendo português, pior que nada. Com a lista ainda vazia (o Chrome
 * carrega as vozes depois), o pedido vai com `lang = 'pt-BR'` e o navegador escolhe.
 *
 * ⚠️ `disponivel` nasce FALSO também no cliente e só liga depois de montar: ler `speechSynthesis`
 * no render daria um botão no cliente que o servidor não desenhou (erro de hidratação).
 */
export function useSceneVoice() {
  const [disponivel, setDisponivel] = useState(false)
  /**
   * ⚠️⚠️ `temVoz`: a API existe E a lista de vozes não diz que falta o português (consertos do review da
   * onda A do lote 5, B4). `disponivel` é só "existe a API", e com vozes carregadas sem nenhuma pt o
   * `falar` desiste em silêncio: a `screen-reader` mostrava "Voz: ligada" e nada falava. Recalculado no
   * `voiceschanged`, porque o Chrome carrega a lista depois. Lista ainda vazia conta como voz (o pedido
   * sai com `lang` pt-BR e o navegador escolhe).
   */
  const [temVoz, setTemVoz] = useState(false)
  const [falando, setFalando] = useState(false)
  /** ⚠️ A fila de voz é do NAVEGADOR: cancelar sem ser o dono calaria outra cena da página. */
  const dono = useRef(false)
  /**
   * ⚠️ As falas precisam de uma referência VIVA enquanto tocam: o Chrome recolhe uma
   * `SpeechSynthesisUtterance` sem dono antes do fim, e aí o `onend` nunca chega e o botão fica
   * preso em "Parar" (review do lote 2).
   */
  const atual = useRef<SpeechSynthesisUtterance[] | null>(null)
  useEffect(() => {
    const existe =
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof window.SpeechSynthesisUtterance === 'function'
    setDisponivel(existe)
    if (!existe) return
    const synth = window.speechSynthesis
    const conferir = () => {
      try {
        const vozes = synth.getVoices()
        setTemVoz(vozes.length === 0 || vozes.some((v) => v.lang?.toLowerCase().startsWith('pt')))
      } catch {
        setTemVoz(false)
      }
    }
    conferir()
    synth.addEventListener?.('voiceschanged', conferir)
    return () => synth.removeEventListener?.('voiceschanged', conferir)
  }, [])
  const parar = useCallback(() => {
    if (!dono.current) return
    dono.current = false
    atual.current = null
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* navegador sem voz: nada a parar */
    }
    setFalando(false)
  }, [])
  const falar = useCallback((textos: readonly string[]) => {
    try {
      const synth = window.speechSynthesis
      const texto = textos
        .map((t) => t.replace(SIMBOLOS, ' ').trim())
        .filter(Boolean)
        .join(' ')
      if (!synth || !texto) return
      const vozes = synth.getVoices()
      const voz = vozes.find((v) => v.lang?.toLowerCase().startsWith('pt'))
      if (vozes.length > 0 && !voz) return
      synth.cancel()
      // ⚠️ Uma fala por FRASE: o Chrome corta uma fala longa (~15 s) sem disparar evento nenhum, e
      // com a pergunta do palpite e as opções o texto passa disso.
      const falas = texto
        .split(/(?<=[.!?…])\s+/)
        .filter(Boolean)
        .map((frase) => {
          const fala = new window.SpeechSynthesisUtterance(frase)
          fala.lang = 'pt-BR'
          if (voz) fala.voice = voz
          return fala
        })
      const terminou = (ultima: boolean) => () => {
        if (atual.current !== falas || !ultima) return
        atual.current = null
        dono.current = false
        setFalando(false)
      }
      falas.forEach((fala, i) => {
        fala.onend = terminou(i === falas.length - 1)
        // Um erro no meio encerra a leitura toda: o resto da fila foi junto.
        fala.onerror = terminou(true)
      })
      atual.current = falas
      dono.current = true
      setFalando(true)
      for (const fala of falas) synth.speak(fala)
    } catch {
      atual.current = null
      dono.current = false
      setFalando(false)
    }
  }, [])
  useEffect(() => parar, [parar])
  return { disponivel, temVoz, falando, falar, parar }
}
