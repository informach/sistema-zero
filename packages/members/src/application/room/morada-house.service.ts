import { DomainError } from '@sistemazero/core/errors'
import {
  isMoradaAdultOnly,
  isMoradaFree,
  isMoradaFunctionInstance,
  isMoradaTrophyTier,
  LEGACY_TROPHY_SHELF,
  MORADA_CATALOG,
  MORADA_TROPHY_SHELF,
  type MoradaHouse,
  MoradaHouseSchema,
  moradaInstanceAllowed,
  moradaPieceAllowed,
  reconcileMoradaHouse,
  validateMoradaHouse,
} from '@sistemazero/core/morada'
import type { CourseAudience } from '../../domain/course/course'
import type {
  MoradaHouseRecord,
  MoradaHouseRepository,
} from '../../domain/ports/morada-house-repository.port'
import type { RoomRepository } from '../../domain/ports/room-repository.port'
import { migrateLegacyRoom, PRESERVED_ROOM_TROPHIES } from '../../domain/room/morada-migration'

export interface MoradaHouseEnvelope extends MoradaHouseRecord {
  owned: string[]
}
export class MoradaInvalidError extends DomainError {
  readonly code = 'MORADA_INVALID'
}
export class MoradaConflictError extends DomainError {
  readonly code = 'MORADA_CONFLICT'
  constructor(readonly current: MoradaHouseEnvelope) {
    super('A casa mudou em outro lugar. Reabra a versão atual antes de salvar.')
  }
}
export class MoradaLegacyClientError extends DomainError {
  readonly code = 'MORADA_CLIENT_OUTDATED'
  constructor() {
    super('Este editor precisa ser atualizado para salvar a casa Morada.')
  }
}

export class MoradaHouseService {
  constructor(
    private readonly houses: MoradaHouseRepository,
    private readonly rooms: RoomRepository,
    private readonly clock: () => Date,
  ) {}

  async read(userId: string, audience: CourseAudience): Promise<MoradaHouseEnvelope> {
    const [stored, raw, inventory] = await Promise.all([
      this.houses.get(userId, audience),
      this.rooms.getState(userId, audience),
      this.rooms.listInventory(userId, audience),
    ])
    const shape = stored ? MoradaHouseSchema.safeParse(stored.house) : null
    if (shape && !shape.success)
      throw new MoradaInvalidError('A casa guardada precisa de recuperação: estrutura inválida.')
    const recovered = shape?.success ? reconcileMoradaHouse(shape.data) : null
    if (stored && recovered) {
      const errors = validateMoradaHouse(recovered)
      if (!Number.isSafeInteger(stored.revision) || stored.revision < 1 || errors.length)
        throw new MoradaInvalidError(`A casa guardada precisa de recuperação: ${errors.join('; ')}`)
    }
    const house = recovered ?? migrateLegacyRoom(raw, inventory)
    return {
      house,
      revision: stored?.revision ?? 0,
      owned: moradaOwned(inventory, house),
    }
  }

  async assertLegacyWritable(userId: string, audience: CourseAudience): Promise<void> {
    if (await this.houses.get(userId, audience)) throw new MoradaLegacyClientError()
  }

  async save(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    input: { house: MoradaHouse; revision: number; scope?: 'room' | 'house' },
  ): Promise<MoradaHouseEnvelope> {
    if (!Number.isSafeInteger(input.revision) || input.revision < 0)
      throw new MoradaInvalidError('Revisão inválida.')
    const parsed = MoradaHouseSchema.safeParse(input.house)
    if (!parsed.success)
      throw new MoradaInvalidError(parsed.error.issues.map((issue) => issue.message).join('; '))
    const current = await this.read(userId, audience)
    if (current.revision !== input.revision) throw new MoradaConflictError(current)
    let house = parsed.data
    if (input.scope === 'room') {
      const roomId = current.house.roomId
      const room = house.rooms.find((r) => r.id === roomId)
      if (!room || house.roomId !== roomId)
        throw new MoradaInvalidError(
          'O quarto da casa não pode ser removido pelo editor do quarto.',
        )
      house = {
        ...current.house,
        pet: house.pet,
        rooms: current.house.rooms.map((r) =>
          r.id === roomId ? { ...room, origin: r.origin } : r,
        ),
        instances: [
          ...current.house.instances.filter((i) => i.roomId !== roomId),
          ...house.instances.filter((i) => i.roomId === roomId),
        ],
      }
    }
    const migrations = new Set([...(current.house.migrations ?? []), ...(house.migrations ?? [])])
    if (migrations.size) house.migrations = [...migrations]
    const errors = validateMoradaHouse(house)
    // A posse: troféu conquistado, peça comprada, ou peça que já estava na casa guardada (o
    // `owned` da leitura inclui as da casa: ninguém perde o que já pôs).
    const owned = new Set(current.owned)
    for (const instance of house.instances) {
      // Peça só do adulto não entra no Kids, a não ser a que já estava na casa.
      if (
        audience !== 'adult' &&
        isMoradaAdultOnly(instance.pieceId) &&
        !owned.has(instance.pieceId)
      )
        errors.push('Esta peça não está disponível aqui.')
      else if (!moradaInstanceAllowed(instance, owned))
        errors.push(
          isMoradaTrophyTier(instance.pieceId)
            ? 'Troféu ainda não conquistado.'
            : `Peça ainda não comprada: ${MORADA_CATALOG.pieces[instance.pieceId]?.label ?? instance.pieceId}.`,
        )
    }
    if (house.pet && !moradaPieceAllowed(house.pet, owned))
      errors.push('Bichinho ainda não comprado.')
    errors.push(...moradaBehaviorProblems(current.house, house, input.scope ?? 'house'))
    if (errors.length) throw new MoradaInvalidError(errors.join('; '))
    // A posse "por estar na casa" vira posse de verdade quando a peça SAI da casa guardada: senão
    // tirar a peça (com o salvar sozinho, em 1 s) e desfazer a recusava para sempre ("Peça ainda
    // não comprada"). A peça foi aceita antes (casa convertida, posta antes de haver preço), então
    // guardá-la no inventário não dá nada novo. Antes da troca: falhar aqui não perde a casa.
    const keep = presenceOwnedRemoved(
      current.house,
      house,
      await this.rooms.listInventory(userId, audience),
    )
    for (const pieceId of keep)
      await this.rooms.addToInventory(userId, audience, pieceId, this.clock())
    const saved = await this.houses.compareAndSwap(
      userId,
      accountId,
      audience,
      input.revision,
      house,
      this.clock(),
    )
    if (!saved) throw new MoradaConflictError(await this.read(userId, audience))
    // A posse de depois de salvar (a peça que saiu da casa e não foi comprada deixa de ser dela;
    // devolver a de antes faria o editor oferecê-la como dela e o próximo salvamento recusar).
    const inventory = await this.rooms.listInventory(userId, audience)
    return { ...saved, owned: moradaOwned(inventory, saved.house) }
  }
}

/**
 * O que a criança tem na Morada, para o editor, o jogo e o salvamento:
 * - os troféus conquistados (`trophy/<id>`);
 * - a estante de troféus, para quem ganhou a `estante-trofeus` com o primeiro troféu;
 * - as peças compradas (o id Morada no `room_inventory`);
 * - as peças que já estão na casa (a casa convertida e o que foi posto antes de haver preço),
 *   menos as funções do jogo, que valem pela função e não viram posse da peça.
 * Peça grátis não entra: `moradaPieceAllowed` já a aceita.
 */
export function moradaOwned(inventory: readonly string[], house: MoradaHouse): string[] {
  const owned = new Set<string>()
  for (const id of inventory) {
    if ((PRESERVED_ROOM_TROPHIES as readonly string[]).includes(id)) owned.add(`trophy/${id}`)
    else if (id === LEGACY_TROPHY_SHELF) owned.add(MORADA_TROPHY_SHELF)
    else if (MORADA_CATALOG.pieces[id] && !isMoradaFree(id)) owned.add(id)
  }
  for (const instance of house.instances)
    if (
      MORADA_CATALOG.pieces[instance.pieceId] &&
      !isMoradaFree(instance.pieceId) &&
      !isMoradaFunctionInstance(instance)
    )
      owned.add(instance.pieceId)
  if (house.pet && MORADA_CATALOG.pieces[house.pet] && !isMoradaFree(house.pet))
    owned.add(house.pet)
  return [...owned]
}

/**
 * As funções do jogo (`behavior: objeto:<id>`, a geladeira, o fliperama…): uma instância por função
 * na casa inteira, e o editor do QUARTO (`scope: 'room'`) não cria função nova, só mexe nas que a
 * casa guardada já tem (quem dá a função é o jogo, `scope: 'house'`). Sem isto, o "Duplicar" do
 * quarto copiava a geladeira do jogo: peça paga de graça e a edição da casa travada no Arquipélago
 * ("Um projeto funcional só pode estar em um lugar"; revisão de 26/11/2026).
 */
export function moradaBehaviorProblems(
  before: MoradaHouse,
  next: MoradaHouse,
  scope: 'room' | 'house',
): string[] {
  const errors: string[] = []
  const known = new Set(before.instances.flatMap((i) => (i.behavior ? [i.behavior] : [])))
  const seen = new Set<string>()
  for (const instance of next.instances) {
    if (!instance.behavior) continue
    if (seen.has(instance.behavior)) errors.push('Um projeto funcional só pode estar em um lugar.')
    seen.add(instance.behavior)
    if (scope === 'room' && !known.has(instance.behavior))
      errors.push('Esta função chega pelo jogo, não pelo quarto.')
  }
  return errors
}

/**
 * As peças pagas que só eram da criança por estarem na casa guardada (fora do inventário, sem ser
 * função do jogo) e que a casa nova não tem mais: essas entram no inventário ao salvar.
 */
export function presenceOwnedRemoved(
  before: MoradaHouse,
  next: MoradaHouse,
  inventory: readonly string[],
): string[] {
  const stored = new Set(inventory)
  const still = new Set(next.instances.map((i) => i.pieceId))
  if (next.pet) still.add(next.pet)
  const out = new Set<string>()
  for (const instance of before.instances)
    if (
      MORADA_CATALOG.pieces[instance.pieceId] &&
      !isMoradaFree(instance.pieceId) &&
      !isMoradaFunctionInstance(instance) &&
      !stored.has(instance.pieceId) &&
      !still.has(instance.pieceId)
    )
      out.add(instance.pieceId)
  if (
    before.pet &&
    MORADA_CATALOG.pieces[before.pet] &&
    !isMoradaFree(before.pet) &&
    !stored.has(before.pet) &&
    !still.has(before.pet)
  )
    out.add(before.pet)
  return [...out]
}
