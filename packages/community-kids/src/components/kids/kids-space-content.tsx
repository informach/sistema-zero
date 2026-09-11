'use client'

import {
  AttachmentUploader,
  type UploadedAttachment,
} from '@sistemazero/member-shell/components/attachment-uploader'
import { RichEditor } from '@sistemazero/member-shell/components/rich-editor'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Textarea } from '@sistemazero/ui/textarea'
import { Bot, ChevronRight, MessageCircle, Plus, Send } from 'lucide-react'
import type { ReactNode } from 'react'
import type {
  HubChannelView,
  HubCommentView,
  HubMyThreadView,
  HubSpaceView,
  HubThreadView,
} from '@/lib/types'
import { channelPresentation } from './channel-presentation'
import { KidsBand } from './kids-band'
import { GamePicker, ShowcaseCard, Tag, ThreadDetail } from './kids-space-detail'
import {
  ChannelsPanel,
  ClubeClosing,
  ClubeHeader,
  MuralClosing,
  MuralHeader,
} from './kids-space-sections'
import { KidsMascot } from './mascot'
import type { MuralSort } from './mural-sort'
import { AuthorBadge, type AuthorItem, authorText } from './space-author'

const SUGGESTION_STARTERS: { chip: string; title: string }[] = [
  { chip: '🎮 Mostrar meu jogo', title: 'Olha o jogo que eu criei!' },
  { chip: '🙋 Pedir uma ajuda', title: 'Preciso de uma ajuda com o meu projeto' },
  { chip: '🕹️ Jogo favorito', title: 'Qual é o seu jogo favorito?' },
  { chip: '💡 Uma ideia nova', title: 'Tive uma ideia e quero mostrar!' },
]

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  return `${Math.floor(hours / 24)} d`
}

type KidsSpaceContext = {
  isWall: boolean
  /** Viewer é da equipe: muda só a legenda dos canais `staff_only` ("Só a equipe escreve"). */
  isStaff: boolean
  space: HubSpaceView
  viewerId: string
  spaceChannelIds: string[]
  onOpenThreadById: (id: string) => void
}

type KidsSpaceNavigation = {
  channels: HubChannelView[]
  channel: HubChannelView | null
  onSelectChannel: (channel: HubChannelView) => void
}

type KidsSpaceDiscussion = {
  thread: HubThreadView | null
  comments: HubCommentView[]
  replyBody: string
  onReplyBodyChange: (value: string) => void
  replyAttachments: UploadedAttachment[]
  onReplyAttachmentsChange: (value: UploadedAttachment[]) => void
  commentsHasMore: boolean
  loadingMoreComments: boolean
  onLoadMoreComments: () => void
  onBackFromThread: () => void
  onSendReply: () => void
  onReact: (target: 'threads' | 'comments', id: string, emoji: string, mine: boolean) => void
  onReport: (target: 'threads' | 'comments', id: string) => void
  authorLabel: (item: AuthorItem) => ReactNode
  onRemix: ((thread: HubThreadView) => void) | null
  remixLockFor: (thread: HubThreadView) => { levelLabel: string | null } | null
  canReply: boolean
}

type KidsSpaceComposer = {
  canComposeInChannel: boolean
  showNew: boolean
  onToggleNew: () => void
  onCancelNew: () => void
  newTitle: string
  onNewTitleChange: (value: string) => void
  newBody: string
  onNewBodyChange: (value: string) => void
  newAttachments: UploadedAttachment[]
  onNewAttachmentsChange: (value: UploadedAttachment[]) => void
  myGames: HubMyThreadView[] | null
  newPlayId: string | null
  onLoadMyGames: () => void
  onNewPlayIdChange: (value: string | null) => void
  onCreateThread: () => void
}

type KidsSpaceFeed = {
  threads: HubThreadView[]
  challengeThreads: HubThreadView[]
  challenge: { key: string; title: string; emoji: string } | null
  /** Filtro do Mural (ordem da lista); o Clube não usa. */
  sort: MuralSort
  onSortChange: (sort: MuralSort) => void
  onOpenThread: (thread: HubThreadView) => void
  threadsHasMore: boolean
  loadingMoreThreads: boolean
  onLoadMoreThreads: () => void
}

type KidsSpaceReport = {
  reportOpen: boolean
  reportReason: string
  reportBusy: boolean
  onReportReasonChange: (value: string) => void
  onCloseReport: () => void
  onSubmitReport: () => void
}

export type KidsSpaceContentProps = {
  context: KidsSpaceContext
  navigation: KidsSpaceNavigation
  discussion: KidsSpaceDiscussion
  composer: KidsSpaceComposer
  feed: KidsSpaceFeed
  report: KidsSpaceReport
  busy: boolean
}

/**
 * Apresentação do espaço, no desenho das telas-modelo (11/09/2026): cabeçalho no
 * creme, o conteúdo na faixa da porta (Mural no menta, Clube no azul-claro) e o
 * fechamento no lilás. Rede, autorização e estado continuam no orquestrador.
 */
export function KidsSpaceContent(props: KidsSpaceContentProps) {
  const { context, navigation, discussion, composer, feed, report, busy } = props
  const { isWall, space, viewerId, spaceChannelIds } = context
  const { channels, channel } = navigation
  const { thread } = discussion

  const detail = thread ? (
    <ThreadDetail
      thread={thread}
      comments={discussion.comments}
      busy={busy}
      isWall={isWall}
      replyBody={discussion.replyBody}
      setReplyBody={discussion.onReplyBodyChange}
      replyAttachments={discussion.replyAttachments}
      setReplyAttachments={discussion.onReplyAttachmentsChange}
      commentsHasMore={discussion.commentsHasMore}
      loadingMoreComments={discussion.loadingMoreComments}
      onLoadMoreComments={discussion.onLoadMoreComments}
      onBack={discussion.onBackFromThread}
      onSend={discussion.onSendReply}
      onReact={discussion.onReact}
      onReport={discussion.onReport}
      authorLabel={discussion.authorLabel}
      onRemix={discussion.onRemix}
      remixLock={discussion.remixLockFor(thread)}
      canReply={discussion.canReply}
    />
  ) : null

  return (
    <>
      <KidsBand tone="creme">
        {isWall ? (
          <MuralHeader space={space} sort={feed.sort} onSortChange={feed.onSortChange} />
        ) : (
          <ClubeHeader
            space={space}
            viewerId={viewerId}
            channelIds={spaceChannelIds}
            onOpenThreadById={context.onOpenThreadById}
          />
        )}
      </KidsBand>

      <KidsBand tone={isWall ? 'menta' : 'ceu'}>
        {isWall ? (
          (detail ?? <WallFeed feed={feed} viewerId={viewerId} discussion={discussion} />)
        ) : (
          // `grid-cols-1` (= `minmax(0,1fr)`) no celular: a coluna `auto` de sempre crescia até
          // a fileira INTEIRA de canais (a lista rola de lado dentro do painel, mas o painel
          // não encolhia), e a página rolava 62px de lado a 390px (full review de 11/09/2026).
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18.75rem_minmax(0,1fr)]">
            <ChannelsPanel
              channels={channels}
              channel={channel}
              isStaff={context.isStaff}
              onSelect={navigation.onSelectChannel}
            />
            <div className="min-w-0">
              {detail ?? (
                <ForumChannel
                  channel={channel}
                  viewerId={viewerId}
                  composer={composer}
                  feed={feed}
                  busy={busy}
                />
              )}
            </div>
          </div>
        )}
      </KidsBand>

      <KidsBand tone="lilas">
        {/* O remix e o "Publicar" pedem a MESMA coisa (Estúdio livre na carreira), então
            a presença do `onRemix` é a régua do botão de publicar. */}
        {isWall ? <MuralClosing canPublish={discussion.onRemix !== null} /> : <ClubeClosing />}
      </KidsBand>

      <ReportDialog report={report} />
    </>
  )
}

function ReportDialog({ report }: { report: KidsSpaceReport }) {
  return (
    <Dialog
      open={report.reportOpen}
      onClose={report.onCloseReport}
      title="Avisar um professor"
      description="Conta o que aconteceu. Um professor vai dar uma olhada. 💙"
      footer={
        <>
          <Button variant="outline" onClick={report.onCloseReport} disabled={report.reportBusy}>
            Cancelar
          </Button>
          <Button onClick={report.onSubmitReport} disabled={report.reportBusy}>
            Enviar aviso
          </Button>
        </>
      }
    >
      <label htmlFor="report-reason" className="sr-only">
        Motivo do aviso
      </label>
      <Textarea
        id="report-reason"
        name="reportReason"
        value={report.reportReason}
        onChange={(event) => report.onReportReasonChange(event.target.value)}
        placeholder="O que aconteceu de errado?"
        rows={4}
        maxLength={1000}
      />
    </Dialog>
  )
}

/** "Carregar mais", na pílula de contorno das telas-modelo. */
function LoadMore({ feed, label }: { feed: KidsSpaceFeed; label: string }) {
  if (!feed.threadsHasMore) return null
  return (
    <div className="mt-6 flex justify-center">
      <button
        type="button"
        onClick={feed.onLoadMoreThreads}
        disabled={feed.loadingMoreThreads}
        className="sz-btn-gradient sz-btn-contorno h-11 px-6 disabled:opacity-60"
      >
        {feed.loadingMoreThreads ? 'Carregando…' : label}
      </button>
    </div>
  )
}

/**
 * O canal aberto do Clube, num cartão branco: "#canal" em Baloo com a frase do canal,
 * "Começar conversa" à direita, as conversas (ou o vazio com o robô) e, no pé, a
 * pílula creme de "Escreva uma mensagem", que abre o mesmo formulário.
 */
function ForumChannel({
  channel,
  viewerId,
  composer,
  feed,
  busy,
}: {
  channel: HubChannelView | null
  viewerId: string
  composer: KidsSpaceComposer
  feed: KidsSpaceFeed
  busy: boolean
}) {
  const presentation = channelPresentation(channel?.slug ?? '')
  const staffOnly = channel?.postingPolicy === 'staff_only'
  const canCompose = Boolean(channel) && composer.canComposeInChannel
  return (
    <section aria-labelledby="canal-heading" className="kids-carta p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="canal-heading" className="sz-display text-2xl">
            {channel ? `#${channel.slug}` : 'Escolha um canal'}
          </h2>
          {channel ? (
            <p className="mt-1 text-muted-foreground text-sm">
              {channel.topic ||
                (staffOnly
                  ? 'A equipe escreve por aqui. Você pode ler e reagir.'
                  : 'Toda a turma pode conversar por aqui.')}
            </p>
          ) : null}
        </div>
        {canCompose ? (
          <button
            type="button"
            onClick={composer.onToggleNew}
            aria-expanded={composer.showNew}
            className="sz-btn-gradient h-[2.875rem] gap-2 px-6"
          >
            <Plus className="size-[1.125rem]" aria-hidden /> Começar conversa
          </button>
        ) : null}
      </div>

      {composer.showNew && canCompose ? (
        <div className="mt-5">
          <ThreadComposer composer={composer} busy={busy} />
        </div>
      ) : null}

      <div className="mt-5">
        {feed.threads.length === 0 ? (
          <div className="flex flex-col items-center rounded-[1.25rem] border-[1.5px] border-border bg-background px-6 py-12 text-center md:py-[4.5rem]">
            <span className="grid size-[4.75rem] place-items-center rounded-full bg-(--band-ceu)">
              <Bot className="size-9" strokeWidth={1.5} aria-hidden />
            </span>
            <p className="sz-display mt-4 text-xl">{presentation.emptyTitle}</p>
            <p className="mt-2 text-[0.9375rem] text-muted-foreground">{presentation.emptyText}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {feed.threads.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => feed.onOpenThread(item)}
                  className="flex w-full items-center gap-4 rounded-2xl bg-background p-4 text-left transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      {item.isPinned ? <Tag>Fixado</Tag> : null}
                      {item.pending ? <Tag>Aguardando ✅</Tag> : null}
                      <span className="truncate font-extrabold text-[0.9375rem]">{item.title}</span>
                    </span>
                    <span className="mt-1.5 flex items-center gap-3 text-muted-foreground text-xs">
                      <AuthorBadge
                        item={item}
                        viewerId={viewerId}
                        nameNode={authorText(item, viewerId)}
                      />
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="size-3.5" aria-hidden /> {item.commentCount}
                      </span>
                      <span>{timeAgo(item.lastActivityAt)}</span>
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <LoadMore feed={feed} label="Carregar mais conversas" />
      </div>

      {canCompose && !composer.showNew ? (
        <button
          type="button"
          onClick={composer.onToggleNew}
          className="mt-5 flex w-full items-center gap-3 rounded-full bg-(--band-creme) py-2 pr-2 pl-6 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--band-creme)_92%,var(--foreground))]"
        >
          <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-muted-foreground">
            Escreva uma mensagem para a turma…
          </span>
          <span
            aria-hidden="true"
            className="kids-marca grid size-12 shrink-0 place-items-center rounded-full"
          >
            <Send className="size-5" />
          </span>
        </button>
      ) : channel && staffOnly ? (
        <p className="mt-5 rounded-2xl bg-(--band-creme) px-5 py-3.5 text-center font-semibold text-muted-foreground text-sm">
          Aqui só a equipe escreve 💬
        </p>
      ) : null}
    </section>
  )
}

function ThreadComposer({ composer, busy }: { composer: KidsSpaceComposer; busy: boolean }) {
  return (
    <div className="space-y-3 rounded-[1.25rem] bg-background p-4">
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTION_STARTERS.map((suggestion) => (
          <button
            type="button"
            key={suggestion.chip}
            onClick={() => composer.onNewTitleChange(suggestion.title)}
            className="rounded-full bg-card px-3 py-1.5 font-bold text-muted-foreground text-xs ring-1 ring-border transition-colors hover:text-primary hover:ring-primary"
          >
            {suggestion.chip}
          </button>
        ))}
      </div>
      <label htmlFor="new-thread-title" className="sr-only">
        Título da conversa
      </label>
      <input
        id="new-thread-title"
        name="threadTitle"
        className="w-full rounded-xl border-2 border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="Sobre o que você quer falar?"
        value={composer.newTitle}
        onChange={(event) => composer.onNewTitleChange(event.target.value)}
      />
      <RichEditor
        value={composer.newBody}
        onChange={composer.onNewBodyChange}
        ariaLabel="Mensagem da conversa"
      />
      <AttachmentUploader
        value={composer.newAttachments}
        onChange={composer.onNewAttachmentsChange}
        disabled={busy}
      />
      <GamePicker
        games={composer.myGames}
        selectedId={composer.newPlayId}
        onOpen={composer.onLoadMyGames}
        onSelect={composer.onNewPlayIdChange}
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="sz-btn-gradient sz-btn-contorno h-11 px-5"
          onClick={composer.onCancelNew}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="sz-btn-gradient h-11 px-6 disabled:opacity-60"
          onClick={composer.onCreateThread}
          disabled={busy}
        >
          Publicar
        </button>
      </div>
    </div>
  )
}

/** O Mural: a prateleira do Desafio do mês (quando há) e a grade de três colunas. */
function WallFeed({
  feed,
  viewerId,
  discussion,
}: {
  feed: KidsSpaceFeed
  viewerId: string
  discussion: KidsSpaceDiscussion
}) {
  if (feed.threads.length === 0) {
    return (
      // Estado vazio de verdade, e não a caixa tracejada cinza: aqui o Zappy faz o
      // papel do círculo colorido do `KidsEmptyState`, porque a fala é dele.
      <div className="kids-carta flex flex-col items-center gap-2 px-6 py-12 text-center">
        <KidsMascot expression="happy" className="kid-float size-20" />
        <p className="sz-display mt-2 text-xl">{channelPresentation('parede').emptyText}</p>
      </div>
    )
  }
  const { challenge, challengeThreads, threads } = feed
  const shelf =
    challengeThreads.length > 0
      ? challengeThreads
      : challenge
        ? threads.filter((thread) => thread.challengeKey === challenge.key)
        : []
  const others = challenge
    ? threads.filter((thread) => thread.challengeKey !== challenge.key)
    : threads
  const card = (thread: HubThreadView) => (
    <ShowcaseCard
      key={thread.id}
      thread={thread}
      viewerId={viewerId}
      onOpen={() => feed.onOpenThread(thread)}
      onRemix={discussion.onRemix}
      remixLock={discussion.remixLockFor(thread)}
    />
  )
  return (
    <div className="space-y-8">
      {challenge && shelf.length > 0 ? (
        <section aria-label="Desafio do mês">
          <h2 className="sz-display mb-4 flex items-center gap-2 text-2xl">
            <span aria-hidden="true">{challenge.emoji}</span>🏆 Desafio do mês: {challenge.title}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{shelf.map(card)}</div>
        </section>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{others.map(card)}</div>
      <LoadMore feed={feed} label="Carregar mais projetos" />
    </div>
  )
}
