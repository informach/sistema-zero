import { describe, expect, it } from 'bun:test'
import { decideSavedSource, type SavedSourceDecision } from './savedSourceDecision'

/** A conferência de "só a ordem mudou", contando quantas vezes ela roda (o HTML usa o DOMParser). */
function compatibility() {
  let calls = 0
  return {
    calls: () => calls,
    compatible: (saved: string, canonical: string) => {
      calls++
      return [...saved].sort().join('') === [...canonical].sort().join('')
    },
  }
}

describe('manter o arquivo salvo no lugar do gerado pelos blocos', () => {
  it('abrir com o salvo que difere só na ordem mantém o salvo', () => {
    const check = compatibility()
    const decision = decideSavedSource({
      previous: null,
      canonical: 'ab',
      saved: 'ba',
      opening: true,
      compatible: check.compatible,
    })
    expect(decision?.keep).toBe(true)
    expect(check.calls()).toBe(1)
  })

  it('a edição que não muda o gerado reaproveita a decisão, sem conferir de novo', () => {
    const check = compatibility()
    const opened = decideSavedSource({
      previous: null,
      canonical: 'ab',
      saved: 'ba',
      opening: true,
      compatible: check.compatible,
    })
    const edited = decideSavedSource({
      previous: opened,
      canonical: 'ab',
      saved: 'ba',
      opening: false,
      compatible: check.compatible,
    })
    expect(edited).toBe(opened)
    expect(check.calls()).toBe(1)
  })

  it('a edição que muda o gerado só na ordem vale como a criança fez', () => {
    const check = compatibility()
    // O arquivo salvo é o gerado ("ab"); a criança troca dois blocos de lugar e o gerado vira
    // "ba". Antes, a conferência dizia "só a ordem mudou" e o código ficava em "ab".
    const before: SavedSourceDecision = { canonical: 'ab', saved: 'ab', keep: false }
    const reordered = decideSavedSource({
      previous: before,
      canonical: 'ba',
      saved: 'ab',
      opening: false,
      compatible: check.compatible,
    })
    expect(reordered?.keep).toBe(false)
    expect(check.calls()).toBe(0)
  })

  it('o salvo que mudou sem o gerado mudar (o código da Ponte) é conferido de novo', () => {
    const check = compatibility()
    const opened = decideSavedSource({
      previous: null,
      canonical: 'ab',
      saved: 'ab',
      opening: true,
      compatible: check.compatible,
    })
    const typed = decideSavedSource({
      previous: opened,
      canonical: 'ab',
      saved: 'abc',
      opening: false,
      compatible: check.compatible,
    })
    expect(typed?.keep).toBe(false)
    expect(check.calls()).toBe(2)
  })

  it('sem arquivo salvo não há o que manter', () => {
    expect(
      decideSavedSource({
        previous: null,
        canonical: 'ab',
        saved: undefined,
        opening: true,
        compatible: () => true,
      }),
    ).toBeNull()
  })
})
