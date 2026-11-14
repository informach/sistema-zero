import { DomainError } from '@sistemazero/core/errors'
import {
  MORADA_CATALOG,
  type MoradaHouse,
  MoradaHouseSchema,
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
    const owned = inventory
      .filter((id) => (PRESERVED_ROOM_TROPHIES as readonly string[]).includes(id))
      .map((id) => `trophy/${id}`)
    return {
      house: recovered ?? migrateLegacyRoom(raw, inventory),
      revision: stored?.revision ?? 0,
      owned,
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
    for (const instance of house.instances) {
      const piece = MORADA_CATALOG.pieces[instance.pieceId]
      if (piece?.tags.includes('trophy') && !current.owned.includes(instance.pieceId))
        errors.push('Troféu ainda não conquistado.')
    }
    if (errors.length) throw new MoradaInvalidError(errors.join('; '))
    const saved = await this.houses.compareAndSwap(
      userId,
      accountId,
      audience,
      input.revision,
      house,
      this.clock(),
    )
    if (!saved) throw new MoradaConflictError(await this.read(userId, audience))
    return { ...saved, owned: current.owned }
  }
}
