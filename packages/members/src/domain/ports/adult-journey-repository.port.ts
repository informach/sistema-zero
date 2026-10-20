import type {
  AdultCourseMilestone,
  AdultCreatorCapability,
  AdultJourneyPolicy,
} from '@sistemazero/core/journey'

export interface AdultJourneyPolicyRecord {
  version: number
  policy: AdultJourneyPolicy
}
export interface AdultJourneyRepository {
  getPolicy(): Promise<AdultJourneyPolicyRecord | null>
  savePolicy(
    policy: AdultJourneyPolicy,
    expectedVersion: number,
    now: Date,
  ): Promise<AdultJourneyPolicyRecord | null>
  /**
   * Insere a política só se não existir nenhuma (sob advisory lock próprio + insert-if-absent);
   * devolve `null` quando já havia política. Nunca atualiza uma existente.
   */
  insertPolicyIfAbsent(
    policy: AdultJourneyPolicy,
    now: Date,
  ): Promise<AdultJourneyPolicyRecord | null>
  listMilestones(userId: string): Promise<AdultCourseMilestone[]>
  /** Os marcos de VÁRIAS pessoas numa consulta só (a etapa nas listas: ranking, Mural, Clube). */
  listMilestonesForUsers(userIds: readonly string[]): Promise<Map<string, AdultCourseMilestone[]>>
  listGranted(userId: string): Promise<AdultCreatorCapability[]>
  /** O piso gravado (a posição mais alta já alcançada); `null` sem registro. */
  getReached(userId: string): Promise<number | null>
  /** Os pisos de VÁRIAS pessoas numa consulta só (só leitura, para as listas). */
  listReachedForUsers(userIds: readonly string[]): Promise<Map<string, number>>
  /**
   * Congela as capacidades novas e sobe o piso da posição (`reachedPosition`, monotônico: nunca
   * desce) na MESMA transação, sob a versão da política em que foram calculados. Versão mudou ou
   * conta em exclusão → `false` e nada é gravado.
   */
  freezeGranted(
    userId: string,
    version: number,
    capabilities: readonly AdultCreatorCapability[],
    now: Date,
    reachedPosition?: number | null,
  ): Promise<boolean>
}
