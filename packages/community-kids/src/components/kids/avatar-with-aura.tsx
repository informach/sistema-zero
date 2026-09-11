import { KidsAvatar } from '@/components/kids/kids-avatar'

/**
 * Avatar da criança nas listas, cabeçalhos e cartões.
 *
 * ⚠️ O NOME é histórico: até 10/09/2026 ele desenhava um anel com brilho na cor do
 * NÍVEL em volta da foto. As telas-modelo de 11/09/2026 não têm anel nenhum (a foto,
 * ou a inicial, direto no círculo), e o nível passou a morar no selo (`LevelBadge`)
 * e na linha de texto ao lado. Renomear tocaria em oito telas sem ganho para a
 * criança, então a API ficou: `levelSlug` segue aceito e não pinta mais nada.
 */
export function AvatarWithAura({
  photoUrl,
  name,
  size = 'md',
  className,
  label,
}: {
  photoUrl?: string | null
  /** Nome de quem é o avatar: a inicial aparece enquanto não há foto. */
  name?: string | null
  /** Aceito por compatibilidade; o anel do nível saiu do desenho. */
  levelSlug?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  label?: string
}) {
  return (
    <KidsAvatar photoUrl={photoUrl} name={name} size={size} label={label} className={className} />
  )
}
