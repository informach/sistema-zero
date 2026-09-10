import type { CreativeToolId } from '@sistemazero/core/career'
import { ArrowRight, LockKeyhole, Sparkles, Wrench } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { ContinueHero } from '@/components/kids/continue-hero'
import { CreatorWorks } from '@/components/kids/creator-works'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsClosingCard } from '@/components/kids/kids-closing-card'
import { KidsFeatureCard } from '@/components/kids/kids-feature-card'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { KidsScene } from '@/components/kids/kids-scene'
import { levelInfo } from '@/lib/level-info'
import { TOOL_SIGNATURE } from '@/lib/tool-signature'
import { getCreatorJourney } from '@/server/creator-journey'

export const dynamic = 'force-dynamic'

/** O que cada oficina FAZ. Nome, atalho, ícone e cor vêm do `TOOL_SIGNATURE`. */
const descricoes: Record<CreativeToolId, string> = {
  'estudio-completo': 'Dê vida ao seu jogo com os blocos que você conquistou.',
  pinta: 'Desenhe personagens, cenários e peças em 2D.',
  pensa: 'Transforme sua ideia em um plano e acompanhe as tarefas.',
  molda: 'Crie modelos, texturas e céus para seus mundos 3D.',
}

export default async function CriarPage() {
  const journey = await getCreatorJourney()
  const available = journey.tools.filter((tool) => tool.state === 'available')
  const future = journey.tools.filter((tool) => tool.state !== 'available')
  return (
    <>
      <KidsBand tone="creme">
        <KidsPageHeader
          eyebrow="Sua oficina de criação"
          eyebrowIcon={Sparkles}
          title="Uma ideia. Muitas formas de criar."
          subtitle={
            available.length
              ? 'Retome seus projetos nas ferramentas abaixo. Tudo o que você aprende amplia sua oficina.'
              : 'Comece criando dentro das aulas. Sua oficina cresce junto com a Carreira do Criador.'
          }
        />
        <div className="mt-6">
          {journey.courses ? (
            <ContinueHero courses={journey.courses} />
          ) : (
            <p role="status" className="kids-carta p-5 font-semibold">
              Não conseguimos consultar seus cursos agora. Tente atualizar esta página.
            </p>
          )}
        </div>
      </KidsBand>

      {available.length ? (
        <KidsBand tone="menta">
          <h2 className="sz-display text-[clamp(1.4rem,3vw,1.9rem)]">Prontas para criar</h2>
          <p className="mt-1 font-semibold text-muted-foreground text-sm">
            Cada oficina tem a cor dela. Você reconhece antes de ler o nome.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {available.map(({ id }) => {
              const oficina = TOOL_SIGNATURE[id]
              return (
                <Link key={id} href={oficina.href} prefetch={false} className="kid-pop">
                  <KidsFeatureCard
                    icon={oficina.icone}
                    title={oficina.nome}
                    description={descricoes[id]}
                    badge="Liberado"
                    color={oficina.fundo}
                    ink={oficina.tinta}
                    footer={
                      <span className="flex items-center gap-2">
                        Abrir minha oficina <ArrowRight className="size-4" aria-hidden />
                      </span>
                    }
                    className="h-full"
                  />
                </Link>
              )
            })}
          </div>
        </KidsBand>
      ) : null}

      {available.length ? (
        <KidsBand tone="ceu">
          <Suspense
            fallback={
              <p role="status" className="font-semibold text-muted-foreground text-sm">
                Buscando seus trabalhos…
              </p>
            }
          >
            <CreatorWorks available={available.map((tool) => tool.id)} />
          </Suspense>
        </KidsBand>
      ) : null}

      <KidsBand tone="lilas">
        {future.length ? (
          <section aria-labelledby="future-tools-heading" className="kids-carta p-5 md:p-6">
            <h2 id="future-tools-heading" className="sz-display text-xl">
              Conheça as ferramentas
            </h2>
            <div className="mt-2 divide-y divide-(--linha-carta)">
              {future.map(({ id, state, requiredLevel }) => {
                const oficina = TOOL_SIGNATURE[id]
                const Icone = oficina.icone
                return (
                  <div key={id} className="flex items-start gap-3 py-4">
                    {/* Ladrilho na cor da oficina, mesmo travada: a criança aprende a
                        cor antes de ter acesso, e o cadeado fica por cima dela. */}
                    <span
                      aria-hidden="true"
                      className="relative grid size-10 shrink-0 place-items-center rounded-xl"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${oficina.fundo} 14%, transparent)`,
                        color: oficina.tinta,
                      }}
                    >
                      <Icone className="size-5" />
                      <LockKeyhole className="-right-1 -bottom-1 absolute size-4 rounded-full bg-card p-0.5 text-muted-foreground" />
                    </span>
                    <div className="flex-1">
                      <h3 className="sz-display text-base">{oficina.nome}</h3>
                      <p className="mt-1 font-semibold text-muted-foreground text-sm">
                        {descricoes[id]}
                      </p>
                      <p className="mt-2 font-bold text-sm">
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
                          className="inline-flex min-h-11 items-center font-bold text-primary text-sm"
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
        ) : (
          <KidsClosingCard
            icon={Wrench}
            title="Toda a sua oficina já está liberada"
            description="Você conquistou as quatro ferramentas. O que vier de novo aparece aqui primeiro."
            action={<KidsScene name="zappy-final" className="size-20 md:size-24" />}
          />
        )}
      </KidsBand>
    </>
  )
}
