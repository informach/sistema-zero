import type { CourseAudience } from '../course/course'

export interface RankingCursorPayload {
  audience: CourseAudience
  viewerUserId: string
  snapshotAt: Date
  xp: number
  userId: string
}

/** Cursor público opaco: o identificador interno nunca pode ficar legível no browser. */
export interface RankingCursorCodec {
  encode(payload: RankingCursorPayload): string
  decode(token: string): RankingCursorPayload | null
}
