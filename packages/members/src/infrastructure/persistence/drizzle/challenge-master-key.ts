import { type SQL, sql } from 'drizzle-orm'
import {
  CHALLENGE_COURSES,
  CHALLENGE_MASTER_KEY,
} from '../../../domain/entitlement/challenge-courses'
import { entitlements } from './schema'

/**
 * A chave-mestra que já cobre o Desafio de cada linha de `entitlements`, pelo público do curso
 * (Kids: `all_kids_courses`; adulto: `all_courses`). Sai de `CHALLENGE_COURSES`, a mesma lista
 * que filtra as linhas, então um Desafio novo entra nos dois lugares de uma vez.
 */
export const CHALLENGE_MASTER_KEY_FOR_ROW: SQL = sql`case ${entitlements.courseRef} ${sql.join(
  Object.entries(CHALLENGE_COURSES).map(
    ([courseRef, audience]) => sql`when ${courseRef} then ${CHALLENGE_MASTER_KEY[audience]}`,
  ),
  sql` `,
)} end`
