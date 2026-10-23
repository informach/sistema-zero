import { describe, expect, test } from 'bun:test'
import { creationPartStorageKey, creationStorageKey } from './storage-keys'
import { creativeToolAccessRef } from './tool-access'

describe('chaves das criações no R2 (compartilhadas entre members e member-shell)', () => {
  test('adulto isola blobs e licenças; referências Kids permanecem iguais', () => {
    expect(creationStorageKey('u1', 'studio', 'jogo', 3, 'adult')).toBe(
      'creations/adult/u1/studio/jogo/3.json.gz',
    )
    expect(creationPartStorageKey('u1', 'studio', 'jogo', 'a'.repeat(64), 2, 'adult')).toBe(
      `creations/adult/u1/studio/jogo/parts/${'a'.repeat(64)}.2.gz`,
    )
    for (const ref of ['estudio-completo', 'pinta', 'molda', 'pensa']) {
      expect(creativeToolAccessRef(ref, 'adult')).toBe(`adult-${ref}`)
      expect(creativeToolAccessRef(ref, 'kids')).toBe(ref)
    }
    expect(creativeToolAccessRef('curso-demo', 'adult')).toBe('curso-demo')
  })
  test('blob por revisão e parte por hash + revisão de subida, sob o prefixo do perfil', () => {
    expect(creationStorageKey('u1', 'studio', 'jogo', 3)).toBe('creations/u1/studio/jogo/3.json.gz')
    expect(creationPartStorageKey('u1', 'studio', 'jogo', 'a'.repeat(64), 2)).toBe(
      `creations/u1/studio/jogo/parts/${'a'.repeat(64)}.2.gz`,
    )
    // O purge por prefixo do perfil cobre os dois.
    expect(
      creationPartStorageKey('u1', 'pinta', 'd', 'b'.repeat(64), 1).startsWith('creations/u1/'),
    ).toBe(true)
    // O Molda (oficina 3D) é a terceira ferramenta, no mesmo layout.
    expect(creationStorageKey('u1', 'molda', 'casa', 1)).toBe('creations/u1/molda/casa/1.json.gz')
  })
})
