'use client'

import type { ModuleChestView } from '@sistemazero/member-shell/lib/types'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { ChestClosedFallback, ChestIcon } from './chest-icon'
import { ChestReward } from './chest-reward'
import { ChestRive } from './chest-rive'
import { chestRiveSrc } from './chest-rive-contract'
import { useReducedMotion } from './room/use-reduced-motion'

type ChestClaim = { xpAwarded?: number; coinsAwarded?: number }

/**
 * O baú do fim da unidade, agora CLICÁVEL.
 *
 * Até 09/2026 ele era um desenho: o XP caía sozinho ao concluir a última aula do
 * módulo e o baú só mudava de cor. Agora a criança clica, ele abre e aí ela ganha.
 * Quem revalida é o servidor (o cliente nunca decide que a unidade fechou) e quem
 * garante que ninguém ganha duas vezes é o ledger.
 *
 * Ele NÃO trava a próxima aula, decisão dela: a criança que esquecer de abrir
 * continua estudando, e o baú por abrir vira o destino do "Continuar" na home.
 */
export function TrailChest({
  courseSlug,
  moduleId,
  unitNumber,
  chest,
  offset,
}: {
  courseSlug: string
  moduleId: string
  unitNumber: number
  /** `null` = o servidor não mandou estado (curso adulto): baú decorativo. */
  chest: ModuleChestView | null
  offset: number
}) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const [estado, setEstado] = useState<'parado' | 'solicitando' | 'abrindo'>('parado')
  const [premio, setPremio] = useState<{ xp: number; coins: number } | null>(null)
  const [abertoAgora, setAbertoAgora] = useState(false)
  const [riveReady, setRiveReady] = useState(false)
  const pendingClaim = useRef<ChestClaim | null>(null)
  // O botão DESMONTA ao abrir, então o `useModalA11y` do prêmio guarda o `<body>`
  // como "foco anterior" e devolve o foco para lugar nenhum. Este contêiner é o
  // destino: ele sobrevive à troca de estado e aceita foco programático.
  const raiz = useRef<HTMLDivElement>(null)
  const aberto = Boolean(chest?.claimed) || abertoAgora
  const riveSrc = chestRiveSrc()

  /** Conclusão idempotente, compartilhada pelo Rive e pelo SVG de queda. */
  const concluirAbertura = useCallback(() => {
    const body = pendingClaim.current
    if (!body) return
    pendingClaim.current = null
    setEstado('parado')
    setAbertoAgora(true)
    // `xpAwarded: 0` = outra aba já abriu este baú. Fica aberto, sem festa: a
    // criança não ganhou nada AGORA e a festa mentiria.
    if ((body.xpAwarded ?? 0) > 0 || (body.coinsAwarded ?? 0) > 0) {
      setPremio({ xp: body.xpAwarded ?? 0, coins: body.coinsAwarded ?? 0 })
    }
    // O XP muda foguinho, nível e ranking no topo: re-sincroniza sem F5.
    router.refresh()
  }, [router])

  const riveFailed = useCallback(() => {
    setRiveReady(false)
    // Se o claim já foi confirmado, `estado === 'abrindo'` faz o SVG assumir a
    // transição e concluir no próprio animationend. A falha não pula a reação.
  }, [])

  function devolverFoco() {
    setPremio(null)
    raiz.current?.focus()
  }

  async function abrir() {
    if (estado !== 'parado' || aberto) return
    setEstado('solicitando')
    try {
      const res = await fetch(
        `/api/members/courses/${encodeURIComponent(courseSlug)}/units/${encodeURIComponent(moduleId)}/chest/claim`,
        { method: 'POST' },
      )
      if (!res.ok) {
        toast.error('Não consegui abrir o baú agora. Tente de novo!')
        setEstado('parado')
        return
      }
      const body = (await res.json().catch(() => null)) as ChestClaim | null
      if (body === null) {
        // 200 com corpo ilegível: não dá para dizer que ela ganhou nada, e abrir o
        // baú em silêncio seria mentira. Volta ao estado clicável com recado.
        toast.error('Não consegui abrir o baú agora. Tente de novo!')
        setEstado('parado')
        return
      }
      pendingClaim.current = body
      // Movimento reduzido não é tela quebrada esperando animationend que nunca
      // virá. O sucesso visual é o próprio primeiro quadro aberto do SVG.
      if (reducedMotion) {
        concluirAbertura()
        return
      }
      // O Rive preloaded abre pela máquina dele; se ele não chegou a tempo, o SVG
      // existente anima e avisa no `animationend`, sem chute de milissegundos.
      setEstado('abrindo')
    } catch {
      toast.error('Não consegui abrir o baú agora. Tente de novo!')
      setEstado('parado')
    }
  }

  const posicao = {
    left: `calc(50% + ${offset} * var(--trail-step))`,
  }
  const legenda = aberto ? 'Baú aberto!' : chest?.unlocked ? 'Abrir baú' : 'Baú da unidade'
  const abrindo = estado === 'abrindo'
  const svgAbrindo = abrindo && !riveReady

  function terminouSvg(event: React.AnimationEvent<HTMLSpanElement>) {
    // A tampa também anima. Seu evento borbulha, mas a abertura termina no shake
    // do recipiente, que é a animação mais longa e o único cronômetro visual.
    if (event.target === event.currentTarget) concluirAbertura()
  }

  // Fechado e sem poder abrir NÃO é botão: seria uma parada de foco que não faz
  // nada. O estado inteiro vive no aria-label, como já era antes do lote.
  if (!chest?.unlocked && !aberto) {
    return (
      <div
        ref={raiz}
        tabIndex={-1}
        role="img"
        aria-label={`Baú da unidade ${unitNumber}, fechado. Ele abre quando você concluir todas as aulas desta unidade.`}
        className="-ml-14 absolute top-0 flex w-28 flex-col items-center gap-1.5 outline-none"
        style={posicao}
      >
        <span className="kids-node kids-node--chest kids-node--chest-closed">
          <ChestClosedFallback />
        </span>
        <span className="kids-chest-label text-center font-semibold text-muted-foreground text-xs leading-tight">
          {legenda}
        </span>
      </div>
    )
  }

  if (aberto) {
    return (
      <>
        <div
          ref={raiz}
          tabIndex={-1}
          role="img"
          aria-label={`Baú da unidade ${unitNumber}, aberto`}
          className="-ml-14 absolute top-0 flex w-28 flex-col items-center gap-1.5 outline-none"
          style={posicao}
        >
          <span className="kids-node kids-node--chest kids-node--chest-open kids-unit-tesouro">
            <ChestIcon open className="kid-float" />
          </span>
          <span className="kids-chest-label sz-display-grad text-center font-semibold text-xs leading-tight">
            {legenda}
          </span>
        </div>
        {premio ? (
          <ChestReward
            unitNumber={unitNumber}
            xp={premio.xp}
            coins={premio.coins}
            onClose={devolverFoco}
          />
        ) : null}
      </>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void abrir()}
      disabled={estado !== 'parado'}
      aria-label={`Abrir o baú da unidade ${unitNumber} e ganhar ${chest?.xp ?? 0} XP`}
      className="kids-node-link -ml-14 absolute top-0 flex min-h-11 w-28 flex-col items-center gap-1.5"
      style={posicao}
    >
      <span
        className={cn(
          'kids-node kids-node--chest kids-node--chest-ready kids-unit-tesouro relative',
          svgAbrindo && 'kids-chest-opening',
        )}
        onAnimationEnd={svgAbrindo ? terminouSvg : undefined}
      >
        <ChestClosedFallback
          className={cn(estado === 'parado' && !riveReady && 'kid-float', riveReady && 'opacity-0')}
        />
        <ChestRive
          src={riveSrc}
          opening={abrindo && riveReady}
          onReady={() => setRiveReady(true)}
          onFailed={riveFailed}
          onOpened={concluirAbertura}
        />
      </span>
      <span className="kids-chest-label sz-display-grad text-center font-semibold text-xs leading-tight">
        {legenda}
      </span>
    </button>
  )
}
