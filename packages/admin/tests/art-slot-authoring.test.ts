import { describe, expect, test } from 'bun:test'
import {
  lessonArtSlots,
  lessonGameImageNames,
  normalizeArtSlotName,
  studioArtSlotsFormIssue,
  suggestArtSlotName,
} from '../src/lib/art-slot-authoring'

describe('autoria das vagas de arte', () => {
  test('o nome digitado vira nome de imagem do Estúdio', () => {
    expect(normalizeArtSlotName('  Minha Chave Dourada! ')).toBe('minha-chave-dourada')
    expect(normalizeArtSlotName('Coração Ágil')).toBe('coracao-agil')
    expect(normalizeArtSlotName('---')).toBe('')
    expect(normalizeArtSlotName('a'.repeat(60))).toHaveLength(48)
  })

  test('a sugestão sai da imagem que a criança vai redesenhar', () => {
    expect(suggestArtSlotName('chave-dourada')).toBe('minha-chave')
    expect(suggestArtSlotName('farol-listrado-aceso')).toBe('meu-farol')
    expect(suggestArtSlotName('veleiro')).toBe('meu-veleiro')
    expect(suggestArtSlotName('')).toBe('')
  })

  test('as imagens dos jogos e as vagas desta aula vêm do rascunho', () => {
    const blocks = [
      {
        id: 's',
        content: {
          kind: 'studio',
          initialProject: {
            assets: [
              { name: 'veleiro', kind: 'image' },
              { name: 'musica', kind: 'audio' },
              { name: 'chave-dourada', kind: 'image' },
            ],
          },
        },
      },
      {
        id: 'p1',
        content: { kind: 'pinta', artSlot: { name: 'minha-chave', replaces: 'chave-dourada' } },
      },
      { id: 'p2', content: { kind: 'pinta', artSlot: { name: 'Nome Ruim' } } },
      { id: 'p3', content: { kind: 'pinta' } },
    ]
    expect(lessonGameImageNames(blocks)).toEqual(['chave-dourada', 'veleiro'])
    expect(lessonArtSlots(blocks)).toEqual([{ name: 'minha-chave', replaces: 'chave-dourada' }])
    expect(lessonArtSlots(blocks, 'p1')).toEqual([])
  })

  test('as vagas do Estúdio: nome válido, sem repetir, até 8', () => {
    expect(studioArtSlotsFormIssue([{ name: 'minha-chave', mode: 'add' }])).toBeNull()
    expect(studioArtSlotsFormIssue([{ name: 'Minha', mode: 'add' }])).toContain('não é um nome')
    expect(
      studioArtSlotsFormIssue([
        { name: 'x', mode: 'add' },
        { name: 'x', mode: 'replace' },
      ]),
    ).toContain('duas vezes')
    expect(
      studioArtSlotsFormIssue(
        Array.from({ length: 9 }, (_, i) => ({ name: `v${i}`, mode: 'add' as const })),
      ),
    ).toContain('no máximo 8')
  })
})
