'use client'

import { filaDeVoz, roteiroDoZappy, type SceneVozes } from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import { Square, Volume2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '../lib/cn'
import { registerLessonMedia, requestLessonMediaFocus } from '../lib/lesson-media-focus'
import { useSceneVoice } from './use-scene-voice'

/**
 * "🔊 Ouvir" solto, para um texto que não mora num balão do Zappy: a pergunta do quiz no player
 * adulto e a explicação da correção.
 *
 * ⭐ Mesmas regras do balão e da cena (`useSceneVoice`): a voz do Zappy quando o MP3 existe, e
 * a do navegador quando não existe — aqui o botão é muleta de quem ainda não lê, e qualquer voz
 * serve. ⚠️ Entra no foco de mídia da aula, senão falaria por cima do vídeo.
 */
export function ZappyOuvirButton({
  textos,
  roteiros,
  vozes,
  audioUrl,
  rotulo = 'Ouvir',
  className,
}: {
  /** O que a voz do navegador lê, e a legenda do MP3. */
  textos: readonly string[]
  /** Roteiros efetivos do Zappy, na ordem de `textos`; localizam o MP3 no dicionário. */
  roteiros?: readonly string[]
  vozes?: SceneVozes
  /** MP3 já resolvido (a explicação do quiz chega assim, na correção). */
  audioUrl?: string
  /** Nome acessível do botão, quando há vários na mesma tela ("Ouvir a pergunta 2"). */
  rotulo?: string
  className?: string
}) {
  const voz = useSceneVoice()
  const owner = useRef(Symbol('zappy-ouvir'))
  useEffect(() => registerLessonMedia(owner.current, voz.parar), [voz.parar])
  const temArquivo =
    Boolean(audioUrl) || filaDeVoz(roteiros ?? textos.map((t) => roteiroDoZappy(t)), vozes) !== null
  if (!temArquivo && !voz.temVoz) return null
  return (
    <Button
      type="button"
      variant="outline"
      // O alvo de toque do público infantil (o ui desenha 36px), como no balão.
      className={cn('min-h-11 gap-2 rounded-full', className)}
      aria-label={voz.falando ? 'Parar' : rotulo}
      onClick={() => {
        if (voz.falando) {
          voz.parar()
          return
        }
        // ⚠️ Sem `await`: o Safari do iOS só libera o áudio dentro do gesto (ver o balão).
        void requestLessonMediaFocus(owner.current)
        if (audioUrl) voz.tocarArquivos([audioUrl])
        else voz.falar(textos, vozes, roteiros)
      }}
    >
      {voz.falando ? <Square size={16} aria-hidden /> : <Volume2 size={16} aria-hidden />}
      {voz.falando ? 'Parar' : 'Ouvir'}
    </Button>
  )
}
