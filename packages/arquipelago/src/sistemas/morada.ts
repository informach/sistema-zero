import {
  type AparenciaDoObjeto,
  aparenciaDaGaleria,
  OBJETOS_DA_CASA,
  type ObjetoDaCasa,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import {
  MORADA_CATALOG,
  type MoradaCatalog,
  type MoradaHouse,
  type MoradaInstance,
  type MoradaPiece,
  type MoradaVector,
  validateMoradaHouse,
} from '@sistemazero/avatar-quarto/morada/catalog'

/** Casa e ilhas antigas são cenas diferentes: esta régua nunca recebe a ponte de escala 1,85. */
function nativeSpeed(id: string) {
  const clip = AVATAR_CATALOG.base.skeleton.game.clips.find((clip) => clip.id === id)
  if (!clip?.stride || !clip.duration) throw new Error(`Clipe de movimento ausente: ${id}`)
  return clip.stride / clip.duration
}
export const MORADA_NATIVE = {
  grid: 0.5,
  gravity: 18,
  walk: nativeSpeed('andar_frente'),
  run: nativeSpeed('correr_frente'),
  jump: 5,
  step: 0.4,
} as const

/** Identidade funcional independe da malha, da cor e da aparência criada pela criança. */
export const MORADA_FUNCTION: Record<ObjetoDaCasa, string> = {
  geladeira: 'moveis/cozinha_eletros/geladeira_duplex_branca',
  forno: 'moveis/cozinha_eletros/forno_eletrico_creme',
  aquario: 'moveis/armarios/armario_vitrine_turquesa',
  lareira: 'moveis/lareiras/lareira_branca_tampo_amarelo',
  banda: 'moveis/objetos/piano_armario_chocolate',
  fliperama: 'moveis/jogos/fliperama_foguete_estelar',
  museu: 'moveis/estantes/estante_nichos_8_azul',
  casinha: 'moveis/objetos/arranhador_torre_casinha',
  'planta-interior': 'moveis/plantas/planta_costela_de_adao',
}

export const MORADA_VARIANTS: Record<ObjetoDaCasa, { retro: string; moderna: string }> = {
  geladeira: {
    retro: 'moveis/cozinha_eletros/geladeira_retro_pes_rosa',
    moderna: 'moveis/cozinha_eletros/geladeira_duas_portas_lilas',
  },
  forno: {
    retro: 'moveis/cozinha_eletros/forno_eletrico_vermelho',
    moderna: 'moveis/cozinha_moveis/fogao_modulo_moderna',
  },
  aquario: {
    retro: 'moveis/armarios/armario_vitrine_rosa',
    moderna: 'moveis/armarios/armario_vitrine_amarelo',
  },
  lareira: {
    retro: 'moveis/lareiras/lareira_tijolo_chamine',
    moderna: 'moveis/lareiras/lareira_canto_coifa',
  },
  banda: {
    retro: 'moveis/objetos/piano_armario_branco',
    moderna: 'moveis/objetos/piano_cauda_preto',
  },
  fliperama: {
    retro: 'moveis/jogos/fliperama_pista_turbo',
    moderna: 'moveis/jogos/fliperama_abelha_zumzum',
  },
  museu: {
    retro: 'moveis/estantes/estante_escada_branca',
    moderna: 'moveis/estantes/estante_tubos_3_laranja',
  },
  casinha: {
    retro: 'moveis/brinquedos/cabana_casinha_pano',
    moderna: 'cidade/fazenda/casinha_ferramentas',
  },
  'planta-interior': {
    retro: 'moveis/plantas/planta_jiboia',
    moderna: 'moveis/plantas/planta_palmeira_areca',
  },
}
export function moradaFunctionPiece(
  id: ObjetoDaCasa,
  appearance: AparenciaDoObjeto | null,
): string {
  const entry = appearance?.origem === 'galeria' ? aparenciaDaGaleria(appearance.id) : null
  return entry && entry.objeto === id && entry.modelo !== 'objeto'
    ? MORADA_VARIANTS[id][entry.modelo]
    : MORADA_FUNCTION[id]
}

export function moradaFunction(instance: MoradaInstance): ObjetoDaCasa | null {
  return OBJETOS_DA_CASA.find((id) => instance.behavior === `objeto:${id}`) ?? null
}

export function snapMorada(value: number): number {
  return Math.round(value / MORADA_NATIVE.grid) * MORADA_NATIVE.grid
}

export interface MoradaTransform {
  position: MoradaVector
  rotation: number
}
export function rotateMorada([x, y, z]: MoradaVector, rotation: number): MoradaVector {
  const c = Math.cos(rotation)
  const s = Math.sin(rotation)
  return [x * c + z * s, y, -x * s + z * c]
}
const add = (a: MoradaVector, b: MoradaVector): MoradaVector => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
]

/** A mesma origem do renderer: fundo do slot, depois a transformação do pai. */
export function moradaTransform(
  house: MoradaHouse,
  instance: MoradaInstance,
  catalog: MoradaCatalog = MORADA_CATALOG,
): MoradaTransform {
  if (instance.parentId) {
    const parent = house.instances.find((i) => i.id === instance.parentId)
    const slot =
      parent && catalog.pieces[parent.pieceId]?.slots.find((s) => s.id === instance.slotId)
    if (!parent || !slot) throw new Error(`Encaixe inválido: ${instance.id}`)
    const transform = moradaTransform(house, parent, catalog)
    const center: MoradaVector = [slot.center[0], slot.center[1] - slot.size[1] / 2, slot.center[2]]
    return {
      position: add(
        transform.position,
        rotateMorada(add(center, instance.position), transform.rotation),
      ),
      rotation: transform.rotation + instance.rotation,
    }
  }
  const origin = house.rooms.find((r) => r.id === instance.roomId)?.origin ?? [0, 0, 0]
  return { position: add(origin, instance.position), rotation: instance.rotation }
}

export interface MoradaBox {
  id: string
  instanceId: string
  center: MoradaVector
  size: MoradaVector
  rotation: number
}
/** Todas as caixas autorais, inclusive os vãos da cadeira e da mesa, preservadas. */
export function moradaBoxes(
  house: MoradaHouse,
  catalog: MoradaCatalog = MORADA_CATALOG,
): MoradaBox[] {
  return house.instances.flatMap((instance) => {
    const piece = catalog.pieces[instance.pieceId]
    if (!piece) return []
    const t = moradaTransform(house, instance, catalog)
    return [...piece.colliders, ...(piece.navigationColliders ?? [])].map((box, index) => ({
      id: `${instance.id}:${index}`,
      instanceId: instance.id,
      center: add(t.position, rotateMorada(box.center, t.rotation)),
      size: box.size,
      rotation: t.rotation,
    }))
  })
}

export function isPlantingPiece(piece: MoradaPiece): boolean {
  return /canteiro|talhao/.test(piece.id) || piece.tags.includes('plantar')
}

/** A colheita é do progresso do jogo; a posição é da instância estável da casa. */
export function plantingId(id: string): string {
  if (id.startsWith('horta:')) return id.slice(6)
  let hash = 14695981039346656037n
  for (const byte of new TextEncoder().encode(id))
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 1099511628211n)
  return `m:${hash.toString(36)}`
}

/** Conserva a safra dos canteiros anteriores sem conservar a arte nem a posição antigas. */
export function moradaWithGarden(
  house: MoradaHouse,
  save: Salvamento,
  catalog: MoradaCatalog = MORADA_CATALOG,
): MoradaHouse {
  const pieceId = 'cidade/fazenda/moldura_canteiro_vazia'
  if (!catalog.pieces[pieceId]) return house
  const bound = new Set(
    house.instances
      .filter((i) => catalog.pieces[i.pieceId] && isPlantingPiece(catalog.pieces[i.pieceId]!))
      .map((i) => plantingId(i.id)),
  )
  const plots = save.horta
    .filter((plot) => !bound.has(plot.id))
    .map(
      (plot, index): MoradaInstance => ({
        id: `horta:${plot.id}`,
        pieceId,
        position: [-7.5 + (index % 6) * 3, 0, 7 + Math.floor(index / 6) * 2],
        rotation: 0,
      }),
    )
  return plots.length ? { ...house, instances: [...house.instances, ...plots] } : house
}

/** Recoloca funções já conquistadas sem copiar o arranjo ou os modelos antigos. */
export function moradaWithFunctions(
  house: MoradaHouse,
  save: Salvamento,
  catalog: MoradaCatalog = MORADA_CATALOG,
  upperObjects: readonly ObjetoDaCasa[] = [],
): MoradaHouse {
  const placed = [...(save.construcao.casa?.objetos ?? []), ...upperObjects.map((id) => ({ id }))]
  const instances = [...house.instances]
  for (const object of placed) {
    if (!save.projetos[object.id] || instances.some((i) => i.behavior === `objeto:${object.id}`))
      continue
    const pieceId = moradaFunctionPiece(object.id, save.projetos[object.id]?.aparencia ?? null)
    if (!catalog.pieces[pieceId]) throw new Error(`A Morada não tem equivalente para ${object.id}.`)
    const index = instances.filter((i) => i.behavior?.startsWith('objeto:')).length
    instances.push({
      id: `funcao:${object.id}`,
      pieceId,
      position: [-9 + (index % 5) * 3, 0, -7 - Math.floor(index / 5) * 3],
      rotation: 0,
      behavior: `objeto:${object.id}`,
    })
  }
  return instances.length === house.instances.length ? house : { ...house, instances }
}

function moradaBlocks(house: MoradaHouse, catalog: MoradaCatalog) {
  return moradaBoxes(house, catalog).filter((box) => {
    const instance = house.instances.find((i) => i.id === box.instanceId)
    const piece = instance && catalog.pieces[instance.pieceId]
    const index = Number(box.id.slice(box.id.lastIndexOf(':') + 1))
    // A folha abre; o batente continua contando. Não exigir abrir a porta para editar a casa.
    return (
      !piece?.colliders[index]?.part &&
      box.center[1] + box.size[1] / 2 > 0.2 &&
      box.center[1] - box.size[1] / 2 < 1.05
    )
  })
}

/** A chegada e os cômodos do térreo precisam de caminho até a borda livre do lote. */
export function moradaAccess(house: MoradaHouse, catalog: MoradaCatalog = MORADA_CATALOG): boolean {
  const boxes = moradaBlocks(house, catalog)
  const width = Math.floor(house.lot.size[0] / 0.25)
  const depth = Math.floor(house.lot.size[1] / 0.25)
  if (width * depth > 40_000) return false
  const blocked = new Uint8Array(width * depth)
  for (let z = 0; z < depth; z++)
    for (let x = 0; x < width; x++) {
      const px = (x + 0.5) * 0.25 - house.lot.size[0] / 2
      const pz = (z + 0.5) * 0.25 - house.lot.size[1] / 2
      if (
        boxes.some((box) => {
          const point = rotateMorada([px - box.center[0], 0, pz - box.center[2]], -box.rotation)
          return (
            Math.abs(point[0]) < box.size[0] / 2 + 0.17 &&
            Math.abs(point[2]) < box.size[2] / 2 + 0.17
          )
        })
      )
        blocked[z * width + x] = 1
    }
  const seen = new Uint8Array(width * depth)
  const queue: number[] = []
  for (let z = 0; z < depth; z++)
    for (let x = 0; x < width; x++)
      if ((x === 0 || z === 0 || x === width - 1 || z === depth - 1) && !blocked[z * width + x]) {
        const key = z * width + x
        seen[key] = 1
        queue.push(key)
      }
  for (let i = 0; i < queue.length; i++) {
    const key = queue[i]!
    const x = key % width
    const z = Math.floor(key / width)
    for (const [nx, nz] of [
      [x - 1, z],
      [x + 1, z],
      [x, z - 1],
      [x, z + 1],
    ]) {
      if (nx === undefined || nz === undefined || nx < 0 || nz < 0 || nx >= width || nz >= depth)
        continue
      const next = nz * width + nx
      if (!seen[next] && !blocked[next]) {
        seen[next] = 1
        queue.push(next)
      }
    }
  }
  return house.rooms
    .filter((room) => room.origin[1] < 0.3)
    .every((room) => {
      let anyFree = false
      for (let z = 0; z < depth; z++)
        for (let x = 0; x < width; x++) {
          const px = (x + 0.5) * 0.25 - house.lot.size[0] / 2
          const pz = (z + 0.5) * 0.25 - house.lot.size[1] / 2
          if (
            Math.abs(px - room.origin[0]) < room.size[0] / 2 - 0.3 &&
            Math.abs(pz - room.origin[2]) < room.size[1] / 2 - 0.3 &&
            !blocked[z * width + x]
          ) {
            anyFree = true
            if (!seen[z * width + x]) return false
          }
        }
      return anyFree
    })
}
export function preservePlantings(
  house: MoradaHouse,
  save: Salvamento,
  catalog: MoradaCatalog = MORADA_CATALOG,
): Salvamento {
  const plots = house.instances.filter(
    (i) => catalog.pieces[i.pieceId] && isPlantingPiece(catalog.pieces[i.pieceId]!),
  )
  const ids = new Set(plots.map((i) => plantingId(i.id)))
  const horta = save.horta.filter((c) => ids.has(c.id))
  for (const instance of plots) {
    const id = plantingId(instance.id)
    if (!horta.some((c) => c.id === id))
      horta.push({ id, semente: null, plantadoEm: null, regadoEm: null })
  }
  return { ...save, horta }
}

export function validateMoradaEdit(
  before: MoradaHouse,
  next: MoradaHouse,
  save: Salvamento,
  catalog: MoradaCatalog = MORADA_CATALOG,
): string[] {
  const errors = validateMoradaHouse(next, catalog)
  const ids = new Set(
    next.instances
      .filter((i) => catalog.pieces[i.pieceId] && isPlantingPiece(catalog.pieces[i.pieceId]!))
      .map((i) => i.id),
  )
  for (const i of before.instances) {
    if (
      catalog.pieces[i.pieceId] &&
      isPlantingPiece(catalog.pieces[i.pieceId]!) &&
      !ids.has(i.id) &&
      save.horta.some((c) => c.id === plantingId(i.id) && c.semente !== null)
    )
      errors.push('Colha antes de retirar o canteiro.')
  }
  const functions = new Set<string>()
  for (const instance of next.instances) {
    if (!instance.behavior) continue
    const id = moradaFunction(instance)
    if (!id) errors.push('Função desconhecida.')
    else if (!save.projetos[id]) errors.push(`Conquiste o projeto ${id} antes de usar esta função.`)
    if (functions.has(instance.behavior))
      errors.push('Um projeto funcional só pode estar em um lugar.')
    functions.add(instance.behavior)
  }
  const plots = next.instances.filter(
    (i) => catalog.pieces[i.pieceId] && isPlantingPiece(catalog.pieces[i.pieceId]!),
  )
  if (plots.length > 24) errors.push('A horta comporta até 24 canteiros.')
  if (new Set(plots.map((i) => plantingId(i.id))).size !== plots.length)
    errors.push('Os canteiros precisam de identificadores distintos.')
  if (!errors.length && !moradaAccess(next, catalog))
    errors.push('Deixe um caminho livre dos cômodos até a saída do lote.')
  return errors
}

/** Área em m²; mudar de grade não multiplica o aconchego por quatro. */
export function moradaComfort(
  house: MoradaHouse,
  roomId: string,
  catalog: MoradaCatalog = MORADA_CATALOG,
) {
  const room = house.rooms.find((r) => r.id === roomId)
  const pieces = house.instances
    .filter((i) => i.roomId === roomId)
    .map((i) => catalog.pieces[i.pieceId])
    .filter((p): p is MoradaPiece => Boolean(p))
  const area = room ? room.size[0] * room.size[1] : 0
  const variety = new Set(pieces.filter((p) => p.kind === 'furniture').map((p) => p.group)).size
  const plants = new Set(pieces.filter((p) => p.category.includes('plantas')).map((p) => p.group))
    .size
  const lights = new Set(
    pieces.filter((p) => p.category.includes('luminarias')).map((p) => p.group),
  ).size
  const windows = new Set(
    pieces.filter((p) => p.id.startsWith('construcao/janela_')).map((p) => p.group),
  ).size
  const door = pieces.some(
    (p) => p.id.startsWith('construcao/porta_') || p.id.startsWith('construcao/arco_'),
  )
  const floor = pieces.some((p) => p.category === 'chaos')
  return {
    area,
    variety,
    plants,
    lights,
    total:
      Math.min(variety, 6) * 2 +
      Math.min(plants, 3) * 2 +
      Math.min(lights, 2) * 2 +
      Math.min(windows, 3) * 2 +
      (door ? 2 : 0) +
      (floor ? 2 : 0) +
      (area >= 9 && (area <= 36 || variety >= Math.ceil(area / 12)) ? 2 : 0),
  }
}

/**
 * A posse é a mesma régua da plataforma e do serviço (`core/morada/pricing`): peça grátis entra;
 * paga, troféu e a estante de troféus só com `owned` (que a plataforma entrega: compradas,
 * conquistadas e as que já estavam na casa); as funções do jogo (`behavior: objeto:`) vêm da
 * conquista no jogo. A compra é no Meu quarto da plataforma: a bandeja do jogo mostra o que é dela.
 */
export {
  isMoradaTrophyTier,
  moradaInstanceAllowed,
  moradaPieceAllowed,
} from '@sistemazero/avatar-quarto/morada/catalog'
