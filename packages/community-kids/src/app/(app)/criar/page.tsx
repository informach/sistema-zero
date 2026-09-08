import type { CreativeToolId } from '@sistemazero/core/career'
import { ArrowRight, Blocks, Box, Lightbulb, LockKeyhole, Palette } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { ContinueHero } from '@/components/kids/continue-hero'
import { CreatorWorks } from '@/components/kids/creator-works'
import { levelInfo } from '@/lib/level-info'
import { getCreatorJourney } from '@/server/creator-journey'

export const dynamic = 'force-dynamic'

const tools: Record<
  CreativeToolId,
  { title: string; href: string; icon: typeof Blocks; description: string }
> = {
  'estudio-completo': {
    title: 'Estúdio',
    href: '/estudio',
    icon: Blocks,
    description: 'Dê vida ao seu jogo com os blocos que você conquistou.',
  },
  pinta: {
    title: 'Pinta',
    href: '/pinta',
    icon: Palette,
    description: 'Desenhe personagens, cenários e peças em 2D.',
  },
  pensa: {
    title: 'Pensa',
    href: '/pensa',
    icon: Lightbulb,
    description: 'Transforme sua ideia em um plano e acompanhe as tarefas.',
  },
  molda: {
    title: 'Molda',
    href: '/molda',
    icon: Box,
    description: 'Crie modelos, texturas e céus para seus mundos 3D.',
  },
}

export default async function CriarPage() {
  const journey = await getCreatorJourney()
  const available = journey.tools.filter((tool) => tool.state === 'available')
  const future = journey.tools.filter((tool) => tool.state !== 'available')
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm font-bold text-primary">Sua oficina de criação</p>
        <h1 className="sz-display mt-2 text-3xl md:text-4xl">Uma ideia. Muitas formas de criar.</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {available.length
            ? 'Retome seus projetos nas ferramentas abaixo. Tudo o que você aprende amplia sua oficina.'
            : 'Comece criando dentro das aulas. Sua oficina cresce junto com a Carreira do Criador.'}
        </p>
      </header>
      {journey.courses ? (
        <ContinueHero courses={journey.courses} />
      ) : (
        <p role="status" className="rounded-2xl border border-border bg-card p-5">
          Não conseguimos consultar seus cursos agora. Tente atualizar esta página.
        </p>
      )}
      <Link
        href="/praticar"
        className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5"
      >
        <span>
          <strong className="block">Praticar um pouco</strong>
          <span className="text-sm text-muted-foreground">
            Relembre o que aprendeu com perguntas curtas.
          </span>
        </span>
        <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
      </Link>
      {available.length ? (
        <Suspense
          fallback={
            <p role="status" className="text-sm text-muted-foreground">
              Buscando seus trabalhos…
            </p>
          }
        >
          <CreatorWorks available={available.map((tool) => tool.id)} />
        </Suspense>
      ) : null}
      {available.length ? (
        <section aria-labelledby="tools-heading">
          <h2 id="tools-heading" className="sz-display mb-4 text-xl">
            Prontas para criar
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {available.map(({ id }) => {
              const { title, href, icon: Icon, description } = tools[id]
              return (
                <Link
                  key={id}
                  href={href}
                  prefetch={false}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="flex items-center justify-between">
                    <Icon className="size-8 text-primary" aria-hidden />
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      Liberado
                    </span>
                  </span>
                  <h3 className="sz-display text-2xl">{title}</h3>
                  <p className="flex-1 text-muted-foreground text-sm">{description}</p>
                  <span className="flex min-h-11 items-center gap-2 font-bold text-primary text-sm">
                    Abrir minha oficina <ArrowRight className="size-4" aria-hidden />
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}
      {future.length ? (
        <section
          aria-labelledby="future-tools-heading"
          className="rounded-2xl border border-border bg-card p-5"
        >
          <h2 id="future-tools-heading" className="sz-display text-xl">
            Conheça as ferramentas
          </h2>
          <div className="mt-2 divide-y divide-border">
            {future.map(({ id, state, requiredLevel }) => {
              const tool = tools[id]
              return (
                <div key={id} className="flex items-start gap-3 py-4">
                  <LockKeyhole className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="flex-1">
                    <h3 className="font-bold">{tool.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
                    <p className="mt-2 text-sm font-semibold">
                      {state === 'career-locked'
                        ? `Incluído na sua conta · abre no nível ${levelInfo(requiredLevel).label}`
                        : state === 'not-included'
                          ? 'Não incluído nos acessos desta conta'
                          : 'Não foi possível consultar a disponibilidade agora'}
                    </p>
                    {state === 'career-locked' ? (
                      <Link
                        href="/cursos"
                        prefetch={false}
                        className="mt-1 inline-flex min-h-11 items-center font-bold text-primary text-sm"
                      >
                        Ver o caminho na carreira
                      </Link>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
