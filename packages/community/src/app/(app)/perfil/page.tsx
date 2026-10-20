import { PalettePicker } from '@sistemazero/member-shell/components/palette-picker'
import { isReadonlyImpersonation } from '@sistemazero/member-shell/lib/act'
import { paletteValueOf } from '@sistemazero/member-shell/lib/palette-cookie'
import { isVoiceInputConfigured } from '@sistemazero/member-shell/server/openrouter-transcribe'
import { cookies } from 'next/headers'
import { PageBody } from '@/components/community/page'
import { AvatarSection } from '@/components/community/profile/avatar-section'
import { ProfileNav } from '@/components/community/profile/profile-nav'
import { PublicProfileSettings } from '@/components/community/public-profile-settings'
import { PersonAvatar } from '@/components/community/user-menu'
import { PALETTE_COOKIE } from '@/lib/cookies'
import { getMeReadonly } from '@/server/auth'
import { getAvatarReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'
import { PasswordSection, PersonalDataSection } from './profile-client'

export const dynamic = 'force-dynamic'

/**
 * A seção já escreve o título; o seletor o empresta em vez de escrever a própria legenda. Dois
 * títulos empilhados dizendo a mesma coisa é ruído na tela e anúncio repetido no leitor.
 */
const TITULO_DA_COR = 'perfil-cor-do-tema'

/**
 * As caixinhas do `PalettePicker` (compartilhado, intocado) vestidas como na prancha: seis cartões
 * com o nome da cor à vista. Tudo pelos filhos, sem mexer no componente.
 */
const PALETTE_SKIN = [
  '[&>p:first-of-type]:hidden [&>p[role=status]:empty]:hidden',
  '[&_[role=radiogroup]]:mt-0 [&_[role=radiogroup]]:grid [&_[role=radiogroup]]:grid-cols-3 [&_[role=radiogroup]]:gap-3 sm:[&_[role=radiogroup]]:grid-cols-6',
  '[&_label]:flex [&_label]:min-h-[6rem] [&_label]:flex-col [&_label]:gap-2 [&_label]:rounded-[0.8rem] [&_label]:bg-card [&_label]:p-3',
  '[&_label:not(:has(:checked))]:border-border [&_label:has(:checked)]:border-[3px]',
  '[&_label>span[aria-hidden]]:size-[2.6rem] [&_label>span[aria-hidden]_svg]:size-6',
  '[&_label>span.sr-only]:not-sr-only [&_label>span.sr-only]:text-[0.9rem] [&_label:has(:checked)>span.sr-only]:font-bold',
].join(' ')

export default async function ProfilePage() {
  // Dados frescos do banco (trazem `phone`); fallback nas claims da sessão.
  // SOMENTE-LEITURA: página é Server Component (refresh/escrita de cookie aqui
  // lança) — o proxy já renovou o access antes do render; 401 residual degrada.
  const session = await getSession()
  const { status, body } = await getMeReadonly()
  const user =
    status === 200 && body?.user ? body.user : session ? { ...session, phone: undefined } : null

  if (!user) return null
  const [preferences, progress, avatar] = await Promise.all([
    shell.members.getAdultProfileReadonly().catch(() => null),
    shell.members.getGamificationReadonly().catch(() => null),
    getAvatarReadonly().catch(() => null),
  ])
  const aiAvailable = progress?.body?.journey?.capabilities.includes('ai') === true
  const pensaUnlocked = progress?.body?.journey?.capabilities.includes('pensa') === true
  // Ler o saldo não consome crédito; só vale a ida quando a seção aparece.
  const credits = aiAvailable ? await shell.members.getAiCreditsReadonly().catch(() => null) : null

  // A cor vem do MESMO espelho que o layout raiz leu: é o que pinta a tela no primeiro quadro.
  // O seletor confere com o servidor depois de montar (espelho de seis horas é POR APARELHO).
  const paletteEscolhida = paletteValueOf((await cookies()).get(PALETTE_COOKIE)?.value)
  const readOnly = Boolean(session && isReadonlyImpersonation(session))
  // ⚠️ `session.id` (o `sub` do JWT), NUNCA o `user.id` do /auth/me: é contra o `sub` que o BFF
  // compara o `x-sz-viewer`. Divergir aqui vira 409 permanente com um recado que manda reabrir a
  // página — o que não conserta nada.
  const viewerId = session?.id ?? user.id
  const person = {
    avatarUrl: avatar?.status === 200 ? (avatar.body?.photoUrl ?? null) : null,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  }

  return (
    <>
      {/* A faixa do perfil leva o retrato ao lado do título: mesma pele e medidas do `PageBand`. */}
      <section className="sz-band">
        <div className="sz-page flex flex-wrap items-center gap-6 pt-10 pb-9 md:pt-11 md:pb-10">
          <PersonAvatar user={person} className="size-[4.8rem] text-[1.6rem]" />
          <div className="flex min-w-0 flex-1 basis-[18rem] flex-col gap-1.5">
            <h1 className="sz-h1">Meu perfil</h1>
            <p className="sz-lead break-words">
              {user.email} · seus dados, sua cor e como você aparece na comunidade.
            </p>
          </div>
        </div>
      </section>
      <PageBody className="lg:flex-row lg:items-start lg:gap-8">
        <ProfileNav showAi={aiAvailable} />
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <AvatarSection user={person} />
          <PersonalDataSection user={user} readOnly={readOnly} />
          {/* Renderizado pela PÁGINA (servidor), não pelo formulário do cliente: a cor não é dado
              de cadastro e não deve engordar o `profile-client`. */}
          <section
            id="cor"
            aria-labelledby={TITULO_DA_COR}
            className="sz-card flex scroll-mt-28 flex-col gap-5 p-6 md:p-8"
          >
            <div className="flex flex-col gap-1.5">
              <h2 id={TITULO_DA_COR} className="sz-h3">
                Cor da plataforma
              </h2>
              <p className="text-[0.9rem] text-muted-foreground">
                A cor dos botões, links e destaques. Vale em qualquer computador em que você entrar.
              </p>
            </div>
            <PalettePicker
              viewerId={viewerId}
              initial={paletteEscolhida}
              readOnly={readOnly}
              labelledBy={TITULO_DA_COR}
              className={PALETTE_SKIN}
            />
          </section>
          <PublicProfileSettings
            initial={preferences?.status === 200 ? preferences.body : null}
            viewerId={viewerId}
            readOnly={readOnly}
            ai={
              aiAvailable
                ? {
                    credits: credits?.status === 200 ? (credits.body ?? null) : null,
                    voiceConfigured: isVoiceInputConfigured(),
                    pensaUnlocked,
                  }
                : null
            }
          />
          <PasswordSection impersonating={Boolean(session?.act)} />
        </div>
      </PageBody>
    </>
  )
}
