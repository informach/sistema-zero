import { describe, expect, mock, test } from 'bun:test'
import {
  PINTA_PALETTE_LIBRARY_ITEM_ID,
  PINTA_PALETTE_LIBRARY_KIND,
} from '@sistemazero/core/creations'
import type { PensaProposal } from '@sistemazero/core/pensa'
import { MOLDA_ASSET_KINDS } from '@sistemazero/molda/assets'
import { PINTA_ASSET_KINDS } from '@sistemazero/pinta/assets'
import type { CreationIndexView, CreationSummaryView, SessionUser } from '../src/lib/types'
import type { MembersClient } from '../src/server/clients'

mock.module('server-only', () => ({}))
const { journeyInventory, loadJourneyContext, MOLDA_KIND_FAMILY, PINTA_KIND_FAMILY } = await import(
  '../src/server/pensa-journey/context'
)
const { validateJourneyProposal } = await import('../src/server/pensa-journey/contracts')
const { journeyModelContext, JOURNEY_PROMPT_LADDER } = await import(
  '../src/server/pensa-journey/prompt-context'
)

/** Uma linha da listagem da nuvem como o members devolve (a mesma forma que o Pinta sobe). */
function summary(tool: 'pinta' | 'molda', itemId: string, kind: string): CreationSummaryView {
  return {
    formatVersion: 1,
    tool,
    itemId,
    name: `Criação ${itemId}`,
    kind,
    itemUpdatedAt: '2026-10-14T12:00:00.000Z',
    revision: 3,
    bytes: 1024,
    thumb: null,
    syncedAt: '2026-10-14T12:00:01.000Z',
    deletedAt: null,
  }
}

function members(pinta: CreationIndexView[], molda: CreationIndexView[] = []) {
  const search = mock(async (_query: string) => ({ status: 200, body: { hits: [] } }))
  const client = {
    getGamificationReadonly: async () => ({ status: 200, body: { level: { slug: 'god' } } }),
    getStudioUnlocksReadonly: async () => ({
      status: 200,
      body: { blocks: ['sz_g2d_setup_stage', 'sz_g2d_on_key'] },
    }),
    checkCreativeToolsAccessReadonly: async () => ({
      status: 200,
      body: { access: { 'estudio-completo': true, pinta: true, molda: true } },
    }),
    zappyKnowledgeSearch: search,
    listCreationsReadonly: async (tool: string) => ({
      status: 200,
      body: { items: tool === 'pinta' ? pinta : molda },
    }),
  } as unknown as MembersClient
  return { client, search }
}
const CHILD = { id: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e010', role: 'student' } as SessionUser

describe('inventário: o tipo guardado vira a família da proposta (A1)', () => {
  test('todo tipo do Pinta e do Molda tem família, e a tabela não inventa tipo', () => {
    expect(Object.keys(PINTA_KIND_FAMILY).sort()).toEqual([...PINTA_ASSET_KINDS].sort())
    expect(Object.keys(MOLDA_KIND_FAMILY).sort()).toEqual([...MOLDA_ASSET_KINDS].sort())
    expect(PINTA_KIND_FAMILY['pixel-sprite']).toBe('sprite')
    expect(PINTA_KIND_FAMILY['vector-background']).toBe('background')
    expect(PINTA_KIND_FAMILY['vector-tileset']).toBe('tileset')
  })

  test('a biblioteca de paletas, a lápide e o tipo desconhecido saem do inventário', () => {
    const items: CreationIndexView[] = [
      summary('pinta', 'heroi-123456', 'pixel-sprite'),
      summary('pinta', PINTA_PALETTE_LIBRARY_ITEM_ID, PINTA_PALETTE_LIBRARY_KIND),
      // Identidade parcial da biblioteca (kind reservado num item comum): também não é desenho.
      summary('pinta', 'outro-123456', PINTA_PALETTE_LIBRARY_KIND),
      { itemId: 'apagado-1234', revision: 2, deletedAt: '2026-10-14T12:00:00.000Z' },
      { ...summary('pinta', 'lixeira-1234', 'pixel-sprite'), deletedAt: '2026-10-14T12:00:00Z' },
      summary('pinta', 'futuro-12345', 'pixel-hologram'),
    ]
    expect(journeyInventory('pinta', items)).toEqual([
      { id: 'heroi-123456', name: 'Criação heroi-123456', kind: 'sprite', tool: 'pinta' },
    ])
  })

  test('desenho que já existe no Pinta entra no plano como sprite (antes reprovava sempre)', async () => {
    const { client } = members(
      [
        summary('pinta', 'heroi-123456', 'pixel-sprite'),
        summary('pinta', 'ceu-1234567', 'vector-background'),
      ],
      [summary('molda', 'nave-1234567', 'model')],
    )
    const context = await loadJourneyContext(client, CHILD, 'Um gato na lua')
    expect(context.existingCreations.map((item) => [item.id, item.kind])).toEqual([
      ['heroi-123456', 'sprite'],
      ['ceu-1234567', 'background'],
      ['nave-1234567', 'model'],
    ])
    const proposal: Pick<PensaProposal, 'dimension' | 'missions'> = {
      dimension: '2d',
      missions: [
        {
          key: 'gato',
          destination: 'studio',
          title: 'Colocar o gato',
          result: 'O gato aparece',
          dependencies: [],
          blockIds: ['sz_g2d_setup_stage'],
          extensionIds: ['game-2d'],
          mechanicIds: ['game-2d'],
          toolIds: [],
          asset: {
            id: 'gato',
            kind: 'sprite',
            source: 'existing',
            creationId: 'heroi-123456',
            description: 'O gato que ela já desenhou',
          },
        },
      ],
    }
    expect(
      validateJourneyProposal(
        proposal,
        context.capabilities,
        context.documents.map((d) => d.extension),
        context.existingCreationIds,
        context.existingCreations,
        context.blocks,
      ),
    ).toEqual([])
  })
})

test('busca e inventário removem dados pessoais sem alterar IDs das criações', async () => {
  const { client, search } = members([
    {
      ...summary('pinta', 'asset-123456789012', 'pixel-sprite'),
      name: 'Meu desenho crianca@example.com',
    },
  ])
  const context = await loadJourneyContext(client, CHILD, 'Gato para crianca@example.com')
  expect(search.mock.calls[0]?.[0]).not.toContain('crianca@example.com')
  const sent = JSON.stringify(
    journeyModelContext(context, { focus: 'gato' }, JOURNEY_PROMPT_LADDER[0]!),
  )
  expect(sent).toContain('asset-123456789012')
  // O nome da criação é redigido na borda (`privateJourneyInput`), não aqui: o teto do pedido
  // inteiro passa por ela (ver pensa-journey-budget.test.ts).
  expect(context.existingCreations[0]?.id).toBe('asset-123456789012')
})

test('o perfil da criança fica no snapshot, mas não no que vai ao modelo (M5)', async () => {
  const { client } = members([])
  const context = await loadJourneyContext(client, CHILD, 'Gato')
  expect(context.capabilities.profileId).toBe(CHILD.id)
  const sent = JSON.stringify(
    journeyModelContext(context, { focus: 'gato' }, JOURNEY_PROMPT_LADDER[0]!),
  )
  expect(sent).not.toContain(CHILD.id)
  expect(sent).not.toContain('profileId')
  expect(sent).not.toContain(context.capabilities.fingerprint)
})
