import { UserRound } from 'lucide-react'
import Link from 'next/link'
import { PersonAvatar } from '@/components/community/user-menu'
import type { SessionUserWithAvatar } from '@/lib/types'

/** O editor do avatar devolve a pessoa ao perfil (`/perfil` está na lista de retornos aceitos). */
const AVATAR_EDITOR_HREF = '/meu-avatar?returnTo=%2Fperfil'

/**
 * "Seu avatar" (direção de arte de 18/10/2026): a imagem da pessoa é a foto do avatar 3D, como no
 * Kids. O envio de foto saiu; sem avatar, as iniciais, e um exemplo de como fica depois.
 */
export function AvatarSection({
  user,
}: {
  user: Pick<SessionUserWithAvatar, 'avatarUrl' | 'firstName' | 'lastName' | 'email'>
}) {
  const hasPhoto = Boolean(user.avatarUrl)
  return (
    <section
      id="avatar"
      aria-labelledby="perfil-avatar"
      className="sz-card flex scroll-mt-28 flex-col gap-5 p-6 md:p-8"
    >
      <div className="flex flex-wrap items-center gap-6">
        <PersonAvatar user={user} className="size-[5.6rem] text-[1.8rem]" />
        <div className="flex min-w-0 flex-1 basis-[16rem] flex-col gap-2">
          <h2 id="perfil-avatar" className="sz-h3">
            Seu avatar
          </h2>
          <p className="text-muted-foreground">
            {hasPhoto
              ? 'A imagem que representa você na comunidade é a foto do seu avatar 3D.'
              : 'A imagem que representa você na comunidade é a foto do seu avatar 3D. Enquanto você não cria o seu, aparecem as suas iniciais.'}
          </p>
        </div>
        <Link href={AVATAR_EDITOR_HREF} prefetch={false} className="sz-btn">
          <UserRound aria-hidden />
          {hasPhoto ? 'Editar meu avatar' : 'Criar meu avatar'}
        </Link>
      </div>
      <div className="sz-soft flex flex-wrap items-center gap-5 px-6 py-5">
        {hasPhoto ? null : <ExamplePortrait />}
        <div className="flex min-w-0 flex-1 basis-[14rem] flex-col gap-1">
          <strong>{hasPhoto ? 'Onde a foto aparece' : 'Como fica depois'}</strong>
          <p className="text-[0.9rem] text-muted-foreground">
            A foto tirada no editor do avatar aparece no menu do topo, no seu perfil público e no
            seu espaço 3D. Para trocar, é só editar o avatar e tirar outra foto.
          </p>
        </div>
      </div>
    </section>
  )
}

/** Exemplo ilustrado (não é dado de ninguém): o retrato que o editor do avatar produz. */
function ExamplePortrait() {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label="Exemplo de avatar: uma mulher de cabelo grisalho preso e óculos"
      className="block size-[3.6rem] flex-none rounded-full"
    >
      <rect width="120" height="120" fill="#E6EDFE" />
      <path d="M18 120c4-24 22-36 42-36s38 12 42 36z" fill="#C8246F" />
      <rect x="51" y="70" width="18" height="18" rx="6" fill="#E8B48F" />
      <circle cx="60" cy="52" r="26" fill="#F2C29E" />
      <path d="M33 50c0-18 12-28 27-28s27 10 27 28c-6-8-14-12-27-12s-21 4-27 12z" fill="#B9BEC9" />
      <circle cx="60" cy="22" r="10" fill="#B9BEC9" />
      <g fill="none" stroke="#0F1A33" strokeWidth="2.5">
        <circle cx="49" cy="54" r="7" />
        <circle cx="71" cy="54" r="7" />
        <path d="M56 54h8" />
      </g>
      <path
        d="M52 66q8 6 16 0"
        fill="none"
        stroke="#9A4B35"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
