'use client'

import {
  BookOpen,
  Brain,
  Gamepad2,
  Gift,
  MessageCircle,
  MessagesSquare,
  Rocket,
  Send,
  Shirt,
  Shuffle,
  Sofa,
  Sparkles,
  Star,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ComponentType, type CSSProperties, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import type { MissionsMeView, MissionView } from '@/lib/types'
import { ChestIcon } from './chest-icon'
import { KidsSectionHeader } from './kids-section-header'
import { ZappyCoin } from './zappy-coin'

/**
 * Ícone da missão — identidade visual rápida por tipo de meta (decorativo). Eram emojis;
 * as telas-modelo (11/09/2026) pedem o ícone de linha num ladrilho da cor do grupo. O
 * baú é o desenho da trilha, e não o presente do lucide: a criança aprende a ler o baú
 * pela forma dele.
 */
function missionIcon(m: MissionView): ComponentType<{ className?: string }> {
  switch (m.goalType) {
    case 'lesson_complete':
      return BookOpen
    case 'quiz_passed':
      return Brain
    case 'unit_complete':
      return ChestIcon
    case 'studio_submitted':
      return Send
    case 'studio_passed':
      return Gamepad2
    case 'course_showcased':
    case 'studio_published':
      return Rocket
    case 'course_rated':
      return Star
    case 'room_item_buy':
      return Sofa
    case 'avatar_part_buy':
      return Shirt
    case 'mural_comment':
      return MessageCircle
    case 'clube_thread':
      return MessagesSquare
    case 'studio_remix':
      return Shuffle
    default:
      return Sparkles
  }
}

/** Texto da meta da missão (PT, tom kids) — derivado do goalType + alvo. */
function missionLabel(m: MissionView): string {
  const n = m.target
  switch (m.goalType) {
    case 'lesson_complete':
      return n === 1 ? 'Conclua 1 aula' : `Conclua ${n} aulas`
    case 'quiz_passed':
      return n === 1 ? 'Acerte 1 quiz' : `Acerte ${n} quizzes`
    case 'unit_complete':
      return n === 1 ? 'Abra 1 baú de unidade' : `Abra ${n} baús`
    case 'studio_submitted':
      return n === 1 ? 'Envie uma atividade ao professor' : `Envie ${n} atividades ao professor`
    case 'studio_passed':
      return n === 1 ? 'Crie 1 projeto no Estúdio' : `Crie ${n} projetos no Estúdio`
    case 'course_showcased':
      return n === 1 ? 'Publique um jogo no Mural' : `Publique ${n} jogos no Mural`
    case 'course_rated':
      return n === 1 ? 'Classifique um curso' : `Classifique ${n} cursos`
    case 'room_item_buy':
      return n === 1 ? 'Decore seu quarto' : `Ganhe ${n} itens para o quarto`
    case 'avatar_part_buy':
      return n === 1 ? 'Personalize seu avatar' : `Ganhe ${n} peças do avatar`
    case 'mural_comment':
      return n === 1 ? 'Comente no Mural' : `Comente ${n} vezes no Mural`
    case 'clube_thread':
      return n === 1 ? 'Converse no Clube' : `Converse ${n} vezes no Clube`
    // Estúdio Completo (retenção pós-cursos): publicar standalone + remix do Mural.
    case 'studio_published':
      return n === 1 ? 'Lance um jogo seu no Mural' : `Lance ${n} jogos seus no Mural`
    case 'studio_remix':
      return n === 1 ? 'Faça sua versão de um jogo do Mural' : `Faça sua versão de ${n} jogos`
    default:
      return 'Complete a missão'
  }
}

/**
 * Painel de missões diárias/semanais (estilo Duolingo): barra de progresso + botão
 * "Resgatar" quando concluída. As missões chegam JÁ RESOLVIDAS do servidor (prop
 * `initial`, no Promise.all da home — sem fetch/waterfall pós-hidratação); o cliente
 * só cuida do resgate (POST idempotente). `initial` nulo (gamificação indisponível)
 * → placeholder gentil (a home não "encolhe" sem explicação; era sumir em silêncio).
 *
 * Desenho das telas-modelo (11/09/2026): cada grupo tem a sua cor (Hoje azul, Esta semana
 * rosa, Este mês verde) no fio de 2px do cartão, no ladrilho e no "Resgatar"; o contador
 * simples à direita e a barra verde embaixo.
 */
export function MissionsPanel({
  initial,
  className,
}: {
  initial: MissionsMeView | null
  className?: string
}) {
  const [data, setData] = useState<MissionsMeView | null>(initial)
  const [claiming, setClaiming] = useState<string | null>(null)
  const router = useRouter()

  async function claim(m: MissionView) {
    if (claiming) return
    setClaiming(m.slug)
    try {
      const res = await fetch(
        `/api/members/gamification/missions/${encodeURIComponent(m.slug)}/claim`,
        { method: 'POST' },
      )
      if (!res.ok) {
        toast.error('Não consegui resgatar agora. Tente de novo!')
        return
      }
      const body = await res.json().catch(() => null)
      if (body?.xpAwarded > 0 || body?.coinsAwarded > 0) {
        toast.success(`Recompensa! +${body.xpAwarded} XP e +${body.coinsAwarded} moedas 🎉`)
      }
      // Marca como resgatada localmente (feedback instantâneo).
      const mark = (x: MissionView) => (x.slug === m.slug ? { ...x, claimed: true } : x)
      setData((d) =>
        d
          ? {
              daily: d.daily.map(mark),
              weekly: d.weekly.map(mark),
              monthly: d.monthly.map(mark),
            }
          : d,
      )
      // O resgate rende XP → pode mudar o ranking/nível: re-sincroniza o chrome
      // (foguinho/XP/ranking) SEM a criança precisar recarregar/deslogar.
      router.refresh()
    } catch {
      toast.error('Não consegui resgatar agora.')
    } finally {
      setClaiming(null)
    }
  }

  const titulo = (
    <span className="inline-flex items-center gap-2.5">
      <Sparkles className="size-7 shrink-0 text-primary" aria-hidden /> Missões
    </span>
  )

  if (!data) {
    return (
      <section aria-labelledby="missoes" className={className}>
        <KidsSectionHeader id="missoes" title={titulo} />
        <div className="kids-carta px-5 py-6 text-center">
          <p className="font-medium text-[0.9375rem] text-muted-foreground">
            As missões estão tirando uma soneca… volte daqui a pouquinho! 💤
          </p>
        </div>
      </section>
    )
  }
  const all = [...data.daily, ...data.weekly, ...data.monthly]
  if (all.length === 0) return null

  return (
    <section aria-labelledby="missoes" className={className}>
      <KidsSectionHeader id="missoes" title={titulo} />
      <div className="space-y-7">
        <MissionGroup
          title="Hoje"
          unitClass="kids-unit-cyan"
          missions={data.daily}
          claiming={claiming}
          onClaim={claim}
          label={missionLabel}
        />
        <MissionGroup
          title="Esta semana"
          unitClass="kids-unit-rosa"
          missions={data.weekly}
          claiming={claiming}
          onClaim={claim}
          label={missionLabel}
        />
        <MissionGroup
          title="Este mês"
          unitClass="kids-unit-verde"
          missions={data.monthly}
          claiming={claiming}
          onClaim={claim}
          label={missionLabel}
        />
      </div>
    </section>
  )
}

function MissionGroup({
  title,
  unitClass,
  missions,
  claiming,
  onClaim,
  label,
}: {
  title: string
  /** Tema kids-unit-* do grupo: pinta o fio dos cartões, os ladrilhos e o "Resgatar". */
  unitClass: string
  missions: MissionView[]
  claiming: string | null
  onClaim: (m: MissionView) => void
  label: (m: MissionView) => string
}) {
  if (missions.length === 0) return null
  return (
    <div className={unitClass}>
      <p
        className="flex items-center gap-2 font-extrabold text-xs uppercase tracking-[0.12em]"
        // A cor do grupo como TINTA miúda reprova AA (a rosa dava 3,9:1 no azul-claro):
        // misturada com o texto do tema ela mantém o matiz e passa.
        style={{ color: 'color-mix(in oklab, var(--unit) 60%, var(--foreground))' }}
      >
        <span aria-hidden className="size-2 rounded-full bg-(--unit)" />
        {title}
      </p>
      <ul className="mt-3.5 grid gap-4">
        {missions.map((m) => {
          const pct = m.target > 0 ? Math.min(100, Math.round((m.progress / m.target) * 100)) : 0
          const Icone = missionIcon(m)
          return (
            <li
              key={m.slug}
              className={cn(
                // `min-w-0`: item de grade nasce com a largura mínima do conteúdo, e o nome
                // da missão (`truncate`, sem quebra) empurrava o cartão para fora da tela
                // no celular em vez de ganhar as reticências.
                'min-w-0 rounded-[1.25rem] bg-card px-4 py-4 ring-(--unit) ring-2 ring-inset md:px-5',
                m.claimed && 'opacity-60 saturate-50',
              )}
            >
              <div className="flex items-center gap-3.5">
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-[0.75rem] bg-(--unit) text-(--unit-fg)"
                >
                  <Icone className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold text-[0.9375rem]">{label(m)}</p>
                  <span className="mt-0.5 inline-flex items-center gap-1 font-semibold text-muted-foreground text-xs">
                    <ZappyCoin className="size-3.5" /> {m.rewardCoins} · {m.rewardXp} XP
                  </span>
                </div>
                {m.claimed ? (
                  <span className="shrink-0 font-bold text-muted-foreground text-xs">
                    Resgatado ✅
                  </span>
                ) : m.completed ? (
                  <button
                    type="button"
                    onClick={() => onClaim(m)}
                    disabled={claiming === m.slug}
                    // O fundo é a cor do grupo puxada 14% para a tinta do tema: a rosa pura
                    // dava 4,37:1 com o branco (reprovava por pouco); assim passa nos dois
                    // temas. O degrau do 3D é a mesma cor, mais funda (sem ele, a borda de
                    // baixo seria a da cor de ação, embaixo de um botão de outra cor).
                    className="sz-btn-gradient h-9 shrink-0 gap-1.5 px-4 text-(--unit-fg) text-[0.8125rem] hover:brightness-95 disabled:opacity-60"
                    style={
                      {
                        backgroundColor: 'color-mix(in oklab, var(--unit) 86%, var(--foreground))',
                        '--k3d-degrau': 'color-mix(in oklab, var(--unit) 62%, var(--foreground))',
                      } as CSSProperties
                    }
                  >
                    <Gift className="size-4" aria-hidden /> Resgatar
                  </button>
                ) : (
                  <span className="shrink-0 font-extrabold text-muted-foreground text-sm tabular-nums">
                    {m.progress}/{m.target}
                  </span>
                )}
              </div>
              {!m.claimed && (
                <div className="sz-progress mt-3.5" aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
