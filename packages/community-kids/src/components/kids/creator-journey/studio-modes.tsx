import type { KidsCreatorCapability, KidsJourneyView } from '@sistemazero/core/journey'
import { ArrowRight, Blocks, Check, Code, Lock, type LucideIcon, Split } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { KidsSectionHeader } from '../kids-section-header'

const MODES: {
  capability: KidsCreatorCapability
  title: string
  text: string
  Icon: LucideIcon
}[] = [
  {
    capability: 'studio',
    title: 'Blocos',
    text: 'Monte o jogo encaixando os blocos que você ganhou nos cursos.',
    Icon: Blocks,
  },
  {
    capability: 'bridge',
    title: 'Ponte',
    text: 'Blocos e código lado a lado: mexa num e veja o outro mudar.',
    Icon: Split,
  },
  {
    capability: 'pro',
    title: 'Pro',
    text: 'Projetos em arquivos, do jeito que os profissionais trabalham.',
    Icon: Code,
  },
]

/**
 * "Os jeitos de criar no Estúdio" (telas aprovadas de 25/10/2026): Blocos, Ponte e Pro, cada
 * um dizendo se já está liberado ou em qual trilha abre. A trilha sai das ferramentas que a
 * política publicada concede em cada trilha; nada aqui libera um modo.
 */
export function StudioModes({ view }: { view: KidsJourneyView }) {
  const stages = view.curriculum?.stages ?? []
  const opensIn = (capability: KidsCreatorCapability) => {
    const index = view.advances.findIndex((advance) => advance.capabilities.includes(capability))
    return index >= 0 ? (stages[index]?.title ?? null) : null
  }
  return (
    <section aria-labelledby="jeitos-de-criar">
      <KidsSectionHeader
        id="jeitos-de-criar"
        title="Os jeitos de criar no Estúdio"
        subtitle="Cada trilha abre um jeito novo. As linguagens chegam pelos blocos que os cursos liberam."
        actions={
          <Link href="/cursos" prefetch={false} className="sz-btn-gradient sz-btn-suave gap-2 px-5">
            Ver o caminho na jornada <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
      <ul className="grid gap-4 md:grid-cols-3">
        {MODES.map(({ capability, title, text, Icon }) => {
          const earned = view.earned.capabilities.includes(capability)
          const trail = earned ? null : opensIn(capability)
          return (
            <li key={capability} className="kids-carta flex flex-col gap-3 p-5">
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-12 place-items-center rounded-2xl',
                  earned
                    ? 'bg-(--band-ceu) text-(--sz-kids-azul-texto)'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="size-6" />
              </span>
              <h3 className="sz-display text-xl">{title}</h3>
              <p className="font-medium text-[0.9375rem] text-muted-foreground">{text}</p>
              <span
                className={cn(
                  'mt-auto inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 font-extrabold text-[0.8125rem]',
                  earned
                    ? 'bg-(--band-menta) text-(--success-foreground)'
                    : 'bg-(--band-creme) text-foreground',
                )}
              >
                {earned ? (
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                ) : (
                  <Lock className="size-3.5" aria-hidden />
                )}
                {earned ? 'Liberado' : trail ? `Abre na Trilha ${trail}` : 'Abre mais adiante'}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
