import { ArrowRight, Blocks, Box, House, Lightbulb, MessagesSquare, Palette } from 'lucide-react'
import Link from 'next/link'
import { KidsMascot } from '@/components/kids/mascot'

export const dynamic = 'force-dynamic'

/**
 * Hub "Criar" (07/2026): destino da aba central da tab bar mobile de 5 itens.
 * Cards grandes para o trio criativo NA ORDEM DA JORNADA (Pensa planeja →
 * Pinta desenha → Estúdio constrói) + Quarto e Clube (que saíram da tab bar).
 * `prefetch={false}` pela mesma razão da sidebar (réplica única).
 */
const JOURNEY = [
  {
    href: '/pensa',
    icon: Lightbulb,
    step: 1,
    title: 'Pensa',
    text: 'Planeje o seu jogo com o Zappy: a ideia vira missões.',
  },
  {
    href: '/pinta',
    icon: Palette,
    step: 2,
    title: 'Pinta',
    text: 'Desenhe os personagens, cenários e peças do seu jogo.',
  },
  {
    href: '/molda',
    icon: Box,
    step: 3,
    title: 'Molda',
    text: 'Modele personagens, texturas e céus 3D para o seu jogo.',
  },
  {
    href: '/estudio',
    icon: Blocks,
    step: 4,
    title: 'Estúdio',
    text: 'Construa com blocos que viram código de verdade. E jogue!',
  },
] as const

const MORE = [
  {
    href: '/quarto',
    icon: House,
    title: 'Quarto',
    text: 'Decore o seu cantinho com as moedas que você ganhou.',
  },
] as const

export default function CriarPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <KidsMascot expression="happy" className="size-14 md:size-20" />
        <div>
          <h1 className="sz-display text-3xl md:text-4xl">O que vamos criar hoje?</h1>
          <p className="mt-1 text-muted-foreground text-sm md:text-base">
            Pense, desenhe e construa: é assim que um jogo nasce!
          </p>
        </div>
      </div>

      {/* Clube em DESTAQUE (07/2026): a comunidade merece o topo — antes ficava
          escondida no rodapé "E também". Card grande e caloroso, acima do trio criativo. */}
      <Link
        href="/clube-dos-criadores"
        prefetch={false}
        className="flex items-center gap-4 rounded-3xl border-2 border-primary bg-(--kids-cyan-tint) p-5 shadow-[0_4px_0_var(--border)] transition-transform active:translate-y-[2px] active:shadow-[0_2px_0_var(--border)]"
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <MessagesSquare className="size-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="sz-display block text-xl text-primary">Clube dos Criadores</span>
          <span className="mt-0.5 block text-muted-foreground text-sm">
            Converse com a turma, faça amizades e mostre as suas descobertas.
          </span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-primary" />
      </Link>

      <section className="flex flex-col gap-3">
        {JOURNEY.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className="flex items-center gap-4 rounded-3xl border-2 border-border bg-card p-5 shadow-[0_4px_0_var(--border)] transition-transform active:translate-y-[2px] active:shadow-[0_2px_0_var(--border)]"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-(--kids-cyan-tint) text-primary">
                <Icon className="size-7" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-full bg-primary font-bold text-primary-foreground text-xs [font-family:var(--font-display)]">
                    {item.step}
                  </span>
                  <span className="sz-display text-xl">{item.title}</span>
                </span>
                <span className="mt-0.5 block text-muted-foreground text-sm">{item.text}</span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          )
        })}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="sz-display text-lg text-muted-foreground">E também</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {MORE.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="flex items-center gap-4 rounded-3xl border-2 border-border bg-card p-4 shadow-[0_4px_0_var(--border)] transition-transform active:translate-y-[2px] active:shadow-[0_2px_0_var(--border)]"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-muted text-foreground">
                  <Icon className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="sz-display block text-base">{item.title}</span>
                  <span className="mt-0.5 block text-muted-foreground text-xs">{item.text}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
