import { ToolRejected } from '@sistemazero/agent-core'
import {
  GitHub,
  githubDraftSchema,
  githubReadSchema,
  repositorySchema,
} from '@sistemazero/agent-integrations/github'
import { Telegram, telegramMessageSchema } from '@sistemazero/agent-integrations/telegram'
import { z } from 'zod'
import { Credentials } from '../credentials'
import type { Dispatcher } from '../execution/dispatcher'
import { Locks } from '../execution/locks'
import type { Supervisor } from '../supervisor'
import { tool } from '../tools/definition'
import { hash } from '../tools/paths'
import { Outbound } from './outbound'

const configSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('github'),
    repositories: z.array(repositorySchema).min(1).max(20),
    connectionId: z.string().uuid(),
  }),
  z.object({
    kind: z.literal('telegram'),
    chats: z.array(telegramMessageSchema.shape.chatId).min(1).max(20),
    connectionId: z.string().uuid(),
  }),
])
const binding = z.object({ connectionId: z.string().uuid() })
const intentId = z
  .string()
  .min(8)
  .max(100)
  .regex(/^[\w-]+$/)
export function setupNotifications(supervisor: Supervisor, dispatcher: Dispatcher) {
  const vault = new Credentials(supervisor.directory),
    outbound = new Outbound(supervisor.store)
  const connections = new Locks()
  let github: { hash: string; client: GitHub } | undefined,
    telegram: { hash: string; client: Telegram } | undefined
  const getConfig = async (kind: string, connectionId?: string) => {
    const raw = await supervisor.store.call({
      op: 'document.get',
      namespace: 'connections',
      id: kind,
    })
    if (!raw)
      throw new ToolRejected(
        'CONNECTION_REQUIRED',
        'Configure this integration and its allowed destinations first',
      )
    const config = configSchema.parse(raw)
    if (connectionId && config.connectionId !== connectionId)
      throw new ToolRejected(
        'CONNECTION_CHANGED',
        'Connection changed after this operation was prepared',
      )
    return config
  }
  const token = async (kind: string) => {
    const secret = await vault.get(kind)
    if (!secret)
      throw new ToolRejected(
        'CREDENTIAL_REQUIRED',
        'Connect this integration through the local credential command',
      )
    return secret
  }
  const githubClient = async () => {
    const secret = await token('github')
    if (github?.hash !== hash(secret)) github = { hash: hash(secret), client: new GitHub(secret) }
    return github.client
  }
  const telegramClient = async () => {
    const secret = await token('telegram')
    if (telegram?.hash !== hash(secret))
      telegram = { hash: hash(secret), client: new Telegram(secret) }
    return { client: telegram.client, botId: secret.split(':')[0] }
  }
  supervisor.commands.set('integration.configure', async (raw) => {
    const config = configSchema.parse({
      ...z.record(z.string(), z.unknown()).parse(raw),
      connectionId: crypto.randomUUID(),
    })
    await connections.with(config.kind, () =>
      supervisor.store.call({
        op: 'document.put',
        namespace: 'connections',
        id: config.kind,
        value: config,
      }),
    )
    return config
  })
  supervisor.commands.set('integration.secret', async (raw) => {
    const { kind, value } = z
      .object({ kind: z.enum(['github', 'telegram']), value: z.string().min(10).max(4096) })
      .parse(raw)
    return connections.with(kind, async () => {
      const config = await getConfig(kind)
      if (kind === 'telegram') new Telegram(value)
      // Rotate binding first: an old approval cannot cross an account change.
      const updated = { ...config, connectionId: crypto.randomUUID() }
      await supervisor.store.call({
        op: 'document.put',
        namespace: 'connections',
        id: kind,
        value: updated,
      })
      await vault.set(kind, value)
      return { ...updated, connected: true }
    })
  })
  supervisor.commands.set('integration.disconnect', async (raw) => {
    const { kind } = z.object({ kind: z.enum(['github', 'telegram']) }).parse(raw)
    return connections.with(kind, async () => {
      const config = await getConfig(kind)
      await supervisor.store.call({
        op: 'document.put',
        namespace: 'connections',
        id: kind,
        value: { ...config, connectionId: crypto.randomUUID() },
      })
      await vault.delete(kind)
      return { connected: false }
    })
  })
  supervisor.commands.set('integrations.status', async () =>
    Promise.all(
      ['github', 'telegram'].map(async (kind) => {
        const config = await supervisor.store.call({
          op: 'document.get',
          namespace: 'connections',
          id: kind,
        })
        return {
          kind,
          configured: Boolean(config),
          connected: Boolean(await vault.get(kind)),
          ...(config ? { configuration: configSchema.parse(config) } : {}),
        }
      }),
    ),
  )
  supervisor.commands.set('outbound.list', (raw) =>
    supervisor.store.call({
      op: 'document.page',
      namespace: 'outbound',
      limit: 50,
      ...z.object({ after: z.string().default('') }).parse(raw),
    }),
  )
  supervisor.commands.set('outbound.reconcile', (raw) => {
    const input = z
      .object({
        id: z.string(),
        resolution: z.enum(['confirmed', 'not_applied']),
        evidence: z.string().min(10).max(8000),
        value: z.unknown().optional(),
      })
      .parse(raw)
    return outbound.reconcile(input.id, input.resolution, input.evidence, input.value)
  })
  const githubBinding = binding.extend({ repository: repositorySchema })
  async function authorizeGithub(input: z.infer<typeof githubBinding>) {
    return connections.with('github', async () => {
      const config = await getConfig('github', input.connectionId)
      if (
        config.kind !== 'github' ||
        !config.repositories.some((repo) => repo.toLowerCase() === input.repository.toLowerCase())
      )
        throw new ToolRejected('REPOSITORY_DENIED', 'Repository is outside configured scope')
      return githubClient()
    })
  }
  dispatcher.register(
    tool(
      'github_read',
      'Read paged pull requests/files, check runs or workflow runs from a configured repository. Responses include source and observation time.',
      'read',
      githubBinding.extend({ operation: githubReadSchema }),
      async (input, context) =>
        (await authorizeGithub(input)).read(input.repository, input.operation, context.signal),
    ),
  )
  dispatcher.register(
    tool(
      'github_draft_pr',
      'Create a draft pull request for an already pushed branch at the reviewed commit. Does not push or merge. Stable intentId prevents duplicate publication; an uncertain receipt requires explicit reconciliation.',
      'external',
      githubBinding.extend({ intentId, pull: githubDraftSchema }),
      async (input, context) => {
        const client = await authorizeGithub(input)
        const receipt = await outbound.execute(
          'github-pr',
          input.repository.toLowerCase(),
          input.intentId,
          input.pull,
          context.run.id,
          (marker) => client.draft(input.repository, input.pull, marker, context.signal),
        )
        return {
          ...receipt,
          success: z.object({ success: z.boolean() }).parse(receipt.value).success,
        }
      },
    ),
  )
  dispatcher.register(
    tool(
      'telegram_send',
      'Send one plain text notification to an explicitly configured chat. A stable intentId deduplicates confirmed sends. Telegram has no send idempotency lookup; an ambiguous response never triggers an automatic resend.',
      'external',
      binding.extend({ intentId, message: telegramMessageSchema }),
      async (input, context) => {
        const { client, botId } = await connections.with('telegram', async () => {
          const config = await getConfig('telegram', input.connectionId)
          if (config.kind !== 'telegram' || !config.chats.includes(input.message.chatId))
            throw new ToolRejected('DESTINATION_DENIED', 'Chat is outside configured scope')
          return telegramClient()
        })
        return outbound.execute(
          'telegram',
          String(botId),
          input.intentId,
          input.message,
          context.run.id,
          () => client.send(input.message, context.signal),
        )
      },
    ),
  )
}
