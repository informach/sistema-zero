import {
  browserActionSchema,
  browserExtractSchema,
  browserTargetSchema,
} from '@sistemazero/agent-integrations/browser'
import { z } from 'zod'
import type { Dispatcher } from '../execution/dispatcher'
import { Previews, verificationSchema } from '../preview/manager'
import { setupViewer } from '../preview/viewer'
import type { Processes } from '../process/manager'
import type { Services } from '../services/registry'
import type { Supervisor } from '../supervisor'
import { tool } from '../tools/definition'
import { Browsers } from './manager'

export function setupBrowser(
  supervisor: Supervisor,
  dispatcher: Dispatcher,
  processes: Processes,
  services: Services,
) {
  setupViewer(supervisor)
  const browsers = new Browsers(supervisor, processes, services)
  const previews = new Previews(supervisor, browsers, services)
  const identity = z.object({ id: z.string() })
  const openSchema = z.object({
    serviceId: z.string().optional(),
    url: z.url().optional(),
    publicWeb: z.boolean().optional(),
  })
  dispatcher.register(
    tool(
      'browser_open',
      'Open an isolated browser restricted to GET/HEAD, with WebSockets blocked. Local URLs require an owned ready service.',
      'read',
      openSchema,
      (input, context) => browsers.open({ ...input, readOnly: true }, context),
    ),
  )
  dispatcher.register(
    tool(
      'browser_open_interactive',
      'Open an interactive Build browser. Page scripts and forms may produce external effects. Local URLs require an owned ready service.',
      'external',
      openSchema.extend({
        account: z
          .string()
          .regex(/^[a-zA-Z0-9_-]{1,80}$/)
          .optional(),
      }),
      (input, context) => browsers.open(input, context),
    ),
  )
  dispatcher.register(
    tool(
      'browser_login',
      'Open an isolated account browser for human login. Never supply credentials through agent tools.',
      'external',
      z.object({ account: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), url: z.url() }),
      (input, context) => browsers.open({ ...input, headed: true }, context),
    ),
  )
  dispatcher.register(
    tool(
      'browser_observe',
      'Observe bounded page text and interactive targets, with revision and independent diagnostics.',
      'read',
      identity,
      (input, context) => browsers.observe(input.id, context),
    ),
  )
  dispatcher.register(
    tool(
      'browser_navigate',
      'Navigate using the browser network policy. Returns a fresh observation.',
      'read',
      identity.extend({ url: z.url() }),
      (input, context) => browsers.navigate(input.id, input.url, context),
    ),
  )
  dispatcher.register(
    tool(
      'browser_navigate_interactive',
      'Navigate an interactive Build browser; page scripts may produce external effects.',
      'external',
      identity.extend({ url: z.url() }),
      (input, context) => browsers.navigate(input.id, input.url, context, true),
    ),
  )
  dispatcher.register(
    tool(
      'browser_extract',
      'Extract named text or safe attributes from unique targets, with revision binding and privacy redaction.',
      'read',
      identity.extend({ fields: browserExtractSchema }),
      (input, context) => browsers.extract(input.id, input.fields, context),
    ),
  )
  const action = identity
    .extend({
      expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
      target: browserTargetSchema,
      action: z.enum(['click', 'fill', 'select', 'check', 'press', 'upload', 'download']),
      value: z.string().max(8000).optional(),
      checked: z.boolean().optional(),
      upload: z
        .object({ path: z.string(), expectedHash: z.string().regex(/^[a-f0-9]{64}$/) })
        .optional(),
    })
    .superRefine((input, ctx) => {
      if (['fill', 'select', 'press'].includes(input.action) && input.value === undefined)
        ctx.addIssue({ code: 'custom', message: 'This action requires value' })
      if (input.action === 'press' && (input.value?.length ?? 0) > 50)
        ctx.addIssue({ code: 'custom', message: 'Key chord exceeds 50 characters' })
      if (input.action === 'check' && input.checked === undefined)
        ctx.addIssue({ code: 'custom', message: 'Check action requires checked' })
      if ((input.action === 'upload') !== Boolean(input.upload))
        ctx.addIssue({
          code: 'custom',
          message: 'Upload action requires an upload reference; other actions must omit it',
        })
    })
  dispatcher.register(
    tool(
      'browser_act',
      'Perform one reviewed browser action against the exact observed revision. External outcome may be uncertain after transport loss.',
      'external',
      action,
      (input, context) =>
        browsers.action(input.id, browserActionSchema.parse(input), context, input.upload),
    ),
  )
  dispatcher.register(
    tool(
      'browser_screenshot',
      'Capture bounded viewport PNG, masking passwords and private elements.',
      'read',
      identity,
      (input, context) => browsers.screenshot(input.id, context),
    ),
  )
  dispatcher.register(
    tool(
      'browser_trace',
      'Read bounded operation metadata and console/network diagnostics, without cookies or request bodies.',
      'read',
      identity,
      (input, context) => browsers.inspect(input.id, context),
    ),
  )
  dispatcher.register(
    tool(
      'browser_close',
      'Close this session and its owned Chromium process tree.',
      'read',
      identity,
      (input, context) => browsers.closeOwned(input.id, context),
    ),
  )
  dispatcher.register(
    tool(
      'preview_revision',
      'Hash source files of the environment serving this preview.',
      'read',
      identity,
      (input, context) => previews.revision(input.id, context),
    ),
  )
  dispatcher.register(
    tool(
      'preview_verify',
      'Verify text assertions, diagnostics, stable source/DOM and the application reporter. Missing reporter is unverified. Stops after three attempts or repeated results on the same source.',
      'read',
      verificationSchema,
      (input, context) => previews.verify(input, context),
    ),
  )
  dispatcher.register(
    tool(
      'preview_candidate',
      'Read the last validated candidate and recompute whether its source evidence is stale.',
      'read',
      identity,
      (input, context) => previews.candidate(input.id, context),
    ),
  )
  supervisor.commands.set('browsers.list', async (raw) =>
    browsers.list(z.object({ after: z.string().default('') }).parse(raw).after),
  )
  supervisor.cleanup.add(() => browsers.shutdown())
  return { browsers, previews, ready: browsers.initialize() }
}
