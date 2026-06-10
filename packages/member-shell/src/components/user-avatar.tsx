import { cn } from '../lib/cn'
import { getUserDisplayName, getUserInitials } from '../lib/user-display'

const SIZES = {
  /** Botão do header. */
  sm: 'size-8 text-sm',
  /** Cabeçalho do menu suspenso. */
  lg: 'size-12 text-base',
  /** Página de perfil. */
  xl: 'size-20 text-2xl',
} as const

export interface UserAvatarProps {
  avatarUrl?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  size?: keyof typeof SIZES
  className?: string
}

/**
 * Avatar do usuário: foto (`avatarUrl`) ou círculo com as iniciais. `<img>` em
 * vez de next/image — URL externa arbitrária (R2), invariante #6 do package.
 */
export function UserAvatar({
  avatarUrl,
  firstName,
  lastName,
  email,
  size = 'sm',
  className,
}: UserAvatarProps) {
  const base = cn(
    'flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full',
    SIZES[size],
    className,
  )
  if (avatarUrl) {
    return (
      // URL externa arbitrária (R2) → <img> simples (noImgElement off no package).
      <img
        src={avatarUrl}
        alt={getUserDisplayName(firstName, lastName, email)}
        className={cn(base, 'border border-border object-cover')}
      />
    )
  }
  return (
    <span aria-hidden="true" className={cn(base, 'bg-primary/15 font-semibold text-foreground')}>
      {getUserInitials(firstName, lastName, email)}
    </span>
  )
}
