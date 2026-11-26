import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import {
  applyMoradaPlacement,
  createMoradaHouse,
  MORADA_CATALOG,
  type MoradaInstance,
  moradaPlace,
  moradaRemove,
} from '@sistemazero/avatar-quarto/morada/catalog'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { criarLoja } from '../src/estado/loja'
import { createCasaMoradaStore } from '../src/estado/morada'
import { pintaMoradaModel } from '../src/mundo/morada-aparencia'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import {
  MORADA_FUNCTION,
  MORADA_NATIVE,
  moradaAccess,
  moradaBoxes,
  moradaTransform,
  moradaWithGarden,
  plantingId,
  preservePlantings,
  validateMoradaEdit,
} from '../src/sistemas/morada'

const now = new Date('2026-11-14T12:00:00Z')
const save = () => criarSalvamentoInicial(now)
function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  }
}
function game(readonly = false) {
  return criarLoja({
    salvamento: { ...save(), casa: { ...save().casa, portaNova: true } },
    jornada: 1,
    quarto: { theme: 'padrao', placedItems: [], pet: null },
    avatar: { slots: {} },
    acesso: {
      liberado: true,
      motivo: null,
      limiteDiarioMinutos: null,
      usadoHojeSegundos: 0,
      somenteLeitura: readonly,
    },
    aoMudar: () => {},
  })
}

describe('casa nativa, catálogo e física', () => {
  test('cada função possui uma peça real e a casa inicial tem acesso ao quintal', () => {
    for (const id of Object.values(MORADA_FUNCTION))
      expect(MORADA_CATALOG.pieces[id]?.file).toBeTruthy()
    expect(MORADA_NATIVE.grid).toBe(0.5)
    expect(moradaAccess(createMoradaHouse())).toBe(true)
  })
  test('colisão mantém todas as caixas autorais e gira o centro no espaço da casa', () => {
    const piece = Object.values(MORADA_CATALOG.pieces).find(
      (p) => p.category === 'cadeiras' && p.colliders.length > 1,
    )!
    const instance: MoradaInstance = {
      id: 'chair',
      pieceId: piece.id,
      position: [1, 0, 0],
      rotation: Math.PI / 2,
      roomId: 'quarto',
    }
    const house = { ...createMoradaHouse(), instances: [instance] }
    const boxes = moradaBoxes(house)
    expect(boxes).toHaveLength(piece.colliders.length)
    expect(boxes[0]!.center[0]).toBeCloseTo(1 + piece.colliders[0]!.center[2])
    expect(boxes[0]!.center[2]).toBeCloseTo(-piece.colliders[0]!.center[0])
    expect(boxes[0]!.size).toEqual(piece.colliders[0]!.size)
  })
  test('filho acompanha o fundo do slot, cômodo e giro do pai', () => {
    const parentPiece = Object.values(MORADA_CATALOG.pieces).find((p) => p.slots.length > 0)!
    const slot = parentPiece.slots[0]!
    const parent: MoradaInstance = {
      id: 'parent',
      pieceId: parentPiece.id,
      position: [2, 0, 1],
      rotation: Math.PI / 2,
      roomId: 'quarto',
    }
    const child: MoradaInstance = {
      id: 'child',
      pieceId: MORADA_FUNCTION['planta-interior'],
      position: [0, 0, 0],
      rotation: 0,
      roomId: 'quarto',
      parentId: 'parent',
      slotId: slot.id,
    }
    const house = {
      ...createMoradaHouse(),
      rooms: [
        {
          id: 'quarto',
          label: 'Q',
          origin: [5, 3.2, 4] as [number, number, number],
          size: [8, 6] as [number, number],
        },
      ],
      instances: [parent, child],
    }
    const transform = moradaTransform(house, child)
    expect(transform.position[0]).toBeCloseTo(7 + slot.center[2])
    expect(transform.position[1]).toBeCloseTo(3.2 + slot.center[1] - slot.size[1] / 2)
    expect(transform.position[2]).toBeCloseTo(5 - slot.center[0])
    expect(transform.rotation).toBeCloseTo(Math.PI / 2)
  })
  test('quarto sem saída é recusado e não depende da escala da ilha antiga', () => {
    const house = createMoradaHouse()
    const wall = 'construcao/parede_4m'
    expect(MORADA_CATALOG.pieces[wall]).toBeDefined()
    const ring: MoradaInstance[] = []
    for (let z = -4; z < 4; z += 4) {
      ring.push(
        { id: `w${z}`, pieceId: wall, position: [-4, 0, z], rotation: -Math.PI / 2 },
        { id: `e${z}`, pieceId: wall, position: [4, 0, z], rotation: -Math.PI / 2 },
      )
    }
    for (let x = -4; x < 4; x += 4) {
      ring.push(
        { id: `n${x}`, pieceId: wall, position: [x, 0, -4], rotation: 0 },
        { id: `s${x}`, pieceId: wall, position: [x, 0, 4], rotation: 0 },
      )
    }
    expect(moradaAccess({ ...house, instances: ring })).toBe(false)
  })
})

describe('horta e função preservam progresso', () => {
  test('todos os 24 canteiros sobrevivem, incluindo safra e relógio', () => {
    const previous = save()
    previous.horta = Array.from({ length: 24 }, (_, i) => ({
      id: `old-${i}`,
      semente: 'tomate' as const,
      plantadoEm: now.toISOString(),
      regadoEm: now.toISOString(),
    }))
    const house = moradaWithGarden(createMoradaHouse(), previous)
    expect(house.instances.filter((i) => i.id.startsWith('horta:'))).toHaveLength(24)
    const next = preservePlantings(house, previous)
    expect(next.horta).toEqual(previous.horta)
    expect(moradaWithGarden(house, next)).toBe(house)
    expect(validateMoradaEdit(house, house, previous)).toEqual([])
  })
  test('retirar ou trocar uma peça plantada não apaga a colheita', () => {
    const previous = save()
    previous.horta[0]!.semente = 'milho'
    const house = moradaWithGarden(createMoradaHouse(), previous)
    const plot = house.instances.find((i) => i.id.startsWith('horta:'))!
    expect(
      validateMoradaEdit(
        house,
        { ...house, instances: house.instances.filter((i) => i.id !== plot.id) },
        previous,
      ),
    ).toContain('Colha antes de retirar o canteiro.')
    expect(
      validateMoradaEdit(
        house,
        {
          ...house,
          instances: house.instances.map((i) =>
            i.id === plot.id ? { ...i, pieceId: MORADA_FUNCTION.geladeira } : i,
          ),
        },
        previous,
      ),
    ).toContain('Colha antes de retirar o canteiro.')
  })
  test('ids com prefixos iguais continuam em parcelas diferentes', () => {
    expect(plantingId('123456789012345678-a')).not.toBe(plantingId('123456789012345678-b'))
    expect(plantingId('x'.repeat(160)).length).toBeLessThanOrEqual(20)
  })
  test('modelo não concede a função ou duplica um projeto', () => {
    const house = createMoradaHouse()
    const instance: MoradaInstance = {
      id: 'fridge',
      pieceId: MORADA_FUNCTION.geladeira,
      position: [8, 0, 0],
      rotation: 0,
      behavior: 'objeto:geladeira',
    }
    const previous = save()
    expect(
      validateMoradaEdit(house, { ...house, instances: [...house.instances, instance] }, previous),
    ).toContain('Conquiste o projeto geladeira antes de usar esta função.')
    previous.projetos.geladeira = { ganhoEm: now.toISOString(), aparencia: null, aparencias: [] }
    expect(
      validateMoradaEdit(
        house,
        {
          ...house,
          instances: [
            ...house.instances,
            instance,
            { ...instance, id: 'second', position: [10, 0, 0] },
          ],
        },
        previous,
      ),
    ).toContain('Um projeto funcional só pode estar em um lugar.')
  })
})

test('a projeção Pinta é local mesmo com a peça sob um pai transformado', () => {
  const parent = new Group()
  parent.position.set(20, 5, 30)
  parent.rotation.y = Math.PI / 2
  const model = new Group()
  model.add(new Mesh(new BoxGeometry(1, 2, 1), new MeshStandardMaterial()))
  parent.add(model)
  parent.updateMatrixWorld(true)
  const projection = pintaMoradaModel(model)
  expect(projection.size.toArray()).toEqual([1, 2, 1])
  expect(projection.root.getObjectByName('pintaFrente')!.position.z).toBeCloseTo(0.503)
  projection.dispose()
})

describe('persistência da casa compartilhada', () => {
  test('CAS conserva a edição rejeitada e permite recuperação explícita', async () => {
    const platform = criarPlataformaFalsa({ persistir: false })
    const first = createCasaMoradaStore(game(), platform, storage())
    const second = createCasaMoradaStore(game(), platform, storage())
    await first.getState().enter(true)
    await second.getState().enter(true)
    const firstHouse = first.getState().house!
    const secondHouse = second.getState().house!
    first.getState().edit({
      ...firstHouse,
      rooms: firstHouse.rooms.map((room) => ({ ...room, label: 'Casa A' })),
    })
    second.getState().edit({
      ...secondHouse,
      rooms: secondHouse.rooms.map((room) => ({ ...room, label: 'Casa B' })),
    })
    expect(await first.getState().save()).toBe(true)
    expect(await second.getState().save()).toBe(false)
    expect(second.getState().status).toBe('conflict')
    expect(second.getState().recovery).not.toBeNull()
    second.getState().recover()
    expect(second.getState().dirty).toBe(true)
    expect(await second.getState().save()).toBe(true)
    expect(second.getState().revision).toBe(first.getState().revision + 1)
  })
  test('suporte só lê e consegue sair sem gravar', async () => {
    const platform = criarPlataformaFalsa({ persistir: false, somenteLeitura: true })
    const source = createCasaMoradaStore(game(true), platform, storage())
    await source.getState().enter(true)
    expect(source.getState().editing).toBe(false)
    expect(source.getState().dirty).toBe(false)
    await source.getState().close()
    expect(source.getState().open).toBe(false)
    expect(source.getState().revision).toBe(0)
  })
  test('resposta perdida confirma a própria gravação em vez de criar conflito', async () => {
    const platform = criarPlataformaFalsa({ persistir: false })
    const original = platform.salvarCasaMorada!
    let fail = true
    platform.salvarCasaMorada = async (request) => {
      const result = await original(request)
      if (fail) {
        fail = false
        throw new TypeError('Resposta perdida')
      }
      return result
    }
    const source = createCasaMoradaStore(game(), platform, storage())
    await source.getState().enter(true)
    expect(await source.getState().save()).toBe(false)
    expect(source.getState().dirty).toBe(true)
    expect(await source.getState().save()).toBe(true)
    expect(source.getState().status).toBe('ready')
    expect(source.getState().dirty).toBe(false)
    expect(source.getState().revision).toBe(1)
  })
})

describe('modo construção compartilhado com o quarto (26/11/2026)', () => {
  test('janela pelo motor do core abre o vão; tirar fecha; desfazer e refazer voltam a casa', async () => {
    const platform = criarPlataformaFalsa({ persistir: false })
    const store = createCasaMoradaStore(game(), platform, storage())
    await store.getState().enter(true)
    const house = store.getState().house!
    const room = house.rooms.find((r) => r.id === house.roomId)!
    // Perto da parede do fundo do quarto, em coordenadas do cômodo (como o editor converte).
    const placement = moradaPlace(
      house,
      'construcao/janela_quadrada_inteira_branca',
      [-2.2, -2.6],
      {
        roomId: room.id,
      },
    )
    expect(placement.valid).toBe(true)
    expect(store.getState().edit(applyMoradaPlacement(house, placement))).toBe(true)
    const placed = store.getState().house!
    expect(placed.instances.some((i) => i.pieceId === 'construcao/janela_2m')).toBe(true)
    expect(store.getState().edit(moradaRemove(placed, placement.instance.id))).toBe(true)
    expect(
      store.getState().house!.instances.some((i) => i.pieceId === 'construcao/janela_2m'),
    ).toBe(false)
    store.getState().undo()
    expect(store.getState().house).toEqual(placed)
    expect(store.getState().after).toHaveLength(1)
    store.getState().redo()
    expect(
      store.getState().house!.instances.some((i) => i.pieceId === 'construcao/janela_2m'),
    ).toBe(false)
    expect(store.getState().after).toHaveLength(0)
    // Um gesto novo apaga o refazer.
    store.getState().undo()
    expect(store.getState().edit({ ...placed, roomId: placed.roomId })).toBe(true)
    expect(store.getState().after).toHaveLength(0)
  })
})
