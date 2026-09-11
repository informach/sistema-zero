import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

/**
 * O "voltar" ÚNICO do kids. Antes cada tela inventava o seu (círculo com relevo na
 * aula, círculo chapado nos Recados, link de texto na trilha, botão fantasma nas
 * compras...) e o app parecia costurado de retalhos. Agora todos saem daqui.
 *
 * O desenho é o do "Voltar ao mapa" das telas-modelo (11/09/2026):
 *  - com `showLabel`: a PÍLULA branca, com a seta dentro de um círculo creme e o
 *    texto ao lado. É a seta das páginas internas, sozinha na linha do cabeçalho;
 *  - sem rótulo: só o círculo creme de 44px, para quando o botão divide a linha
 *    com outros controles (aula, avatar);
 *  - `overlay`: flutuando sobre a cena 3D do avatar, onde o creme some no fundo e o
 *    botão precisa do véu translúcido para ficar legível.
 * O `label` vai SEMPRE no nome acessível.
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
  const pill = showLabel && variant !== 'overlay'

  const content = pill ? (
    <>
      {/* O círculo creme dentro da pílula branca: o creme é o da faixa, que no
          escuro já é o navy um tom acima, então o par segue o tema sozinho. */}
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-(--band-creme) text-foreground transition-colors group-hover:bg-[color-mix(in_oklab,var(--band-creme)_85%,var(--foreground))]"
      >
        <ArrowLeft className="size-4" />
      </span>
      <span className="font-bold text-[0.9375rem] text-foreground">{label}</span>
    </>
  ) : (
    <span
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-full transition-[color,background-color,transform]',
        variant === 'overlay'
          ? 'bg-card/90 text-foreground shadow-md backdrop-blur active:scale-90'
          : 'bg-(--band-creme) text-foreground hover:bg-[color-mix(in_oklab,var(--band-creme)_85%,var(--foreground))] active:translate-y-px',
      )}
    >
      <ArrowLeft className="size-5" />
    </span>
  )

  // SEM `title`, nunca. Um `title` igual ao nome acessível vira DESCRIÇÃO pela
  // accname spec — o leitor de tela diria "Voltar aos recados, link, Voltar aos
  // recados" — e o público é tablet/celular, onde tooltip nem aparece: custo sem
  // benefício. O nome vem do texto (com rótulo) ou do `aria-label` (sem ele).
  const shared = {
    'aria-label': pill ? undefined : label,
    className: cn(
      // `rounded-full` no elemento FOCÁVEL: o anel de foco do navegador segue a
      // borda dele, não do círculo interno — sem isto sai um retângulo em volta de
      // um botão redondo (e, no `overlay`, por cima da cena 3D).
      'group inline-flex w-fit items-center rounded-full',
      'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
      // A pílula tem 52px de altura, a do "Voltar ao mapa" (medido); o fio só aparece
      // no escuro, onde a pílula e a faixa quase se confundem.
      pill && 'h-13 gap-2.5 bg-card pr-5 pl-2.5 ring-1 ring-(--borda-carta)',
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
