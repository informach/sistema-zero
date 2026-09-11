import { HeartHandshake } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ChildrenDashboard,
  FamilyAiCredits,
  ParentSupportCard,
} from '@/app/perfis/parent-dashboard'
import { KidsEyebrow } from '@/components/kids/kids-eyebrow'
import { KidsScreen } from '@/components/kids/kids-screen'
import { isParentVerifiedFor } from '@/server/parent-gate'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/** Account-only accompaniment. The data endpoints independently require the same parent gate. */
export default async function ResponsavelPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.activeProfile || !(await isParentVerifiedFor(session.id)))
    redirect('/perfis?manage=1')
  return (
    <KidsScreen align="start" innerClassName="flex max-w-4xl flex-col items-center gap-7">
      <header className="w-full max-w-2xl">
        <KidsEyebrow icon={HeartHandshake}>Área dos responsáveis</KidsEyebrow>
        <h1 className="sz-display mt-3 text-[clamp(2rem,3.4vw,2.8125rem)]">
          Acompanhe as descobertas
        </h1>
        <p className="mt-2.5 font-medium text-[1.0625rem] text-muted-foreground">
          Veja o que cada criança está criando, as conquistas da carreira e o próximo passo. Uma boa
          conversa começa pedindo que ela mostre como fez o jogo.
        </p>
        <nav aria-label="Área dos responsáveis" className="mt-5 flex flex-wrap gap-2">
          <Link href="/perfis" prefetch={false} className="sz-btn-gradient sz-btn-contorno">
            Escolher uma criança
          </Link>
          <Link
            href="/perfis?manage=1"
            prefetch={false}
            className="sz-btn-gradient sz-btn-contorno"
          >
            Gerenciar perfis e conta
          </Link>
          <Link
            href="/responsavel/ajuda"
            prefetch={false}
            className="sz-btn-gradient sz-btn-contorno"
          >
            Atendimento
          </Link>
        </nav>
      </header>
      <ChildrenDashboard avatarPhotoByProfile={{}} />
      <section className="kids-carta w-full max-w-2xl p-5 md:p-6">
        <h2 className="sz-display text-xl">Para conversar sobre uma criação</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Que ideia você quis colocar neste jogo?</li>
          <li>O que precisou testar ou mudar para funcionar?</li>
          <li>O que gostaria de experimentar na próxima versão?</li>
        </ul>
      </section>
      <FamilyAiCredits />
      <ParentSupportCard />
    </KidsScreen>
  )
}
