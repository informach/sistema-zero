'use client'

import type { ModuleChestView } from '@sistemazero/member-shell/lib/types'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { ChestIcon } from './chest-icon'
import { ChestReward } from './chest-reward'

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
  const [estado, setEstado] = useState<'parado' | 'abrindo'>('parado')
  const [premio, setPremio] = useState<{ xp: number; coins: number } | null>(null)
  const [abertoAgora, setAbertoAgora] = useState(false)
  // O botão DESMONTA ao abrir, então o `useModalA11y` do prêmio guarda o `<body>`
  // como "foco anterior" e devolve o foco para lugar nenhum. Este contêiner é o
  // destino: ele sobrevive à troca de estado e aceita foco programático.
  const raiz = useRef<HTMLDivElement>(null)
  const aberto = Boolean(chest?.claimed) || abertoAgora

  function devolverFoco() {
    setPremio(null)
    raiz.current?.focus()
  }

  async function abrir() {
    if (estado !== 'parado' || aberto) return
    setEstado('abrindo')
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
      const body = (await res.json().catch(() => null)) as {
        xpAwarded?: number
        coinsAwarded?: number
      } | null
      if (body === null) {
        // 200 com corpo ilegível: não dá para dizer que ela ganhou nada, e abrir o
        // baú em silêncio seria mentira. Volta ao estado clicável com recado.
        toast.error('Não consegui abrir o baú agora. Tente de novo!')
        setEstado('parado')
        return
      }
      setAbertoAgora(true)
      // `xpAwarded: 0` = outra aba já abriu este baú. Fica aberto, sem festa: a
      // criança não ganhou nada AGORA e a festa mentiria.
      if ((body?.xpAwarded ?? 0) > 0 || (body?.coinsAwarded ?? 0) > 0) {
        setPremio({ xp: body?.xpAwarded ?? 0, coins: body?.coinsAwarded ?? 0 })
      }
      // O XP muda foguinho, nível e ranking no topo: re-sincroniza sem F5.
      router.refresh()
    } catch {
      toast.error('Não consegui abrir o baú agora. Tente de novo!')
      setEstado('parado')
    }
  }

  const posicao = {
    left: `calc(50% + ${offset} * var(--trail-step))`,
  }
  const legenda = aberto ? 'Baú aberto!' : chest?.unlocked ? 'Abrir baú' : 'Baú da unidade'

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
        <span className="kids-node kids-node--chest-closed">
          <ChestIcon />
        </span>
        <span className="text-center font-semibold text-muted-foreground text-xs leading-tight">
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
          <span className="kids-node kids-node--chest-open kids-unit-tesouro">
            <ChestIcon open className="kid-float" />
          </span>
          <span className="sz-display-grad text-center font-semibold text-xs leading-tight">
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
      disabled={estado === 'abrindo'}
      aria-label={`Abrir o baú da unidade ${unitNumber} e ganhar ${chest?.xp ?? 0} XP`}
      className="-ml-14 absolute top-0 flex min-h-11 w-28 flex-col items-center gap-1.5"
      style={posicao}
    >
      <span
        className={cn(
          'kids-node kids-node--chest-ready kids-unit-tesouro',
          estado === 'abrindo' && 'kids-chest-opening',
        )}
      >
        <ChestIcon className={cn(estado === 'parado' && 'kid-float')} />
      </span>
      <span className="sz-display-grad text-center font-semibold text-xs leading-tight">
        {legenda}
      </span>
    </button>
  )
}
