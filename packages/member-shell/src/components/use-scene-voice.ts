'use client'

import {
  filaDeVoz,
  isZappySpeechText,
  normalizarRoteiroDoZappy,
  roteiroDoZappy,
  type SceneVozes,
  textoFalado,
} from '@sistemazero/core/learning/scene'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * "🔊 Ouvir": a instrução e a pista faladas, para quem ainda não lê.
 *
 * ⭐⭐ Desde 17/09/2026 há DOIS caminhos, nesta ordem: a voz do Zappy (MP3 gerado na autoria, ver
 * `voz.ts` no core) e, faltando o áudio de qualquer trecho, a voz do navegador como sempre foi. A
 * escolha é por FALA inteira, nunca por trecho: ver `filaDeVoz`.
 *
 * ⭐ Decisão da dona (Raio-X, lote 2): nenhum uso de cena em aula tinha `instructionAudioUrl`, então
 * o botão "Ouvir instrução" nunca aparecia e a criança que não lê não tinha caminho nenhum por
 * áudio. Sem áudio gravado, a síntese de voz do próprio navegador lê em pt-BR.
 *
 * ⚠️⚠️ A síntese NUNCA quebra e cai em SILÊNCIO sem voz em português: com vozes carregadas e nenhuma
 * pt, a fala sairia num sotaque inglês lendo português, pior que nada. Com a lista ainda vazia (o
 * Chrome carrega as vozes depois), o pedido vai com `lang = 'pt-BR'` e o navegador escolhe.
 *
 * ⚠️ `temVoz` nasce FALSO também no cliente e só liga depois de montar: ler `speechSynthesis` no
 * render daria um botão no cliente que o servidor não desenhou (erro de hidratação).
 */
export function useSceneVoice() {
  /**
   * ⚠️⚠️ `temVoz`: a API existe E a lista de vozes não diz que falta o português. É a ÚNICA pergunta que
   * o hook responde (full review de 16/09/2026): havia também `disponivel` ("existe a API"), e com vozes
   * carregadas sem nenhuma pt o `falar` desiste em silêncio. A `screen-reader` passou a `temVoz` e o
   * "🔊 Ouvir" do player ficou no `disponivel`: o botão aparecia e o clique não fazia nada. Recalculado
   * no `voiceschanged`, porque o Chrome carrega a lista depois. Lista ainda vazia conta como voz (o
   * pedido sai com `lang` pt-BR e o navegador escolhe).
   *
   * ⚠️ Ele NÃO governa mais sozinho se o botão aparece: com o dicionário do Zappy a cena fala num
   * aparelho sem voz de sistema nenhuma. Quem decide é `temVoz || filaDeVoz(...)` no player.
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
  /**
   * ⚠️⚠️ UM elemento de áudio para a fila inteira, trocando o `src` a cada trecho — e não um
   * `new Audio()` por MP3. No Safari do iOS o elemento só toca depois de um `play()` nascido do
   * GESTO da criança, e esse destravamento vale para o ELEMENTO: com um elemento por trecho, o
   * primeiro tocaria e o resto da fala morreria no meio, calada, só no iPhone.
   */
  const player = useRef<HTMLAudioElement | null>(null)
  /**
   * Qual FALA está no ar. Sobe a cada `falar` e a cada `parar`, e todo callback de áudio confere o
   * número antes de agir.
   *
   * ⚠⚠ Sem isso, um evento ATRASADO da fala anterior atropela a nova: o elemento é reaproveitado,
   * e o `error` que o próprio `pararAudio` provoca (trocar o `src` aborta a carga) chega DEPOIS de a
   * fala seguinte começar — aí o tratamento de erro daquela fala morta derrubaria esta para a voz
   * do navegador, no meio do MP3 que já está tocando.
   */
  const geracao = useRef(0)
  useEffect(() => {
    const existe =
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof window.SpeechSynthesisUtterance === 'function'
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
  const pararAudio = useCallback(() => {
    const el = player.current
    if (!el) return
    try {
      el.pause()
      // ⚠️ `removeAttribute('src')` e não `src = ''`: a string vazia faz o Chrome pedir a PÁGINA
      // como se fosse mídia, e o console enche de erro de rede a cada "Parar".
      el.removeAttribute('src')
      el.load()
    } catch {
      /* elemento já solto: nada a parar */
    }
  }, [])
  const parar = useCallback(() => {
    // ⚠ A geração sobe SEMPRE, mesmo sem ser o dono: é ela que invalida os eventos em voo, e um
    // `return` antes disso deixaria o `error` do áudio abortado vivo para atropelar a próxima fala.
    geracao.current += 1
    if (!dono.current) return
    dono.current = false
    atual.current = null
    pararAudio()
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* navegador sem voz: nada a parar */
    }
    setFalando(false)
  }, [pararAudio])
  /** A voz do NAVEGADOR lê a lista inteira. É o caminho de sempre, e a rede de segurança do outro. */
  const sintetizar = useCallback((textos: readonly string[]) => {
    try {
      const synth = window.speechSynthesis
      const texto = textos.map(textoFalado).filter(Boolean).join(' ')
      if (!synth || !texto) return false
      const vozes = synth.getVoices()
      const voz = vozes.find((v) => v.lang?.toLowerCase().startsWith('pt'))
      if (vozes.length > 0 && !voz) return false
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
      return true
    } catch {
      atual.current = null
      dono.current = false
      setFalando(false)
      return false
    }
  }, [])
  /**
   * A voz do ZAPPY: toca a fila de MP3, um trecho por vez.
   *
   * ⚠️⚠️ Um erro no meio (404 do R2, rede caindo) NÃO deixa a criança no escuro: o que falta é lido
   * pela voz do navegador. Vale principalmente para quem depende do botão — ela não lê o que está
   * escrito, então "o áudio falhou" seria o fim do caminho, e não um contratempo.
   */
  const tocar = useCallback(
    (urls: readonly string[], textos: readonly string[]) => {
      const el = player.current ?? new Audio()
      player.current = el
      const minha = geracao.current
      let i = 0
      /** O que falta, na voz do navegador. Ver o aviso da função. */
      const cair = () => {
        const sobrou = textos.slice(i)
        if (!sobrou.length || !sintetizar(sobrou)) {
          dono.current = false
          setFalando(false)
        }
      }
      const proximo = () => {
        if (geracao.current !== minha) return
        const url = urls[i]
        if (!url) {
          dono.current = false
          setFalando(false)
          return
        }
        el.src = url
        // ⚠ O `play()` devolve promessa: sem o `catch` o erro vira "unhandled rejection" no console
        // a cada "Parar" (o `pause()` rejeita o play em andamento).
        el.play().catch(() => {
          if (geracao.current !== minha) return
          cair()
        })
      }
      el.onended = () => {
        if (geracao.current !== minha) return
        i += 1
        proximo()
      }
      el.onerror = () => {
        if (geracao.current !== minha) return
        cair()
      }
      dono.current = true
      setFalando(true)
      proximo()
    },
    [sintetizar],
  )
  /**
   * Fala a lista de trechos: o Zappy quando o dicionário cobre TODOS, o navegador quando não.
   *
   * ⚠️⚠️ A escolha é por fala inteira (`filaDeVoz`), e é o que evita o pior resultado: o Zappy
   * dizendo a instrução e a voz do sistema emendando a pergunta que tranca o palco.
   */
  const falar = useCallback(
    (textos: readonly string[], vozes?: SceneVozes, roteiros?: readonly string[]) => {
      // ⚠ `parar()` também SOBE a geração, e é dele que vem a invalidação dos eventos da fala anterior.
      parar()
      const limpos = textos.map(textoFalado).filter(Boolean)
      if (!limpos.length) return
      /**
       * A tela é sempre a legenda e o plano B. O MP3, porém, é localizado pelo roteiro efetivo:
       * uma exceção como "X" → "xis" não pode fazer o player procurar a chave do X escrito.
       *
       * Só aceita a lista autoral se ela corresponder 1:1 às frases vistas. Uma lista torta nunca
       * pode tocar metade da explicação na voz do Zappy e inventar a outra metade.
       */
      const roteiroEfetivo =
        roteiros?.length === limpos.length && roteiros.every(isZappySpeechText)
          ? roteiros.map(normalizarRoteiroDoZappy)
          : limpos.map((texto) => roteiroDoZappy(texto))
      const fila = filaDeVoz(roteiroEfetivo, vozes)
      if (fila) {
        tocar(fila, limpos)
        return
      }
      sintetizar(limpos)
    },
    [parar, sintetizar, tocar],
  )
  useEffect(() => parar, [parar])
  return { temVoz, falando, falar, parar }
}
