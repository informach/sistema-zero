'use client'

import { Dialog } from '@sistemazero/ui/dialog'
import { Hammer } from 'lucide-react'
import { useState } from 'react'
import type { CareerPoint } from '@/lib/career-path'
import { CAREER_REWARD_INFO } from '@/lib/career-rewards'
import { LEVEL_INFO } from '@/lib/level-info'
import type { StudentLevelSlug } from '@/lib/types'

/**
 * O nó que FECHA o mapa da carreira enquanto o catálogo não tem os 48 cursos.
 *
 * No lugar da fileira de medalhões cinzas com cadeado (que para a criança lê como "você não
 * fez o suficiente"), um nó só, com a arte da Lenda e um martelinho: os postos daqui para
 * cima estão sendo CONSTRUÍDOS, e a espera não é culpa dela. Tocar abre o painel com os
 * postos que faltam e o que cada um traz, então o sonho grande continua visível numa tela
 * em vez de seis.
 *
 * Some sozinho quando o catálogo enche (`hasHorizonNode` → false).
 */
export function CareerHorizonNode({
  point,
  viewHeight,
  levels,
}: {
  point: CareerPoint
  viewHeight: number
  /** Postos que ficaram além do horizonte, na ordem da escada. */
  levels: readonly StudentLevelSlug[]
}) {
  const [open, setOpen] = useState(false)
  // Arte ausente cai no ÍCONE do nível, como os demais nós. Antes o `onError` só
  // escondia a imagem e sobrava um círculo VAZIO — o único nó do mapa sem desenho.
  const [artBroken, setArtBroken] = useState(false)
  const last = levels.at(-1) ?? 'god'
  const art = LEVEL_INFO[last]
  const Icon = art.icon

  return (
    <li
      className="-translate-x-1/2 -translate-y-1/2 absolute"
      style={{ left: `${point.x}%`, top: `${(point.y / viewHeight) * 100}%` }}
    >
      <button
        type="button"
        aria-label="Ver os próximos postos da carreira"
        className="relative block"
        onClick={() => setOpen(true)}
      >
        <span className="kid-pop block">
          {/* Mesmo wrapper dos demais nós: o badge fica FORA do círculo que recorta. */}
          <span className="career-medal relative z-10 block shrink-0">
            <span className="grid h-full w-full place-items-center overflow-hidden rounded-full border-4 border-dashed bg-card opacity-90 shadow-lg">
              {artBroken ? (
                <Icon className="size-16 text-muted-foreground" aria-hidden />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/carreira/${last}.webp`}
                  alt=""
                  width={112}
                  height={112}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover opacity-70"
                  onError={() => setArtBroken(true)}
                />
              )}
            </span>
            <span className="absolute right-1 bottom-1 z-20 grid size-9 place-items-center rounded-full bg-background text-muted-foreground shadow-md ring-1 ring-border">
              <Hammer className="size-5" aria-hidden />
            </span>
          </span>
          <span className="-translate-x-1/2 absolute top-full left-1/2 mt-3 flex w-44 flex-col items-center gap-0.5 text-center">
            <span className="font-bold text-foreground text-sm leading-tight">
              E tem muito mais pela frente
            </span>
            <span className="text-[11px] text-muted-foreground">
              {levels.length === 1
                ? 'Mais 1 posto está sendo construído'
                : `Mais ${levels.length} postos estão sendo construídos`}
            </span>
          </span>
        </span>
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="O que vem por aí"
        description="Estes postos estão sendo construídos. Quando os cursos ficarem prontos, eles aparecem no seu mapa!"
      >
        <ul className="flex flex-col gap-3">
          {levels.map((slug) => {
            const info = LEVEL_INFO[slug]
            const reward = CAREER_REWARD_INFO[slug]
            const LevelIcon = info.icon
            return (
              <li key={slug} className="flex items-start gap-3">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-full border-2"
                  style={{ borderColor: info.colorVar }}
                >
                  <LevelIcon className="size-5" style={{ color: info.colorVar }} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm [font-family:var(--font-display)]">
                    {info.label}
                  </p>
                  <p className="text-muted-foreground text-xs leading-snug">{reward.title}</p>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-primary/5 px-3 py-2 text-muted-foreground text-xs">
          <Icon className="size-4 shrink-0" style={{ color: art.colorVar }} aria-hidden />
          Continue criando! Cada curso novo abre mais um pedaço do mapa.
        </p>
      </Dialog>
    </li>
  )
}
