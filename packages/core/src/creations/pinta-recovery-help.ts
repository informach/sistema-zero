import { z } from 'zod'

/**
 * O pedido de ajuda da recuperação de desenhos do Pinta (23/11/2026), o mesmo contrato no BFF e
 * no Members. Só identifica a recuperação: o perfil (o armazenamento local do Pinta), cada edição
 * guardada (`opId`) com os desenhos dela e a hora. Nenhum byte de desenho viaja.
 *
 * Tetos contra abuso, escolhidos para o recado que o Members monta caber SEMPRE na coluna (8000):
 * 20 edições e 40 desenhos no total. Acima disso o pedido é recusado e o aviso continua oferecendo
 * o "Baixar arquivos para a equipe".
 */
export const PINTA_RECOVERY_HELP_LIMITS = { operations: 20, drawings: 40, name: 120 } as const

export const PintaRecoveryHelpReportSchema = z
  .strictObject({
    kind: z.literal('retained-recovery'),
    profile: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9:_-]+$/),
    requestedAt: z.iso.datetime({ offset: true }),
    operations: z
      .array(
        z.strictObject({
          opId: z.uuid(),
          drawings: z
            .array(
              z.strictObject({
                id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
                name: z.string().max(PINTA_RECOVERY_HELP_LIMITS.name).nullable(),
              }),
            )
            .max(PINTA_RECOVERY_HELP_LIMITS.drawings),
        }),
      )
      .min(1)
      .max(PINTA_RECOVERY_HELP_LIMITS.operations),
  })
  .refine(
    (report) =>
      report.operations.reduce((total, op) => total + op.drawings.length, 0) <=
      PINTA_RECOVERY_HELP_LIMITS.drawings,
    { message: 'Desenhos demais no pedido de ajuda' },
  )
export type PintaRecoveryHelpReport = z.infer<typeof PintaRecoveryHelpReportSchema>
