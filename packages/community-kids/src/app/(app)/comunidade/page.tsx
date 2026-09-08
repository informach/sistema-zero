import { ArrowRight, Images, Mail, MessagesSquare, Trophy } from 'lucide-react'
import Link from 'next/link'

const destinations = [
  {
    href: '/mural-dos-criadores',
    title: 'Mural dos Criadores',
    icon: Images,
    text: 'Jogue as criações da turma e conte o que você descobriu.',
  },
  {
    href: '/clube-dos-criadores',
    title: 'Clube dos Criadores',
    icon: MessagesSquare,
    text: 'Troque ideias, tire dúvidas e acompanhe os desafios.',
  },
  {
    href: '/recados',
    title: 'Recados do professor',
    icon: Mail,
    text: 'Leia as devolutivas dos seus projetos e continue a conversa.',
  },
  {
    href: '/ranking',
    title: 'Conquistas da turma',
    icon: Trophy,
    text: 'Conheça os criadores e acompanhe as ligas.',
  },
]

export default function ComunidadePage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="font-bold text-primary text-sm">Criar fica melhor em companhia</p>
        <h1 className="sz-display mt-2 text-3xl md:text-4xl">Comunidade</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Um lugar para mostrar suas ideias, aprender com outros jogos e ajudar a turma.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {destinations.map(({ href, title, icon: Icon, text }) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <Icon className="size-8 text-primary" aria-hidden />
            <h2 className="sz-display text-xl">{title}</h2>
            <p className="flex-1 text-sm text-muted-foreground">{text}</p>
            <span className="inline-flex min-h-11 items-center gap-2 font-bold text-primary text-sm">
              Explorar <ArrowRight className="size-4" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
      <aside className="rounded-2xl bg-primary/5 p-5 text-sm">
        <strong>Uma boa devolutiva ajuda a criar.</strong> Conte algo que gostou, explique uma
        dúvida e sugira uma ideia. Fale sobre o projeto com respeito a quem criou.
      </aside>
    </div>
  )
}
