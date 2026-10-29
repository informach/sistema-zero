import { describe, expect, it } from 'bun:test'
import {
  ART_SLOT_NAME_MAX_CHARS,
  type ArtSlotCourseBlock,
  artSlotCourseIssues,
  isArtSlotName,
  MAX_STUDIO_ART_SLOTS,
  newArtSlotCourseIssues,
  pintaArtSlotIssue,
  studioArtSlotsIssue,
} from './art-slots'

describe('vaga de arte: o nome', () => {
  it('tem a forma de um nome de imagem do Estúdio', () => {
    for (const ok of ['minha-chave', 'meu-personagem', 'chave2', 'a'])
      expect(isArtSlotName(ok), ok).toBe(true)
    for (const ruim of ['', 'Minha-Chave', '-chave', 'minha chave', 'chave_dourada', 'ç', 42, null])
      expect(isArtSlotName(ruim), String(ruim)).toBe(false)
    expect(isArtSlotName('a'.repeat(ART_SLOT_NAME_MAX_CHARS))).toBe(true)
    expect(isArtSlotName('a'.repeat(ART_SLOT_NAME_MAX_CHARS + 1))).toBe(false)
  })
})

describe('vaga de arte do bloco de Pinta', () => {
  it('aceita a vaga com e sem a imagem substituída, e a ausência dela', () => {
    expect(pintaArtSlotIssue(undefined)).toBeNull()
    expect(pintaArtSlotIssue({ name: 'minha-chave' })).toBeNull()
    expect(pintaArtSlotIssue({ name: 'minha-chave', replaces: 'chave-dourada' })).toBeNull()
  })

  it('recusa nome, imagem substituída e campo a mais fora da régua', () => {
    expect(pintaArtSlotIssue({ name: 'Minha Chave' })).toContain('letras minúsculas')
    expect(pintaArtSlotIssue({ name: 'minha-chave', replaces: 'Chave Dourada' })).toContain(
      'nome de imagem',
    )
    expect(pintaArtSlotIssue({ name: 'minha-chave', modo: 'x' })).not.toBeNull()
    expect(pintaArtSlotIssue('minha-chave')).not.toBeNull()
  })
})

describe('vagas importadas pelo bloco de Estúdio', () => {
  it('aceita os dois modos e a ausência', () => {
    expect(studioArtSlotsIssue(undefined)).toBeNull()
    expect(
      studioArtSlotsIssue([
        { name: 'minha-chave', mode: 'add' },
        { name: 'meu-farol', mode: 'replace' },
      ]),
    ).toBeNull()
  })

  it('recusa lista vazia, longa demais, repetida, modo desconhecido e campo a mais', () => {
    expect(studioArtSlotsIssue([])).not.toBeNull()
    expect(
      studioArtSlotsIssue(
        Array.from({ length: MAX_STUDIO_ART_SLOTS + 1 }, (_, i) => ({
          name: `vaga-${i}`,
          mode: 'add',
        })),
      ),
    ).not.toBeNull()
    expect(
      studioArtSlotsIssue([
        { name: 'minha-chave', mode: 'add' },
        { name: 'minha-chave', mode: 'replace' },
      ]),
    ).toContain('duas vezes')
    expect(studioArtSlotsIssue([{ name: 'minha-chave', mode: 'trocar' }])).toContain('minha-chave')
    expect(studioArtSlotsIssue([{ name: 'minha-chave', mode: 'add', extra: 1 }])).not.toBeNull()
  })
})

const desenho = (
  blockId: string,
  order: number[],
  slot: { name: string; replaces?: string },
  lessonTitle = `Aula ${blockId}`,
): ArtSlotCourseBlock => ({
  kind: 'pinta',
  blockId,
  lessonId: `l-${blockId}`,
  lessonTitle,
  order,
  slot,
})
const jogo = (
  blockId: string,
  order: number[],
  slots: { name: string; mode: 'add' | 'replace' }[],
  imageNames = ['chave-dourada', 'farol'],
  lessonTitle = `Aula ${blockId}`,
): ArtSlotCourseBlock => ({
  kind: 'studio',
  blockId,
  lessonId: `l-${blockId}`,
  lessonTitle,
  order,
  slots,
  imageNames,
})
const chaves = (blocks: ArtSlotCourseBlock[]) => artSlotCourseIssues(blocks).map((i) => i.key)

describe('vagas de arte no curso', () => {
  it('o curso do extra passa: desenho antes do jogo, nos dois modos', () => {
    expect(
      chaves([
        desenho('p', [0, 0, 1, 0], { name: 'minha-chave', replaces: 'chave-dourada' }),
        jogo('s', [0, 0, 2, 0], [{ name: 'minha-chave', mode: 'add' }]),
        jogo('t', [0, 1, 0, 0], [{ name: 'minha-chave', mode: 'replace' }]),
      ]),
    ).toEqual([])
  })

  it('recusa duas vagas com o mesmo nome, nomeando as aulas em ordem de curso', () => {
    const issues = artSlotCourseIssues([
      desenho('b', [0, 2], { name: 'minha-chave' }, 'Segunda'),
      desenho('a', [0, 1], { name: 'minha-chave' }, 'Primeira'),
    ])
    expect(issues.map((i) => i.key)).toEqual(['duplicate:minha-chave:a', 'duplicate:minha-chave:b'])
    expect(issues[0]?.message).toContain('"Primeira" e "Segunda"')
  })

  it('recusa o jogo que importa uma vaga que ninguém preenche', () => {
    expect(chaves([jogo('s', [0, 1], [{ name: 'meu-farol', mode: 'add' }])])).toEqual([
      'missing:s:meu-farol',
    ])
  })

  it('recusa a vaga preenchida só depois do jogo, também dentro da mesma aula', () => {
    expect(
      chaves([
        desenho('p', [0, 0, 3, 0], { name: 'minha-chave' }),
        jogo('s', [0, 0, 2, 5], [{ name: 'minha-chave', mode: 'add' }]),
      ]),
    ).toEqual(['order:s:minha-chave'])
  })

  it('no modo trocar, exige a imagem substituída e que ela exista no jogo', () => {
    expect(
      chaves([
        desenho('p', [0, 1], { name: 'minha-chave' }),
        jogo('s', [0, 2], [{ name: 'minha-chave', mode: 'replace' }]),
      ]),
    ).toEqual(['replace-missing:s:minha-chave'])
    expect(
      chaves([
        desenho('p', [0, 1], { name: 'minha-chave', replaces: 'chave-de-ouro' }),
        jogo('s', [0, 2], [{ name: 'minha-chave', mode: 'replace' }]),
      ]),
    ).toEqual(['replace-unknown:s:minha-chave:chave-de-ouro'])
  })

  it('no modo materiais, recusa o nome que já é imagem do jogo', () => {
    expect(
      chaves([
        desenho('p', [0, 1], { name: 'farol' }),
        jogo('s', [0, 2], [{ name: 'farol', mode: 'add' }]),
      ]),
    ).toEqual(['add-collision:s:farol'])
  })

  it('a comparação de antes e depois só aponta o que a gravação criou', () => {
    const antes = artSlotCourseIssues([
      desenho('a', [0, 1], { name: 'x' }),
      desenho('b', [0, 2], { name: 'x' }),
    ])
    const depois = artSlotCourseIssues([
      desenho('a', [0, 1], { name: 'x' }),
      desenho('b', [0, 2], { name: 'x' }),
      desenho('c', [0, 3], { name: 'x' }),
    ])
    expect(newArtSlotCourseIssues(antes, depois).map((i) => i.key)).toEqual(['duplicate:x:c'])
    expect(newArtSlotCourseIssues(depois, antes)).toEqual([])
  })

  it('reordenar vagas repetidas que já existiam não cria problema novo', () => {
    // Review de 29/10/2026: a chave levava o id do bloco que ficava em segundo, e trocar a
    // ordem das aulas virava um 409 para quem estava justamente consertando a repetição.
    const jogoDaVaga = jogo('s', [0, 3], [{ name: 'x', mode: 'replace' }])
    const antes = artSlotCourseIssues([
      desenho('a', [0, 1], { name: 'x' }),
      desenho('b', [0, 2], { name: 'x', replaces: 'farol' }),
      jogoDaVaga,
    ])
    const depois = artSlotCourseIssues([
      desenho('a', [0, 2], { name: 'x' }),
      desenho('b', [0, 1], { name: 'x', replaces: 'farol' }),
      jogoDaVaga,
    ])
    expect(antes.length).toBeGreaterThan(0)
    expect(newArtSlotCourseIssues(antes, depois)).toEqual([])
  })

  it('recusa o jogo publicado cuja vaga só é preenchida em aula não publicada', () => {
    const naoPublicado = { ...desenho('p', [0, 1], { name: 'minha-chave' }), published: false }
    const issues = artSlotCourseIssues([
      naoPublicado,
      jogo('s', [0, 2], [{ name: 'minha-chave', mode: 'add' }]),
    ])
    expect(issues.map((i) => i.key)).toEqual(['unpublished:s:minha-chave'])
    expect(issues[0]?.message).toContain('não está publicada')
    // O jogo ainda em rascunho não acusa: o curso está sendo montado.
    expect(
      chaves([
        naoPublicado,
        { ...jogo('s', [0, 2], [{ name: 'minha-chave', mode: 'add' }]), published: false },
      ]),
    ).toEqual([])
    // Um desenho publicado da vaga basta.
    expect(
      chaves([
        naoPublicado,
        desenho('q', [0, 1, 1], { name: 'minha-chave' }),
        jogo('s', [0, 2], [{ name: 'minha-chave', mode: 'add' }]),
      ]),
    ).toEqual(['duplicate:minha-chave:p', 'duplicate:minha-chave:q'])
  })
})
