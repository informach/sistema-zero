/** Convites já concluídos: libera participação no prazo restante, sem enviar mensagens. */
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { isMuralTrialGranted } from '../src/domain/gift-policy'
import { loadEnv } from '../src/infrastructure/config/env'
import { createReferralsGatewayClient } from '../src/infrastructure/gateways/gateway.client'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { scholarshipRedemptions as redemptions } from '../src/infrastructure/persistence/drizzle/schema'

const args = process.argv.slice(2)
if (args.includes('--help')) {
  console.log(
    'bun run gifts:upgrade-mural [--apply] — sem --apply, somente lista resgates elegíveis; não envia e-mails.',
  )
} else {
  if (args.some((arg) => arg !== '--apply')) throw new Error('Argumento desconhecido. Use --help.')
  const apply = args.includes('--apply')
  const env = loadEnv()
  if (apply && (!env.GATEWAY_URL || !env.REFERRALS_HMAC_SECRET))
    throw new Error('GATEWAY_URL e REFERRALS_HMAC_SECRET são obrigatórios para aplicar.')
  const connection = createDbConnection(env.DATABASE_URL, { max: 1 })
  try {
    // A oferta histórica sem prazo não é convertida em teste de sete dias.
    const eligible = and(
      eq(redemptions.status, 'completed'),
      eq(redemptions.muralVisitorPolicy, 'visitor'),
      eq(redemptions.accessDurationDays, 7),
      isNotNull(redemptions.userId),
      isNotNull(redemptions.grantedAt),
      sql`${redemptions.createdAt} + interval '7 days' > now()`,
    )
    const rows = await connection.db.select().from(redemptions).where(eligible)
    console.log(
      `${apply ? 'Aplicação' : 'Simulação'}: ${rows.length} convite(s) com prazo restante.`,
    )
    const gateway =
      env.GATEWAY_URL && env.REFERRALS_HMAC_SECRET
        ? createReferralsGatewayClient({
            baseUrl: env.GATEWAY_URL,
            hmacSecret: env.REFERRALS_HMAC_SECRET,
            timeoutMs: env.S2S_TIMEOUT_MS,
          })
        : null
    for (const row of rows) {
      const expiresAt = new Date(row.createdAt.getTime() + 7 * 86_400_000)
      console.log(JSON.stringify({ redemptionId: row.id, expiresAt: expiresAt.toISOString() }))
      if (!apply || !gateway || !row.userId) continue
      // Members confere a matrícula da mesma origem; revogação/expiração não é desfeita.
      const result = await gateway.grantMuralTrial({
        userId: row.userId,
        sourceId: `scholarship:${row.id}`,
        courseRef: row.courseSlug ?? env.SCHOLARSHIP_COURSE_SLUG,
        expiresAt: expiresAt.toISOString(),
        deliveryId: `scholarship:mural-trial:${row.id}`,
      })
      if (!isMuralTrialGranted(result)) {
        console.error(
          JSON.stringify({ redemptionId: row.id, status: result.status, updated: false }),
        )
        process.exitCode = 1
        continue
      }
      const updated = await connection.db
        .update(redemptions)
        .set({
          muralVisitorPolicy: 'trial',
          muralVisitorGrantedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(redemptions.id, row.id), eligible))
        .returning({ id: redemptions.id })
      if (updated.length !== 1) {
        console.error(
          JSON.stringify({
            redemptionId: row.id,
            error: 'Prazo ou estado mudou; conferir o resgate.',
          }),
        )
        process.exitCode = 1
      }
    }
  } finally {
    await connection.close()
  }
}
