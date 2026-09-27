import type { HelpCollectionIcon, HelpCollectionTone } from '@sistemazero/core/help'
import type { CreativeToolId } from '@sistemazero/core/journey'
import {
  Blocks,
  BookOpen,
  Box,
  Compass,
  Gamepad2,
  Lightbulb,
  type LucideIcon,
  Palette,
  Sparkles,
} from 'lucide-react'

/**
 * A APRESENTAÇÃO das coleções do "Como fazer". A coleção mora no banco com um `icon` e um
 * `tone` das allowlists do core; aqui cada nome vira o ícone do lucide e o par de cores que
 * o kids já tem para as oficinas (`--tool-*`) ou a cor da casa.
 *
 * ⚠️ São `Record`s completos de propósito: ícone ou tom novo no core sem entrada aqui é erro
 * de tipo, não um cartão sem cor.
 */
export const HELP_COLLECTION_ICON: Record<HelpCollectionIcon, LucideIcon> = {
  compass: Compass,
  palette: Palette,
  blocks: Blocks,
  lightbulb: Lightbulb,
  box: Box,
  gamepad: Gamepad2,
  sparkles: Sparkles,
  book: BookOpen,
}

export interface HelpToneColors {
  /** Fundo do cabeçalho do cartão. */
  color: string
  /** A cor como TINTA sobre o corpo. */
  ink: string
  /** A tinta do ícone sobre o fundo. */
  fg: string
  /** A tinta do selo branco. */
  seloInk: string
}

function oficina(tom: 'estudio' | 'pinta' | 'pensa' | 'molda'): HelpToneColors {
  return {
    color: `var(--tool-${tom})`,
    ink: `var(--tool-${tom}-texto)`,
    fg: `var(--tool-${tom}-fg)`,
    seloInk: `var(--tool-${tom}-selo)`,
  }
}

export const HELP_COLLECTION_TONE: Record<HelpCollectionTone, HelpToneColors> = {
  marca: {
    color: 'var(--sz-primary)',
    ink: 'var(--sz-primary)',
    fg: 'var(--sz-primary-fg)',
    seloInk: 'var(--sz-primary)',
  },
  estudio: oficina('estudio'),
  pinta: oficina('pinta'),
  pensa: oficina('pensa'),
  molda: oficina('molda'),
}

/** O nome que a criança lê e a página que abre a ferramenta de um tutorial (`toolRef`). */
export const HELP_TOOL_INFO: Record<CreativeToolId, { label: string; href: string }> = {
  'estudio-completo': { label: 'Estúdio', href: '/estudio' },
  pinta: { label: 'Pinta', href: '/pinta' },
  pensa: { label: 'Pensa', href: '/pensa' },
  molda: { label: 'Molda', href: '/molda' },
}
