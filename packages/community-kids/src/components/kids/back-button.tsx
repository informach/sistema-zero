import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

/**
 * O "voltar" ÚNICO do kids. Antes cada tela inventava o seu (círculo com relevo na
 * aula, círculo chapado nos Recados, link de texto na trilha, botão fantasma nas
 * compras...) e o app parecia costurado de retalhos. Agora todos saem daqui.
 *
 * O visual é o botão 3D da marca — mesmo relevo do CTA e do `FocusModeToggle`
 * (sombra dura + afunda no clique). Duas variantes só:
 *  - `default`: sobre fundo de página.
 *  - `overlay`: flutuando sobre a cena 3D do avatar, onde a sombra dura some no
 *    fundo escuro e o botão precisa do véu translúcido para ficar legível.
 *
 * `showLabel` liga o texto ao lado do círculo. A regra, para não voltar ao
 * "cada um de um jeito": LIGADO quando o botão está sozinho numa linha de
 * cabeçalho (a criança lê para onde vai), DESLIGADO quando divide a linha com
 * outros controles (aula, avatar). O botão em si é idêntico nos dois casos, e o
 * `label` vai SEMPRE no `aria-label`/`title`.
 */
interface KidsBackButtonBase {
  /** Para onde volta, em 2ª pessoa. Ex.: "Voltar ao mapa". */
  label: string
  className?: string
}

/**
 * `overlay` NUNCA aceita `showLabel`: o véu translúcido que dá legibilidade vive no
 * CÍRCULO, então o texto ao lado cairia direto sobre a cena WebGL, ilegível. Como
 * este é o "voltar" único do app, o tipo proíbe a combinação em vez de confiar.
 */
type KidsBackButtonLook =
  | { variant?: 'default'; showLabel?: boolean }
  | { variant: 'overlay'; showLabel?: never }

/**
 * União discriminada: OU `href` OU `onClick`, nunca nenhum dos dois. Sem isso
 * `<KidsBackButton label="Voltar" />` compilava e renderizava um botão sem handler —
 * um controle morto com cara de clicável.
 */
export type KidsBackButtonProps = KidsBackButtonBase &
  KidsBackButtonLook &
  ({ href: string; onClick?: never } | { onClick: () => void; href?: never })

export function KidsBackButton({
  href,
  onClick,
  label,
  showLabel = false,
  variant = 'default',
  className,
}: KidsBackButtonProps) {
  const circle = cn(
    'grid size-11 shrink-0 place-items-center rounded-full transition-[color,background-color,border-color,box-shadow,transform]',
    variant === 'overlay'
      ? 'bg-card/90 text-foreground shadow-md backdrop-blur active:scale-90'
      : 'border-2 border-border bg-card text-muted-foreground shadow-[0_3px_0_var(--border)] hover:text-foreground active:translate-y-[2px] active:shadow-[0_1px_0_var(--border)]',
  )

  const content = (
    <>
      <span className={circle}>
        <ArrowLeft className="size-5" />
      </span>
      {showLabel ? (
        <span className="font-semibold text-muted-foreground text-sm transition-colors group-hover:text-foreground">
          {label}
        </span>
      ) : null}
    </>
  )

  // SEM `title`, nunca. Um `title` igual ao nome acessível vira DESCRIÇÃO pela
  // accname spec — o leitor de tela diria "Voltar aos recados, link, Voltar aos
  // recados" — e o público é tablet/celular, onde tooltip nem aparece: custo sem
  // benefício. O nome vem do texto (com rótulo) ou do `aria-label` (sem ele).
  const shared = {
    'aria-label': showLabel ? undefined : label,
    className: cn(
      // `rounded-full` no elemento FOCÁVEL: o anel de foco do navegador segue a
      // borda dele, não do círculo interno — sem isto sai um retângulo em volta de
      // um botão redondo (e, no `overlay`, por cima da cena 3D).
      'group inline-flex w-fit items-center gap-2.5 rounded-full',
      'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
      className,
    ),
  }

  // `href.trim()`, não só `href`: a união discriminada barra "os dois" e "nenhum",
  // mas não barra `href=""` — que cairia aqui e renderizaria um link para lugar
  // nenhum. Vazio decai para o `<button>` abaixo, que ao menos não navega errado.
  if (href?.trim()) {
    return (
      <Link href={href} {...shared}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} {...shared}>
      {content}
    </button>
  )
}
