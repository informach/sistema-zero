'use client'

import { filaDeVoz, roteiroDoZappy, type SceneVozes } from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import { Square, Volume2 } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { registerLessonMedia, requestLessonMediaFocus } from '../lib/lesson-media-focus'
import type { DialogueBlock } from '../lib/types'
import { useSceneVoice } from './use-scene-voice'
import { useZappyFala, ZappyFalaProvider } from './zappy-fala-context'

/** A fala de um balão que não vem diretamente do conteúdo `dialogue` da aula. */
export interface DialogueSpeech {
  /** Uma unidade de fala fechada, sem instruções de outra etapa misturadas. */
  texts: readonly string[]
  /** Roteiros efetivos, na mesma ordem das frases visíveis; só eles localizam o MP3 do Zappy. */
  roteiros?: readonly string[]
  vozes?: SceneVozes
  /** Narração escolhida na autoria para esta fala; tem preferência sobre o dicionário gerado. */
  audioUrl?: string
  /** Legenda da narração, quando ela não corresponde literalmente ao texto visível. */
  captionsText?: string
  /** As cenas podem usar a voz do navegador quando ainda não houver MP3 do Zappy. */
  fallbackToBrowser: boolean
}

/**
 * Balão de fala do mascote, no lugar de contexto corrido. Para criança, "o Zappy
 * te explicando" lê melhor que um parágrafo solto acima da atividade.
 *
 * O mascote é asset do KIDS (o member-shell não tem `public/`, então referenciar
 * `/zappy/*.webp` daqui daria 404 na comunidade adulta). Por isso ele entra por
 * SLOT: o kids injeta o Zappy, e o adulto vê o mesmo balão como recado
 * destacado, sem personagem.
 *
 * ⚠️ Mascote e balão são IRMÃOS na mesma linha, e a cauda é ancorada na borda
 * ESQUERDA do balão. Isso evita de graça a armadilha do balão do tutorial, onde
 * a seta mira o CENTRO e um `mx-auto` a joga cem pixels fora do alvo: aqui não
 * existe centro a calcular.
 *
 * ⭐⭐ Desde 17/09/2026 o balão FALA, na voz do Zappy gravada na autoria (`vozes`). É o bloco em que
 * isso é mais óbvio: é ele quem está falando. ⚠️ Sem dicionário o botão não aparece — aqui NÃO há
 * queda para a voz do navegador, de propósito: um balão do Zappy lido pela voz do sistema seria
 * outro personagem falando no lugar dele. Na instrução da cena o botão é muleta de quem não lê e
 * qualquer voz serve; aqui ele é a voz do personagem.
 */
export function DialogueBlockView({
  content,
  mascot,
  speech,
}: {
  content: DialogueBlock
  /** Figura de quem fala. Sem ela o balão vira um recado destacado. */
  mascot?: ReactNode
  /** A cena fornece sua fala de forma explícita; diálogos autorados mantêm a regra atual. */
  speech?: DialogueSpeech
}) {
  const voz = useSceneVoice()
  /**
   * A cena já é dona da fala quando usa este balão para vestir sua instrução. Nesse caso o estado
   * vem de fora, no mesmo instante em que o botão "Ouvir" inicia ou para o MP3. O balão não pode
   * pôr um provider vazio por cima dele: o mascote veria "modo livre" e o Rive ficaria em loop.
   *
   * Nos blocos `dialogue` normais não há provider ancestral; eles continuam criando e entregando
   * seu próprio estado, a partir do `useSceneVoice` deste componente.
   */
  const falaDaCena = useZappyFala()
  const textos = speech?.texts ?? [content.text]
  const roteiros = speech?.roteiros ?? [roteiroDoZappy(content.text, content.zappySpeech)]
  const vozes = speech?.vozes ?? content.vozes
  const fila = filaDeVoz(roteiros, vozes)
  const audio = useRef<HTMLAudioElement>(null)
  const [tocandoArquivo, setTocandoArquivo] = useState(false)
  /** Evita que `error` e a rejeição de `play()` disparem duas filas de fallback. */
  const arquivoFalhou = useRef(false)
  /** Um erro de pré-carregamento nunca pode iniciar fala sem a criança apertar “Ouvir”. */
  const arquivoPedido = useRef(false)
  /**
   * ⚠⚠ O balão entra no FOCO de mídia da aula, como o vídeo e a cena. Sem registro o
   * `requestLessonMediaFocus` devolve falso sem pausar ninguém, e o Zappy falaria POR CIMA do
   * vídeo que está rodando — duas vozes ao mesmo tempo, que é pior que nenhuma.
   */
  const owner = useRef(Symbol('dialogue-voice'))
  const parar = useCallback(() => {
    arquivoFalhou.current = true
    arquivoPedido.current = false
    audio.current?.pause()
    setTocandoArquivo(false)
    voz.parar()
  }, [voz.parar])
  useEffect(() => registerLessonMedia(owner.current, parar), [parar])
  /**
   * ⭐ A BOCA do mascote segue o áudio (o slot é renderizado DENTRO do provider, então o Zappy
   * que o kids injeta enxerga isto). ⚠️ A dependência é `temFala`, e não `fila`: o `filaDeVoz`
   * devolve um array NOVO a cada render e o contexto mudaria de identidade em todos eles.
   */
  const temFala =
    Boolean(speech?.audioUrl) || fila !== null || (speech?.fallbackToBrowser === true && voz.temVoz)
  const falando = tocandoArquivo || voz.falando
  const falaPropria = useMemo(() => ({ podeFalar: temFala, falando }), [falando, temFala])
  const cairParaFala = useCallback(() => {
    if (!arquivoPedido.current || arquivoFalhou.current) return
    arquivoFalhou.current = true
    arquivoPedido.current = false
    setTocandoArquivo(false)
    voz.falar(textos, vozes, roteiros)
  }, [roteiros, textos, voz, vozes])
  const mascote = falaDaCena ? (
    mascot
  ) : (
    <ZappyFalaProvider value={falaPropria}>{mascot}</ZappyFalaProvider>
  )
  return (
    <div className="flex items-end gap-3">
      {mascote}
      <div className="relative min-w-0 flex-1 rounded-2xl border-2 border-(--unit,var(--color-border)) bg-card p-4">
        {mascot ? (
          <span
            aria-hidden="true"
            className="-left-[9px] absolute bottom-6 size-3.5 rotate-45 border-(--unit,var(--color-border)) border-b-2 border-l-2 bg-card"
          />
        ) : null}
        {/* Texto de verdade, no fluxo normal: nada de `role="status"` (isto não é
            aviso) nem de `blockquote` (a atribuição é o mascote, que é decorativo
            e some para o leitor de tela, o que deixaria uma citação sem autor). */}
        <p className="whitespace-pre-line text-pretty text-base text-foreground">{content.text}</p>
        {speech?.audioUrl ? (
          <audio
            ref={audio}
            src={speech.audioUrl}
            preload="metadata"
            className="sr-only"
            onPlay={() => setTocandoArquivo(true)}
            onPause={() => setTocandoArquivo(false)}
            onEnded={() => {
              arquivoPedido.current = false
              setTocandoArquivo(false)
            }}
            onError={cairParaFala}
          >
            <track
              kind="captions"
              srcLang="pt-BR"
              label="Fala do Zappy"
              src={`data:text/vtt;charset=utf-8,${encodeURIComponent(`WEBVTT\n\n00:00:00.000 --> 24:00:00.000\n${speech.captionsText ?? content.text}`)}`}
            />
          </audio>
        ) : null}
        {temFala ? (
          <Button
            variant="outline"
            // ⚠ O `Button` do ui, e não um `<button>` cru: o kids dá o relevo 3D a todo botão por um
            // seletor que casa `button[data-slot="button"]` com a classe da variante, então o cru
            // ficaria chapado — o único controle sem relevo dentro do balão. `min-h-11` é o alvo de
            // toque do público (o ui desenha 36px).
            className="mt-3 min-h-11 gap-2 rounded-full"
            onClick={() => {
              if (falando) {
                parar()
                return
              }
              // ⚠️⚠️ Sem `await` antes de tocar: o Safari do iOS só libera o áudio dentro do gesto,
              // e esperar o pedido de foco (um Vimeo responde por mensagem) deixava o balão mudo.
              // A parte síncrona do pedido já pausa as outras mídias antes de o som entrar.
              void requestLessonMediaFocus(owner.current)
              if (speech?.audioUrl) {
                arquivoFalhou.current = false
                arquivoPedido.current = true
                const arquivo = audio.current
                if (!arquivo) {
                  cairParaFala()
                  return
                }
                arquivo.currentTime = 0
                void arquivo.play().catch(cairParaFala)
                return
              }
              voz.falar(textos, vozes, roteiros)
            }}
          >
            {falando ? <Square size={16} aria-hidden /> : <Volume2 size={16} aria-hidden />}
            {falando ? 'Parar' : 'Ouvir'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
