import { artifactSchema, ToolRejected } from '@sistemazero/agent-core'
import {
  ApiError,
  parseBuildRequest,
  STUDIO_PRO_TEMPLATE_IDS,
  StaffClient,
  type StaffOperation,
  serviceOrigin,
  staffMessageSchema,
  staffMutation,
  staffOperationSchema,
} from '@sistemazero/agent-integrations/sistemazero'
import { z } from 'zod'
import { Credentials } from '../credentials'
import type { Dispatcher } from '../execution/dispatcher'
import { Artifacts } from '../store/artifacts'
import type { Supervisor } from '../supervisor'
import { tool } from '../tools/definition'
import { hash, readBounded, workspacePath } from '../tools/paths'

const connectionSchema = z.object({ origin: z.string().url(), userId: z.string().uuid() })
export function setupStaff(supervisor: Supervisor, dispatcher: Dispatcher) {
  const credentials = new Credentials(supervisor.directory)
  const artifacts = new Artifacts(supervisor.directory)
  let current: StaffClient | undefined
  async function client(expectedOrigin?: string) {
    const raw = await supervisor.store.call({
      op: 'document.get',
      namespace: 'connections',
      id: 'sistemazero',
    })
    if (!raw)
      throw new ToolRejected(
        'STAFF_NOT_CONFIGURED',
        'Configure Sistema Zero in connections before using staff operations',
      )
    const { origin } = z.object({ origin: z.string() }).parse(raw)
    if (expectedOrigin && serviceOrigin(expectedOrigin) !== origin)
      throw new ToolRejected(
        'STAFF_ORIGIN_CHANGED',
        'Configured origin differs from reviewed operation',
      )
    if (current?.http.origin !== origin) current = new StaffClient(origin, credentials)
    return current
  }
  supervisor.commands.set('staff.configure', async (raw) => {
    const { origin } = z.object({ origin: z.string().url() }).parse(raw)
    const normalized = serviceOrigin(origin)
    await supervisor.store.call({
      op: 'document.put',
      namespace: 'connections',
      id: 'sistemazero',
      value: { origin: normalized },
    })
    return { origin: normalized }
  })
  supervisor.commands.set('staff.status', async (_raw, signal) => {
    const configured = await supervisor.store.call({
      op: 'document.get',
      namespace: 'connections',
      id: 'sistemazero',
    })
    return configured ? (await client()).status(signal) : { connected: false, configured: false }
  })
  supervisor.commands.set('staff.otp.request', async (raw, signal) =>
    (await client()).requestCode(z.object({ email: z.string().email() }).parse(raw).email, signal),
  )
  supervisor.commands.set('staff.otp.verify', async (raw, signal) => {
    const { email, code } = z.object({ email: z.string().email(), code: z.string() }).parse(raw)
    return (await client()).verifyCode(email, code, signal)
  })
  supervisor.commands.set('staff.logout', async (_raw, signal) => (await client()).logout(signal))
  const execute = async (
    input: z.infer<typeof connectionSchema>,
    operation: StaffOperation,
    signal: AbortSignal,
  ) => {
    try {
      const result = await (await client(input.origin)).operation(operation, signal, input.userId)
      return {
        ...result,
        source: input.origin,
        action: operation.action,
        observedAt: new Date().toISOString(),
      }
    } catch (error) {
      if (
        error instanceof ApiError &&
        ([400, 401, 403, 404, 409, 422, 429].includes(error.status) ||
          error.code === 'CIRCUIT_OPEN')
      )
        throw new ToolRejected(error.code, error.message)
      throw error
    }
  }
  dispatcher.register(
    tool(
      'sistemazero_read',
      'Read current staff identity, message receipts/templates, helpdesk tickets/KB or Studio submissions. Requires configured origin and account. Paged reads, no credentials in inputs.',
      'read',
      connectionSchema.extend({
        operation: staffOperationSchema.refine(
          (value) => !staffMutation(value),
          'Read operations only',
        ),
      }),
      (input, context) => execute(input, input.operation, context.signal),
    ),
  )
  dispatcher.register(
    tool(
      'sistemazero_message_send',
      'Enqueue an email or WhatsApp template for the exact reviewed recipient. Requires admin permission and a stable intentId. 202 means accepted/queued, not delivered. Read messages.status to reconcile; never blindly resend an uncertain operation.',
      'external',
      connectionSchema.extend({ message: staffMessageSchema }),
      (input, context) =>
        execute(input, { action: 'messages.send', message: input.message }, context.signal),
    ),
  )
  const reply = z.object({
    id: z.string().uuid(),
    version: z.number().int().nonnegative(),
    body: z.string().min(1).max(8000),
  })
  dispatcher.register(
    tool(
      'studio_build_prepare',
      'Capture selected workspace files into the shared Studio build contract. Hashes must match; reserved runtime config is excluded. Returns an immutable artifact and manifest for review.',
      'read',
      z.object({
        templateId: z.enum(STUDIO_PRO_TEMPLATE_IDS),
        files: z
          .array(
            z.object({ path: z.string().max(180), sha256: z.string().regex(/^[a-f0-9]{64}$/) }),
          )
          .min(1)
          .max(80),
      }),
      async (input, context) => {
        const files: Record<string, string> = {}
        let bytes = 0
        for (const file of input.files) {
          const data = await readBounded(
            await workspacePath(context.workspace, file.path),
            1_024_000,
          )
          bytes += data.length
          if (bytes > 2_000_000)
            throw new ToolRejected('STUDIO_LIMIT', 'Studio snapshot exceeds 2 MB')
          if (hash(data) !== file.sha256)
            throw new ToolRejected('STUDIO_STALE', 'Source changed since review')
          if (Object.hasOwn(files, file.path))
            throw new ToolRejected('STUDIO_DUPLICATE', 'Duplicate file path')
          files[file.path] = new TextDecoder('utf8', { fatal: true }).decode(data)
        }
        const build = parseBuildRequest({
          executionId: crypto.randomUUID(),
          templateId: input.templateId,
          files,
        })
        return {
          artifact: await artifacts.put(
            JSON.stringify(build),
            'application/vnd.sistemazero.studio-build+json',
          ),
          templateId: build.templateId,
          files: Object.entries(build.files).map(([path, content]) => ({
            path,
            sha256: hash(content),
            bytes: Buffer.byteLength(content),
          })),
        }
      },
    ),
  )
  dispatcher.register(
    tool(
      'studio_build',
      'Build the exact prepared Studio artifact through the authorized backend facade. Uses the existing restricted Studio runtime contract; server credentials never enter the client. Produces HTML and build-log artifacts.',
      'external',
      connectionSchema.extend({ artifact: artifactSchema }),
      async (input, context) => {
        if (input.artifact.bytes > 2_000_000)
          throw new ToolRejected('STUDIO_LIMIT', 'Build artifact exceeds limit')
        const build = parseBuildRequest(
          JSON.parse((await artifacts.read(input.artifact)).toString('utf8')),
        )
        const result = await execute(input, { action: 'studio.build', build }, context.signal)
        const output = z
          .discriminatedUnion('ok', [
            z.object({
              ok: z.literal(true),
              html: z.string().max(2_500_000),
              output: z.string(),
              durationMs: z.number(),
            }),
            z.object({
              ok: z.literal(false),
              code: z.string(),
              message: z.string(),
              output: z.string().optional(),
            }),
          ])
          .parse(result.value)
        return output.ok
          ? {
              success: true,
              html: await artifacts.put(output.html, 'text/html'),
              log: await artifacts.put(output.output),
              durationMs: output.durationMs,
            }
          : {
              success: false,
              code: output.code,
              message: output.message,
              ...(output.output ? { log: await artifacts.put(output.output) } : {}),
            }
      },
    ),
  )
  dispatcher.register(
    tool(
      'sistemazero_helpdesk_reply',
      'Submit a reviewed human reply to the exact ticket version. Always requires a fresh human confirmation, even when a capability grant exists. The service preserves its delivery intent and reconciliation rules.',
      'external',
      connectionSchema.extend({ reply }),
      async (input, context) => {
        const confirmation = await context.ask(
          `Enviar resposta humana ao chamado ${input.reply.id}, versão ${input.reply.version}?\n${input.reply.body}`,
          ['approve', 'deny'],
        )
        if (confirmation !== 'approve')
          throw new ToolRejected('HUMAN_REVIEW_REQUIRED', 'Human reply was not approved')
        return execute(input, { action: 'helpdesk.reply', ...input.reply }, context.signal)
      },
    ),
  )
}
