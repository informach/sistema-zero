import { ValidationError } from '@sistemazero/core/errors'
import type {
  ProfileCohortQuery,
  ProfileCohortRepository,
} from '../../domain/ports/profile-cohort-repository.port'
import { ProfileCohortQuerySchema } from '../../domain/profile/profile-cohort'

/** Bootstrap only. New profiles behind this cursor are protected by universal pending admission. */
export class ReadProfileCohortService {
  constructor(private readonly profiles: ProfileCohortRepository) {}

  execute(input: ProfileCohortQuery) {
    const parsed = ProfileCohortQuerySchema.safeParse(input)
    if (!parsed.success) throw new ValidationError('Consulta da coorte de perfis inválida')
    return this.profiles.readPage(parsed.data)
  }
}
