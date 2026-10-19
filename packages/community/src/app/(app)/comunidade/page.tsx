import Link from 'next/link'
import { PageBand, PageBody } from '@/components/community/page'
import { PersonAvatar } from '@/components/community/user-menu'
import { getAvatarReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'
import { CommunityHomeClient } from './community-home-client'

export const dynamic = 'force-dynamic'

export default async function ComunidadePage() {
  const [session, avatar, preferences] = await Promise.all([
    getSession(),
    getAvatarReadonly().catch(() => null),
    shell.members.getAdultProfileReadonly().catch(() => null),
  ])
  const profile = preferences?.status === 200 ? (preferences.body ?? null) : null
  const avatarUrl = avatar?.status === 200 ? (avatar.body?.photoUrl ?? null) : null

  return (
    <>
      <PageBand
        kicker="Espaços da comunidade adulta"
        title="Comunidade"
        lead="Tire dúvidas, mostre seus projetos e troque ideias com outras pessoas que também estão criando o primeiro jogo."
      />
      <PageBody>
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <CommunityHomeClient />
          <aside aria-label="Sobre a sua participação" className="flex flex-col gap-5">
            <section
              aria-labelledby="como-voce-aparece"
              className="sz-card flex flex-col gap-3 p-6"
            >
              <h2 id="como-voce-aparece" className="sz-h3">
                Como você aparece
              </h2>
              {session && profile ? (
                <div className="flex items-center gap-3">
                  <PersonAvatar
                    user={{ ...session, avatarUrl }}
                    className="size-[2.4rem] text-[0.85rem]"
                  />
                  <span className="flex min-w-0 flex-col">
                    <strong className="truncate">
                      {profile.publicEnabled ? profile.displayName || session.firstName : 'Colega'}
                    </strong>
                    <span className="text-[0.85rem] text-muted-foreground">
                      {profile.publicEnabled ? 'Perfil público ligado' : 'Perfil público desligado'}
                    </span>
                  </span>
                </div>
              ) : null}
              <p className="text-[0.85rem] text-muted-foreground">
                {/* Sem as preferências (falha de leitura) não dá para afirmar se está ligado. */}
                {profile === null
                  ? 'Com o perfil público desligado, as outras pessoas veem você como “Colega”. Ligado, aparecem o seu nome, os seus jogos e as suas conquistas.'
                  : profile.publicEnabled
                    ? 'Com o perfil público ligado, as outras pessoas veem o seu nome, os seus jogos e as suas conquistas. Desligando, você aparece como “Colega”.'
                    : 'Com o perfil público desligado, as outras pessoas veem você como “Colega”. Ligando, aparecem o seu nome, os seus jogos e as suas conquistas.'}
              </p>
              <Link
                href="/perfil"
                prefetch={false}
                className="sz-link inline-flex min-h-[2.4rem] items-center self-start"
              >
                Alterar em Meu perfil
              </Link>
            </section>
            <section aria-labelledby="duvida-aula" className="sz-card flex flex-col gap-3 p-6">
              <h2 id="duvida-aula" className="sz-h3">
                Dúvida sobre uma aula?
              </h2>
              <p className="text-[0.85rem] text-muted-foreground">
                Dentro da aula, “Preciso de ajuda” fala direto com a equipe. As respostas chegam em
                Recados.
              </p>
              <Link
                href="/recados"
                prefetch={false}
                className="sz-link inline-flex min-h-[2.4rem] items-center self-start"
              >
                Abrir Recados
              </Link>
            </section>
          </aside>
        </div>
      </PageBody>
    </>
  )
}
