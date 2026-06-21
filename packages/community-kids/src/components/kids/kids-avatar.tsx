import { cn } from '@/lib/cn'

const SIZES = {
  sm: 'size-8',
  md: 'size-12',
  lg: 'size-16',
  xl: 'size-28',
} as const

/**
 * Avatar da criança = a FOTO (snapshot) do personagem 3D montado no `/meu-avatar`.
 * Renderer reusado em TODO lugar (menu, cards, perfil, quarto, perfil público) — mostra
 * só um `<img>` (zero WebGL fora do configurador; avatares aparecem em listas/rankings).
 * Sem foto ainda → personagem padrão (SVG inline, sem asset binário).
 */
export function KidsAvatar({
  photoUrl,
  size = 'md',
  className,
  label,
}: {
  /** URL do snapshot (`avatarPhotoUrl`/`photoUrl` das views). `null`/ausente → default. */
  photoUrl?: string | null
  size?: keyof typeof SIZES
  className?: string
  /** Texto acessível (ex.: "Avatar de Lia"). */
  label?: string
}) {
  return (
    <span
      role="img"
      aria-label={label ?? 'Avatar'}
      className={cn(
        'inline-block shrink-0 overflow-hidden rounded-full bg-(--kids-cyan-tint)',
        SIZES[size],
        className,
      )}
    >
      {photoUrl ? (
        // biome-ignore lint/performance/noImgElement: avatar é imagem do R2 (não otimizada pelo next/image no BFF).
        <img
          src={photoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <DefaultAvatar />
      )}
    </span>
  )
}

/** Personagem padrão (rostinho amigável) mostrado antes da 1ª foto — SVG inline. */
function DefaultAvatar() {
  return (
    <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
      <title>Avatar padrão</title>
      <rect width="64" height="64" fill="var(--kids-cyan-tint)" />
      <circle cx="32" cy="27" r="14" fill="#ecad80" />
      <circle cx="27" cy="25" r="2.3" fill="#2c2c2c" />
      <circle cx="37" cy="25" r="2.3" fill="#2c2c2c" />
      <path
        d="M26 31 q6 6 12 0"
        stroke="#9b5a4a"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M13 62 q19 -20 38 0 z" fill="#3498db" />
    </svg>
  )
}
