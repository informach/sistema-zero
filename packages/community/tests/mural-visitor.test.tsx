import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  MURAL_VISITOR_NOTE,
  ThreadDetail,
} from '../src/app/(app)/comunidade/[slug]/space-view-client'
import { muralVisitor } from '../src/lib/mural-visitor'
import type { HubThreadView } from '../src/lib/types'

/**
 * Visitante do Mural adulto (20/10/2026): depois do presente, a pessoa ainda vê e joga, mas o hub
 * devolve `canInteract: false`. A conversa esconde comentar e reagir e mostra a continuidade.
 */

const thread = {
  id: 't1',
  channelId: 'c1',
  authorId: 'u2',
  authorDisplayName: 'Ana',
  authorAvatarUrl: null,
  title: 'Meu primeiro jogo',
  body: 'Jogue e me diga.',
  attachments: [],
  reactions: [{ emoji: '👍', count: 3, reactedByMe: false }],
  isShowcase: true,
  isLocked: false,
  createdAt: '2026-10-20T12:00:00.000Z',
} as unknown as HubThreadView

const render = (canInteract: boolean) =>
  renderToStaticMarkup(
    <ThreadDetail
      thread={thread}
      comments={[]}
      newComments={[]}
      hasMoreComments={false}
      loadingMoreComments={false}
      onLoadMoreComments={() => {}}
      busy={false}
      commentBody=""
      setCommentBody={() => {}}
      commentAttachments={[]}
      setCommentAttachments={() => {}}
      onBack={() => {}}
      backLabel="Voltar aos jogos"
      paned={false}
      onSend={() => {}}
      onReact={() => {}}
      onReport={() => {}}
      authorLabel={() => 'Ana'}
      canInteract={canInteract}
    />,
  )

describe('conversa do Mural para o visitante', () => {
  test('sem interação: nada de comentar ou reagir, e o recado leva à continuidade', () => {
    const html = render(false)
    expect(html).not.toContain('Escreva um comentário')
    expect(html).not.toContain('Comentar')
    expect(html).not.toContain('aria-pressed')
    // As contagens seguem à vista, só para ler.
    expect(html).toContain('aria-label="Reações"')
    expect(html).toContain(MURAL_VISITOR_NOTE)
    expect(html).toContain('/pro/comunidade-dos-criadores/oferta/continuar')
    expect(html).toContain('utm_content=mural-visitante')
  })

  test('com interação: o comentário e as reações voltam', () => {
    const html = render(true)
    expect(html).toContain('Escreva um comentário')
    expect(html).toContain('aria-pressed')
    expect(html).not.toContain(MURAL_VISITOR_NOTE)
  })
})

describe('cabeçalho do Mural adulto para o visitante', () => {
  test('só é visitante quando o hub responde canInteract: false', () => {
    expect(muralVisitor({ status: 200, body: { canInteract: false } })).toBe(true)
    expect(muralVisitor({ status: 200, body: { canInteract: true } })).toBe(false)
    // Hub fora ou resposta sem o campo: a página segue como sempre (o hub decide no clique).
    expect(muralVisitor(null)).toBe(false)
    expect(muralVisitor({ status: 503, body: null })).toBe(false)
    expect(muralVisitor({ status: 200, body: {} })).toBe(false)
  })

  test('a página esconde "Publicar um jogo meu" e o "comente" do visitante', async () => {
    const source = await Bun.file(
      new URL('../src/app/(app)/mural-dos-criadores-adulto/page.tsx', import.meta.url),
    ).text()
    expect(source).toContain('shell.hub.getSpaceReadonly(CREATOR_SHOWCASE_SLUGS.adult)')
    expect(source).toContain('const visitor = muralVisitor(space)')
    expect(source).toMatch(/visitor \? undefined : \(\s*<Link[\s\S]*Publicar um jogo meu/)
    expect(source).toMatch(/visitor\s*\?\s*'Jogos prontos da comunidade\. Jogue no navegador\.'/)
  })
})
