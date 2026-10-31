'use client'

import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'

import type { ModuleChestView } from '@sistemazero/member-shell/lib/types'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { ChestAnimation } from './chest-animation'
import { ChestClosedFallback, ChestIcon } from './chest-icon'
import { ChestReward } from './chest-reward'
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
  const [animationReady, setAnimationReady] = useState(false)
  const pendingClaim = useRef<ChestClaim | null>(null)
  // O botão de acionar o baú some ao abrir. Este contêiner sobrevive à troca de
  // estado e recebe o foco de volta quando a criança fecha o prêmio.
  const raiz = useRef<HTMLDivElement>(null)
  const aberto = Boolean(chest?.claimed) || abertoAgora

  /** Conclusão idempotente, compartilhada pelo player e pela imagem de reserva. */
  const concluirAbertura = useCallback(() => {
    const body = pendingClaim.current
    if (!body) return
    pendingClaim.current = null
    setEstado('parado')
    setAbertoAgora(true)
    setAnimationReady(false)
    // `xpAwarded: 0` = outra aba já abriu este baú. Fica aberto, sem festa: a
    // criança não ganhou nada AGORA e a festa mentiria.
    if ((body.xpAwarded ?? 0) > 0 || (body.coinsAwarded ?? 0) > 0) {
      setPremio({ xp: body.xpAwarded ?? 0, coins: body.coinsAwarded ?? 0 })
    }
    // O XP muda foguinho, nível e ranking no topo: re-sincroniza sem F5.
    router.refresh()
  }, [router])

  useEffect(() => {
    if (estado === 'abrindo' && reducedMotion) concluirAbertura()
  }, [estado, reducedMotion, concluirAbertura])

  const animationFailed = useCallback(() => {
    setAnimationReady(false)
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
      // A arte pré-carregada abre pela máquina dela; se ele não chegou a tempo, o SVG
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
  const legenda = aberto ? 'Baú aberto!' : chest?.unlocked ? 'Abrir baú' : 'Baú do módulo'
  const abrindo = estado === 'abrindo'
  const svgAbrindo = abrindo && !animationReady
  const bloqueado = !chest?.unlocked && !aberto
  const podeAbrir = Boolean(chest?.unlocked) && !aberto
  const semanticaDoBaú =
    bloqueado || aberto
      ? {
          role: 'img' as const,
          'aria-label': bloqueado
            ? `Baú do Módulo ${unitNumber}, fechado. Ele abre quando você concluir todas as aulas deste módulo.`
            : `Baú do Módulo ${unitNumber}, aberto`,
        }
      : { role: 'group' as const }

  function terminouSvg(event: React.AnimationEvent<HTMLSpanElement>) {
    // A tampa também anima. Seu evento borbulha, mas a abertura termina no shake
    // do recipiente, que é a animação mais longa e o único cronômetro visual.
    if (event.target === event.currentTarget) concluirAbertura()
  }

  return (
    <>
      <div
        ref={raiz}
        data-trail-obstacle
        tabIndex={-1}
        {...semanticaDoBaú}
        className={cn(
          '-ml-14 absolute top-0 flex min-h-11 w-28 flex-col items-center gap-1.5 outline-none',
          // Fechado ou já aberto: nada acontece ao toque, o mesmo cursor da aula travada.
          podeAbrir ? 'kids-node-link' : 'cursor-not-allowed',
        )}
        style={posicao}
      >
        {podeAbrir ? (
          <button
            type="button"
            onClick={() => void abrir()}
            disabled={estado !== 'parado'}
            aria-label={`Abrir o baú do Módulo ${unitNumber} e ganhar ${chest?.xp ?? 0} XP`}
            className="kids-chest-hit-area absolute top-0 left-1/2 z-10 size-(--trail-node) -translate-x-1/2 cursor-pointer rounded-full border-0 bg-transparent p-0 disabled:cursor-wait"
          />
        ) : null}
        <span
          className={cn(
            'kids-node kids-node--chest kids-unit-tesouro relative',
            bloqueado
              ? 'kids-node--chest-closed'
              : aberto
                ? 'kids-node--chest-open'
                : 'kids-node--chest-ready',
            svgAbrindo && 'kids-chest-opening',
          )}
          onAnimationEnd={svgAbrindo ? terminouSvg : undefined}
        >
          <span
            aria-hidden="true"
            className={cn(
              'kids-chest-artwork',
              animationReady && 'opacity-0',
              estado === 'parado' && !animationReady && 'kid-float',
            )}
          >
            {aberto ? (
              <ChestIcon open className="size-full" />
            ) : (
              <ChestClosedFallback className="size-full" />
            )}
          </span>
          {chest !== null && (
            <ChestAnimation
              opening={abrindo && animationReady}
              opened={aberto}
              onReady={() => setAnimationReady(true)}
              onFailed={animationFailed}
              onOpened={concluirAbertura}
            />
          )}
        </span>
        <span
          className={cn(
            'kids-chest-label text-center font-semibold text-xs leading-tight',
            bloqueado ? 'text-muted-foreground' : 'sz-display-grad',
          )}
        >
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
