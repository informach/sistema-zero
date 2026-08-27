import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'

// Mantém o módulo completo: outros testes do mesmo processo usam exports adicionais.
/**
 * ⚠️⚠️ O editor rico entra como DUPLO aqui, e a razão é específica.
 *
 * O `aria-label` do editor real é definido DENTRO do `useEditor` do TipTap
 * (`editorProps.attributes`), então o campo "Mensagem da conversa" só existe
 * depois que a INSTÂNCIA do editor é criada — não basta o módulo estar
 * carregado. Sob CPU disputada no CI, essa inicialização já estourou 1 s e
 * depois 5 s, sempre cravada no valor do teto (o sinal de "não apareceu", não
 * de "demorou").
 *
 * ⚠️⚠️ ESTE BLOCO PRECISA VIR ANTES dos imports dos componentes. Na 1ª versão
 * ele ficava depois, e o duplo virava CÓDIGO MORTO: o `kids-space-view-client`
 * já tinha materializado o editor REAL na sua árvore de imports, e a primeira
 * materialização GRUDA. O sintoma foi cruel de ler — um `<textarea>` puro
 * "levando" 5 s no CI, que é impossível; quem estava lá ainda era o TipTap.
 *
 * ⚠️ Três tentativas anteriores erraram o alvo e ficam registradas para não se
 * repetirem: (1) subir o teto de espera — trata como latência algo que é
 * inicialização assíncrona; (2) AQUECER o módulo com `await import` do `.impl`
 * — resolve o carregamento, que não era o gargalo; (3) mockar DEPOIS dos
 * imports — o mock nunca chegou a valer.
 *
 * O que este arquivo prova é a FIAÇÃO: que o compositor passa `ariaLabel` ao
 * editor. Um duplo com o mesmo `aria-label` prova isso de forma determinística.
 * O que se perde — que o editor REAL honra o `ariaLabel` — é responsabilidade do
 * member-shell, dono do componente.
 *
 * ⭐ O duplo é INOFENSIVO POR CONSTRUÇÃO (lição de 21/08, `mock.module` é global
 * ao run e a primeira materialização gruda): espalha o módulo real, troca só o
 * `RichEditor`, e o substituto é um `<textarea>` de verdade com o mesmo nome
 * acessível — qualquer outro teste que renderize o compositor continua achando
 * um campo de texto nomeado, com value/onChange funcionando.
 */
const actualRichEditor = await import('@sistemazero/member-shell/components/rich-editor')
mock.module('@sistemazero/member-shell/components/rich-editor', () => ({
  ...actualRichEditor,
  RichEditor: ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string
    onChange: (next: string) => void
    ariaLabel: string
  }) => (
    <textarea
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}))


const navigation = await import('next/navigation')
const push = mock(() => {})
mock.module('next/navigation', () => ({ ...navigation, useRouter: () => ({ push }) }))

const { RecadoThreadClient } = await import(
  '../src/app/(app)/recados/[threadId]/recado-thread-client'
)
const { KidsSpaceViewClient } = await import('../src/components/kids/kids-space-view-client')

const originalFetch = globalThis.fetch

function installFetch() {
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path === '/api/hub/spaces/clube') {
        return Response.json({
          id: 'space-1',
          slug: 'clube',
          name: 'Clube dos Criadores',
          description: null,
          iconUrl: null,
          audience: 'kids',
          locked: false,
        })
      }
      if (path === '/api/hub/spaces/clube/channels') {
        return Response.json({
          items: [
            {
              id: 'channel-1',
              spaceId: 'space-1',
              slug: 'geral',
              name: 'Geral',
              topic: null,
              postingPolicy: 'members',
              requiresApproval: false,
              hasUnread: false,
            },
          ],
        })
      }
      if (path === '/api/hub/channels/channel-1/threads') {
        return Response.json({ items: [], nextCursor: null, hasMore: false })
      }
      if (path === '/api/members/teacher-threads/thread-1') {
        return Response.json({
          id: 'thread-1',
          userId: 'profile-1',
          accountId: 'account-1',
          audience: 'kids',
          contextType: 'general',
          contextRef: null,
          courseId: null,
          lessonId: null,
          title: 'Conversa com o professor',
          lastMessageAt: '2026-08-16T12:00:00.000Z',
          createdAt: '2026-08-16T12:00:00.000Z',
          messages: [],
          nextCursor: null,
        })
      }
      if (init?.method === 'POST') return Response.json({ ok: true })
      throw new Error(`fetch de teste não previsto: ${path}`)
    }),
    { preconnect: originalFetch.preconnect },
  )
}

beforeEach(installFetch)
afterEach(() => {
  globalThis.fetch = originalFetch
})

/** Rede de segurança para os dois fetches e o diálogo, não orçamento de latência. */
const ESPERA = { timeout: 5_000 } as const

/**
 * ⚠️ Teto SEPARADO e generoso só para o campo do editor, e a razão é honesta:
 * se por qualquer motivo o duplo acima não valer (chaves do `mock.module`
 * divergem entre plataformas — no Windows o mock pega nas duas posições, no
 * Linux não), quem renderiza é o TipTap de verdade, e a inicialização dele sob
 * CPU disputada já estourou 1 s e 5 s no CI. Com o duplo valendo isto resolve em
 * milissegundos e o número nunca é alcançado; sem ele, o teste ainda diz a
 * verdade em vez de reprovar por relógio. Três tentativas anteriores tentaram
 * escolher UM dos dois mundos — esta cobre os dois.
 */
const ESPERA_EDITOR = { timeout: 30_000 } as const

describe('nomes acessíveis dos compositores da comunidade', () => {
  test('o campo de resposta dos recados tem label persistente', async () => {
    render(<RecadoThreadClient threadId="thread-1" />)

    const reply = await screen.findByRole('textbox', { name: 'Resposta para o professor' })
    expect(reply.getAttribute('name')).toBe('reply')
  })

  test('o título da nova conversa tem label persistente', async () => {
    render(<KidsSpaceViewClient slug="clube" viewerId="profile-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Começar conversa' }, ESPERA))
    // ⚠️ indBy (assíncrono), como o irmão logo abaixo: o conteúdo do diálogo não
    // está no DOM no mesmo tique do clique. Com getBy síncrono o teste passava na
    // máquina rápida e reprovava no CI (2 de 3 runs em 18/08) — flake por corrida.
    const title = await screen.findByRole('textbox', { name: 'Título da conversa' }, ESPERA)
    expect(title.getAttribute('name')).toBe('threadTitle')
  })

  test('o corpo da nova conversa expõe o editor rico como campo nomeado', async () => {
    render(<KidsSpaceViewClient slug="clube" viewerId="profile-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Começar conversa' }, ESPERA))
    expect(
      await screen.findByRole('textbox', { name: 'Mensagem da conversa' }, ESPERA_EDITOR),
    ).toBeTruthy()
  })
})
