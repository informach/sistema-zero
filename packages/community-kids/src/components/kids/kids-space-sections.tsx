'use client'

import {
  ArrowRight,
  Bot,
  Handshake,
  Hash,
  Images,
  Lock,
  Megaphone,
  MessagesSquare,
  Rocket,
  ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { HubChannelView, HubSpaceView } from '@/lib/types'
import { KidsBackButton } from './back-button'
import { ClubeActivityBell } from './clube-activity-bell'
import { ClubeCombinados, COMBINADOS } from './clube-combinados'
import { KidsChip } from './kids-chip'
import { KidsClosingCard } from './kids-closing-card'
import { KidsEyebrow } from './kids-eyebrow'
import { KidsHero } from './kids-hero'
import { KidsPageHeader } from './kids-page-header'
import { MURAL_SORTS, type MuralSort } from './mural-sort'
import { backToSection } from './nav'

/**
 * As peças de MOLDURA do Mural e do Clube no desenho das telas-modelo (11/09/2026):
 * cabeçalhos, painel de canais e os cartões de fechamento. O estado e a rede ficam no
 * orquestrador (`kids-space-view-client`); aqui é só apresentação.
 */

/** Cabeçalho do Mural: seta para a Comunidade, título do espaço e os filtros. */
export function MuralHeader({
  space,
  sort,
  onSortChange,
}: {
  space: HubSpaceView
  sort: MuralSort
  onSortChange: (sort: MuralSort) => void
}) {
  return (
    <>
      <KidsPageHeader
        back={backToSection('/mural-dos-criadores')}
        eyebrow="Comunidade · vitrine da turma"
        eyebrowIcon={Images}
        title={space.name}
        subtitle={space.description || 'Jogue as criações da turma e ajude quem criou.'}
      />
      <div role="group" aria-label="Ordem dos jogos" className="mt-6 flex flex-wrap gap-2.5">
        {MURAL_SORTS.map((option) => (
          <KidsChip
            key={option.value}
            selected={sort === option.value}
            onClick={() => onSortChange(option.value)}
          >
            {option.label}
          </KidsChip>
        ))}
      </div>
    </>
  )
}

/**
 * Cabeçalho do Clube: a pílula de contexto e o HERÓI azul com o nome do espaço (na
 * tela-modelo o título mora dentro do azul, por isso o herói leva o `h1`), o sino das
 * respostas e os Combinados em pílula branca.
 */
export function ClubeHeader({
  space,
  viewerId,
  channelIds,
  onOpenThreadById,
}: {
  space: HubSpaceView
  viewerId: string
  channelIds: string[]
  onOpenThreadById: (id: string) => void
}) {
  const back = backToSection('/clube-dos-criadores')
  return (
    <>
      <div className="flex flex-col items-start">
        {back ? (
          <KidsBackButton href={back.href} label={back.label} showLabel className="mb-5" />
        ) : null}
        <KidsEyebrow icon={MessagesSquare}>Comunidade · conversa</KidsEyebrow>
      </div>
      <KidsHero
        className="mt-6"
        icon={Bot}
        titleAs="h1"
        title={space.name}
        description={space.description || 'Converse com a turma e mostre o que você criou!'}
        actions={
          <>
            <ClubeActivityBell
              viewerId={viewerId}
              channelIds={channelIds}
              onOpenThread={onOpenThreadById}
            />
            <ClubeCombinados viewerId={viewerId} variant="heroi" />
          </>
        }
      />
    </>
  )
}

/** Quem pode escrever no canal, na palavra da criança. */
function channelAudience(channel: HubChannelView, isStaff: boolean): string {
  if (channel.postingPolicy !== 'staff_only') return 'Toda a turma'
  return isStaff ? 'Só a equipe escreve' : 'Só leitura'
}

/**
 * O painel "CANAIS": o canal escolhido é a pílula azul cheia, os outros ficam no cinza
 * claro, e o de recados da equipe leva o megafone e o cadeado. Embaixo, o aviso de que
 * o professor acompanha as conversas (a pré-moderação do Clube kids é real).
 */
export function ChannelsPanel({
  channels,
  channel,
  isStaff,
  onSelect,
}: {
  channels: HubChannelView[]
  channel: HubChannelView | null
  isStaff: boolean
  onSelect: (channel: HubChannelView) => void
}) {
  return (
    <nav aria-label="Canais do clube" className="kids-carta self-start p-5 md:p-6 lg:self-stretch">
      <p className="font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
        Canais
      </p>
      {/* `relative`: o "com novidades" só para leitor de tela é `sr-only` (absoluto), e sem
          um ancestral posicionado DENTRO da fileira que rola ele escapava do recorte e fazia a
          página inteira rolar de lado no celular (full review de 11/09/2026). */}
      <ul className="relative mt-3 flex gap-2 overflow-x-auto lg:flex-col">
        {channels.map((item) => {
          const active = channel?.id === item.id
          const Icon = item.postingPolicy === 'staff_only' ? Megaphone : Hash
          return (
            <li key={item.id} className="shrink-0 lg:shrink">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(item)}
                className={cn(
                  'flex min-h-14 w-full items-center gap-3 rounded-[0.75rem] px-4 py-2 text-left transition-colors',
                  active ? 'kids-marca' : 'bg-background hover:bg-muted',
                )}
              >
                <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold text-[0.9375rem]">
                    {item.name}
                  </span>
                  <span
                    className={cn(
                      'block truncate text-xs',
                      active ? 'kids-marca-suave' : 'text-muted-foreground',
                    )}
                  >
                    {channelAudience(item, isStaff)}
                  </span>
                </span>
                {item.postingPolicy === 'staff_only' ? (
                  <Lock className="size-4 shrink-0 opacity-70" aria-hidden />
                ) : null}
                {item.hasUnread ? (
                  <span className="size-2.5 shrink-0 rounded-full bg-(--sz-hot)">
                    <span className="sr-only">, com novidades</span>
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 flex items-center gap-2.5 rounded-[0.75rem] bg-(--band-menta) px-4 py-3 font-bold text-[0.8125rem]">
        <ShieldCheck className="size-5 shrink-0" aria-hidden />O professor acompanha todas as
        conversas.
      </p>
    </nav>
  )
}

/**
 * Fechamento do Mural. O botão "Publicar um jogo" só aparece para quem pode abrir o
 * Estúdio livre (a mesma régua do remix: posse do produto e o nível da carreira), para
 * nunca levar a criança a uma tela trancada. Sem ele, a frase explica de onde vêm os
 * jogos sem prometer nada.
 */
export function MuralClosing({ canPublish }: { canPublish: boolean }) {
  return (
    <KidsClosingCard
      icon={Rocket}
      title="Seu jogo também merece o mural"
      description={
        canPublish
          ? 'Publique uma criação do Estúdio e a turma inteira vai poder jogar e comentar.'
          : 'Os jogos da turma chegam aqui pelo Estúdio. Jogue, comente e ajude quem criou.'
      }
      action={
        canPublish ? (
          <Link
            href="/estudio"
            prefetch={false}
            className="sz-btn-gradient h-[3.125rem] gap-2 px-6 text-base"
          >
            Publicar um jogo
            <ArrowRight className="size-[1.125rem]" aria-hidden />
          </Link>
        ) : undefined
      }
    />
  )
}

/** As cores das pílulas dos combinados, na ordem das faixas. */
const FUNDOS = [
  'bg-(--band-menta)',
  'bg-(--band-ceu)',
  'bg-(--band-lilas)',
  'bg-(--band-amarelo)',
] as const

/** Fechamento do Clube: os combinados de sempre, agora à vista em pílulas. */
export function ClubeClosing() {
  return (
    <KidsClosingCard
      icon={Handshake}
      title="Combinados do clube"
      description="Quatro combinados para o clube ser um lugar bom para todo mundo."
      chips={
        <ul className="grid w-full gap-4 md:grid-cols-2">
          {COMBINADOS.map(({ text, icon: Icon }, i) => (
            <li
              key={text}
              className={cn(
                'flex min-h-[4.5rem] items-center gap-3 rounded-[1.125rem] px-[1.125rem] py-3 font-bold text-[0.9375rem]',
                FUNDOS[i % FUNDOS.length],
              )}
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
  )
}
