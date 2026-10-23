import { BrandLogo } from '@sistemazero/ui/brand-logo'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { safeNextPath } from '@/lib/paths'
import { isAdminRole } from '@/lib/types'
import { getSession } from '@/server/session'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const user = await getSession()
  if (user && isAdminRole(user.role)) {
    const { next } = await searchParams
    redirect(safeNextPath(next) ?? '/admin/professor')
  }

  // A entrada da sala da equipe (23/10/2026): de um lado a noite da Comunidade dos Criadores, com
  // o Zappy e as duas comunidades; do outro, o formulário.
  return (
    <main className="flex min-h-screen flex-col bg-background md:flex-row">
      <section className="flex flex-col justify-between gap-10 bg-menu px-6 py-10 text-menu-text md:w-1/2 md:px-14 md:py-14">
        <BrandLogo fundo="escuro" label="Sistema Zero" className="block h-auto w-[190px]" />
        <div className="flex max-w-lg flex-col gap-5">
          <Image
            src="/zappy/happy.webp"
            alt=""
            width={180}
            height={180}
            priority
            className="h-auto w-[150px] md:w-[180px]"
          />
          {/* Um `<p>` com cara de título: o primeiro título da página é o "Entrar" do formulário. */}
          <p className="font-display text-4xl font-bold leading-tight text-white md:text-[44px]">
            A sala da equipe
          </p>
          <p className="text-[17px] leading-relaxed">
            Daqui a gente cuida da Comunidade dos Criadores e da Comunidade Sistema Zero: encontros,
            projetos, recados, cursos e o que mantém a casa de pé.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex h-7 items-center rounded-full bg-lens-kids px-3 text-[13px] font-bold text-lens-kids-ink">
            Kids
          </span>
          <span className="inline-flex h-7 items-center rounded-full bg-lens-adult px-3 text-[13px] font-bold text-lens-adult-ink">
            Adultos
          </span>
        </div>
      </section>
      <section className="flex flex-1 items-center justify-center px-4 py-12">
        <LoginForm />
      </section>
    </main>
  )
}
