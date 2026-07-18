import { Check, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { ChallengeMeView } from '@/lib/types'

/**
 * Card do DESAFIO do mês (game jam) na home — SÓ renderizado quando a criança
 * possui Clube dos Criadores + Estúdio Completo (a página checa as duas refs
 * numa ida; produtos vendidos à parte). O tema é determinístico e global (vem
 * do members); o gate REAL da tag é o do hub no publish.
 */
export function ChallengeCard({ data }: { data: ChallengeMeView }) {
  const { challenge, entered } = data
  return (
    <section
      aria-label="Desafio do mês"
      className="rounded-3xl border-2 border-border bg-card p-5 shadow-[0_4px_0_var(--border)] md:p-6"
    >
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="text-4xl md:text-5xl">
          {challenge.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-bold text-muted-foreground text-xs uppercase tracking-wide [font-family:var(--font-display)]">
            <Trophy className="size-3.5" /> Desafio do mês
          </p>
          <p className="mt-0.5 sz-display text-lg md:text-xl">{challenge.title}</p>
          <p className="mt-1 text-muted-foreground text-sm">{challenge.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {entered ? (
              <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-(--kids-lime) px-4 font-bold text-sm">
                <Check className="size-4" /> Você já está participando!
              </span>
            ) : (
              <Link
                href="/estudio"
                prefetch={false}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 font-bold text-primary-foreground text-sm"
              >
                Criar no Estúdio
              </Link>
            )}
            <Link
              href="/mural-dos-criadores"
              prefetch={false}
              className="inline-flex min-h-10 items-center rounded-full border-2 border-border px-4 font-bold text-sm transition-colors hover:bg-muted/60"
            >
              Ver os jogos do desafio
            </Link>
          </div>
          {!entered ? (
            <p className="mt-2 text-muted-foreground text-xs">
              Crie o jogo no Estúdio, aperte Compartilhar e marque "Participar do Desafio do mês".
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
