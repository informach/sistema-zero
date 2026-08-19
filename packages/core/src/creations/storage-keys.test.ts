import { describe, expect, test } from 'bun:test'
import { creationPartStorageKey, creationStorageKey } from './storage-keys'

describe('chaves das criações no R2 (compartilhadas entre members e member-shell)', () => {
  test('blob por revisão e parte por hash + revisão de subida, sob o prefixo do perfil', () => {
    expect(creationStorageKey('u1', 'studio', 'jogo', 3)).toBe('creations/u1/studio/jogo/3.json.gz')
    expect(creationPartStorageKey('u1', 'studio', 'jogo', 'a'.repeat(64), 2)).toBe(
      `creations/u1/studio/jogo/parts/${'a'.repeat(64)}.2.gz`,
    )
    // O purge por prefixo do perfil cobre os dois.
    expect(
      creationPartStorageKey('u1', 'pinta', 'd', 'b'.repeat(64), 1).startsWith('creations/u1/'),
    ).toBe(true)
  })
})
