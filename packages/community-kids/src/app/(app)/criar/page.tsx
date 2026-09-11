import type { CreativeToolId } from '@sistemazero/core/career'
import { ArrowRight, LockKeyhole, Palette, Wrench } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { ContinueHero } from '@/components/kids/continue-hero'
import { CreatorWorks } from '@/components/kids/creator-works'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsClosingCard } from '@/components/kids/kids-closing-card'
import { KidsFeatureCard } from '@/components/kids/kids-feature-card'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { KidsScene } from '@/components/kids/kids-scene'
import { KidsSectionHeader } from '@/components/kids/kids-section-header'
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

/**
 * O Criar, no desenho da tela-modelo (11/09/2026): cabeçalho e herói no creme, os
 * TRABALHOS da criança logo depois (menta), as oficinas prontas para criar (azul-claro)
 * e o fechamento no lilás. A ordem é a da imagem: primeiro o que ela já fez, depois
 * onde fazer mais.
 */
export default async function CriarPage() {
  const journey = await getCreatorJourney()
  const available = journey.tools.filter((tool) => tool.state === 'available')
  const future = journey.tools.filter((tool) => tool.state !== 'available')
  return (
    <>
      <KidsBand tone="creme">
        <KidsPageHeader
          eyebrow="Sua oficina de criação"
          eyebrowIcon={Palette}
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

      {available.length ? (
        <KidsBand tone="ceu">
          <section aria-labelledby="prontas-heading">
            <KidsSectionHeader
              id="prontas-heading"
              title="Prontas para criar"
              subtitle="Cada oficina tem a cor dela. Você reconhece antes de ler o nome."
            />
            {/* 4 colunas só a partir de 1280px: com o menu de 268px, a 1092px cada
                cartão ficava com 160px e o selo "Liberado" era cortado (medido). */}
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
                      fg={oficina.fg}
                      seloInk={oficina.selo}
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
          </section>
        </KidsBand>
      ) : null}

      <KidsBand tone="lilas">
        {future.length ? (
          <section
            aria-labelledby="future-tools-heading"
            className="kids-carta rounded-[2rem] p-6 md:p-8"
          >
            <div className="flex items-center gap-5">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-(--sz-kids-amarelo)">
                <Wrench className="size-7 text-(--kids-ouro-fg)" aria-hidden />
              </span>
              <h2
                id="future-tools-heading"
                className="sz-display text-xl leading-tight md:text-2xl"
              >
                Conheça as ferramentas
              </h2>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {future.map(({ id, state, requiredLevel }) => {
                const oficina = TOOL_SIGNATURE[id]
                const Icone = oficina.icone
                return (
                  <div key={id} className="flex items-start gap-4 rounded-2xl bg-background p-4">
                    {/* Ladrilho SÓLIDO na cor da oficina, mesmo travada: a criança
                        aprende a cor antes de ter acesso, e o cadeado fica por cima. */}
                    <span
                      aria-hidden="true"
                      className="relative grid size-11 shrink-0 place-items-center rounded-[0.75rem]"
                      style={{ backgroundColor: oficina.fundo, color: oficina.fg }}
                    >
                      <Icone className="size-5" />
                      <LockKeyhole className="-right-1.5 -bottom-1.5 absolute size-5 rounded-full bg-card p-0.5 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="sz-display text-lg leading-tight">{oficina.nome}</h3>
                      <p className="mt-1 font-medium text-muted-foreground text-sm">
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
                          className="mt-3 inline-flex min-h-11 items-center gap-1 font-bold text-primary text-sm hover:underline"
                        >
                          Ver o caminho na carreira
                          <ArrowRight className="size-4" aria-hidden />
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
