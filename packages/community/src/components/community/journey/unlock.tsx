import type { AdultCreatorCapability } from '@sistemazero/core/journey'
import {
  ArrowLeftRight,
  Box,
  Code2,
  Lightbulb,
  type LucideIcon,
  MessageCircle,
  Palette,
  Puzzle,
} from 'lucide-react'
import { cn } from '@/lib/cn'

/** Os cartões de "Ao concluir, libera": o nome, para que serve e o ícone na cor do palco. */
export const UNLOCK_TILES: Record<
  AdultCreatorCapability,
  { name: string; text: string; icon: LucideIcon; tone: string }
> = {
  studio: {
    name: 'O Estúdio livre',
    text: 'Crie jogos seus, fora das aulas.',
    icon: Puzzle,
    tone: 'text-(--cta)',
  },
  pinta: {
    name: 'O Pinta',
    text: 'Desenhe os personagens do seu jogo.',
    icon: Palette,
    tone: 'text-(--rosa)',
  },
  molda: {
    name: 'O Molda',
    text: 'A oficina 3D, para modelar objetos.',
    icon: Box,
    tone: 'text-(--laranja)',
  },
  'molda-intermediate': {
    name: 'Molda intermediário',
    text: 'Amplie os modelos e animações dos seus jogos.',
    icon: Box,
    tone: 'text-(--laranja)',
  },
  'molda-professional': {
    name: 'Molda profissional',
    text: 'Use as ferramentas avançadas de modelagem para jogos.',
    icon: Box,
    tone: 'text-(--laranja)',
  },
  bridge: {
    name: 'A Ponte',
    text: 'Veja os blocos virarem código.',
    icon: ArrowLeftRight,
    tone: 'text-(--menta)',
  },
  pro: {
    name: 'O Estúdio Pro',
    text: 'Crie o jogo escrevendo código.',
    icon: Code2,
    tone: 'text-(--dourado)',
  },
  ai: {
    name: 'O Zappy',
    text: 'O tutor que ajuda você no Estúdio.',
    icon: MessageCircle,
    tone: 'text-(--menta)',
  },
  pensa: {
    name: 'O Pensa',
    text: 'Planeja o jogo com você, em missões.',
    icon: Lightbulb,
    tone: 'text-(--cta)',
  },
}

export function UnlockTile({
  icon: Icon,
  tone,
  name,
  text,
}: {
  icon: LucideIcon
  tone: string
  name: string
  text: string
}) {
  return (
    <li className="sz-card-sm flex items-start gap-3.5 p-4">
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex size-11 flex-none items-center justify-center rounded-xl bg-(--carta-2)',
          tone,
        )}
      >
        <Icon className="size-6" />
      </span>
      <span className="flex min-w-0 flex-col">
        <strong>{name}</strong>
        <span className="text-[0.85rem] text-muted-foreground">{text}</span>
      </span>
    </li>
  )
}
