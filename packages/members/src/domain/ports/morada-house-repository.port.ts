import type { MoradaHouse } from '@sistemazero/core/morada'
import type { CourseAudience } from '../course/course'

export interface MoradaHouseRecord {
  house: MoradaHouse
  revision: number
}
export interface MoradaHouseRepository {
  get(userId: string, audience: CourseAudience): Promise<MoradaHouseRecord | null>
  compareAndSwap(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    expectedRevision: number,
    house: MoradaHouse,
    now: Date,
  ): Promise<MoradaHouseRecord | null>
}
