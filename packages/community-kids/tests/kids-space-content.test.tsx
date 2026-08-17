import { afterEach, describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  KidsSpaceContent,
  type KidsSpaceContentProps,
} from '../src/components/kids/kids-space-content'
import type { HubChannelView, HubCommentView, HubThreadView } from '../src/lib/types'

const originalFetch = globalThis.fetch

const channel: HubChannelView = {
  id: 'channel-1',
  spaceId: 'space-1',
  slug: 'geral',
  name: 'Geral',
  topic: 'Converse com a turma',
  postingPolicy: 'members',
  requiresApproval: false,
  hasUnread: false,
}

const thread: HubThreadView = {
  id: 'thread-1',
  version: 1,
  channelId: channel.id,
  authorId: 'profile-2',
  authorProfileId: 'profile-2',
  title: 'Meu jogo espacial',
  slug: 'meu-jogo-espacial',
  body: 'Desvie dos meteoros!',
  isPinned: false,
  isLocked: false,
  status: 'visible',
  pending: false,
  commentCount: 2,
  isShowcase: false,
  authorDisplayName: 'Bia',
  authorPublic: true,
  coverImageUrl: null,
  playId: null,
  challengeKey: null,
  reactions: [],
  attachments: [],
  lastActivityAt: '2026-08-16T12:00:00.000Z',
  createdAt: '2026-08-16T12:00:00.000Z',
  editedAt: null,
}

const comment: HubCommentView = {
  id: 'comment-1',
  version: 1,
  threadId: thread.id,
  authorId: 'profile-3',
  authorDisplayName: 'Caio',
  body: 'Ficou muito legal!',
  status: 'visible',
  pending: false,
  reactions: [],
  attachments: [],
  replyToId: null,
  createdAt: '2026-08-16T12:05:00.000Z',
  editedAt: null,
}

function contentProps(): KidsSpaceContentProps {
  const noop = () => {}
  return {
    context: {
      isWall: false,
      space: {
        id: 'space-1',
        slug: 'clube',
        name: 'Clube dos Criadores',
        description: 'Um lugar para criar junto.',
        iconUrl: null,
        audience: 'kids',
        locked: false,
      },
      viewerId: 'profile-1',
      spaceChannelIds: [channel.id],
      onOpenThreadById: noop,
    },
    navigation: { channels: [channel], channel, onSelectChannel: noop },
    discussion: {
      thread: null,
      comments: [],
      replyBody: '',
      onReplyBodyChange: noop,
      replyAttachments: [],
      onReplyAttachmentsChange: noop,
      commentsHasMore: false,
      loadingMoreComments: false,
      onLoadMoreComments: noop,
      onBackFromThread: noop,
      onSendReply: noop,
      onReact: noop,
      onReport: noop,
      authorLabel: () => 'Colega',
      onRemix: null,
      remixLockFor: () => null,
      canReply: true,
    },
    composer: {
      canComposeInChannel: true,
      showNew: false,
      onToggleNew: noop,
      onCancelNew: noop,
      newTitle: '',
      onNewTitleChange: noop,
      newBody: '',
      onNewBodyChange: noop,
      newAttachments: [],
      onNewAttachmentsChange: noop,
      myGames: null,
      newPlayId: null,
      onLoadMyGames: noop,
      onNewPlayIdChange: noop,
      onCreateThread: noop,
    },
    feed: {
      threads: [thread],
      challengeThreads: [],
      challenge: null,
      onOpenThread: noop,
      threadsHasMore: true,
      loadingMoreThreads: false,
      onLoadMoreThreads: noop,
    },
    report: {
      reportOpen: false,
      reportReason: '',
      reportBusy: false,
      onReportReasonChange: noop,
      onCloseReport: noop,
      onSubmitReport: noop,
    },
    busy: false,
  }
}

function installActivityFetch() {
  const activityFetch = mock(async () => Response.json({ items: [] }))
  globalThis.fetch = Object.assign(activityFetch, { preconnect: originalFetch.preconnect })
  localStorage.setItem('sz:kids:clube:onboarded:profile-1', '1')
  return activityFetch
}

afterEach(() => {
  globalThis.fetch = originalFetch
  localStorage.clear()
})

describe('KidsSpaceContent — comportamento do boundary de apresentação', () => {
  test('encaminha navegação, abertura, composição e paginação do fórum', async () => {
    const activityFetch = installActivityFetch()
    const props = contentProps()
    const onSelectChannel = mock(() => {})
    const onOpenThread = mock(() => {})
    const onToggleNew = mock(() => {})
    const onLoadMoreThreads = mock(() => {})

    render(
      <KidsSpaceContent
        {...props}
        navigation={{ ...props.navigation, onSelectChannel }}
        composer={{ ...props.composer, onToggleNew }}
        feed={{ ...props.feed, onOpenThread, onLoadMoreThreads }}
      />,
    )
    await waitFor(() => expect(activityFetch).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: /Geral/ }))
    fireEvent.click(screen.getByRole('button', { name: /Começar conversa/ }))
    fireEvent.click(screen.getByRole('button', { name: /Meu jogo espacial/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais conversas' }))

    expect(onSelectChannel).toHaveBeenCalledWith(channel)
    expect(onToggleNew).toHaveBeenCalledTimes(1)
    expect(onOpenThread).toHaveBeenCalledWith(thread)
    expect(onLoadMoreThreads).toHaveBeenCalledTimes(1)
  })

  test('encaminha motivo, cancelamento e envio do aviso ao professor', async () => {
    const activityFetch = installActivityFetch()
    const props = contentProps()
    const onReportReasonChange = mock(() => {})
    const onCloseReport = mock(() => {})
    const onSubmitReport = mock(() => {})

    render(
      <KidsSpaceContent
        {...props}
        report={{
          reportOpen: true,
          reportReason: '',
          reportBusy: false,
          onReportReasonChange,
          onCloseReport,
          onSubmitReport,
        }}
      />,
    )
    await waitFor(() => expect(activityFetch).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByRole('textbox', { name: 'Motivo do aviso' }), {
      target: { value: 'Mensagem inadequada' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar aviso' }))

    expect(onReportReasonChange).toHaveBeenCalledWith('Mensagem inadequada')
    expect(onCloseReport).toHaveBeenCalledTimes(1)
    expect(onSubmitReport).toHaveBeenCalledTimes(1)
  })

  test('encaminha retorno, denúncia, resposta e paginação dentro de uma conversa', () => {
    const props = contentProps()
    const onBackFromThread = mock(() => {})
    const onLoadMoreComments = mock(() => {})
    const onReport = mock(() => {})
    const onSendReply = mock(() => {})

    render(
      <KidsSpaceContent
        {...props}
        context={{ ...props.context, isWall: true }}
        discussion={{
          ...props.discussion,
          thread,
          comments: [comment],
          replyBody: 'Adorei!',
          commentsHasMore: true,
          onBackFromThread,
          onLoadMoreComments,
          onReport,
          onSendReply,
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Voltar aos projetos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais respostas' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Avisar professor' })[0]!)
    fireEvent.click(screen.getByRole('button', { name: 'Comentar' }))

    expect(onBackFromThread).toHaveBeenCalledTimes(1)
    expect(onLoadMoreComments).toHaveBeenCalledTimes(1)
    expect(onReport).toHaveBeenCalledWith('threads', thread.id)
    expect(onSendReply).toHaveBeenCalledTimes(1)
  })

  test('separa a prateleira do desafio e encaminha abertura e remix no Mural', () => {
    const props = contentProps()
    const showcase = {
      ...thread,
      isShowcase: true,
      playId: 'play-1',
      challengeKey: 'm:2026-08',
    }
    const onOpenThread = mock(() => {})
    const onRemix = mock(() => {})

    render(
      <KidsSpaceContent
        {...props}
        context={{ ...props.context, isWall: true }}
        discussion={{ ...props.discussion, onRemix }}
        feed={{
          ...props.feed,
          threads: [showcase],
          challengeThreads: [showcase],
          challenge: { key: 'm:2026-08', title: 'Aventura espacial', emoji: '🚀' },
          onOpenThread,
        }}
      />,
    )

    expect(screen.getByRole('region', { name: 'Desafio do mês' })).toBeTruthy()
    fireEvent.click(screen.getByText('Meu jogo espacial').closest('button') as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: 'Fazer a minha versão' }))

    expect(onOpenThread).toHaveBeenCalledWith(showcase)
    expect(onRemix).toHaveBeenCalledWith(showcase)
  })
})
