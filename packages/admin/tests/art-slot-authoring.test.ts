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

describe('a vaga no formulário do bloco de Pinta (review de 29/10/2026)', () => {
  test('nome fora da régua avisa em vez de sumir do bloco salvo', async () => {
    const { EMPTY_BLOCK, validateBlock } = await import('../src/lib/lesson-block-form')
    const pinta = { ...EMPTY_BLOCK, kind: 'pinta' as const }
    expect(validateBlock({ ...pinta, pintaArtSlotName: 'minha-chave' } as never)).toBeNull()
    expect(validateBlock({ ...pinta, pintaArtSlotName: 'Minha Chave' } as never)).toContain(
      'letras minúsculas',
    )
    expect(
      validateBlock({
        ...pinta,
        pintaArtSlotName: 'minha-chave',
        pintaArtSlotReplaces: 'Chave Dourada',
      } as never),
    ).toContain('nome de imagem')
    expect(validateBlock({ ...pinta, pintaArtSlotReplaces: 'chave-dourada' } as never)).toContain(
      'Dê um nome',
    )
  })

  test('no modo exploração os campos somem e não prendem o salvar', async () => {
    const { EMPTY_BLOCK, validateBlock } = await import('../src/lib/lesson-block-form')
    expect(
      validateBlock({
        ...EMPTY_BLOCK,
        kind: 'pinta',
        toolPurpose: 'experiment',
        pintaArtSlotReplaces: 'chave-dourada',
      } as never),
    ).toBeNull()
  })

  test('nome de imagem válido do Estúdio passa intacto pela régua do Admin', async () => {
    // A vaga VIRA o nome da imagem e o `replaces` aponta uma imagem do jogo: a régua do Admin não
    // pode mudar um nome que o Estúdio já aceita (o Estúdio normaliza do mesmo jeito ao carregar).
    const { normalizeAssetName } = await import('../../studio/src/core/projectAssets')
    for (const entrada of [
      'chave-dourada',
      'Minha Chave',
      'Coração Ágil',
      'farol_listrado aceso',
      'a1-b2',
      'x'.repeat(48),
    ]) {
      const doEstudio = normalizeAssetName(entrada)
      if (doEstudio === null) continue
      expect(normalizeArtSlotName(doEstudio), entrada).toBe(doEstudio)
      expect(normalizeArtSlotName(entrada), entrada).toBe(doEstudio)
    }
  })
})
