import {
  BookOpen,
  Box,
  Check,
  LayoutDashboard,
  Lightbulb,
  Lock,
  type LucideIcon,
  Palette,
  Play,
  Sparkles,
  Trophy,
} from 'lucide-react'
import Link from 'next/link'
import { challengeMonthName } from '@/components/community/community/challenge-month'
import { PageBand, PageBody } from '@/components/community/page'
import { cn } from '@/lib/cn'
import { type CreativeToolKey, type ToolLockReason, toolLockReason } from '@/lib/tool-lock'
import { getCreativeToolsState } from '@/server/creative-tools'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

type Capability = 'studio' | 'pinta' | 'pensa' | 'molda'

interface Tool {
  href: string
  name: string
  capability: Capability
  /** A chave da régua compartilhada com as páginas de cada ferramenta (`lib/tool-lock`). */
  key: CreativeToolKey
  icon: LucideIcon
  /** Cor de identidade da ferramenta (fixa: não segue a cor escolhida no perfil). */
  color: string
  description: string
  /** O texto do cartão quando o Zappy e o Pensa já estão liberados na jornada. */
  aiNote: string
  usesAi: boolean
}

const TOOLS: readonly Tool[] = [
  {
    href: '/estudio',
    name: 'Estúdio',
    capability: 'studio',
    key: 'estudio',
    icon: LayoutDashboard,
    color: 'var(--sz-community-blue)',
    description: 'Crie e programe seus jogos com os blocos que conquistou nos cursos.',
    aiNote: 'Com o Zappy, o tutor, no canto da tela.',
    usesAi: true,
  },
  {
    href: '/pinta',
    name: 'Pinta',
    capability: 'pinta',
    key: 'pinta',
    icon: Palette,
    color: 'var(--sz-community-pink)',
    description: 'Desenhe personagens, cenários e imagens para seus jogos.',
    aiNote: 'Não gasta créditos.',
    usesAi: false,
  },
  {
    href: '/molda',
    name: 'Molda',
    capability: 'molda',
    key: 'molda',
    icon: Box,
    color: 'var(--sz-community-orange)',
    description: 'Crie modelos, texturas e ambientes 3D.',
    aiNote: 'Não gasta créditos.',
    usesAi: false,
  },
  {
    href: '/pensa',
    name: 'Pensa',
    capability: 'pensa',
    key: 'pensa',
    icon: Lightbulb,
    color: 'var(--sz-community-purple)',
    description: 'Planeje seus jogos com assistência, disponível após a formação avançada.',
    aiNote: 'Planeja o seu jogo com você e divide o trabalho em missões.',
    usesAi: true,
  },
]

/** Com o Zappy liberado, a ordem do quadro põe lado a lado as duas que gastam créditos. */
const AI_ORDER: readonly Capability[] = ['studio', 'pensa', 'pinta', 'molda']

type ToolStatus =
  | { kind: 'available' }
  | { kind: 'locked'; reason: ToolLockReason }
  | { kind: 'pending' }

type CreativeToolsState = Awaited<ReturnType<typeof getCreativeToolsState>>

/**
 * O estado de cada ferramenta sai dos mesmos dados de `getCreativeToolsState`; o "por quê" do
 * cadeado vem de `toolLockReason` (`lib/tool-lock`), a MESMA régua que a página de cada ferramenta
 * usa para explicar o cadeado a quem chega por "Consultar acesso".
 */
function toolStatus(tool: Tool, state: CreativeToolsState): ToolStatus {
  if (state.kind !== 'ready') return { kind: 'pending' }
  const reason = toolLockReason(tool.key, state)
  return reason ? { kind: 'locked', reason } : { kind: 'available' }
}

const LOCK_REASON = {
  plan: 'faz parte de outro plano.',
  journey: 'abre conforme você avança nas etapas da jornada.',
  advanced: 'pede um curso avançado concluído.',
} as const

function StatusChip({ status }: { status: ToolStatus }) {
  // No celular o selo quebra a linha em vez de passar da borda do cartão.
  const base = 'sz-chip max-w-full self-start whitespace-normal py-1'
  if (status.kind === 'available')
    return (
      <span className={cn(base, 'sz-chip-ok')}>
        <Check aria-hidden />
        Disponível na sua conta
      </span>
    )
  if (status.kind === 'locked')
    return (
      <span className={base}>
        <Lock aria-hidden />
        Ainda não liberado
      </span>
    )
  return <span className={base}>Acesso em consulta</span>
}

function ToolAction({ tool, status, small }: { tool: Tool; status: ToolStatus; small?: boolean }) {
  const base = cn('mt-auto self-start', small && 'sz-btn-sm')
  if (status.kind === 'available')
    return (
      <Link href={tool.href} prefetch={false} className={cn('sz-btn', base)}>
        {small ? 'Abrir' : `Abrir o ${tool.name}`}
      </Link>
    )
  if (status.kind === 'locked' && status.reason !== 'plan')
    return (
      <Link href="/progresso" prefetch={false} className={cn('sz-btn-outline', base)}>
        Ver a sua jornada
      </Link>
    )
  return (
    <Link href={tool.href} prefetch={false} className={cn('sz-btn-outline', base)}>
      Consultar acesso
    </Link>
  )
}

/**
 * A faixa de arte de cada ferramenta (Estúdio à noite, 25/10/2026): a cor de identidade dela num
 * degradê, com o nome em pixel. Fechada, a faixa perde a cor e ganha o cadeado: o estado também
 * está escrito no selo logo abaixo, a cor nunca é a única pista.
 */
function ToolArt({ tool, available }: { tool: Tool; available: boolean }) {
  const Icon = tool.icon
  return (
    <div
      aria-hidden
      className={cn(
        'relative flex h-[8.5rem] items-end justify-between p-5 md:h-[9.5rem]',
        !available && 'saturate-[0.35]',
      )}
      style={{
        background: `linear-gradient(135deg, ${tool.color}, color-mix(in oklab, ${tool.color} 55%, var(--dourado)))`,
      }}
    >
      <span className="font-(family-name:--font-pixel) text-[2rem] text-white uppercase leading-none tracking-[0.12em] [text-shadow:3px_3px_0_rgb(0_0_0/0.35)]">
        {tool.name}
      </span>
      <span className="inline-flex size-[2.6rem] items-center justify-center rounded-[0.8rem] bg-(--noite)/80 text-(--texto-claro)">
        {available ? <Icon className="size-[1.3rem]" /> : <Lock className="size-[1.2rem]" />}
      </span>
    </div>
  )
}

/** O cartão grande do quadro "Criar": duas colunas, o "por quê" quando ainda não liberou. */
function ToolCard({ tool, status }: { tool: Tool; status: ToolStatus }) {
  const available = status.kind === 'available'
  return (
    <section
      aria-labelledby={`ferramenta-${tool.capability}`}
      className="sz-card flex flex-col overflow-hidden"
    >
      <ToolArt tool={tool} available={available} />
      <div className="flex flex-1 flex-col gap-3.5 p-6 md:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id={`ferramenta-${tool.capability}`} className="sz-h2">
            {tool.name}
          </h2>
          <StatusChip status={status} />
        </div>
        <p className="text-muted-foreground">{tool.description}</p>
        {status.kind === 'locked' ? (
          <p className="text-(--aviso-texto) text-[0.85rem]">
            <strong>Por quê:</strong> {LOCK_REASON[status.reason]}
          </p>
        ) : null}
        <ToolAction tool={tool} status={status} />
      </div>
    </section>
  )
}

/** O cartão compacto do quadro "Criar com o Zappy liberado": quatro colunas e o atalho dos créditos. */
function ToolCardCompact({ tool, status }: { tool: Tool; status: ToolStatus }) {
  const available = status.kind === 'available'
  return (
    <section
      aria-labelledby={`ferramenta-${tool.capability}`}
      className="sz-card-sm flex flex-col overflow-hidden"
    >
      <ToolArt tool={tool} available={available} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h2 id={`ferramenta-${tool.capability}`} className="sz-h3">
          {tool.name}
        </h2>
        <StatusChip status={status} />
        <p className="text-[0.85rem] text-muted-foreground">
          {status.kind === 'locked' ? (
            <>
              <strong className="text-foreground">Por quê:</strong> {LOCK_REASON[status.reason]}
            </>
          ) : (
            tool.aiNote
          )}
        </p>
        {available && tool.usesAi ? (
          <Link
            href="/perfil#creditos"
            prefetch={false}
            className="sz-link inline-flex min-h-[2.4rem] items-center self-start text-[0.85rem]"
          >
            Quanto resta de créditos
          </Link>
        ) : null}
        <ToolAction tool={tool} status={status} small />
      </div>
    </section>
  )
}

export default async function CreatePage() {
  const [state, challengeResult] = await Promise.all([
    getCreativeToolsState(),
    shell.members.getChallengeReadonly().catch(() => null),
  ])
  const challenge =
    challengeResult?.status === 200 && challengeResult.body?.audience === 'adult'
      ? challengeResult.body.challenge
      : null
  const challengeMonth = challenge ? challengeMonthName(challenge.key) : null
  const aiUnlocked = state.kind === 'ready' && state.journey.capabilities.includes('ai')
  const tools = aiUnlocked
    ? AI_ORDER.map((capability) => TOOLS.find((tool) => tool.capability === capability) as Tool)
    : TOOLS

  return (
    <>
      <PageBand
        kicker={
          aiUnlocked ? (
            <span className="flex flex-wrap items-center gap-3">
              Ferramentas da sua conta
              <span className="sz-chip sz-chip-ok font-sans">
                <Sparkles aria-hidden />
                Zappy liberado na sua jornada
              </span>
            </span>
          ) : (
            'Ferramentas da sua conta'
          )
        }
        title="Criar"
        lead={
          aiUnlocked
            ? 'Suas ferramentas e seus projetos, guardados na sua conta. O Zappy, o tutor do Estúdio, e o Pensa usam créditos; quanto resta fica em Meu perfil.'
            : 'Suas ferramentas e seus projetos, guardados na sua conta. Abra de qualquer computador e continue de onde parou.'
        }
      >
        {/* As ferramentas no palco: é ali que se descobre o que dá para criar. */}
        <div className="mt-6 flex flex-col gap-5">
          {state.kind === 'unavailable' ? (
            <p role="status" className="sz-soft px-5 py-4 font-bold">
              Não foi possível atualizar o acesso às ferramentas. Tente novamente.
            </p>
          ) : null}
          {aiUnlocked ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {tools.map((tool) => (
                <ToolCardCompact key={tool.href} tool={tool} status={toolStatus(tool, state)} />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {tools.map((tool) => (
                <ToolCard key={tool.href} tool={tool} status={toolStatus(tool, state)} />
              ))}
            </div>
          )}
        </div>
      </PageBand>
      <PageBody>
        <section aria-labelledby="mostrar-e-aprender" className="flex flex-col gap-5">
          <h2 id="mostrar-e-aprender" className="sz-h2">
            Para mostrar e aprender
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            <ShortcutCard
              href="/mural-dos-criadores-adulto"
              icon={Play}
              color="var(--link)"
              title="Mural dos Criadores"
              text="Jogue o que a comunidade publicou e publique os seus."
            />
            <ShortcutCard
              href="/desafios"
              icon={Trophy}
              color="var(--sz-community-orange)"
              title="Desafio do mês"
              text={
                challenge
                  ? `Tema ${challengeMonth ? `de ${challengeMonth}` : 'do mês'}: ${challenge.title}. Crie e participe até o fim do mês.`
                  : 'Um tema novo por mês. Crie e participe até o fim do mês.'
              }
            />
            <ShortcutCard
              href="/como-fazer"
              icon={BookOpen}
              color="var(--pen-ok-texto)"
              title="Como fazer"
              text="Passo a passo das ferramentas, com busca por palavra."
            />
          </div>
        </section>
      </PageBody>
    </>
  )
}

function ShortcutCard({
  href,
  icon: Icon,
  color,
  title,
  text,
}: {
  href: string
  icon: LucideIcon
  color: string
  title: string
  text: string
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="sz-card-sm flex flex-col gap-2.5 p-6 text-foreground no-underline transition-colors hover:border-(--link)"
    >
      <Icon aria-hidden className="size-[1.4rem]" style={{ color }} />
      <strong className="sz-h3">{title}</strong>
      <span className="text-[0.85rem] text-muted-foreground">{text}</span>
    </Link>
  )
}
