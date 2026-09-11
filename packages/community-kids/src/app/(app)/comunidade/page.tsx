import {
  ArrowRight,
  Gamepad2,
  Lightbulb,
  Mail,
  MessageCircle,
  MessageCircleHeart,
  MessagesSquare,
  ThumbsUp,
  Trophy,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsClosingCard } from '@/components/kids/kids-closing-card'
import { KidsFeatureCard } from '@/components/kids/kids-feature-card'
import { KidsHero } from '@/components/kids/kids-hero'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { KidsScene } from '@/components/kids/kids-scene'
import { KidsSectionHeader } from '@/components/kids/kids-section-header'
import { getGamificationReadonly, getTeacherThreadsUnreadReadonly } from '@/server/members'

export const dynamic = 'force-dynamic'

/**
 * As três portas "onde a turma se encontra". A cor de cada uma é a das telas-modelo
 * (11/09/2026: Clube azul, Recados âmbar, Conquistas roxo), tirada dos MESMOS tons das
 * oficinas, com o par de tinta que já passa AA (escura no âmbar).
 */
const PORTAS = [
  {
    href: '/clube-dos-criadores',
    title: 'Clube dos Criadores',
    icon: MessagesSquare,
    text: 'Troque ideias, tire dúvidas e acompanhe os desafios.',
    tom: 'estudio',
  },
  {
    href: '/recados',
    title: 'Recados do professor',
    icon: Mail,
    text: 'Leia as devolutivas dos seus projetos e continue a conversa.',
    tom: 'pensa',
  },
  {
    href: '/ranking',
    title: 'Conquistas da turma',
    icon: Trophy,
    text: 'Conheça os criadores e acompanhe as ligas.',
    tom: 'molda',
  },
] as const

/** As três coisas que cabem em qualquer comentário, cada uma na cor de uma faixa. */
const DEVOLUTIVA = [
  { text: 'Algo que você gostou', icon: ThumbsUp, fundo: 'bg-(--band-menta)' },
  { text: 'Uma dúvida que ficou', icon: MessageCircle, fundo: 'bg-(--band-ceu)' },
  { text: 'Uma ideia para melhorar', icon: Lightbulb, fundo: 'bg-(--band-lilas)' },
] as const

/**
 * Os selos das portas são DADO de verdade, e best-effort: sem o número, sem selo
 * (nunca um "0 recados" inventado nem um selo vazio). O Clube não tem selo porque o
 * "novas respostas" dele mora no navegador da criança (baseline local), não no servidor.
 */
async function lerSelos(): Promise<{ recados: string | null; conquistas: string | null }> {
  const [unread, gam] = await Promise.all([
    getTeacherThreadsUnreadReadonly().catch(() => null),
    getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  const count = unread?.status === 200 ? (unread.body?.count ?? 0) : 0
  const position = gam?.status === 200 ? gam.body?.ranking?.position : undefined
  return {
    recados: count > 0 ? `${count} ${count === 1 ? 'recado não lido' : 'recados não lidos'}` : null,
    conquistas: typeof position === 'number' && position > 0 ? `Você está em ${position}º` : null,
  }
}

export default async function ComunidadePage() {
  const selos = await lerSelos()
  const seloDe = (href: string) =>
    href === '/recados' ? selos.recados : href === '/ranking' ? selos.conquistas : null

  return (
    <>
      <KidsBand tone="creme">
        <KidsPageHeader
          eyebrow="Criar fica melhor em companhia"
          eyebrowIcon={Users}
          title="Comunidade"
          subtitle="Um lugar para mostrar suas ideias, aprender com outros jogos e ajudar a turma."
        />
        <div className="mt-6">
          <KidsHero
            variant="alto"
            eyebrow="Mural dos Criadores"
            title="Jogue as criações da turma"
            description="Conte o que você descobriu e ajude quem criou com um comentário."
            actions={
              <Link
                href="/mural-dos-criadores"
                prefetch={false}
                className="sz-btn-gradient sz-btn-inverso h-[3.125rem] gap-2.5 px-7 text-base"
              >
                <Gamepad2 className="size-[1.125rem]" aria-hidden />
                Explorar mural
              </Link>
            }
            // 230px de largura dão ~217 de altura: o herói fecha nos 272px do modelo.
            art={<KidsScene name="vitoria" className="w-44 md:w-[14.375rem]" />}
          />
        </div>
      </KidsBand>

      <KidsBand tone="menta">
        <section aria-labelledby="turma-heading">
          <KidsSectionHeader
            id="turma-heading"
            title="Onde a turma se encontra"
            subtitle="Três espaços para conversar, tirar dúvidas e acompanhar quem está criando com você."
          />
          {/* 3 colunas só a partir de 1280px: com o menu de 268px, abaixo disso o selo
              "2 recados não lidos" não cabe ao lado do ladrilho. */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {PORTAS.map(({ href, title, icon, text, tom }) => (
              <Link key={href} href={href} prefetch={false} className="kid-pop">
                <KidsFeatureCard
                  icon={icon}
                  title={title}
                  description={text}
                  badge={seloDe(href) ?? undefined}
                  color={`var(--tool-${tom})`}
                  ink={`var(--tool-${tom}-texto)`}
                  fg={`var(--tool-${tom}-fg)`}
                  seloInk={`var(--tool-${tom}-selo)`}
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
        </section>
      </KidsBand>

      <KidsBand tone="lilas">
        <KidsClosingCard
          icon={MessageCircleHeart}
          title="Uma boa devolutiva ajuda a criar"
          description="Fale sobre o projeto com respeito a quem criou. Três coisas cabem em qualquer comentário:"
          chips={
            // Pílulas de 72px, canto de 18px e o ícone num quadradinho branco de 36px
            // com canto de 10px (medidas do modelo a 1440px).
            <ul className="grid w-full gap-4 md:grid-cols-3">
              {DEVOLUTIVA.map(({ text, icon: Icon, fundo }) => (
                <li
                  key={text}
                  className={`flex min-h-[4.5rem] items-center gap-3 rounded-[1.125rem] px-[1.125rem] py-3 font-extrabold text-[0.9375rem] ${fundo}`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-[0.625rem] bg-card">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          }
        />
      </KidsBand>
    </>
  )
}
