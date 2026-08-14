/**
 * APRESENTAÇÃO dos canais do Clube/Mural (emoji + cor + estado vazio) — puro, mora no
 * app (o hub só sabe slug/nome/postingPolicy). Mesmo padrão de `badges.ts`/`level-info.ts`/
 * `room-catalog.ts`: o backend é a verdade estrutural, a "cara" é do kids. Slug
 * desconhecido cai no default (Hash cinza) — forward-compat com canais novos do admin.
 */
export interface ChannelPresentation {
  /** Emoji do canal (troca o ícone `Hash` genérico). */
  emoji: string
  /** Cor de acento (CSS var da marca) do chip ativo/realce. */
  colorVar: string
  /** Convite gentil quando o canal está vazio (com o mascote). */
  emptyState: string
}

const DEFAULT: ChannelPresentation = {
  emoji: '💬',
  colorVar: 'var(--kids-cyan-tint)',
  emptyState: 'Nenhuma conversa ainda. Comece a primeira! ✨',
}

/**
 * Mapa por SLUG de canal. Canais seedados hoje: `geral` (Clube), `recados-da-equipe`
 * (Clube, staff), `parede` (Mural). Novos canais do admin caem no default.
 */
const BY_SLUG: Record<string, ChannelPresentation> = {
  geral: {
    emoji: '💬',
    colorVar: 'var(--kids-cyan-tint)',
    emptyState: 'Nenhuma conversa ainda. Puxa o papo, que a turma quer te conhecer! ✨',
  },
  'recados-da-equipe': {
    emoji: '📣',
    colorVar: 'var(--kids-cyan-tint)',
    emptyState: 'Aqui a equipe deixa recados e novidades. Fique de olho! 👀',
  },
  parede: {
    emoji: '🎨',
    colorVar: 'var(--kids-cyan-tint)',
    emptyState: 'Os projetos dos criadores vão aparecer aqui! 🎨',
  },
}

/** Apresentação do canal pelo slug (default gentil se desconhecido). */
export function channelPresentation(slug: string): ChannelPresentation {
  return BY_SLUG[slug] ?? DEFAULT
}
