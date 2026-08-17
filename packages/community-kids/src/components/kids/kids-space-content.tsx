'use client'

import {
  AttachmentUploader,
  type UploadedAttachment,
} from '@sistemazero/member-shell/components/attachment-uploader'
import { RichEditor } from '@sistemazero/member-shell/components/rich-editor'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Textarea } from '@sistemazero/ui/textarea'
import { Lock, MessageCircle, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import type {
  HubChannelView,
  HubCommentView,
  HubMyThreadView,
  HubSpaceView,
  HubThreadView,
} from '@/lib/types'
import { channelPresentation } from './channel-presentation'
import { ClubeActivityBell } from './clube-activity-bell'
import { ClubeCombinados } from './clube-combinados'
import { GamePicker, ShowcaseCard, Tag, ThreadDetail } from './kids-space-detail'
import { KidsMascot } from './mascot'
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

/** Apresentação do espaço; rede, autorização e estado continuam no orquestrador. */
export function KidsSpaceContent(props: KidsSpaceContentProps) {
  const { context, navigation, discussion, composer, feed, report, busy } = props
  const { isWall, space, viewerId, spaceChannelIds } = context
  const { channels, channel } = navigation
  const { thread } = discussion

  return (
    <>
      <div className="w-full">
        {!isWall ? (
          <div className="mb-4 flex items-center gap-3 rounded-3xl border-2 border-border bg-(--kids-cyan-tint) p-4">
            <KidsMascot expression="happy" className="size-14 shrink-0 md:size-16" />
            <div className="min-w-0 flex-1">
              <h1 className="[font-family:var(--font-display)] font-bold text-2xl">{space.name}</h1>
              <p className="text-muted-foreground text-sm">
                {space.description || 'Converse com a turma e mostre o que você criou! 🎉'}
              </p>
            </div>
            <ClubeActivityBell
              viewerId={viewerId}
              channelIds={spaceChannelIds}
              onOpenThread={context.onOpenThreadById}
            />
            <ClubeCombinados viewerId={viewerId} />
          </div>
        ) : (
          <>
            <h1 className="mb-1 [font-family:var(--font-display)] font-bold text-2xl">
              {space.name}
            </h1>
            {space.description ? (
              <p className="mb-4 text-muted-foreground text-sm">{space.description}</p>
            ) : (
              <div className="mb-4" />
            )}
          </>
        )}

        <div className={`grid gap-4 ${isWall ? '' : 'md:grid-cols-[200px_1fr]'}`}>
          {!isWall ? (
            <aside className="flex gap-2 overflow-x-auto md:flex-col md:gap-1.5">
              {channels.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => navigation.onSelectChannel(item)}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left text-sm transition-colors ${
                    channel?.id === item.id
                      ? 'border-primary bg-(--kids-cyan-tint) font-bold text-primary'
                      : 'border-transparent text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  <span aria-hidden="true" className="shrink-0 text-base leading-none">
                    {channelPresentation(item.slug).emoji}
                  </span>
                  <span className="truncate">{item.name}</span>
                  {item.postingPolicy === 'staff_only' ? (
                    <Lock className="size-3 shrink-0 opacity-60" />
                  ) : null}
                  {item.hasUnread ? (
                    <span className="ml-auto size-2 rounded-full bg-primary" />
                  ) : null}
                </button>
              ))}
            </aside>
          ) : null}

          <main className="min-w-0">
            {thread ? (
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
            ) : (
              <KidsSpaceFeedView
                isWall={isWall}
                viewerId={viewerId}
                channel={channel}
                composer={composer}
                feed={feed}
                discussion={discussion}
                busy={busy}
              />
            )}
          </main>
        </div>
      </div>

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

function KidsSpaceFeedView({
  isWall,
  viewerId,
  channel,
  composer,
  feed,
  discussion,
  busy,
}: {
  isWall: boolean
  viewerId: string
  channel: HubChannelView | null
  composer: KidsSpaceComposer
  feed: KidsSpaceFeed
  discussion: KidsSpaceDiscussion
  busy: boolean
}) {
  return (
    <div className="space-y-3">
      {!isWall ? (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {channel ? channel.topic || `#${channel.slug}` : 'Escolha um canal'}
          </p>
          {channel && composer.canComposeInChannel ? (
            <button
              type="button"
              onClick={composer.onToggleNew}
              className="inline-flex items-center gap-1 rounded-2xl bg-primary px-4 py-2 font-bold text-primary-foreground text-sm"
            >
              <Plus className="size-4" /> Começar conversa
            </button>
          ) : channel && channel.postingPolicy === 'staff_only' ? (
            <span className="text-muted-foreground text-xs">Aqui só a equipe escreve 💬</span>
          ) : null}
        </div>
      ) : null}

      {!isWall && composer.showNew && composer.canComposeInChannel ? (
        <ThreadComposer composer={composer} busy={busy} />
      ) : null}

      {feed.threads.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-border border-dashed p-6 text-center text-muted-foreground text-sm">
          <KidsMascot expression="happy" className="size-16" />
          <p>
            {isWall
              ? 'Os projetos dos criadores vão aparecer aqui! 🎨'
              : channel
                ? channelPresentation(channel.slug).emptyState
                : 'Nenhuma conversa ainda. Comece a primeira! ✨'}
          </p>
        </div>
      ) : isWall ? (
        <WallThreads
          threads={feed.threads}
          challengeThreads={feed.challengeThreads}
          challenge={feed.challenge}
          viewerId={viewerId}
          onOpenThread={feed.onOpenThread}
          onRemix={discussion.onRemix}
          remixLockFor={discussion.remixLockFor}
        />
      ) : (
        feed.threads.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => feed.onOpenThread(item)}
            className="w-full rounded-2xl border-2 border-border bg-card p-3 text-left transition-colors hover:border-primary"
          >
            <div className="flex items-center gap-2">
              {item.isPinned ? <Tag>Fixado</Tag> : null}
              {item.pending ? <Tag>Aguardando ✅</Tag> : null}
              <span className="truncate font-bold">{item.title}</span>
            </div>
            <p className="flex items-center gap-3 text-muted-foreground text-xs">
              <AuthorBadge item={item} viewerId={viewerId} nameNode={authorText(item, viewerId)} />
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="size-3" /> {item.commentCount}
              </span>
              <span>{timeAgo(item.lastActivityAt)}</span>
            </p>
          </button>
        ))
      )}
      {feed.threadsHasMore ? (
        <button
          type="button"
          onClick={feed.onLoadMoreThreads}
          disabled={feed.loadingMoreThreads}
          className="w-full rounded-2xl border-2 border-border border-dashed p-2.5 text-center font-bold text-muted-foreground text-sm transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
        >
          {feed.loadingMoreThreads
            ? 'Carregando…'
            : isWall
              ? 'Carregar mais projetos'
              : 'Carregar mais conversas'}
        </button>
      ) : null}
    </div>
  )
}

function ThreadComposer({ composer, busy }: { composer: KidsSpaceComposer; busy: boolean }) {
  return (
    <div className="space-y-2 rounded-2xl border-2 border-border bg-card p-3">
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTION_STARTERS.map((suggestion) => (
          <button
            type="button"
            key={suggestion.chip}
            onClick={() => composer.onNewTitleChange(suggestion.title)}
            className="rounded-full border-2 border-border px-2.5 py-1 font-bold text-muted-foreground text-xs transition-colors hover:border-primary hover:text-primary"
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
        className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
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
          className="rounded-2xl border-2 border-border px-4 py-2 text-sm"
          onClick={composer.onCancelNew}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="rounded-2xl bg-primary px-4 py-2 font-bold text-primary-foreground text-sm disabled:opacity-60"
          onClick={composer.onCreateThread}
          disabled={busy}
        >
          Publicar
        </button>
      </div>
    </div>
  )
}

function WallThreads({
  threads,
  challengeThreads,
  challenge,
  viewerId,
  onOpenThread,
  onRemix,
  remixLockFor,
}: {
  threads: HubThreadView[]
  challengeThreads: HubThreadView[]
  challenge: { key: string; title: string; emoji: string } | null
  viewerId: string
  onOpenThread: (thread: HubThreadView) => void
  onRemix: ((thread: HubThreadView) => void) | null
  remixLockFor: (thread: HubThreadView) => { levelLabel: string | null } | null
}) {
  const shelf =
    challengeThreads.length > 0
      ? challengeThreads
      : challenge
        ? threads.filter((thread) => thread.challengeKey === challenge.key)
        : []
  const others = challenge
    ? threads.filter((thread) => thread.challengeKey !== challenge.key)
    : threads

  return (
    <div className="space-y-5">
      {challenge && shelf.length > 0 ? (
        <section aria-label="Desafio do mês">
          <h3 className="mb-2 flex items-center gap-2 font-bold [font-family:var(--font-display)]">
            <span aria-hidden="true">{challenge.emoji}</span>🏆 Desafio do mês: {challenge.title}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {shelf.map((thread) => (
              <ShowcaseCard
                key={thread.id}
                thread={thread}
                viewerId={viewerId}
                onOpen={() => onOpenThread(thread)}
                onRemix={onRemix}
                remixLock={remixLockFor(thread)}
              />
            ))}
          </div>
        </section>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {others.map((thread) => (
          <ShowcaseCard
            key={thread.id}
            thread={thread}
            viewerId={viewerId}
            onOpen={() => onOpenThread(thread)}
            onRemix={onRemix}
            remixLock={remixLockFor(thread)}
          />
        ))}
      </div>
    </div>
  )
}
