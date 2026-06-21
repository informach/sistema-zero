import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { tierInfo } from '@/lib/league-info'
import type { LeagueMeView } from '@/lib/types'

/**
 * Board da liga semanal (estilo Duolingo) — apresentacional. Mostra a divisão do aluno,
 * a coorte ranqueada pela XP da semana (SEM nomes/ids de terceiros: privacidade kids —
 * só "Você" se destaca) e as zonas de promoção (topo, verde) / rebaixamento (base,
 * vermelho). Semana amistosa (pouca massa) → sem zonas + recado gentil.
 */
export function LeagueBoard({ league }: { league: LeagueMeView }) {
  const info = tierInfo(league.tier)
  const total = league.entries.length
  const friendly = league.promotionCount === 0 && league.relegationCount === 0

  return (
    <section className="space-y-3 rounded-2xl border-2 border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="sz-display flex items-center gap-2 text-base">
          <span className="text-2xl" aria-hidden="true">
            {info.emoji}
          </span>
          Liga {info.labelPt}
        </h2>
        <span className="rounded-full bg-(--kids-lime-tint) px-3 py-1 font-bold text-xs">
          Você está em {league.myPosition}º
        </span>
      </div>

      <ol className="space-y-1.5">
        {league.entries.map((e) => {
          const promo = !friendly && e.position <= league.promotionCount
          const releg = !friendly && e.position > total - league.relegationCount
          return (
            <li
              key={e.position}
              className={cn(
                'flex items-center gap-3 rounded-xl border-2 px-3 py-2',
                e.isMe ? 'border-primary bg-(--kids-cyan-tint)' : 'border-transparent bg-muted',
              )}
            >
              <span className="w-6 text-center font-bold text-muted-foreground text-sm tabular-nums">
                {e.position}
              </span>
              {promo ? (
                // `--success-foreground` (ciano no dark / verde no light): no dark o
                // `--success` é a cor de FUNDO do badge (quase preta) → seta invisível.
                <ChevronUp className="size-4 text-(--success-foreground)" />
              ) : releg ? (
                <ChevronDown className="size-4 text-(--sz-hot)" />
              ) : (
                <span className="size-4" />
              )}
              <span className="flex-1 truncate font-bold text-sm">
                {e.isMe ? 'Você' : 'Colega'}
              </span>
              <span className="font-bold text-sm tabular-nums">{e.weeklyXp} XP</span>
            </li>
          )
        })}
      </ol>

      {friendly ? (
        <p className="text-center text-muted-foreground text-xs">
          Semana tranquila! Quando mais colegas estiverem competindo, começa a subida de divisão. 🚀
        </p>
      ) : (
        <p className="text-center text-muted-foreground text-xs">
          Os {league.promotionCount} primeiros sobem de divisão no domingo. Bora pro topo! ⬆️
        </p>
      )}
    </section>
  )
}
