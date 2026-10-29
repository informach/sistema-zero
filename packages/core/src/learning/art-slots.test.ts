import { describe, expect, it } from 'bun:test'
import {
  ART_SLOT_NAME_MAX_CHARS,
  isArtSlotName,
  MAX_STUDIO_ART_SLOTS,
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
