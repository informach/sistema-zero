/**
 * Vaga de arte nos blocos de Estúdio e de Pinta (29/10/2026): a coerência da autoria e o que a
 * criança recebe. O desenho em si nunca viaja na configuração do bloco, só os nomes.
 */
import { describe, expect, it } from 'bun:test'
import { assertBlockCoherent } from '../../src/application/content-admin/content-admin.service'
import { type StudioBlock, toMemberFacingStudioContent } from '../../src/domain/course/lesson-block'

const studio = (extra: Partial<StudioBlock>): StudioBlock => ({
  kind: 'studio',
  initialProject: { formatVersion: 2, name: 'p', files: { 'index.html': '' } },
  ...extra,
})

describe('bloco de Estúdio que importa vagas de arte', () => {
  it('recusa lista repetida, modo desconhecido e lista vazia antes de olhar o projeto', () => {
    for (const artSlots of [
      [
        { name: 'minha-chave', mode: 'add' },
        { name: 'minha-chave', mode: 'replace' },
      ],
      [{ name: 'minha-chave', mode: 'trocar' }],
      [],
    ]) {
      expect(
        () => assertBlockCoherent(studio({ artSlots } as Partial<StudioBlock>)),
        JSON.stringify(artSlots),
      ).toThrow()
    }
  })

  it('recusa vaga de arte com entrega pela galeria', () => {
    expect(() =>
      assertBlockCoherent(
        studio({
          artSlots: [{ name: 'minha-chave', mode: 'add' }],
          gallery: { minItems: 1, maxItems: 1 },
        }),
      ),
    ).toThrow('vagas de arte')
  })

  it('a criança recebe os nomes e os modos, copiados', () => {
    const artSlots: StudioBlock['artSlots'] = [{ name: 'minha-chave', mode: 'add' }]
    const view = toMemberFacingStudioContent(studio({ artSlots }))
    expect(view.artSlots).toEqual([{ name: 'minha-chave', mode: 'add' }])
    expect(view.artSlots).not.toBe(artSlots)
    expect('artSlots' in toMemberFacingStudioContent(studio({}))).toBe(false)
  })
})
