import { describe, expect, test } from 'bun:test'
import { AVATAR_CATALOG as C, equipPart, withEars } from '@sistemazero/core/avatar'
import { AvatarInvalidError, AvatarPartNotOwnedError } from '../../src/domain/avatar/avatar.errors'
import {
  assertEquippableConfig,
  canonicalizeAvatarConfig,
  defaultAvatarConfig,
} from '../../src/domain/avatar/avatar-config'
import { avatarItem, inventoryIds, needsOwnership } from '../../src/domain/avatar/avatar3d-catalog'

const partes = Object.entries(C.parts)
const umaDa = (filtro: (p: (typeof partes)[number][1]) => boolean) => {
  const achada = partes.find(([, p]) => !p.hidden && !p.retired && filtro(p))
  if (!achada) throw new Error('nenhuma peça')
  return achada[0]
}
const gratisDo = (grupo: string) => umaDa((p) => p.group === grupo && p.tier === 'free')
const pagaDo = (grupo: string) => umaDa((p) => p.group === grupo && p.tier === 'coins')
const base = () =>
  withEars(C, { corpo: C.rules.default.corpo ?? '', rosto: C.rules.default.rosto ?? '' })

describe('avatar do pack: o que se compra', () => {
  test('peça paga, da festa e conjunto precisam de posse; grátis e orelhas não', () => {
    expect(needsOwnership(avatarItem(gratisDo('roupa_cima')) ?? fail())).toBe(false)
    expect(needsOwnership(avatarItem(pagaDo('roupa_cima')) ?? fail())).toBe(true)
    const conjunto = Object.keys(C.sets)[0] ?? ''
    expect(avatarItem(conjunto)?.kind).toBe('set')
    expect(needsOwnership(avatarItem(conjunto) ?? fail())).toBe(true)
    expect(inventoryIds().has(conjunto)).toBe(true)
    expect(inventoryIds().has(gratisDo('calca'))).toBe(false)
    expect(avatarItem('nao-existe')).toBeNull()
  })
})

describe('avatar do pack: leitura tolerante', () => {
  test('o avatar antigo (versão 2), o legado, null e lixo viram o sorteado do perfil', () => {
    const sorteado = defaultAvatarConfig('perfil-1')
    expect(sorteado.version).toBe(3)
    expect(sorteado.customized).toBeUndefined()
    for (const cru of [
      null,
      { version: 2, style: 'char-v1', slots: { head: { asset: 'head-01', color: '#ecad80' } } },
      { style: 'adventurer', parts: {} },
      'lixo',
      { version: 3, slots: { corpo: 'nao_existe' } },
    ])
      expect(canonicalizeAvatarConfig(cru, 'perfil-1')).toEqual(sorteado)
  })

  test('o mesmo perfil vê sempre o mesmo sorteado; outro perfil, outro', () => {
    expect(defaultAvatarConfig('a')).toEqual(defaultAvatarConfig('a'))
    const varios = new Set(
      Array.from({ length: 20 }, (_, i) => JSON.stringify(defaultAvatarConfig(`p${i}`))),
    )
    expect(varios.size).toBeGreaterThan(15)
  })

  test('a versão 3 válida fica como está, com filtro e personalização', () => {
    const slots = equipPart(C, base(), gratisDo('roupa_cima'))
    const lido = canonicalizeAvatarConfig(
      { version: 3, style: 'cute-v1', slots, filter: 'girl', customized: true },
      'x',
    )
    expect(lido.slots).toEqual(slots)
    expect(lido.filter).toBe('girl')
    expect(lido.customized).toBe(true)
  })

  test('as orelhas são completadas pela cor do corpo', () => {
    const { orelhas: _sem, ...semOrelhas } = base()
    expect(canonicalizeAvatarConfig({ version: 3, slots: semOrelhas }, 'x').slots.orelhas).toBe(
      base().orelhas,
    )
  })
})

describe('avatar do pack: escrita estrita', () => {
  test('aceita peças grátis sem inventário', () => {
    const slots = equipPart(C, base(), gratisDo('roupa_cima'))
    expect(() => assertEquippableConfig({ slots }, new Set())).not.toThrow()
  })

  test('peça paga sem posse → 403; com posse → ok', () => {
    const paga = pagaDo('roupa_cima')
    const slots = equipPart(C, base(), paga)
    expect(() => assertEquippableConfig({ slots }, new Set())).toThrow(AvatarPartNotOwnedError)
    expect(() => assertEquippableConfig({ slots }, new Set([paga]))).not.toThrow()
  })

  test('fantasia exige o CONJUNTO no inventário, não as partes', () => {
    const [setId, conjunto] = Object.entries(C.sets)[0] ?? []
    if (!setId || !conjunto) throw new Error('sem fantasia')
    const slots = equipPart(C, base(), conjunto.parts[0]?.part ?? '')
    const partes = new Set(conjunto.parts.map((p) => p.part))
    expect(() => assertEquippableConfig({ slots }, partes)).toThrow(AvatarPartNotOwnedError)
    expect(() => assertEquippableConfig({ slots }, new Set([setId]))).not.toThrow()
  })

  test('o que não combina, peça desconhecida, encaixe errado e filtro estranho → 400', () => {
    const errados = [
      { ...base(), roupa_inteira: gratisDo('roupa_inteira'), calca: gratisDo('calca') },
      { ...base(), cabelo: 'nao_existe' },
      { ...base(), calca: gratisDo('roupa_cima') },
    ]
    for (const slots of errados)
      expect(() => assertEquippableConfig({ slots }, new Set())).toThrow(AvatarInvalidError)
    expect(() =>
      assertEquippableConfig({ slots: base(), filter: 'outro' as never }, new Set()),
    ).toThrow(AvatarInvalidError)
  })

  test('sem corpo ou sem rosto → 400', () => {
    const { rosto: _r, ...semRosto } = base()
    expect(() => assertEquippableConfig({ slots: semRosto }, new Set())).toThrow(AvatarInvalidError)
  })
})

function fail(): never {
  throw new Error('item ausente')
}
