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
        color: info.colorVar,
        backgroundColor: `color-mix(in oklch, ${info.colorVar} 14%, transparent)`,
        border: `1.5px solid color-mix(in oklch, ${info.colorVar} 40%, transparent)`,
      }}
    >
      <Icon size={iconSize} aria-hidden />
      {info.label}
    </span>
  )
}
