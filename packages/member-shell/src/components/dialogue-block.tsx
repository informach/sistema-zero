'use client'

import { filaDeVoz } from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import { Square, Volume2 } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import { registerLessonMedia, requestLessonMediaFocus } from '../lib/lesson-media-focus'
import type { DialogueBlock } from '../lib/types'
import { useSceneVoice } from './use-scene-voice'
import { ZappyFalaProvider } from './zappy-fala-context'

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
}: {
  content: DialogueBlock
  /** Figura de quem fala. Sem ela o balão vira um recado destacado. */
  mascot?: ReactNode
}) {
  const voz = useSceneVoice()
  const fila = filaDeVoz([content.text], content.vozes)
  /**
   * ⚠⚠ O balão entra no FOCO de mídia da aula, como o vídeo e a cena. Sem registro o
   * `requestLessonMediaFocus` devolve falso sem pausar ninguém, e o Zappy falaria POR CIMA do
   * vídeo que está rodando — duas vozes ao mesmo tempo, que é pior que nenhuma.
   */
  const owner = useRef(Symbol('dialogue-voice'))
  const parar = voz.parar
  useEffect(() => registerLessonMedia(owner.current, parar), [parar])
  /**
   * ⭐ A BOCA do mascote segue o áudio (o slot é renderizado DENTRO do provider, então o Zappy
   * que o kids injeta enxerga isto). ⚠️ A dependência é `temFala`, e não `fila`: o `filaDeVoz`
   * devolve um array NOVO a cada render e o contexto mudaria de identidade em todos eles.
   */
  const temFala = fila !== null
  const fala = useMemo(() => ({ podeFalar: temFala, falando: voz.falando }), [temFala, voz.falando])
  return (
    <div className="flex items-end gap-3">
      <ZappyFalaProvider value={fala}>{mascot}</ZappyFalaProvider>
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
        {fila ? (
          <Button
            variant="outline"
            // ⚠ O `Button` do ui, e não um `<button>` cru: o kids dá o relevo 3D a todo botão por um
            // seletor que casa `button[data-slot="button"]` com a classe da variante, então o cru
            // ficaria chapado — o único controle sem relevo dentro do balão. `min-h-11` é o alvo de
            // toque do público (o ui desenha 36px).
            className="mt-3 min-h-11 gap-2 rounded-full"
            onClick={() => {
              if (voz.falando) {
                voz.parar()
                return
              }
              // ⚠️⚠️ Sem `await` antes de tocar: o Safari do iOS só libera o áudio dentro do gesto,
              // e esperar o pedido de foco (um Vimeo responde por mensagem) deixava o balão mudo.
              // A parte síncrona do pedido já pausa as outras mídias antes de o som entrar.
              void requestLessonMediaFocus(owner.current)
              voz.falar([content.text], content.vozes)
            }}
          >
            {voz.falando ? <Square size={16} aria-hidden /> : <Volume2 size={16} aria-hidden />}
            {voz.falando ? 'Parar' : 'Ouvir'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
