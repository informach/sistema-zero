import { ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { AvatarWithAura } from '@/components/kids/avatar-with-aura'
import { cn } from '@/lib/cn'
import { tierInfo } from '@/lib/league-info'
import type { LeagueMeView } from '@/lib/types'

/**
 * Board da liga semanal (estilo Duolingo) — apresentacional. Mostra a divisão do aluno,
 * a coorte ranqueada pela XP da semana com o ROSTO (avatar) e o 1º NOME de cada colega
 * (igual ao Clube/Mural), e a própria criança com a pílula azul "você". O nome vira LINK
 * p/ o perfil público só quando o colega é público (opt-in dos pais). As zonas de
 * promoção (topo, verde) / rebaixamento (base, vermelho); semana amistosa (pouca massa)
 * → sem zonas.
 *
 * Desenho: o mesmo cartão branco e as mesmas linhas do "Ranking geral" (telas-modelo de
 * 11/09/2026), para a troca de aba mudar o CONTEÚDO e não a cara da página.
 */
export function LeagueBoard({ league }: { league: LeagueMeView }) {
  const info = tierInfo(league.tier)
  const total = league.entries.length
  const friendly = league.promotionCount === 0 && league.relegationCount === 0

  return (
    <section className="kids-carta rounded-[2rem] px-4 py-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="sz-display flex items-center gap-3 text-2xl md:text-[1.75rem]">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-[0.875rem] bg-(--band-creme) text-[1.75rem]"
            aria-hidden="true"
          >
            {info.emoji}
          </span>
          Liga {info.labelPt}
        </h2>
        <span className="kids-marca rounded-full px-3.5 py-1.5 font-extrabold text-sm">
          Você está em {league.myPosition}º
        </span>
      </div>

      <ol className="mt-6 space-y-2">
        {league.entries.map((e, i) => {
          const promo = !friendly && e.position <= league.promotionCount
          const releg = !friendly && e.position > total - league.relegationCount
          // O 1º nome do colega (ausente → "Colega"); a própria criança sem nome é "Você".
          const name = e.firstName ?? (e.isMe ? 'Você' : 'Colega')
          return (
            <li
              // Ranking estático (server-rendered, sem reordenação/estado no cliente) e a
              // posição empata (competition ranking) → o índice é a chave estável correta.
              // biome-ignore lint/suspicious/noArrayIndexKey: ver acima
              key={i}
              className={cn(
                'flex min-h-[3.75rem] items-center gap-3 rounded-2xl px-3.5 py-2 md:px-[1.125rem]',
                e.isMe ? 'bg-card ring-2 ring-primary ring-inset' : 'bg-background',
              )}
            >
              <span className="w-7 shrink-0 font-extrabold text-muted-foreground text-[0.9375rem] tabular-nums">
                {e.position}º
              </span>
              {promo ? (
                // `--success-foreground` (ciano no dark / verde no light): no dark o
                // `--success` é a cor de FUNDO do badge (quase preta) → seta invisível.
                <ChevronUp className="size-4 shrink-0 text-(--success-foreground)" />
              ) : releg ? (
                <ChevronDown className="size-4 shrink-0 text-(--sz-hot)" />
              ) : (
                <span className="size-4 shrink-0" />
              )}
              <AvatarWithAura
                photoUrl={e.photoUrl}
                // A inicial é do NOME de verdade: com "Colega" de reserva, a liga inteira
                // ficava com bolinhas "C" iguais, que não é a inicial de ninguém (full review
                // de 11/09/2026). Sem nome, vale o personagem padrão.
                name={e.firstName ?? null}
                size="sm"
                className="size-9"
                label={e.isMe ? 'Seu avatar' : `Avatar de ${name}`}
              />
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {e.profileId ? (
                  // Colega PÚBLICO (opt-in dos pais) → nome clicável p/ o perfil público.
                  <Link
                    href={`/crianca/${e.profileId}`}
                    className="truncate font-extrabold text-base hover:underline"
                  >
                    {name}
                  </Link>
                ) : (
                  <span className="truncate font-extrabold text-base">{name}</span>
                )}
                {e.isMe && e.firstName ? (
                  <span className="kids-marca shrink-0 rounded-full px-2 py-0.5 font-extrabold text-[0.6875rem] leading-tight">
                    você
                  </span>
                ) : null}
              </div>
              <span className="shrink-0 font-extrabold text-muted-foreground text-[0.9375rem] tabular-nums">
                {e.weeklyXp} XP
              </span>
            </li>
          )
        })}
      </ol>

      <p className="mt-6 text-center font-semibold text-muted-foreground text-sm">
        {friendly
          ? 'Semana tranquila! Quando mais colegas estiverem competindo, começa a subida de divisão. 🚀'
          : `Os ${league.promotionCount} primeiros sobem de divisão no domingo. Bora pro topo! ⬆️`}
      </p>
    </section>
  )
}
