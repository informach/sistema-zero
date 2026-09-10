import { cn } from '@/lib/cn'
import { levelInfo } from '@/lib/level-info'

/**
 * Insígnia do NÍVEL do aluno: selo com ícone + nome na cor do nível. Cor inline
 * (`--level-<slug>` do globals.css). `size="lg"` para o destaque do perfil; `sm`
 * para chips em listas/cabeçalhos.
 */
export function LevelBadge({
  levelSlug,
  size = 'md',
  className,
}: {
  levelSlug?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const info = levelInfo(levelSlug)
  const Icon = info.icon
  const pad =
    size === 'lg'
      ? 'gap-2 px-3.5 py-1.5 text-sm'
      : size === 'sm'
        ? 'gap-1 px-2 py-0.5 text-xs'
        : 'gap-1.5 px-3 py-1 text-sm'
  const iconSize = size === 'lg' ? 18 : size === 'sm' ? 12 : 14
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold sz-display',
        pad,
        className,
      )}
      style={{
        // ⚠️ A tinta NÃO é a cor do nível crua. Medido no pódio do ranking: com a cor
        // pura o rótulo de 12px ficava entre 4,26 e 4,49:1 sobre o próprio fundo
        // tintado — abaixo dos 4,5 da AA em quase todos os oito níveis, e por tão
        // pouco que só apareceu medindo. Puxar 22% na direção do texto do tema
        // mantém o matiz (a cor do nível continua sendo a do nível) e resolve nos
        // DOIS temas de uma vez: no claro escurece, no escuro clareia.
        color: `color-mix(in oklab, ${info.colorVar} 78%, var(--foreground))`,
        backgroundColor: `color-mix(in oklab, ${info.colorVar} 14%, transparent)`,
        border: `1.5px solid color-mix(in oklab, ${info.colorVar} 40%, transparent)`,
      }}
    >
      <Icon size={iconSize} aria-hidden />
      {info.label}
    </span>
  )
}
