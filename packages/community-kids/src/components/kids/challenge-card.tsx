import { Check, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { ChallengeMeView } from '@/lib/types'

/**
 * Card do DESAFIO do mês (game jam) na home — SÓ renderizado quando a criança
 * possui Clube dos Criadores + Estúdio Completo (a página checa as duas refs
 * numa ida; produtos vendidos à parte). O tema é determinístico e global (vem
 * do members); o gate REAL da tag é o do hub no publish.
 *
 * Não aparece nas telas-modelo de 11/09/2026: veste a mesma roupa do cartão da carreira
 * (cartão branco, o emoji do tema num ladrilho creme, sobretítulo em caixa alta, título
 * em Baloo e as pílulas da casa).
 */
export function ChallengeCard({ data }: { data: ChallengeMeView }) {
  const { challenge, entered } = data
  return (
    <section
      aria-label="Desafio do mês"
      className="kids-carta flex flex-col gap-4 p-5 md:flex-row md:items-start md:gap-6 md:px-7 md:py-6"
    >
      <span
        aria-hidden="true"
        className="grid size-16 shrink-0 place-items-center rounded-[1.25rem] bg-(--band-creme) text-4xl md:size-[4.5rem]"
      >
        {challenge.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
          <Trophy className="size-3.5" aria-hidden /> Desafio do mês
        </p>
        <p className="sz-display mt-1.5 text-xl md:text-[1.625rem]">{challenge.title}</p>
        <p className="mt-1.5 font-medium text-[0.9375rem] text-muted-foreground">
          {challenge.description}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {entered ? (
            <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-(--band-menta) px-4 font-extrabold text-sm">
              <Check className="size-4" aria-hidden /> Você já está participando!
            </span>
          ) : (
            <Link href="/estudio" prefetch={false} className="sz-btn-gradient px-5">
              Criar no Estúdio
            </Link>
          )}
          <Link
            href="/mural-dos-criadores"
            prefetch={false}
            className="sz-btn-gradient sz-btn-contorno px-5"
          >
            Ver os jogos do desafio
          </Link>
        </div>
        {!entered ? (
          <p className="mt-2.5 font-medium text-muted-foreground text-xs">
            Crie o jogo no Estúdio, aperte Compartilhar e marque "Participar do Desafio do mês".
          </p>
        ) : null}
      </div>
    </section>
  )
}
