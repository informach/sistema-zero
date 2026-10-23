'use client'

import { Coins } from 'lucide-react'
import { adultCoins, type ShortText } from './skin'

/**
 * Peças pequenas da pele ADULTA dos editores 3D (avatar e espaço). As classes `sz-cos-*` só têm
 * desenho na comunidade adulta (`community/src/app/cosmetics-adult.css`).
 */

/** Rótulo que encolhe no celular: o começo fica à vista e o resto só some da tela (`compact`). */
export function ShortLabel({ text, compact = false }: { text: ShortText; compact?: boolean }) {
  return (
    <span>
      {text.lead}
      <span className={compact ? 'sz-cos-narrow-hide' : undefined}>{text.rest}</span>
    </span>
  )
}

/** O saldo de moedas, com palavra e ícone de linha (nunca só o número). */
export function AdultCoins({
  balance,
  unlimited,
  compact = false,
}: {
  balance: number
  unlimited: boolean
  compact?: boolean
}) {
  return (
    <span className="sz-cos-coins">
      <Coins aria-hidden="true" />
      <ShortLabel text={adultCoins(balance, unlimited)} compact={compact} />
    </span>
  )
}
