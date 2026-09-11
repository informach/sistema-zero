import { Flame, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { GamificationMeView } from '@/lib/types'
import { ZappyCoin } from './zappy-coin'

/**
 * Sequência + XP + moedas Zappy (rodapé do menu no desktop e top bar do celular).
 * Sem hooks: funciona dentro de Server e Client Components. Fogo ACESO = já houve
 * atividade hoje; apagado = cinza, convite a estudar. O saldo de moedas é opcional
 * (tolera members antigo sem `coins`).
 *
 * No menu (telas-modelo de 11/09/2026) cada número é um CHIP separado: o fogo no
 * creme, o XP no azul-claro. As moedas não aparecem na imagem, mas são conteúdo, e
 * entram como um terceiro chip na linha de baixo, da largura do menu.
 */
export function StreakWidget({
  gamification,
  compact = false,
}: {
  gamification: GamificationMeView
  compact?: boolean
}) {
  const { streak, xp } = gamification
  const coins = gamification.coins?.balance
  // Equipe (passe livre) = moedas ilimitadas: mostra ∞ no lugar do número.
  const coinsUnlimited = gamification.coins?.unlimited === true
  const coinsDisplay = coinsUnlimited ? '∞' : coins
  const streakLabel = `Sequência de ${streak.current} ${streak.current === 1 ? 'dia' : 'dias'}${streak.activeToday ? ', com a atividade de hoje feita' : ''}`
  const coinsLabel =
    coins === undefined
      ? ''
      : ` ${coinsUnlimited ? 'moedas Zappy ilimitadas' : `${coins} moedas Zappy`}.`
  const ariaLabel = `${streakLabel}. ${xp} pontos de experiência.${coinsLabel}`
  // Aceso = laranja da marca (o fogo das telas-modelo); apagado = cinza.
  const flameClass = streak.activeToday
    ? 'fill-current text-(--sz-kids-laranja-texto)'
    : 'text-muted-foreground'

  if (compact) {
    // Top bar do celular: o fogo fica SEMPRE; o XP e as moedas só aparecem quando
    // cabem (medido: a 375px os três números + sino + avatar não cabem ao lado do
    // logo). Os dois continuam no Início e no Meu espaço, e o nome falado do grupo
    // diz os três em qualquer largura.
    return (
      <span role="group" className="flex items-center gap-2.5 text-sm" aria-label={ariaLabel}>
        <span className="inline-flex items-center gap-1 font-bold">
          <Flame className={cn('size-4', flameClass)} aria-hidden />
          {streak.current}
        </span>
        <span className="hidden items-center gap-1 font-bold text-primary min-[390px]:inline-flex">
          <Sparkles className="size-4" aria-hidden />
          {xp}
        </span>
        {coins !== undefined ? (
          <span className="hidden items-center gap-1 font-bold min-[440px]:inline-flex">
            <ZappyCoin className="size-4" />
            {coinsDisplay}
          </span>
        ) : null}
      </span>
    )
  }

  const chip = 'inline-flex h-[2.375rem] items-center justify-center gap-1.5 rounded-xl px-3'
  return (
    <div role="group" className="grid grid-cols-2 gap-2 font-bold text-sm" aria-label={ariaLabel}>
      <span className={cn(chip, 'bg-(--band-creme) text-foreground')}>
        <Flame className={cn('size-4 shrink-0', flameClass)} aria-hidden />
        {streak.current}
      </span>
      <span className={cn(chip, 'bg-(--band-ceu) text-primary')}>
        <Sparkles className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{xp} XP</span>
      </span>
      {coins !== undefined ? (
        <span className={cn(chip, 'col-span-2 bg-(--band-amarelo) text-foreground')}>
          <ZappyCoin className="size-4 shrink-0" />
          {coinsDisplay} {coinsUnlimited ? 'moedas' : coins === 1 ? 'moeda' : 'moedas'}
        </span>
      ) : null}
    </div>
  )
}
