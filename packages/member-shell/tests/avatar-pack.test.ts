import { describe, expect, test } from 'bun:test'
import { avatarProblems, AVATAR_CATALOG as C, equipPart, withEars } from '@sistemazero/core/avatar'
import {
  AVATAR_POSES,
  AVATAR_TAB_GROUPS,
  AVATAR_TABS,
  type AvatarShopItem,
  applyAvatarItem,
  avatarKindOfWorn,
  avatarKinds,
  avatarPoses,
  avatarRemovedBy,
  avatarShopItems,
  avatarTab,
  avatarTabGroupOf,
  avatarUnownedWorn,
  isAvatarItemOwned,
  isAvatarItemWorn,
  visibleAvatarKinds,
} from '../src/lib/avatar-pack'

/**
 * A loja do "Meu avatar" com o pack: as abas, os tipos, o filtro, as regras à vista e o que fica
 * só de prévia. Tudo contra o catálogo de verdade (peça nova da arte não pode sumir da loja).
 */

const base = () =>
  withEars(C, { corpo: C.rules.default.corpo ?? '', rosto: C.rules.default.rosto ?? '' })
const nenhum = new Set<string>()
const peca = (id: string): AvatarShopItem => {
  const p = C.parts[id]
  if (!p) throw new Error(`sem peça ${id}`)
  return {
    id,
    kind: 'part',
    label: p.label,
    thumb: p.thumb,
    tier: p.tier,
    price: p.price,
    owned: isAvatarItemOwned(C, id, nenhum),
  }
}
const daAba = (tab: string, grupo: string, filtro: (id: string) => boolean = () => true) => {
  const id = C.rules.groups[grupo]?.parts.find(filtro)
  if (!id) throw new Error(`sem peça em ${grupo}`)
  return { tab: avatarTab(tab as never), item: peca(id) }
}

describe('as abas', () => {
  test('todo grupo do pack (menos as orelhas, que entram sozinhas) está em exatamente uma aba', () => {
    const nasAbas = AVATAR_TABS.flatMap((t) => t.groups)
    const doPack = Object.keys(C.rules.groups).filter((g) => g !== 'orelhas')
    expect([...nasAbas].sort()).toEqual([...doPack].sort())
    expect(new Set(nasAbas).size).toBe(nasAbas.length)
  })

  test('o "Nenhum" esvazia encaixes de verdade; corpo e rosto não têm "Nenhum"', () => {
    const encaixes = new Set(C.rules.slots.map((s) => s.id))
    for (const tab of AVATAR_TABS) for (const s of tab.removable) expect(encaixes.has(s)).toBe(true)
    expect(avatarTab('corpo').removable).toEqual([])
    expect(avatarTab('rosto').removable).toEqual([])
  })

  test('o grupo de cada aba é o que a contém', () => {
    expect(avatarTabGroupOf('cabelo').id).toBe('cabeca')
    expect(avatarTabGroupOf('fantasia').id).toBe('roupa')
    expect(avatarTabGroupOf('corpo').id).toBe('voce')
    expect(AVATAR_TAB_GROUPS.map((g) => g.label)).toEqual(['Você', 'Cabeça', 'Roupa'])
  })
})

describe('os tipos dentro da aba', () => {
  test('o chapéu se divide pelos grupos do pack', () => {
    expect(avatarKinds(C, avatarTab('chapeu')).map((k) => k.label)).toEqual([
      'Chapéu',
      'Tiara e enfeite',
      'Capuz e capacete',
    ])
  })

  test('a blusa se divide pelo nome, e toda peça cai em algum tipo', () => {
    const tipos = avatarKinds(C, avatarTab('roupa_cima'))
    expect(tipos.slice(0, 4).map((k) => k.label)).toEqual([
      'Camiseta',
      'Camisa',
      'Jaqueta e moletom',
      'Colete',
    ])
    const todas = C.rules.groups.roupa_cima?.parts ?? []
    expect(tipos.flatMap((k) => k.ids).sort()).toEqual([...todas].sort())
    // "camisa" não pega "camiseta".
    const camisa = tipos.find((k) => k.id === 'camisa')
    expect(camisa?.ids.every((id) => !id.includes('camiseta'))).toBe(true)
  })

  test('o rosto se divide pelo desenho; com o filtro, só os desenhos dele, numerados de novo', () => {
    const tab = avatarTab('rosto')
    const todos = avatarKinds(C, tab)
    expect(todos.length).toBe(Object.keys(C.rules.faces).length)
    const menino = visibleAvatarKinds(C, tab, todos, 'boy', nenhum, base())
    expect(menino.map((k) => k.label)).toEqual(['Rosto 1', 'Rosto 2'])
    for (const k of menino) for (const id of k.ids) expect(C.parts[id]?.audience).not.toBe('girl')
  })

  test('a aba abre no tipo da peça vestida', () => {
    const tab = avatarTab('chapeu')
    const kinds = avatarKinds(C, tab)
    const capuz = C.rules.groups.capuz?.parts[0] ?? ''
    expect(avatarKindOfWorn(kinds, tab, equipPart(C, base(), capuz))).toBe('capuz')
    expect(avatarKindOfWorn(kinds, tab, base())).toBe('chapeu')
  })
})

describe('a grade', () => {
  test('o filtro esconde as peças do outro, mas nunca a que está vestida', () => {
    const tab = avatarTab('cabelo')
    const [kind] = avatarKinds(C, tab)
    if (!kind) throw new Error('sem tipo')
    const deMenina = kind.ids.find((id) => C.parts[id]?.audience === 'girl') ?? ''
    const menino = avatarShopItems(C, tab, kind, 'boy', nenhum, base())
    expect(menino.some((i) => i.id === deMenina)).toBe(false)
    const vestido = avatarShopItems(C, tab, kind, 'boy', nenhum, equipPart(C, base(), deMenina))
    expect(vestido.some((i) => i.id === deMenina)).toBe(true)
  })

  test('a peça só do adulto (o chapéu de cerveja) some da loja do Kids e fica na adulta', () => {
    const tab = avatarTab('chapeu')
    const kind = avatarKinds(C, tab).find((k) => k.ids.includes('chapeu_cerveja_pacote'))
    if (!kind) throw new Error('sem o tipo do chapéu de cerveja')
    const ids = (community?: 'kids' | 'adult') =>
      avatarShopItems(C, tab, kind, 'all', nenhum, base(), community).map((i) => i.id)
    expect(ids()).not.toContain('chapeu_cerveja_pacote')
    expect(ids('kids')).not.toContain('chapeu_cerveja_pacote')
    expect(ids('adult')).toContain('chapeu_cerveja_pacote')
  })

  test('"Nenhum" primeiro, depois as grátis, depois as pagas da mais barata para a mais cara', () => {
    const tab = avatarTab('chapeu')
    const [kind] = avatarKinds(C, tab)
    if (!kind) throw new Error('sem tipo')
    const itens = avatarShopItems(C, tab, kind, 'all', nenhum, base())
    expect(itens[0]?.kind).toBe('none')
    const resto = itens.slice(1)
    const primeiraPaga = resto.findIndex((i) => !i.owned)
    expect(resto.slice(0, primeiraPaga).every((i) => i.owned)).toBe(true)
    const precos = resto.slice(primeiraPaga).map((i) => i.price)
    expect(precos).toEqual([...precos].sort((a, b) => a - b))
  })

  test('a fantasia aparece como CONJUNTO, com o preço do conjunto e a miniatura da parte principal', () => {
    const tab = avatarTab('fantasia')
    const [kind] = avatarKinds(C, tab)
    if (!kind) throw new Error('sem tipo')
    const itens = avatarShopItems(C, tab, kind, 'all', nenhum, base())
    const conjuntos = itens.filter((i) => i.kind === 'set')
    expect(conjuntos.length).toBe(Object.keys(C.sets).length)
    for (const c of conjuntos) {
      expect(c.price).toBe(C.sets[c.id]?.price ?? -1)
      expect(c.thumb).toMatch(/^miniaturas\//)
      expect(c.owned).toBe(false)
    }
    const [primeiro] = conjuntos
    if (!primeiro) throw new Error('sem fantasia')
    expect(
      avatarShopItems(C, tab, kind, 'all', new Set([primeiro.id]), base()).find(
        (i) => i.id === primeiro.id,
      )?.owned,
    ).toBe(true)
  })

  test('cada peça listada tem miniatura do bucket; a cor do corpo tem a bolinha', () => {
    for (const tab of AVATAR_TABS)
      for (const kind of avatarKinds(C, tab))
        for (const item of avatarShopItems(C, tab, kind, 'all', nenhum, base()))
          if (item.kind !== 'none') expect(item.thumb).toMatch(/^miniaturas\//)
    const tab = avatarTab('corpo')
    const [kind] = avatarKinds(C, tab)
    if (!kind) throw new Error('sem tipo')
    const cores = avatarShopItems(C, tab, kind, 'all', nenhum, base())
    expect(cores.length).toBe(16)
    for (const c of cores) expect(c.swatch).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('as regras à vista', () => {
  test('o chapéu comum tira o cabelo, e o aviso diz o nome do cabelo', () => {
    const cabelo = C.rules.groups.cabelo?.parts[0] ?? ''
    const antes = equipPart(C, base(), cabelo)
    const { tab, item } = daAba('chapeu', 'chapeu')
    const depois = applyAvatarItem(C, antes, item, tab)
    expect(depois.chapeu).toBe(item.id)
    expect(depois.cabelo).toBeUndefined()
    expect(avatarRemovedBy(C, antes, depois, tab)).toEqual([C.parts[cabelo]?.label ?? ''])
    expect(avatarProblems(C, depois)).toEqual([])
  })

  test('trocar uma peça pela outra do mesmo encaixe não vira aviso', () => {
    const [a, b] = C.rules.groups.calcado?.parts ?? []
    const antes = equipPart(C, base(), a ?? '')
    const { tab } = daAba('calcado', 'calcado')
    expect(avatarRemovedBy(C, antes, applyAvatarItem(C, antes, peca(b ?? ''), tab), tab)).toEqual(
      [],
    )
  })

  test('a fantasia veste o conjunto inteiro e tira a roupa; tirar a fantasia avisa uma vez só', () => {
    const blusa = C.rules.groups.roupa_cima?.parts[0] ?? ''
    const antes = equipPart(C, base(), blusa)
    const tab = avatarTab('fantasia')
    const [setId] = Object.keys(C.sets)
    if (!setId) throw new Error('sem fantasia')
    const set: AvatarShopItem = {
      id: setId,
      kind: 'set',
      label: C.sets[setId]?.label ?? '',
      thumb: null,
      tier: 'coins',
      price: C.sets[setId]?.price ?? 0,
      owned: false,
    }
    const vestida = applyAvatarItem(C, antes, set, tab)
    expect(avatarProblems(C, vestida)).toEqual([])
    expect(isAvatarItemWorn(C, set, tab, vestida)).toBe(true)
    expect(avatarRemovedBy(C, antes, vestida, tab)).toContain(C.parts[blusa]?.label ?? '')
    // Vestir uma blusa por cima tira a fantasia: o aviso fala da fantasia, não de cada parte.
    const blusaTab = avatarTab('roupa_cima')
    const semFantasia = applyAvatarItem(C, vestida, peca(blusa), blusaTab)
    expect(avatarRemovedBy(C, vestida, semFantasia, blusaTab)).toEqual([
      `Fantasia de ${C.sets[setId]?.label}`,
    ])
  })

  test('o "Nenhum" esvazia a aba inteira (calça e bermuda)', () => {
    const calca = C.rules.groups.calca?.parts[0] ?? ''
    const tab = avatarTab('calca')
    const antes = equipPart(C, base(), calca)
    const none: AvatarShopItem = {
      id: 'nenhum:calca',
      kind: 'none',
      label: 'Nenhum',
      thumb: null,
      tier: 'free',
      price: 0,
      owned: true,
    }
    const depois = applyAvatarItem(C, antes, none, tab)
    expect(depois.calca).toBeUndefined()
    expect(depois.bermuda).toBeUndefined()
    expect(isAvatarItemWorn(C, none, tab, depois)).toBe(true)
  })
})

describe('o que só está de prévia', () => {
  test('peça paga sem posse, e fantasia sem o conjunto, deixam o avatar em prévia', () => {
    const paga = C.rules.groups.roupa_cima?.parts.find((id) => C.parts[id]?.tier === 'coins') ?? ''
    expect(avatarUnownedWorn(C, equipPart(C, base(), paga), nenhum)).toEqual([paga])
    expect(avatarUnownedWorn(C, equipPart(C, base(), paga), new Set([paga]))).toEqual([])
    const [setId, conjunto] = Object.entries(C.sets)[0] ?? []
    if (!setId || !conjunto) throw new Error('sem fantasia')
    const vestida = equipPart(C, base(), conjunto.parts[0]?.part ?? '')
    expect(avatarUnownedWorn(C, vestida, nenhum)).toEqual([setId])
    expect(avatarUnownedWorn(C, vestida, new Set([setId]))).toEqual([])
    expect(avatarUnownedWorn(C, base(), nenhum)).toEqual([])
  })
})

test('a Cabine só oferece as poses que o esqueleto tem, sem as que tiram o boneco da foto', () => {
  const poses = avatarPoses(C).map((p) => p.id)
  expect(poses[0]).toBe('parado_relaxado')
  for (const id of poses) expect(C.base.skeleton.clips).toContain(id)
  expect(poses).not.toContain('pulo_no_ar')
  expect(poses).not.toContain('correr_frente')
  expect(AVATAR_POSES.length).toBe(poses.length)
})
