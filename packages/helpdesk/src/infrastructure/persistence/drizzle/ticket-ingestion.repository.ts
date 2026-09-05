import { and, eq, inArray, sql } from 'drizzle-orm'
import type {
  TicketIngestionInput,
  TicketIngestionRepository,
  TicketIngestionResult,
} from '../../../domain/ports/ticket-ingestion-repository.port'
import type { Database } from './db'
import { ticketMessages, tickets } from './schema'

const THREAD_LOCK_NAMESPACE = '71130324050607094'
const MESSAGE_LOCK_NAMESPACE = '71130324050607095'

/** Persistência atômica da mensagem Gmail e da projeção do ticket. */
export class DrizzleTicketIngestionRepository implements TicketIngestionRepository {
  constructor(private readonly db: Database) {}

  async ingest(input: TicketIngestionInput): Promise<TicketIngestionResult> {
    return this.db.transaction(async (tx) => {
      // postgres.js sob Bun exige ISO string em parâmetros dentro de SQL cru.
      const atIso = input.at.toISOString()
      // Locks transacionais tornam determinístico o processamento concorrente de
      // uma thread e protegem o dedupe global mesmo quando dois ticks se cruzam.
      await tx.execute(sql`
        select pg_advisory_xact_lock(
          hashtextextended(${`helpdesk:gmail-thread:${input.ticket.gmailThreadId}`}, ${THREAD_LOCK_NAMESPACE}::bigint)
        )
      `)
      await tx.execute(sql`
        select pg_advisory_xact_lock(
          hashtextextended(${`helpdesk:gmail-message:${input.message.gmailMessageId}`}, ${MESSAGE_LOCK_NAMESPACE}::bigint)
        )
      `)

      const [duplicate] = await tx
        .select({ id: ticketMessages.id })
        .from(ticketMessages)
        .where(eq(ticketMessages.gmailMessageId, input.message.gmailMessageId))
        .limit(1)
      if (duplicate) return { status: 'duplicate' }

      // O poller pode enxergar o e-mail aceito pelo Gmail antes da resposta HTTP
      // concluir o intent. Nesse caso ele confirma a mesma mensagem, sem criar
      // uma segunda linha nem incrementar os contadores duas vezes.
      const [deliveryByRfc822MessageId] = input.message.rfc822MessageId
        ? await tx
            .select({
              id: ticketMessages.id,
              ticketId: ticketMessages.ticketId,
              deliveryState: ticketMessages.deliveryState,
            })
            .from(ticketMessages)
            .where(
              and(
                eq(ticketMessages.rfc822MessageId, input.message.rfc822MessageId),
                eq(ticketMessages.direction, 'outbound'),
              ),
            )
            .limit(1)
        : []

      // Lock de linha sincroniza a projeção com PATCH/respostas humanas que não
      // participam dos advisory locks da ingestão.
      const lockedRows = await tx.execute(sql`
        select id from helpdesk.tickets
        where gmail_thread_id = ${input.ticket.gmailThreadId}
        for update
      `)
      const lockedRow = lockedRows[0]
      const existingTicketId =
        deliveryByRfc822MessageId?.ticketId ??
        (lockedRow && typeof lockedRow.id === 'string' ? lockedRow.id : null)

      if (!existingTicketId) {
        await tx.insert(tickets).values(input.ticket)
        await tx.insert(ticketMessages).values(input.message)
        return { status: 'created', ticketId: input.ticket.id }
      }

      if (
        deliveryByRfc822MessageId &&
        (deliveryByRfc822MessageId.deliveryState === 'pending' ||
          deliveryByRfc822MessageId.deliveryState === 'unknown')
      ) {
        const [confirmed] = await tx
          .update(ticketMessages)
          .set({
            gmailMessageId: input.message.gmailMessageId,
            deliveryState: 'sent',
            deliveryLastError: null,
            gmailInternalDate: input.at,
          })
          .where(
            and(
              eq(ticketMessages.id, deliveryByRfc822MessageId.id),
              inArray(ticketMessages.deliveryState, ['pending', 'unknown']),
            ),
          )
          .returning({ id: ticketMessages.id })
        // Uma decisão humana concorrente pode ter marcado a tentativa como
        // falha. Preservamos essa decisão e importamos o e-mail confirmado como
        // registro Gmail separado, sempre no mesmo ticket (nunca numa thread
        // órfã criada a partir de um portal ticket).
        if (!confirmed) {
          await tx.insert(ticketMessages).values({ ...input.message, ticketId: existingTicketId })
        }
      } else {
        await tx.insert(ticketMessages).values({ ...input.message, ticketId: existingTicketId })
      }

      if (input.direction === 'outbound') {
        await tx
          .update(tickets)
          .set({
            version: sql`${tickets.version} + 1`,
            gmailThreadId: sql`coalesce(${tickets.gmailThreadId}, ${input.ticket.gmailThreadId})`,
            status: sql`case
              when ${tickets.lastMessageAt} <= ${atIso}::timestamptz
                and ${tickets.status} in ('new', 'open')
              then 'waiting'::helpdesk.ticket_status
              else ${tickets.status}
            end`,
            firstMessageAt: sql`least(${tickets.firstMessageAt}, ${atIso}::timestamptz)`,
            lastMessageAt: sql`greatest(${tickets.lastMessageAt}, ${atIso})`,
            messageCount: sql`${tickets.messageCount} + 1`,
            updatedAt: sql`greatest(${tickets.updatedAt}, ${atIso}::timestamptz)`,
          })
          .where(eq(tickets.id, existingTicketId))
      } else {
        await tx
          .update(tickets)
          .set({
            version: sql`${tickets.version} + 1`,
            firstMessageAt: sql`least(${tickets.firstMessageAt}, ${atIso}::timestamptz)`,
            lastMessageAt: sql`greatest(${tickets.lastMessageAt}, ${atIso})`,
            lastInboundAt: sql`
              case
                when ${tickets.lastInboundAt} is null or ${tickets.lastInboundAt} < ${atIso}
                then ${atIso}
                else ${tickets.lastInboundAt}
              end
            `,
            messageCount: sql`${tickets.messageCount} + 1`,
            status: sql`
              case
                when ${tickets.lastMessageAt} <= ${atIso}::timestamptz
                  and ${tickets.status} in ('waiting', 'resolved', 'closed')
                then 'open'::helpdesk.ticket_status
                else ${tickets.status}
              end
            `,
            resolvedAt: sql`
              case
                when ${tickets.lastMessageAt} <= ${atIso}::timestamptz
                  and ${tickets.status} in ('resolved', 'closed')
                then null
                else ${tickets.resolvedAt}
              end
            `,
            aiGeneration: sql`case
              when ${tickets.lastMessageAt} <= ${atIso}::timestamptz
              then ${tickets.aiGeneration} + 1 else ${tickets.aiGeneration}
            end`,
            aiSummary: sql`case when ${tickets.lastMessageAt} <= ${atIso}::timestamptz then null else ${tickets.aiSummary} end`,
            aiSummaryAt: sql`case when ${tickets.lastMessageAt} <= ${atIso}::timestamptz then null else ${tickets.aiSummaryAt} end`,
            aiDraft: sql`case when ${tickets.lastMessageAt} <= ${atIso}::timestamptz then null else ${tickets.aiDraft} end`,
            aiDraftAt: sql`case when ${tickets.lastMessageAt} <= ${atIso}::timestamptz then null else ${tickets.aiDraftAt} end`,
            aiDraftEdited: sql`case when ${tickets.lastMessageAt} <= ${atIso}::timestamptz then false else ${tickets.aiDraftEdited} end`,
            aiClassification: sql`case when ${tickets.lastMessageAt} <= ${atIso}::timestamptz then null else ${tickets.aiClassification} end`,
            aiStatus: sql`case
              when ${tickets.lastMessageAt} <= ${atIso}::timestamptz
              then ${input.aiEnabled ? sql`'pending'` : sql`'skipped'`}::helpdesk.ai_status
              else ${tickets.aiStatus}
            end`,
            aiNextAttemptAt: sql`case
              when ${tickets.lastMessageAt} <= ${atIso}::timestamptz
              then ${input.aiEnabled ? sql`${atIso}::timestamptz` : sql`null`}
              else ${tickets.aiNextAttemptAt}
            end`,
            aiAttempts: sql`case when ${tickets.lastMessageAt} <= ${atIso}::timestamptz then 0 else ${tickets.aiAttempts} end`,
            aiLastError: sql`case when ${tickets.lastMessageAt} <= ${atIso}::timestamptz then null else ${tickets.aiLastError} end`,
            updatedAt: sql`greatest(${tickets.updatedAt}, ${atIso}::timestamptz)`,
          })
          .where(eq(tickets.id, existingTicketId))
      }

      return { status: 'appended', ticketId: existingTicketId }
    })
  }
}
