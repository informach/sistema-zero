import { ArrowRight, Heart, Images, Mail, MessagesSquare, Trophy, Users } from 'lucide-react'
import Link from 'next/link'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsChip } from '@/components/kids/kids-chip'
import { KidsClosingCard } from '@/components/kids/kids-closing-card'
import { KidsFeatureCard } from '@/components/kids/kids-feature-card'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { KidsScene } from '@/components/kids/kids-scene'

/**
 * As quatro portas da Comunidade. Cada uma com a SUA cor (ver `--porta-*` no
 * globals): eram as quatro no mesmo azul, e só o título dizia onde a criança
 * estava entrando.
 */
const destinations = [
  {
    href: '/mural-dos-criadores',
    title: 'Mural dos Criadores',
    icon: Images,
    text: 'Jogue as criações da turma e conte o que você descobriu.',
    cor: 'var(--porta-mural)',
    tinta: 'var(--porta-mural-texto)',
  },
  {
    href: '/clube-dos-criadores',
    title: 'Clube dos Criadores',
    icon: MessagesSquare,
    text: 'Troque ideias, tire dúvidas e acompanhe os desafios.',
    cor: 'var(--porta-clube)',
    tinta: 'var(--porta-clube-texto)',
  },
  {
    href: '/recados',
    title: 'Recados do professor',
    icon: Mail,
    text: 'Leia as devolutivas dos seus projetos e continue a conversa.',
    cor: 'var(--porta-recados)',
    tinta: 'var(--porta-recados-texto)',
  },
  {
    href: '/ranking',
    title: 'Conquistas da turma',
    icon: Trophy,
    text: 'Conheça os criadores e acompanhe as ligas.',
    cor: 'var(--porta-ranking)',
    tinta: 'var(--porta-ranking-texto)',
  },
]

export default function ComunidadePage() {
  return (
    <>
      <KidsBand tone="creme">
        <KidsPageHeader
          eyebrow="Criar fica melhor em companhia"
          eyebrowIcon={Users}
          title="Comunidade"
          subtitle="Um lugar para mostrar suas ideias, aprender com outros jogos e ajudar a turma."
          actions={<KidsScene name="vitoria" className="hidden w-40 md:block" />}
        />
      </KidsBand>

      <KidsBand tone="ceu">
        <div className="grid gap-4 sm:grid-cols-2">
          {destinations.map(({ href, title, icon: Icon, text, cor, tinta }) => (
            <Link key={href} href={href} prefetch={false} className="kid-pop">
              <KidsFeatureCard
                icon={Icon}
                title={title}
                description={text}
                color={cor}
                ink={tinta}
                className="h-full"
                footer={
                  <span className="flex items-center gap-2">
                    Explorar <ArrowRight className="size-4" aria-hidden />
                  </span>
                }
              />
            </Link>
          ))}
        </div>
      </KidsBand>

      <KidsBand tone="lilas">
        <div className="kids-unit-verde">
          <KidsClosingCard
            icon={Heart}
            title="Uma boa devolutiva ajuda a criar"
            description="Fale sobre o projeto com respeito a quem criou. Três coisas cabem em qualquer comentário:"
            chips={
              <>
                <KidsChip>Algo que você gostou</KidsChip>
                <KidsChip>Uma dúvida que ficou</KidsChip>
                <KidsChip>Uma ideia para melhorar</KidsChip>
              </>
            }
          />
        </div>
      </KidsBand>
    </>
  )
}
