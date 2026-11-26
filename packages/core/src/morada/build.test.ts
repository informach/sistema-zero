import { describe, expect, test } from 'bun:test'
import {
  applyMoradaPlacement,
  createMoradaHouse,
  emptyMoradaHistory,
  MORADA_BUILD_TYPES,
  MORADA_CATALOG,
  MORADA_HISTORY_LIMIT,
  type MoradaHouse,
  moradaBuildType,
  moradaInstanceCenter,
  moradaOpeningWallsFor,
  moradaPlace,
  moradaRemove,
  moradaRotateAroundCenter,
  moradaWallOpenings,
  moradaWalls,
  pushMoradaHistory,
  redoMoradaHistory,
  undoMoradaHistory,
  validateMoradaHouse,
} from './index'

const piece = (id: string) => {
  const p = MORADA_CATALOG.pieces[id]
  if (!p) throw new Error(id)
  return p
}
const WINDOW = 'construcao/janela_quadrada_inteira_branca'
const WIDE = 'construcao/janela_larga_inteira_branca'
const DOOR = 'construcao/porta_classica_2_branca'
const RUG = 'moveis/tapetes/tapete_zigue_zague_rosa'
const BOARD = 'moveis/escola/quadro_avisos_corredor'
const BED = 'moveis/camas/cama_solteiro_classica_azul'
/** O comprimento de parede por trecho de cada lado do quarto (somado por direção). */
const wallLength = (house: MoradaHouse) => moradaWalls(house).reduce((sum, w) => sum + w.length, 0)
const pieceIds = (house: MoradaHouse) => house.instances.map((i) => i.pieceId)

describe('modo construção: aberturas e encaixes', () => {
  test('as aberturas saem das caixas de colisão da parede', () => {
    expect(moradaWallOpenings(piece('construcao/janela_2m'))).toEqual([
      expect.objectContaining({ kind: 'janela', from: 0.4, to: 1.6 }),
    ])
    expect(moradaWallOpenings(piece('construcao/janela_larga_2m'))[0]?.kind).toBe('janela')
    expect(moradaWallOpenings(piece('construcao/porta_2m'))[0]?.kind).toBe('porta')
    expect(moradaWallOpenings(piece('construcao/janela_dupla_4m'))).toHaveLength(2)
    expect(moradaWallOpenings(piece('construcao/parede_4m'))).toEqual([])
    // Mureta, chão e móvel não são parede de cômodo.
    expect(moradaWallOpenings(piece(BED))).toEqual([])
  })
  test('cada janela acha a parede com o vão do tamanho dela, pelo catálogo', () => {
    expect(moradaOpeningWallsFor(piece(WINDOW))[0]?.wall.id).toBe('construcao/janela_2m')
    expect(moradaOpeningWallsFor(piece(WIDE))[0]?.wall.id).toBe('construcao/janela_larga_2m')
    expect(moradaOpeningWallsFor(piece(DOOR))[0]?.opening.kind).toBe('porta')
    // Janela não entra em vão de porta.
    expect(moradaOpeningWallsFor(piece(WINDOW)).every((o) => o.opening.kind === 'janela')).toBe(
      true,
    )
  })
  test('as lacunas do catálogo ficam vermelhas até a arte desenhar a parede que falta', () => {
    // O vão da janela quadrada de 1 m (0,6 m) não tem janela que sirva…
    expect(
      Object.values(MORADA_CATALOG.pieces).some((p) =>
        moradaOpeningWallsFor(p).some((o) => o.wall.id === 'construcao/janela_quadrada_1m'),
      ),
    ).toBe(false)
    // …e a janela quadrada de Natal não cabe em nenhuma parede: o motivo diz isso.
    expect(moradaOpeningWallsFor(piece('construcao/janela_quadrada_natal'))).toEqual([])
    const p = moradaPlace(createMoradaHouse(), 'construcao/janela_quadrada_natal', [-2, -2.8])
    expect(p.valid).toBe(false)
    expect(p.reason).toMatch(/Ainda não tem parede/)
  })
  test('uma parede nova com o vão certo entra sozinha na tabela (vem do catálogo)', () => {
    const wall = piece('construcao/janela_2m')
    const catalog = {
      ...MORADA_CATALOG,
      pieces: {
        ...MORADA_CATALOG.pieces,
        'construcao/janela_teste_2m': { ...wall, id: 'construcao/janela_teste_2m' },
      },
    }
    expect(moradaOpeningWallsFor(piece(WINDOW), catalog).map((o) => o.wall.id)).toContain(
      'construcao/janela_teste_2m',
    )
  })
  test('os tipos do catálogo de construção', () => {
    expect(MORADA_BUILD_TYPES.map((t) => t.label)).toEqual([
      'Paredes',
      'Janelas',
      'Portas',
      'Pisos',
      'Acabamentos',
      'Festas',
    ])
    expect(moradaBuildType(piece('construcao/parede_4m'))).toBe('paredes')
    expect(moradaBuildType(piece(WINDOW))).toBe('janelas')
    expect(moradaBuildType(piece(BED))).toBeNull()
  })
})

describe('modo construção: onde a peça cai', () => {
  const house = createMoradaHouse()
  test('janela perto de uma parede lisa: o trecho ganha o vão e o resto continua liso', () => {
    const p = moradaPlace(house, WINDOW, [-2.2, -2.6])
    expect(p.valid).toBe(true)
    expect(p.replace?.remove).toEqual(['parede-fundo-esq'])
    expect(p.replace?.add.map((i) => i.pieceId)).toContain('construcao/janela_2m')
    const length = (p.replace?.add ?? []).reduce((sum, i) => sum + piece(i.pieceId).size[0], 0)
    expect(length).toBeCloseTo(4)
    expect(p.instance.rotation).toBe(0)
    const [, z] = moradaInstanceCenter(p.instance, piece(WINDOW))
    expect(z).toBeCloseTo(-3)
    // A casa continua válida para o servidor.
    expect(validateMoradaHouse(applyMoradaPlacement(house, p))).toEqual([])
  })
  test('a troca guarda as cores e os materiais da parede', () => {
    const painted: MoradaHouse = {
      ...house,
      instances: house.instances.map((i) =>
        i.id === 'parede-fundo-esq' ? { ...i, colors: { face_a: '#ff0000' } } : i,
      ),
    }
    const p = moradaPlace(painted, WINDOW, [-2.2, -2.6])
    expect(p.replace?.add.every((i) => i.colors?.face_a === '#ff0000')).toBe(true)
  })
  test('o mesmo vão não recebe duas janelas', () => {
    const next = applyMoradaPlacement(house, moradaPlace(house, WINDOW, [-2.2, -2.6]))
    const again = moradaPlace(next, WINDOW, [-3, -2.8])
    expect(again.valid).toBe(false)
  })
  test('janela na parede do lado vira de frente para ela', () => {
    const p = moradaPlace(house, WINDOW, [3.8, 1.2])
    expect(p.valid).toBe(true)
    expect(p.instance.rotation).toBeCloseTo(Math.PI / 2)
  })
  test('porta no vão de porta que já existe e está vazio', () => {
    const empty = moradaRemove(house, 'porta-entrada')
    // Sem a porta, o vão fechou: a porta nova abre de novo o trecho.
    const p = moradaPlace(empty, DOOR, [-1, 2.8])
    expect(p.valid).toBe(true)
  })
  test('longe das paredes, a janela fica vermelha com o motivo', () => {
    const p = moradaPlace(house, WINDOW, [0, 0])
    expect(p.valid).toBe(false)
    expect(p.reason).toMatch(/parede/)
  })
  test('quadro gruda na face de dentro da parede, de costas para ela', () => {
    const p = moradaPlace(house, BOARD, [1, -2.5])
    expect(p.valid).toBe(true)
    const board = piece(BOARD)
    const [, z] = moradaInstanceCenter(p.instance, board)
    // A face de dentro da parede do fundo fica em −3 + metade da espessura; o quadro encosta nela.
    expect(z).toBeGreaterThan(-3)
    expect(z).toBeLessThan(-2.8)
    expect(p.instance.position[1]).toBeGreaterThan(0.5)
  })
  test('móvel no chão: o centro da caixa anda pela grade de meio metro', () => {
    const p = moradaPlace(house, RUG, [0.6, 0.7])
    expect(p.valid).toBe(true)
    const [x, z] = moradaInstanceCenter(p.instance, piece(RUG))
    expect(x).toBeCloseTo(0.5)
    expect(z).toBeCloseTo(0.5)
  })
  test('móvel no lugar de outro fica vermelho; tapete não bate', () => {
    const bed = moradaPlace(house, BED, [2.5, -1])
    expect(bed.valid).toBe(false)
    expect(bed.reason).toMatch(/Ocupa o lugar/)
    expect(moradaPlace(house, RUG, [2.5, -1]).valid).toBe(true)
  })
  test('fora do quarto fica vermelho', () => {
    const p = moradaPlace(house, BED, [9, 0])
    expect(p.valid).toBe(false)
    expect(p.reason).toMatch(/Fora do quarto/)
  })
  test('mover a peça (a base) não bate nela mesma', () => {
    const bed = house.instances.find((i) => i.id === 'cama-inicial')
    if (!bed) throw new Error('cama')
    const p = moradaPlace(house, BED, moradaInstanceCenter(bed, piece(BED)), { base: bed })
    expect(p.valid).toBe(true)
    expect(p.instance.id).toBe('cama-inicial')
  })
  test('girar mantém o centro da caixa no lugar', () => {
    const wall = house.instances.find((i) => i.id === 'parede-fundo-esq')
    if (!wall) throw new Error('parede')
    const p = piece(wall.pieceId)
    const before = moradaInstanceCenter(wall, p)
    const after = moradaInstanceCenter(moradaRotateAroundCenter(wall, p), p)
    expect(after[0]).toBeCloseTo(before[0])
    expect(after[1]).toBeCloseTo(before[1])
  })
})

describe('modo construção: tirar janela e porta fecha o vão', () => {
  const house = createMoradaHouse()
  test('tirar a janela volta o trecho a parede lisa, com as cores', () => {
    const painted: MoradaHouse = {
      ...house,
      instances: house.instances.map((i) =>
        i.id === 'parede-fundo-esq' ? { ...i, colors: { face_a: '#00ff00' } } : i,
      ),
    }
    const placed = applyMoradaPlacement(painted, moradaPlace(painted, WINDOW, [-2.2, -2.6]))
    const id = placed.instances.find((i) => i.pieceId === WINDOW)?.id
    if (!id) throw new Error('janela')
    const back = moradaRemove(placed, id)
    expect(pieceIds(back)).not.toContain('construcao/janela_2m')
    expect(pieceIds(back)).not.toContain(WINDOW)
    expect(wallLength(back)).toBeCloseTo(wallLength(house))
    expect(
      back.instances
        .filter((i) => piece(i.pieceId).category === 'paredes')
        .filter((i) => moradaInstanceCenter(i, piece(i.pieceId))[1] < -2.9)
        .every((i) => i.colors?.face_a === '#00ff00' || i.id === 'parede-fundo-dir'),
    ).toBe(true)
    expect(validateMoradaHouse(back)).toEqual([])
  })
  test('tirar a porta da casa inicial fecha o vão da porta', () => {
    const back = moradaRemove(house, 'porta-entrada')
    expect(pieceIds(back)).not.toContain('construcao/porta_2m')
    expect(wallLength(back)).toBeCloseTo(wallLength(house))
  })
  test('com outra janela no mesmo trecho, o vão fica', () => {
    const base = moradaRemove(house, 'parede-fundo-esq')
    const wall = {
      id: 'dupla',
      pieceId: 'construcao/janela_dupla_4m',
      roomId: house.roomId,
      position: [-4, 0, -3] as [number, number, number],
      rotation: 0,
    }
    const withWall = { ...base, instances: [...base.instances, wall] }
    const first = applyMoradaPlacement(withWall, moradaPlace(withWall, WINDOW, [-3, -2.8]))
    const second = applyMoradaPlacement(first, moradaPlace(first, WINDOW, [-1, -2.8]))
    const windows = second.instances.filter((i) => i.pieceId === WINDOW)
    expect(windows).toHaveLength(2)
    const one = moradaRemove(second, windows[0]?.id ?? '')
    expect(pieceIds(one)).toContain('construcao/janela_dupla_4m')
  })
  test('tirar móvel leva junto o que está apoiado nele, e as paredes ficam', () => {
    const withChild: MoradaHouse = {
      ...house,
      instances: [
        ...house.instances,
        {
          id: 'em-cima',
          pieceId: BOARD,
          roomId: house.roomId,
          parentId: 'cama-inicial',
          position: [0, 0, 0],
          rotation: 0,
        },
      ],
    }
    const next = moradaRemove(withChild, 'cama-inicial')
    expect(next.instances.some((i) => i.id === 'em-cima' || i.id === 'cama-inicial')).toBe(false)
    expect(wallLength(next)).toBeCloseTo(wallLength(house))
  })
})

describe('modo construção: desfazer', () => {
  const a = createMoradaHouse()
  const b = { ...a, roomId: a.roomId }
  const c = { ...a }
  test('passos com a mesma chave em seguida viram um só; desfazer e refazer voltam a casa', () => {
    let h = pushMoradaHistory(emptyMoradaHistory(), a, 'mover:1', 1000)
    h = pushMoradaHistory(h, b, 'mover:1', 1200)
    expect(h.past).toHaveLength(1)
    const undo = undoMoradaHistory(h, c)
    expect(undo?.house).toBe(a)
    const redo = undo ? redoMoradaHistory(undo.history, undo.house) : null
    expect(redo?.house).toBe(c)
  })
  test('a mesma chave depois de um tempo é outro passo; sem chave, cada gesto é um passo', () => {
    let h = pushMoradaHistory(emptyMoradaHistory(), a, 'cor:1', 1000)
    h = pushMoradaHistory(h, b, 'cor:1', 5000)
    expect(h.past).toHaveLength(2)
    h = pushMoradaHistory(h, c, null, 5100)
    h = pushMoradaHistory(h, a, null, 5150)
    expect(h.past).toHaveLength(4)
  })
  test('um gesto novo apaga o refazer; o desfazer guarda até 60 passos', () => {
    let h = emptyMoradaHistory()
    for (let i = 0; i < MORADA_HISTORY_LIMIT + 5; i++) h = pushMoradaHistory(h, a, null, i * 1000)
    expect(h.past).toHaveLength(MORADA_HISTORY_LIMIT)
    const undo = undoMoradaHistory(h, b)
    if (!undo) throw new Error('desfazer')
    expect(undo.history.future).toHaveLength(1)
    expect(pushMoradaHistory(undo.history, c, null, 999_999).future).toEqual([])
    expect(undoMoradaHistory(emptyMoradaHistory(), a)).toBeNull()
    expect(redoMoradaHistory(emptyMoradaHistory(), a)).toBeNull()
  })
})
