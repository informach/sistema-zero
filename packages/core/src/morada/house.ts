import { MORADA_LIMITS, MoradaHouseSchema } from './schema'

export { MORADA_LIMITS, MoradaHouseSchema } from './schema'

import { MORADA_CATALOG } from './catalog.generated'
import type { MoradaCatalog, MoradaHouse, MoradaPiece, MoradaVector } from './types'

/**
 * A folga da borda do cômodo (ou do lote) para uma peça: móvel 1 mm; construção 0,2 m; janela e
 * porta ficam no plano da parede da borda e passam metade do fundo delas para fora (as do pacote
 * de Natal têm 0,45 m). Régua ÚNICA do servidor (`validateMoradaHouse`), do motor do modo
 * construção (`moradaInsideRoom`) e do editor do quarto (`moradaFitsRoom`): com réguas diferentes,
 * a janela de Natal na borda era aceita ao salvar e recusada ao trocar a cor (26/11/2026).
 */
export function moradaBoundaryMargin(piece: MoradaPiece): number {
  if (piece.kind !== 'construction') return 0.001
  const insert =
    piece.category === 'janelas' || piece.category === 'portas' || piece.category === 'encaixes'
  return Math.max(0.2, insert ? (piece.max[2] - piece.min[2]) / 2 + 0.01 : 0)
}

/** Dimensões XYZ na orientação escolhida, compartilhadas por encaixes e validação. */
export function moradaFootprint(size: MoradaVector, rotation: number): MoradaVector {
  const c = Math.abs(Math.cos(rotation)),
    s = Math.abs(Math.sin(rotation))
  return [size[0] * c + size[2] * s, size[1], size[0] * s + size[2] * c]
}

/** Um cômodo nativo. A plataforma edita somente este recorte da casa. */
export function createMoradaHouse(catalog: MoradaCatalog = MORADA_CATALOG): MoradaHouse {
  const house: MoradaHouse = {
    version: 1,
    roomId: 'quarto',
    lot: { size: [30, 30] },
    rooms: [{ id: 'quarto', label: 'Meu quarto', origin: [0, 0, 0], size: [8, 6] }],
    instances: [],
    pet: null,
  }
  // A origem autoral continua intacta. O centro da caixa só decide onde pôr a instância.
  const place = (id: string, pieceId: string, x: number, z: number, rotation = 0) => {
    const piece = catalog.pieces[pieceId]
    if (!piece) return
    const cx = (piece.min[0] + piece.max[0]) / 2
    const cz = (piece.min[2] + piece.max[2]) / 2
    house.instances.push({
      id,
      pieceId,
      roomId: house.roomId,
      position: [
        x - cx * Math.cos(rotation) - cz * Math.sin(rotation),
        piece.category === 'chaos' ? -piece.max[1] : -piece.min[1],
        z + cx * Math.sin(rotation) - cz * Math.cos(rotation),
      ],
      rotation,
      ...(piece.category === 'chaos' && catalog.textures.madeira_clara
        ? { materials: { piso: { texture: 'madeira_clara' } } }
        : piece.category === 'paredes'
          ? { materials: { face_a: { color: '#f7c9a6' }, face_b: { color: '#f9d9c6' } } }
          : {}),
    })
  }
  for (const [side, x] of [
    ['esq', -2],
    ['dir', 2],
  ] as const) {
    place(`piso-${side}-fundo`, 'construcao/chao_4m', x, -1)
    place(`piso-${side}-frente`, 'construcao/chao_4x2m', x, 2)
    place(`parede-fundo-${side}`, 'construcao/parede_4m', x, -3)
  }
  for (const [side, x] of [
    ['esq', -4],
    ['dir', 4],
  ] as const) {
    place(`parede-${side}-longa`, 'construcao/parede_4m', x, 1, Math.PI / 2)
    place(`parede-${side}-curta`, 'construcao/parede_2m', x, -2, Math.PI / 2)
  }
  place('parede-frente-curta', 'construcao/parede_2m', -3, 3)
  place('parede-frente-porta', 'construcao/porta_2m', -1, 3)
  place('parede-frente-longa', 'construcao/parede_4m', 2, 3)
  place('porta-entrada', 'construcao/porta_classica_2_branca', -1, 3)
  place('cama-inicial', 'moveis/camas/cama_solteiro_classica_azul', 2.5, -1)
  place('cadeira-inicial', 'moveis/cadeiras/cadeira_escritorio_rosa_pacote', 0.5, -1)
  return house
}

/** Projeção pública do Meu quarto: não carrega o quintal nem os outros cômodos. */
export function projectMoradaRoom(house: MoradaHouse): MoradaHouse {
  const room = house.rooms.find((r) => r.id === house.roomId)
  if (!room) throw new Error('O quarto não existe na casa.')
  return {
    ...house,
    lot: { size: [...room.size] },
    rooms: [{ ...room, origin: [0, 0, 0] }],
    instances: house.instances.filter((i) => i.roomId === room.id),
  }
}

/**
 * Projeção de leitura após uma atualização de catálogo. A estrutura do documento continua
 * estrita; somente recursos que saíram do catálogo e seus dependentes são omitidos.
 * Não altera o documento recebido ou a revisão persistida. A próxima escrita segue estrita.
 */
export function reconcileMoradaHouse(
  house: MoradaHouse,
  catalog: MoradaCatalog = MORADA_CATALOG,
): MoradaHouse {
  const normalized: MoradaHouse = MoradaHouseSchema.parse(house)
  normalized.instances = normalized.instances.filter((instance) => {
    const piece = catalog.pieces[instance.pieceId]
    return piece && piece.kind !== 'pet'
  })
  let removed: boolean
  do {
    const byId = new Map(normalized.instances.map((instance) => [instance.id, instance]))
    const before = normalized.instances.length
    normalized.instances = normalized.instances.filter((instance) => {
      if (!instance.parentId) return true
      const parent = byId.get(instance.parentId)
      return (
        parent && catalog.pieces[parent.pieceId]?.slots.some((slot) => slot.id === instance.slotId)
      )
    })
    removed = normalized.instances.length < before
  } while (removed)
  for (const instance of normalized.instances) {
    if (!instance.materials) continue
    for (const [name, material] of Object.entries(instance.materials)) {
      if (material.texture && !catalog.textures[material.texture]) delete material.texture
      if (!material.color && !material.texture) delete instance.materials[name]
    }
    if (!Object.keys(instance.materials).length) delete instance.materials
  }
  if (normalized.pet && catalog.pieces[normalized.pet]?.kind !== 'pet') normalized.pet = null
  return normalized
}

/** Valida relações além da forma JSON, sem carregar arquivos 3D. */
export function validateMoradaHouse(
  house: MoradaHouse,
  catalog: MoradaCatalog = MORADA_CATALOG,
): string[] {
  const parsed = MoradaHouseSchema.safeParse(house)
  if (!parsed.success)
    return parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
  const errors: string[] = []
  if (new TextEncoder().encode(JSON.stringify(house)).byteLength > MORADA_LIMITS.bytes)
    errors.push('A casa excede o limite de bytes.')
  const rooms = new Map(house.rooms.map((room) => [room.id, room]))
  if (rooms.size !== house.rooms.length) errors.push('Cômodos com id repetido.')
  if (!rooms.has(house.roomId)) errors.push('O quarto não existe na casa.')
  for (const room of house.rooms) {
    if (
      Math.abs(room.origin[0]) + room.size[0] / 2 > house.lot.size[0] / 2 ||
      Math.abs(room.origin[2]) + room.size[1] / 2 > house.lot.size[1] / 2
    )
      errors.push(`${room.id}: cômodo fora do lote.`)
  }
  const instances = new Map(house.instances.map((instance) => [instance.id, instance]))
  if (instances.size !== house.instances.length) errors.push('Instâncias com id repetido.')
  const usedSlots = new Set<string>()
  for (const instance of house.instances) {
    const piece = catalog.pieces[instance.pieceId]
    if (!piece) errors.push(`${instance.id}: peça desconhecida.`)
    if (piece?.kind === 'pet') errors.push(`${instance.id}: pet não é uma peça posicionada.`)
    if (instance.roomId && !rooms.has(instance.roomId))
      errors.push(`${instance.id}: cômodo inexistente.`)
    if (Boolean(instance.parentId) !== Boolean(instance.slotId))
      errors.push(`${instance.id}: pai e encaixe devem vir juntos.`)
    if (instance.parentId) {
      const parent = instances.get(instance.parentId)
      const slot =
        parent && catalog.pieces[parent.pieceId]?.slots.find((s) => s.id === instance.slotId)
      if (!parent || !slot) errors.push(`${instance.id}: pai ou encaixe inexistente.`)
      if (parent && parent.roomId !== instance.roomId)
        errors.push(`${instance.id}: pai em outro cômodo.`)
      const key = `${instance.parentId}:${instance.slotId}`
      if (usedSlots.has(key)) errors.push(`${instance.id}: encaixe já ocupado.`)
      usedSlots.add(key)
      if (piece && slot) {
        const footprint = moradaFootprint(piece.size, instance.rotation)
        if (
          footprint.some(
            (v, i) => v + Math.abs(instance.position[i] ?? 0) * 2 > (slot.size[i] ?? 0) + 0.001,
          )
        )
          errors.push(`${instance.id}: peça não cabe no encaixe.`)
      }
    } else {
      const room = instance.roomId ? rooms.get(instance.roomId) : undefined
      const bounds = room?.size ?? house.lot.size
      if (piece) {
        const c = Math.cos(instance.rotation),
          s = Math.sin(instance.rotation)
        const margin = moradaBoundaryMargin(piece)
        for (const x of [piece.min[0], piece.max[0]])
          for (const z of [piece.min[2], piece.max[2]]) {
            if (
              Math.abs(instance.position[0] + x * c + z * s) > bounds[0] / 2 + margin ||
              Math.abs(instance.position[2] - x * s + z * c) > bounds[1] / 2 + margin
            ) {
              errors.push(`${instance.id}: peça fora da área.`)
              break
            }
          }
      }
    }
    const seen = new Set([instance.id])
    let current = instance
    while (current.parentId) {
      if (seen.has(current.parentId)) {
        errors.push(`${instance.id}: ciclo de encaixes.`)
        break
      }
      seen.add(current.parentId)
      const parent = instances.get(current.parentId)
      if (!parent) break
      current = parent
    }
    for (const material of Object.values(instance.materials ?? {})) {
      if (material.texture && !catalog.textures[material.texture])
        errors.push(`${instance.id}: textura desconhecida.`)
    }
  }
  if (house.pet && catalog.pieces[house.pet]?.kind !== 'pet') errors.push('Pet desconhecido.')
  return errors
}
