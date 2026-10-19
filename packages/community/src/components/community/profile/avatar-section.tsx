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
      aria-label="Exemplo de avatar: uma pessoa jovem de cabelo castanho na altura dos ombros e camiseta verde"
      className="block size-[3.6rem] flex-none rounded-full"
    >
      <rect width="120" height="120" fill="#E6EDFE" />
      <path
        d="M32 50c0-20 12-30 28-30s28 10 28 30v30c0 4-3 6-6 6H38c-3 0-6-2-6-6z"
        fill="#3B2A20"
      />
      <path d="M18 120c4-24 22-36 42-36s38 12 42 36z" fill="#0B7A54" />
      <rect x="51" y="70" width="18" height="18" rx="6" fill="#B97A55" />
      <circle cx="60" cy="52" r="24" fill="#D39A72" />
      <path
        d="M35 48c2-15 12-23 25-23s23 8 25 23c-9-2-18-7-23-14-4 7-14 12-27 14z"
        fill="#3B2A20"
      />
      <path
        d="M46 47h8M66 47h8"
        fill="none"
        stroke="#3B2A20"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="51" cy="55" r="2.6" fill="#0F1A33" />
      <circle cx="69" cy="55" r="2.6" fill="#0F1A33" />
      <path
        d="M53 64q7 6 14 0"
        fill="none"
        stroke="#8A3F2B"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
