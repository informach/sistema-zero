import { describe, expect, it } from 'bun:test'
import { creationOriginOf, evidencedOriginOf, personalKindOf } from './creationOrigin'

/**
 * A régua de "quem edita este asset", pura. A ordem importa: `libOrigin` → `origin` do
 * registro pessoal → catálogos → registro pessoal de imagem sem `origin` → só o `kind`
 * 3D cai em Molda. O que o painel PERSISTE (`evidencedOriginOf`) para antes do palpite.
 */
const image = { kind: 'image' as const, libId: 'personal:x' }
const model = { kind: 'model3d' as const, libId: 'personal:m' }

describe('creationOriginOf', () => {
  it('libOrigin é a fonte da verdade, acima de registro e catálogo', () => {
    expect(creationOriginOf({ ...image, libOrigin: 'pinta' }, { origin: 'molda' }, 'molda')).toBe(
      'pinta',
    )
    expect(creationOriginOf({ ...image, libOrigin: 'molda' }, undefined, 'pinta')).toBe('molda')
  })

  it('o origin do registro pessoal vence o catálogo', () => {
    expect(creationOriginOf(image, { origin: 'molda' }, 'pinta')).toBe('molda')
  })

  it('registro pessoal SEM origin + catálogo que diz Molda → Molda (o catálogo vem antes do palpite do registro)', () => {
    expect(creationOriginOf(image, {}, 'molda')).toBe('molda')
    expect(creationOriginOf(image, { origin: undefined }, 'pinta')).toBe('pinta')
  })

  it('registro pessoal de imagem sem origin e sem catálogo → Pinta (o Pinta antigo não gravava o campo)', () => {
    expect(creationOriginOf(image, {}, null)).toBe('pinta')
    expect(creationOriginOf(image, {}, undefined)).toBe('pinta')
  })

  it('imagem sem evidência nenhuma fica ambígua (null), nunca Pinta por palpite', () => {
    expect(creationOriginOf(image, undefined, null)).toBeNull()
    expect(creationOriginOf(image, undefined, undefined)).toBeNull()
  })

  it('só os kinds 3D caem em Molda pelo kind; áudio e asset fora da biblioteca pessoal dão null', () => {
    expect(creationOriginOf(model, undefined, null)).toBe('molda')
    expect(creationOriginOf({ kind: 'environment3d', libId: 'personal:c' }, undefined)).toBe(
      'molda',
    )
    expect(creationOriginOf({ kind: 'audio', libId: 'personal:s' }, undefined)).toBeNull()
    expect(creationOriginOf({ kind: 'image', libId: 'lib-heroi' }, { origin: 'pinta' })).toBeNull()
    expect(creationOriginOf({ kind: 'model3d' }, undefined)).toBeNull()
  })
})

describe('evidencedOriginOf (o que o painel persiste em libOrigin)', () => {
  it('registro pessoal com origin, depois catálogo, depois registro de imagem sem origin', () => {
    expect(evidencedOriginOf(image, { origin: 'molda' }, 'pinta')).toBe('molda')
    expect(evidencedOriginOf(image, undefined, 'pinta')).toBe('pinta')
    expect(evidencedOriginOf(image, {}, 'molda')).toBe('molda')
    expect(evidencedOriginOf(image, {}, null)).toBe('pinta')
  })

  it('NUNCA adivinha pelo kind: 3D sem registro nem catálogo não é evidência', () => {
    expect(evidencedOriginOf(model, undefined, null)).toBeNull()
    expect(evidencedOriginOf(model, {}, null)).toBeNull()
    expect(evidencedOriginOf(image, undefined, null)).toBeNull()
  })
})

describe('personalKindOf', () => {
  it('preserva os kinds 3D e mapeia o resto para imagem (o som nunca chega ao Editar)', () => {
    expect(personalKindOf({ kind: 'model3d' })).toBe('model3d')
    expect(personalKindOf({ kind: 'environment3d' })).toBe('environment3d')
    expect(personalKindOf({ kind: 'image' })).toBe('image')
    expect(personalKindOf({ kind: 'audio' })).toBe('image')
  })
})
