import { describe, expect, test } from 'bun:test'
import { AVATAR_CATALOG as C, equipPart, ownershipOf, withEars } from '@sistemazero/core/avatar'
import { EquipAvatarService } from '../../src/application/avatar/equip-avatar.service'
import { AvatarInvalidError, AvatarPartNotOwnedError } from '../../src/domain/avatar/avatar.errors'
import {
  assertEquippableConfig,
  canonicalizeAvatarConfig,
  defaultAvatarConfig,
} from '../../src/domain/avatar/avatar-config'
import { avatarItem, inventoryIds, isOffShelf } from '../../src/domain/avatar/avatar3d-catalog'

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
    expect(ownershipOf(C, gratisDo('roupa_cima'))).toBeNull()
    expect(ownershipOf(C, pagaDo('roupa_cima'))).toBe(pagaDo('roupa_cima'))
    const conjunto = Object.keys(C.sets)[0] ?? ''
    expect(avatarItem(conjunto)?.kind).toBe('set')
    expect(avatarItem(conjunto) ?? fail()).toMatchObject({ kind: 'set' })
    expect(isOffShelf(gratisDo('roupa_cima'), 'kids')).toBe(false)
    // O chapéu de cerveja é só do adulto: no Kids não se compra.
    expect(isOffShelf('chapeu_cerveja_pacote', 'kids')).toBe(true)
    expect(isOffShelf('chapeu_cerveja_pacote', 'adult')).toBe(false)
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

  test('quem vestia a fantasia de cavaleiro com o elmo antigo continua de cavaleiro, com o elmo novo', () => {
    const conjunto = C.sets.fantasia_cavaleiro
    if (!conjunto) throw new Error('sem a fantasia de cavaleiro')
    const vestida = { ...base() } as Record<string, string>
    for (const { slot, part } of conjunto.parts) vestida[slot] = part
    vestida.chapeu = 'fantasia_cavaleiro_elmo_chifres_pacote'
    const lido = canonicalizeAvatarConfig(
      { version: 3, style: 'cute-v1', slots: vestida, customized: true },
      'x',
    )
    expect(lido.customized).toBe(true)
    expect(lido.slots.chapeu).toBe('chapeu_elmo_cavaleiro__na_fantasia_cavaleiro')
    expect(lido.slots.fantasia).toBe(vestida.fantasia ?? '')
  })
})

describe('avatar do pack: gravar com a parte antiga da fantasia', () => {
  test('a tela que ainda manda o elmo antigo grava a fantasia com o elmo novo (sem 400)', async () => {
    const conjunto = C.sets.fantasia_cavaleiro
    if (!conjunto) throw new Error('sem a fantasia de cavaleiro')
    const vestida = { ...base() } as Record<string, string>
    for (const { slot, part } of conjunto.parts) vestida[slot] = part
    vestida.chapeu = 'fantasia_cavaleiro_elmo_chifres_pacote'
    let gravado: unknown = null
    const repo = {
      getConfig: async () => null,
      listInventory: async () => ['fantasia_cavaleiro'],
      upsertConfig: async (_u: string, _a: string, _au: string, config: unknown) => {
        gravado = config
      },
    } as unknown as ConstructorParameters<typeof EquipAvatarService>[0]
    const config = await new EquipAvatarService(repo, () => new Date()).execute('u', 'a', 'kids', {
      slots: vestida,
    })
    expect(config.slots.chapeu).toBe('chapeu_elmo_cavaleiro__na_fantasia_cavaleiro')
    expect((gravado as { slots: Record<string, string> }).slots.chapeu).toBe(config.slots.chapeu)
  })

  test('a fantasia pela metade continua recusada (o servidor não completa sozinho)', async () => {
    const conjunto = C.sets.fantasia_cavaleiro
    const parte = conjunto?.parts.find((p) => p.slot !== 'chapeu')
    if (!parte) throw new Error('sem a fantasia de cavaleiro')
    const repo = {
      getConfig: async () => null,
      listInventory: async () => ['fantasia_cavaleiro'],
      upsertConfig: async () => {},
    } as unknown as ConstructorParameters<typeof EquipAvatarService>[0]
    await expect(
      new EquipAvatarService(repo, () => new Date()).execute('u', 'a', 'kids', {
        slots: { ...base(), [parte.slot]: parte.part },
      }),
    ).rejects.toThrow(AvatarInvalidError)
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

// 26/11/2026: o avatar GUARDADO com uma peça paga fora do inventário (era grátis quando foi gravada,
// ou veio na troca de avatar) não pode travar as mudanças do resto; tirada, volta a ser cobrada.
describe('avatar do pack: a peça paga que já estava no avatar guardado', () => {
  const chapeu = pagaDo('chapeu')
  const guardado = () =>
    canonicalizeAvatarConfig(
      { version: 3, style: 'cute-v1', slots: equipPart(C, base(), chapeu) },
      'u',
    )
  const repo = (config: unknown) =>
    ({
      getConfig: async () => config,
      listInventory: async () => [],
      upsertConfig: async () => {},
    }) as unknown as ConstructorParameters<typeof EquipAvatarService>[0]

  test('mudar outra peça mantendo a peça guardada grava', async () => {
    const atual = guardado()
    const config = await new EquipAvatarService(repo(atual), () => new Date()).execute(
      'u',
      'a',
      'kids',
      { slots: equipPart(C, atual.slots, gratisDo('calcado')) },
    )
    expect(config.slots.chapeu).toBe(chapeu)
  })

  test('sem a peça no avatar guardado, ela continua cobrada', async () => {
    const semChapeu = canonicalizeAvatarConfig({ version: 3, style: 'cute-v1', slots: base() }, 'u')
    await expect(
      new EquipAvatarService(repo(semChapeu), () => new Date()).execute('u', 'a', 'kids', {
        slots: equipPart(C, semChapeu.slots, chapeu),
      }),
    ).rejects.toThrow(AvatarPartNotOwnedError)
    expect(ownershipOf(C, chapeu)).toBe(chapeu)
  })
})

describe('avatar do pack: o enquadramento da Cabine de fotos', () => {
  const repo = (config: unknown, gravar?: (c: unknown) => void) =>
    ({
      getConfig: async () => config,
      listInventory: async () => [],
      upsertConfig: async (_u: string, _a: string, _au: string, c: unknown) => gravar?.(c),
    }) as unknown as ConstructorParameters<typeof EquipAvatarService>[0]

  test('grava a escolha e a mantém quando o pedido não a traz', async () => {
    let gravado: { photoFraming?: string } | null = null
    const svc = () =>
      new EquipAvatarService(
        repo(gravado, (c) => (gravado = c as never)),
        () => new Date(),
      )
    await svc().execute('u', 'a', 'kids', { slots: base(), framing: 'body' })
    expect(gravado?.photoFraming).toBe('body')
    await svc().execute('u', 'a', 'kids', { slots: base() })
    expect(gravado?.photoFraming).toBe('body')
    await svc().execute('u', 'a', 'kids', { slots: base(), framing: 'face' })
    expect(gravado?.photoFraming).toBe('face')
  })

  test('a leitura guarda a escolha válida e ignora lixo', () => {
    const ok = canonicalizeAvatarConfig(
      { version: 3, style: 'cute-v1', slots: base(), photoFraming: 'face' },
      'u',
    )
    expect(ok.photoFraming).toBe('face')
    const lixo = canonicalizeAvatarConfig(
      { version: 3, style: 'cute-v1', slots: base(), photoFraming: 'perto' },
      'u',
    )
    expect(lixo.photoFraming).toBeUndefined()
  })
})
