import { describe, expect, test } from 'bun:test'
import {
  type AvatarSlots,
  avatarFiles,
  avatarProblems,
  AVATAR_CATALOG as C,
  drawAvatar,
  equipPart,
  isAvatarFile,
  isAvatarOwned,
  isListed,
  ownershipOf,
  ownsKey,
  removeSlot,
  setSlots,
  situationFor,
  withBaseBottom,
  withCurrentSet,
  withEars,
  withMountedVariants,
  withReplacements,
  wornSet,
} from './index'

const parts = Object.entries(C.parts)
const doGrupo = (grupo: string) => {
  const id = parts.find(([, p]) => p.group === grupo && isListed(p) && !p.set)?.[0]
  if (!id) throw new Error(`sem peça no grupo ${grupo}`)
  return id
}
const base = (): AvatarSlots =>
  withEars(C, { corpo: C.rules.default.corpo ?? '', rosto: C.rules.default.rosto ?? '' })

describe('o catálogo', () => {
  test('tem as peças, o esqueleto e a textura', () => {
    expect(parts.length).toBeGreaterThan(300)
    expect(C.base.skeleton.file).toMatch(/^base\/esqueleto\.[0-9a-f]{12}\.glb$/)
    expect(Object.keys(C.base.textures).length).toBeGreaterThan(0)
  })

  test('o contrato do personagem: ossos, encaixes e as animações do jogo com as medidas', () => {
    const s = C.base.skeleton
    const ossos = Object.entries(s.bones)
    expect(ossos.length).toBe(44)
    // Todo osso tem pai conhecido, menos a raiz.
    for (const [nome, osso] of ossos) {
      if (osso.parent === null) expect(nome).toBe('Root')
      else expect(s.bones[osso.parent], `${nome} → ${osso.parent}`).toBeDefined()
    }
    // Os ossos que o jogo procura pelo nome.
    for (const nome of [
      'Hips',
      'Spine1',
      'Head',
      'LeftUpLeg',
      'LeftLeg',
      'LeftFoot',
      'RightUpLeg',
      'RightLeg',
      'RightFoot',
      'LeftArm',
      'LeftForeArm',
      'LeftHand',
      'RightArm',
      'RightForeArm',
      'RightHand',
      'RightHandProp',
    ])
      expect(s.bones[nome], nome).toBeDefined()
    // Os encaixes: as mãos e os do pedido do jogo, cada um num osso que existe, com a rotação
    // unitária; no descanso os olhos ficam na frente do rosto e os pés no chão.
    expect(s.sockets.mao_direita?.bone).toBe('RightHandProp')
    for (const nome of ['cabeca_topo', 'olhos', 'costas', 'pe_esquerdo', 'pe_direito'])
      expect(s.sockets[nome], nome).toBeDefined()
    for (const [nome, e] of Object.entries(s.sockets)) {
      expect(s.bones[e.bone], nome).toBeDefined()
      expect(Math.hypot(...e.rotation), nome).toBeCloseTo(1, 4)
    }
    expect(s.sockets.olhos?.rest[2]).toBeGreaterThan(0.1)
    expect(s.sockets.pe_esquerdo?.rest[1]).toBeCloseTo(0, 2)
    expect(s.sockets.cabeca_topo?.rest[1]).toBeCloseTo(s.height, 2)
    expect(s.game.file).toMatch(/^base\/animacoes-do-jogo\.[0-9a-f]{12}\.glb$/)
    expect(isAvatarFile(C, s.game.file)).toBe(true)
    const clipe = (id: string) => s.game.clips.find((c) => c.id === id)
    for (const c of s.game.clips) expect(c.duration, c.id).toBeGreaterThan(0)
    // Andar e correr deslocam o Hips (é a passada); o pulo sobe e desce o mesmo tanto.
    expect(clipe('andar_frente')?.stride).toBeGreaterThan(0.3)
    expect(clipe('correr_frente')?.stride).toBeGreaterThan(clipe('andar_frente')?.stride ?? 0)
    expect(clipe('pulo_inicio')?.rise).toBeGreaterThan(0.5)
    expect(clipe('pulo_inicio')?.rise ?? 0).toBeCloseTo(-(clipe('pulo_fim')?.rise ?? 0), 1)
    expect(clipe('subir_escada')?.rise).toBeGreaterThan(0.3)
    // Os apoios dos pés que a arte mediu: no andar os dois pés apoiam, dentro dos quadros do clipe.
    const andar = clipe('andar_frente')
    expect(andar?.feet.map((p) => p.foot).sort()).toEqual(['left', 'right'])
    for (const p of andar?.feet ?? []) {
      expect(p.on).toBeLessThanOrEqual(andar?.frames ?? 0)
      expect(p.off).toBeLessThanOrEqual(andar?.frames ?? 0)
    }
  })

  test('as animações que a arte fez para o jogo vêm com as medidas do lugar', () => {
    const jogo = C.base.skeleton.game
    const clipe = (id: string) => jogo.clips.find((c) => c.id === id)
    for (const id of [
      'acenar',
      'acender',
      'sentar',
      'sentado',
      'levantar',
      'deitar',
      'deitado',
      'levantar_da_cama',
      'pendurar_borda',
      'andar_pendurado_esquerda',
      'andar_pendurado_direita',
      'subir_borda',
      'pendurar_cipo',
      'boiar',
      'nadar',
      'entrar_na_agua',
      'sair_da_agua',
      'andar_na_agua',
      'sentado_no_barco',
    ]) {
      expect(clipe(id), id).toBeDefined()
      expect(clipe(id)?.frames, id).toBeGreaterThan(1)
      expect(typeof clipe(id)?.handsFree, id).toBe('boolean')
      expect(clipe(id)?.displacement, id).toHaveLength(3)
    }
    // Onde o clipe acontece: o assento, a quina da borda, a corda e a água.
    expect(clipe('sentado')?.place?.assento_m).toBeGreaterThan(0)
    expect(clipe('pendurar_borda')?.place?.maos_m).toBeGreaterThan(0)
    expect(clipe('pendurar_cipo')?.place?.corda_a_frente_m).toBeGreaterThan(0)
    expect(clipe('nadar')?.place?.linha_d_agua_m).toBeGreaterThan(0)
    expect(clipe('sair_da_agua')?.place?.margem_beira_a_frente_m).toBeGreaterThan(0)
    // Pendurada, as duas mãos agarram; subindo a borda, o corpo sobe e avança.
    expect(
      clipe('pendurar_borda')
        ?.hands?.map((m) => m.hand)
        .sort(),
    ).toEqual(['left', 'right'])
    expect(clipe('subir_borda')?.rise).toBeGreaterThan(0.4)
    expect(clipe('deitado')?.hatOff).toBe(true)
    expect(clipe('acender')?.object).toBe('mao_lanterna')
    // Os clipes do pack continuam como eram (sem os campos das animações nossas).
    expect(clipe('andar_frente')?.handsFree).toBeUndefined()
    // As camadas: só os ossos listados, todos do esqueleto, e os objetos existem (um objeto de mão
    // ou uma peça que vai nas costas, como a mochila e o planador dobrado).
    expect(jogo.layers?.length).toBeGreaterThan(0)
    for (const camada of jogo.layers ?? []) {
      expect(camada.bones.length, camada.id).toBeGreaterThan(0)
      for (const osso of camada.bones)
        expect(C.base.skeleton.bones[osso], `${camada.id}: ${osso}`).toBeDefined()
      for (const objeto of camada.objects)
        expect(C.equipment?.[objeto] ?? C.parts[objeto], `${camada.id}: ${objeto}`).toBeDefined()
    }
  })

  test('a lanterna é objeto de mão do jogo, fora do guarda-roupa', () => {
    const lanterna = C.equipment?.mao_lanterna
    if (!lanterna) throw new Error('sem a lanterna')
    expect(C.base.skeleton.sockets[lanterna.socket]?.bone).toBe('RightHandProp')
    expect(lanterna.file).toMatch(/^pecas\/mao_lanterna\.[0-9a-f]{12}\.glb$/)
    expect(isAvatarFile(C, lanterna.file)).toBe(true)
    expect(isAvatarFile(C, lanterna.thumb)).toBe(true)
    expect(C.base.skeleton.game.clips.some((c) => c.id === lanterna.use)).toBe(true)
    expect(lanterna.light?.bone).toBe('Luz')
    // Não é peça, não tem encaixe nem grupo no guarda-roupa, e não sai no sorteio.
    for (const id of Object.keys(C.equipment ?? {})) {
      expect(C.parts[id], id).toBeUndefined()
      for (const g of Object.values(C.rules.groups)) expect(g.parts).not.toContain(id)
    }
    expect(C.rules.slots.some((s) => s.id === lanterna.socket)).toBe(false)
    expect(C.rules.groups[lanterna.socket]).toBeUndefined()
  })

  test('a pegada de cada objeto de mão aponta para camadas de dedos que existem', () => {
    const dedos = new Set(
      (C.base.skeleton.game.layers ?? []).filter((c) => c.with === undefined).map((c) => c.id),
    )
    for (const [id, objeto] of Object.entries(C.equipment ?? {})) {
      expect(objeto.fingers?.length, id).toBeGreaterThan(0)
      for (const clipe of objeto.fingers ?? [])
        expect(dedos.has(clipe), `${id}: ${clipe}`).toBe(true)
    }
    // O balde e o regador fecham a mão na alça como a lanterna no cabo; a barra, com as duas mãos.
    expect(C.equipment?.mao_balde?.fingers).toEqual(C.equipment?.mao_lanterna?.fingers)
    expect(C.equipment?.mao_regador?.fingers).toEqual(C.equipment?.mao_lanterna?.fingers)
    expect(C.equipment?.mao_barra_planador?.fingers?.length).toBe(2)
  })

  test('toda peça citada por grupo, conjunto, orelha e padrão existe', () => {
    for (const [grupo, g] of Object.entries(C.rules.groups))
      for (const id of g.parts) {
        // O grupo da fantasia lista os conjuntos inteiros.
        if (grupo === 'fantasia') expect(C.sets[id], id).toBeDefined()
        else expect(C.parts[id]?.group, `${grupo}: ${id}`).toBe(grupo)
      }
    for (const [setId, s] of Object.entries(C.sets))
      for (const { slot, part } of s.parts) {
        expect(C.parts[part]?.slot, `${setId}: ${part}`).toBe(slot)
        expect(C.parts[part]?.set).toBe(setId)
      }
    for (const [corpo, orelhas] of Object.entries(C.rules.earsByBody)) {
      expect(C.parts[corpo]?.slot).toBe('corpo')
      expect(C.parts[orelhas]?.slot).toBe('orelhas')
    }
    for (const id of Object.values(C.rules.default)) expect(C.parts[id]).toBeDefined()
  })

  test('preço coerente com a faixa', () => {
    for (const [id, p] of parts) {
      if (p.tier === 'coins') expect(p.price, id).toBeGreaterThan(0)
      else expect(p.price, id).toBe(0)
    }
    for (const [id, s] of Object.entries(C.sets)) expect(s.price, id).toBeGreaterThan(0)
  })

  test('todo rosto tem o desenho e a expressão, e a marca segue o lado', () => {
    for (const [id, p] of parts.filter(([, p]) => p.slot === 'rosto')) {
      expect(p.face, id).toBeDefined()
      expect(p.audience, id).toBe(p.face?.set.startsWith('fem') ? 'girl' : 'boy')
    }
  })

  test('nenhum arquivo do pack aparece com endereço público', () => {
    for (const file of avatarFiles(C)) expect(file).not.toMatch(/^https?:/)
  })
})

describe('vestir', () => {
  test('a roupa inteira tira a roupa de cima e a calça, e a de cima tira a inteira', () => {
    const cima = doGrupo('roupa_cima')
    const calca = doGrupo('calca')
    const inteira = doGrupo('roupa_inteira')
    let s = equipPart(C, equipPart(C, base(), cima), calca)
    s = equipPart(C, s, inteira)
    expect(s.roupa_inteira).toBe(inteira)
    expect(s.roupa_cima).toBeUndefined()
    expect(s.calca).toBeUndefined()
    s = equipPart(C, s, cima)
    expect(s.roupa_inteira).toBeUndefined()
    expect(avatarProblems(C, s)).toEqual([])
  })

  test('o chapéu comum tira o cabelo; o capuz tira também as orelhas', () => {
    const cabelo = doGrupo('cabelo')
    let s = equipPart(C, base(), cabelo)
    expect(s.orelhas).toBeDefined()
    s = equipPart(C, s, doGrupo('chapeu'))
    expect(s.cabelo).toBeUndefined()
    expect(s.orelhas).toBeDefined()
    s = equipPart(C, equipPart(C, s, cabelo), doGrupo('capuz'))
    expect(s.cabelo).toBeUndefined()
    expect(s.orelhas).toBeUndefined()
    expect(avatarProblems(C, s)).toEqual([])
  })

  test('o chapéu sobre o cabelo só fica com o cabelo feito para ele', () => {
    let s = equipPart(C, base(), doGrupo('cabelo'))
    s = equipPart(C, s, doGrupo('chapeu_sobre_cabelo'))
    expect(s.cabelo).toBeUndefined()
    const curto = doGrupo('cabelo_sob_chapeu')
    s = equipPart(C, s, curto)
    expect(s.cabelo).toBe(curto)
    expect(s.chapeu).toBeDefined()
    expect(avatarProblems(C, s)).toEqual([])
  })

  test('a fantasia veste o conjunto inteiro e sai inteira', () => {
    const [setId, conjunto] = Object.entries(C.sets)[0] ?? []
    if (!setId || !conjunto) throw new Error('sem fantasia')
    const primeira = conjunto.parts[0]?.part ?? ''
    let s = equipPart(C, equipPart(C, base(), doGrupo('roupa_cima')), primeira)
    for (const { slot, part } of conjunto.parts) expect(s[slot]).toBe(part)
    expect(s.roupa_cima).toBeUndefined()
    expect(s.orelhas).toBeUndefined()
    expect(avatarProblems(C, s)).toEqual([])
    s = equipPart(C, s, doGrupo('roupa_cima'))
    for (const { part } of conjunto.parts) expect(Object.values(s)).not.toContain(part)
    expect(s.orelhas).toBeDefined()
    expect(avatarProblems(C, removeSlot(C, equipPart(C, base(), primeira), 'chapeu'))).toEqual([])
  })

  test('trocar o corpo troca as orelhas', () => {
    const corpos = parts.filter(([, p]) => p.slot === 'corpo').map(([id]) => id)
    const s = equipPart(C, base(), corpos[3] ?? '')
    expect(s.orelhas).toBe(C.rules.earsByBody[corpos[3] ?? ''])
  })

  test('um par que não combina: a escolhida por último fica', () => {
    const [a, outras] = Object.entries(C.rules.incompatible)[0] ?? []
    const b = outras?.[0]
    if (!a || !b) throw new Error('sem par')
    const s = equipPart(C, equipPart(C, base(), b), a)
    expect(s[C.parts[a]?.slot ?? '']).toBe(a)
    expect(Object.values(s)).not.toContain(b)
  })

  test('o servidor reprova avatar montado à mão que não combina', () => {
    const s = { ...base(), roupa_inteira: doGrupo('roupa_inteira'), calca: doGrupo('calca') }
    expect(avatarProblems(C, s).some((p) => p.kind === 'conflict')).toBe(true)
    expect(avatarProblems(C, { ...base(), cabelo: 'nao_existe' })).toContainEqual({
      kind: 'unknown-part',
      slot: 'cabelo',
      part: 'nao_existe',
    })
    const { rosto: _sem, ...semRosto } = base()
    expect(avatarProblems(C, semRosto)).toContainEqual({ kind: 'missing-required', slot: 'rosto' })
  })
})

describe('a variante para montar (a saia assentada na sela)', () => {
  // Um catálogo de exemplo com uma peça de calça sem variante e a variante dela.
  const saia = parts.find(
    ([, p]) => p.slot === 'calca' && isListed(p) && !p.set && !p.mountedVariant,
  )
  if (!saia) throw new Error('sem peça de calça')
  const [idSaia, pecaSaia] = saia
  const comVariante = {
    ...C,
    parts: {
      ...C.parts,
      [idSaia]: { ...pecaSaia, mountedVariant: `${idSaia}_montada` },
      [`${idSaia}_montada`]: {
        ...pecaSaia,
        hidden: true,
        variantOf: idSaia,
        variantFor: ['montado'],
      },
    },
  }

  test('montada, a peça troca pela variante; o resto fica', () => {
    const vestida: AvatarSlots = { ...base(), calca: idSaia }
    const montada = withMountedVariants(comVariante, vestida)
    expect(montada.calca).toBe(`${idSaia}_montada`)
    expect(montada.corpo).toBe(vestida.corpo)
  })

  test('sem variante (ou com a variante fora do catálogo), nada muda', () => {
    const vestida: AvatarSlots = { ...base(), calca: idSaia }
    expect(withMountedVariants(C, vestida)).toBe(vestida)
    const semArquivo = {
      ...C,
      parts: { ...C.parts, [idSaia]: { ...pecaSaia, mountedVariant: 'nao_existe' } },
    }
    expect(withMountedVariants(semArquivo, vestida)).toBe(vestida)
  })
})

describe('peça só do adulto', () => {
  test('o chapéu de cerveja é só do adulto: fora da loja e do sorteio do Kids', () => {
    const cerveja = C.parts.chapeu_cerveja_pacote
    if (!cerveja) throw new Error('sem o chapéu de cerveja')
    expect(cerveja.adultOnly).toBe(true)
    expect(isListed(cerveja)).toBe(false)
    expect(isListed(cerveja, 'kids')).toBe(false)
    expect(isListed(cerveja, 'adult')).toBe(true)
    const tem = new Set(['chapeu_cerveja_pacote'])
    const sorteios = (community: 'kids' | 'adult') =>
      Array.from({ length: 400 }, (_, i) =>
        drawAvatar(C, `cerveja-${i}`, { owned: tem, community }),
      ).filter((s) => s.chapeu === 'chapeu_cerveja_pacote').length
    expect(sorteios('kids')).toBe(0)
    expect(sorteios('adult')).toBeGreaterThan(0)
  })
})

describe('sorteio', () => {
  test('todo avatar sorteado é válido, grátis e do lado pedido', () => {
    for (const filter of ['boy', 'girl', 'all'] as const) {
      for (let i = 0; i < 400; i++) {
        const s = drawAvatar(C, `${filter}-${i}`, { filter })
        expect(avatarProblems(C, s), JSON.stringify(s)).toEqual([])
        for (const id of Object.values(s)) {
          const p = C.parts[id]
          expect(p?.hidden, id).toBeFalsy()
          // Fantasia nunca é grátis: o sorteio só de grátis não a escolhe.
          expect(p?.set, id).toBeUndefined()
          if (p?.slot !== 'orelhas') expect(p?.tier, id).toBe('free')
          if (filter !== 'all') expect(['both', filter]).toContain(p?.audience ?? 'both')
        }
        const rosto = C.parts[s.rosto ?? '']
        expect(['normal', 'neutro', 'feliz']).toContain(rosto?.face?.expression ?? '')
      }
    }
  })

  test('o avatar sorteado sai sempre vestido: em cima e embaixo, ou roupa inteira, ou fantasia', () => {
    for (let i = 0; i < 400; i++) {
      for (const tiers of [['free'], ['free', 'coins']] as const) {
        const s = drawAvatar(C, `vestido-${i}`, { filter: 'boy', tiers })
        const fantasia = Object.values(s).some((id) => C.parts[id]?.set)
        if (fantasia || s.roupa_inteira) continue
        expect(s.roupa_cima, JSON.stringify(s)).toBeDefined()
        expect(s.calca ?? s.bermuda, JSON.stringify(s)).toBeDefined()
      }
    }
    // Sem a opção, o sorteio do pack deixa gente sem blusa.
    const semRoupa = Array.from({ length: 100 }, (_, i) =>
      drawAvatar(C, `cru-${i}`, { dressed: false }),
    ).filter(
      (s) => !s.roupa_cima && !s.roupa_inteira && !Object.values(s).some((id) => C.parts[id]?.set),
    )
    expect(semRoupa.length).toBeGreaterThan(0)
  })

  test('a mesma semente dá o mesmo avatar, e sementes diferentes variam', () => {
    expect(drawAvatar(C, 'perfil-1', { filter: 'boy' })).toEqual(
      drawAvatar(C, 'perfil-1', { filter: 'boy' }),
    )
    const vistos = new Set(
      Array.from({ length: 50 }, (_, i) => JSON.stringify(drawAvatar(C, `p${i}`))),
    )
    expect(vistos.size).toBeGreaterThan(40)
  })

  test('com as fantasias liberadas, sai fantasia inteira e válida', () => {
    const comFantasia = Array.from({ length: 300 }, (_, i) =>
      drawAvatar(C, `fantasia-${i}`, { tiers: ['free', 'coins'] }),
    ).filter((s) => Object.values(s).some((id) => C.parts[id]?.set))
    expect(comFantasia.length).toBeGreaterThan(20)
    for (const s of comFantasia) expect(avatarProblems(C, s)).toEqual([])
  })

  test('com as pagas liberadas, sai peça paga', () => {
    const pagas = Array.from({ length: 200 }, (_, i) =>
      drawAvatar(C, `pago-${i}`, { tiers: ['free', 'coins'] }),
    ).filter((s) => Object.values(s).some((id) => C.parts[id]?.tier === 'coins'))
    expect(pagas.length).toBeGreaterThan(50)
  })
})

describe('arquivos', () => {
  test('a rota só entrega arquivo do catálogo', () => {
    const algum = C.parts[parts[0]?.[0] ?? '']?.file ?? ''
    expect(isAvatarFile(C, algum)).toBe(true)
    expect(isAvatarFile(C, C.base.skeleton.file)).toBe(true)
    expect(isAvatarFile(C, 'pecas/outra.000000000000.glb')).toBe(false)
    expect(isAvatarFile(C, '../segredo.glb')).toBe(false)
    expect(isAvatarFile(C, 'pecas/../../x.glb')).toBe(false)
    expect(isAvatarFile(C, 'materiais/aula.pdf')).toBe(false)
  })
})

describe('posse', () => {
  test('grátis e orelhas são de todo mundo; paga, da festa e escondida pedem a própria peça', () => {
    const nada = new Set<string>()
    const de = (filtro: (p: (typeof C.parts)[string]) => boolean) =>
      Object.entries(C.parts).find(([, p]) => !p.set && filtro(p))?.[0] ?? ''
    const gratis = de((p) => p.tier === 'free' && !p.hidden)
    const paga = de((p) => p.tier === 'coins' && !p.hidden)
    const daFesta = de((p) => p.tier === 'festa')
    expect(ownershipOf(C, gratis)).toBeNull()
    expect(isAvatarOwned(C, gratis, nada)).toBe(true)
    expect(ownershipOf(C, paga)).toBe(paga)
    expect(isAvatarOwned(C, paga, nada)).toBe(false)
    expect(isAvatarOwned(C, paga, new Set([paga]))).toBe(true)
    expect(isAvatarOwned(C, daFesta, nada)).toBe(false)
    const escondida = de((p) => Boolean(p.hidden))
    if (escondida) expect(ownershipOf(C, escondida)).toBe(escondida)
    expect(isAvatarOwned(C, 'nao-existe', nada)).toBe(false)
  })

  test('a parte de fantasia e o conjunto pedem o CONJUNTO no inventário', () => {
    const [setId, conjunto] = Object.entries(C.sets)[0] ?? []
    if (!setId || !conjunto) throw new Error('sem fantasia')
    const parte = conjunto.parts[0]?.part ?? ''
    expect(ownershipOf(C, parte)).toBe(setId)
    expect(isAvatarOwned(C, parte, new Set([parte]))).toBe(false)
    expect(isAvatarOwned(C, parte, new Set([setId]))).toBe(true)
    expect(isAvatarOwned(C, setId, new Set([setId]))).toBe(true)
  })
})

describe('peça nossa dentro da fantasia (trocas_fantasia) e peça reaproveitada', () => {
  const copias = parts.filter(([, p]) => p.copyOf)

  test('toda parte de uma fantasia é dela (uma peça, uma fantasia)', () => {
    for (const [setId, conjunto] of Object.entries(C.sets))
      for (const { part } of conjunto.parts)
        expect(C.parts[part]?.set, `${setId}: ${part}`).toBe(setId)
  })

  test('a fantasia usa a cópia (do elmo novo, das botas, do capuz), e a original segue como era', () => {
    expect(copias.length).toBeGreaterThan(0)
    for (const [id, copia] of copias) {
      const original = C.parts[copia.copyOf ?? '']
      expect(original, id).toBeDefined()
      expect(copia.file).toBe(original?.file ?? '')
      expect(copia.set, id).toBeDefined()
      expect(copia.tier).toBe('set')
      // A original é vendida sozinha ou é parte de OUTRA fantasia, nunca desta.
      expect(original?.set, `${copia.copyOf}`).not.toBe(copia.set)
      const conjunto = C.sets[copia.set ?? '']
      expect(conjunto?.parts.some((p) => p.part === id)).toBe(true)
      expect(ownershipOf(C, id)).toBe(copia.set ?? '')
    }
    // O elmo novo, fora da fantasia, continua à venda sozinho.
    expect(C.parts.chapeu_elmo_cavaleiro?.set).toBeUndefined()
    expect(C.parts.chapeu_elmo_cavaleiro?.hidden).toBeUndefined()
  })

  test('quem já vestia a fantasia com a peça antiga do pack passa a vestir a nova, válido', () => {
    let trocas = 0
    for (const [id, copia] of copias) {
      const conjunto = C.sets[copia.set ?? '']
      if (!conjunto) throw new Error(id)
      // Só as trocas da arte têm peça antiga (a do pack, escondida, na mesma fantasia).
      const antiga = parts.find(
        ([pid, p]) => p.set === copia.set && p.slot === copia.slot && p.hidden && pid !== id,
      )?.[0]
      if (!antiga) continue
      trocas += 1
      const vestida: AvatarSlots = { ...base() }
      for (const { slot, part } of conjunto.parts) vestida[slot] = part
      vestida[copia.slot] = antiga
      const atualizada = withEars(C, withCurrentSet(C, vestida))
      expect(atualizada[copia.slot]).toBe(id)
      expect(avatarProblems(C, atualizada)).toEqual([])
    }
    expect(trocas).toBeGreaterThan(0)
  })

  test('as fantasias que reaproveitam botas, capuz e luvas se vestem inteiras, só com o conjunto', () => {
    for (const setId of ['fantasia_raposa', 'fantasia_gato', 'fantasia_urso_polar']) {
      const vestida = withEars(C, { ...base(), ...setSlots(C, setId) })
      expect(wornSet(C, vestida), setId).toBe(setId)
      expect(avatarProblems(C, vestida), setId).toEqual([])
      for (const id of Object.values(vestida)) {
        const chave = ownershipOf(C, id)
        expect(chave === null || chave === setId, `${setId}: ${id}`).toBe(true)
      }
    }
  })

  test('a parte que saiu da fantasia sai do avatar; sem completar, a fantasia pela metade fica', () => {
    const setId = 'fantasia_cavaleiro'
    const conjunto = C.sets[setId]
    const antiga = 'fantasia_cavaleiro_elmo_chifres_pacote'
    if (!conjunto || C.parts[antiga]?.set !== setId) throw new Error('sem a troca do cavaleiro')
    // A peça antiga num encaixe que a fantasia não usa mais (como se a arte a tirasse dali).
    const vestida: AvatarSlots = { ...base(), ...setSlots(C, setId), costas_extra: antiga }
    const atualizada = withCurrentSet(C, vestida)
    expect(Object.values(atualizada)).not.toContain(antiga)
    // Só uma parte da fantasia: sem completar, continua só ela (a gravação recusa).
    const parte = conjunto.parts[0]
    if (!parte) throw new Error('fantasia vazia')
    const metade: AvatarSlots = { ...base(), [parte.slot]: parte.part }
    expect(withCurrentSet(C, metade, { completar: false })).toEqual(metade)
    expect(avatarProblems(C, metade).some((p) => p.kind === 'incomplete-set')).toBe(true)
    expect(Object.keys(withCurrentSet(C, metade)).length).toBeGreaterThan(
      Object.keys(metade).length,
    )
  })

  test('sem fantasia, withCurrentSet não muda nada', () => {
    expect(withCurrentSet(C, base())).toEqual(base())
  })
})

describe('as entregas de 15/11 da arte: shortinho, variantes, planador e cópias do pack', () => {
  const regra = C.rules.baseBottom
  if (!regra) throw new Error('o catálogo não tem a peça de baixo fixa')

  test('a peça de baixo fixa entra quando nada cobre e sai quando algo cobre', () => {
    const fixa = C.parts[regra.part]
    expect(fixa?.hidden).toBe(true)
    expect(fixa?.tier).toBe('free')
    const nua = withBaseBottom(C, base())
    expect(nua[regra.slot]).toBe(regra.part)
    // Com calça (ou saia), bermuda, roupa inteira ou fantasia, não entra.
    for (const grupo of ['calca', 'bermuda', 'roupa_inteira']) {
      const vestida = equipPart(C, base(), doGrupo(grupo))
      const desenho = withBaseBottom(C, vestida)
      expect(Object.values(desenho)).not.toContain(regra.part)
    }
    const fantasia = Object.keys(C.sets)[0] ?? ''
    const comFantasia = equipPart(C, base(), C.sets[fantasia]?.parts[0]?.part ?? '')
    expect(Object.values(withBaseBottom(C, comFantasia))).not.toContain(regra.part)
    // A que estava no desenho sai quando uma peça que cobre entra.
    const depois = withBaseBottom(C, { ...nua, calca: doGrupo('calca') })
    expect(Object.values(depois)).not.toContain(regra.part)
  })

  test('as variantes montadas dizem em que situação valem, e a original aponta para elas', () => {
    const variantes = parts.filter(([, p]) => p.variantOf)
    expect(variantes.length).toBeGreaterThanOrEqual(17)
    for (const [id, p] of variantes) {
      expect(p.hidden, id).toBe(true)
      expect(p.variantFor, id).toContain('montado')
      expect(C.parts[p.variantOf ?? '']?.mountedVariant, id).toBe(id)
    }
  })

  test('a fantasia de cavaleiro ganhou a calça', () => {
    const cavaleiro = C.sets.fantasia_cavaleiro
    expect(cavaleiro?.parts.some(({ slot }) => slot === 'calca')).toBe(true)
  })

  test('o planador: só do jogo, um arquivo por peça de costas, e some com cabelo comprido', () => {
    const planador = C.parts.planador_dobrado
    const s = planador?.situations
    if (!planador || !s) throw new Error('sem o planador dobrado')
    expect(planador.hidden).toBe(true)
    expect(C.rules.slots.some((slot) => slot.id === planador.slot)).toBe(false)
    // Cada peça de costas do catálogo tem a situação dela ou esconde o planador (as capas), e cada
    // situação aponta para uma peça de agora.
    const costas = parts.filter(([, p]) => p.slot === 'costas' && !p.retired && !p.copyOf)
    for (const [id] of costas)
      expect(s.byBack[id] !== undefined || s.hiddenWith?.includes(id), id).toBe(true)
    for (const id of Object.values(s.byBack)) expect(C.parts[id]?.retired, id).toBeUndefined()
    // Com capa, o planador não aparece.
    const capa = costas.find(([id]) => s.hiddenWith?.includes(id))?.[0]
    if (capa) expect(situationFor(C, 'planador_dobrado', { ...base(), costas: capa })).toBeNull()
    // O cabelo que bate no fardo atrás de uma bolsa esconde só naquela situação.
    for (const [bolsa, cabelos] of Object.entries(s.hiddenWithByBack ?? {})) {
      const cabelo = cabelos.find((id) => C.parts[id] && !s.hiddenWith?.includes(id))
      if (!cabelo) continue
      expect(situationFor(C, 'planador_dobrado', { ...base(), costas: bolsa, cabelo })).toBeNull()
      expect(situationFor(C, 'planador_dobrado', { ...base(), cabelo })).toBe('planador_dobrado')
    }
    for (const id of [...Object.values(s.byBack), ...Object.values(s.highStrap ?? {})])
      expect(C.parts[id]?.situationOf === 'planador_dobrado' || id === 'planador_dobrado').toBe(
        true,
      )
    // Sem nada nas costas, a própria peça; com a mochila, a situação dela.
    expect(situationFor(C, 'planador_dobrado', base())).toBe('planador_dobrado')
    const [mochila] = costas[0] ?? []
    if (mochila)
      expect(situationFor(C, 'planador_dobrado', { ...base(), costas: mochila })).toBe(
        s.byBack[mochila],
      )
    // Com um casaco da lista, a alça alta (onde há alças).
    const casaco = s.highStrapWith?.find((id) => C.parts[id] && !C.parts[id]?.set)
    if (casaco && s.highStrap?.none)
      expect(situationFor(C, 'planador_dobrado', { ...base(), roupa_cima: casaco })).toBe(
        s.highStrap.none,
      )
    // Um cabelo comprido cobre o fardo.
    const cabelo = s.hiddenWith?.find((id) => C.parts[id])
    if (cabelo) expect(situationFor(C, 'planador_dobrado', { ...base(), cabelo })).toBeNull()
    // Peça sem situações: nada.
    expect(situationFor(C, doGrupo('calca'), base())).toBeNull()
  })

  test('a peça do pack substituída: o desenho mostra a nossa, e ter uma é ter a outra', () => {
    const trocas = C.rules.replacements ?? {}
    const [doPack, nossa] = Object.entries(trocas).find(([a, b]) => C.parts[a] && C.parts[b]) ?? []
    if (!doPack || !nossa) throw new Error('sem substituição no catálogo')
    const slot = C.parts[doPack]?.slot ?? ''
    expect(withReplacements(C, { ...base(), [slot]: doPack })[slot]).toBe(nossa)
    expect(withReplacements(C, base())).toEqual(base())
    expect(ownsKey(C, nossa, new Set([doPack]))).toBe(true)
    expect(ownsKey(C, doPack, new Set([nossa]))).toBe(true)
    expect(ownsKey(C, nossa, new Set())).toBe(false)
    // A nossa herdou o preço da do pack.
    expect(C.parts[nossa]?.tier).toBe(C.parts[doPack]?.tier)
    expect(C.parts[nossa]?.price).toBe(C.parts[doPack]?.price)
    // E quem comprou a do pack pode vestir a nossa (pela régua da posse).
    if (ownershipOf(C, nossa) !== null)
      expect(isAvatarOwned(C, nossa, new Set([doPack]))).toBe(true)
  })
})
