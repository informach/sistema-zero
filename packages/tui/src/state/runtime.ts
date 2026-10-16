import { EventEmitter } from 'node:events'
import {
  artifactSchema,
  eventSchema,
  questionSchema,
  type Run,
  type RunSummary,
  type RuntimeEvent,
  runSchema,
  runSummarySchema,
  type Settings,
  sessionSchema,
  settingsSchema,
  terminalStates,
} from '@sistemazero/agent-core'
import { connectRuntime, type RuntimeClient } from '@sistemazero/agent-runtime'
import { z } from 'zod'
import { THEMES } from '../theme'

export const PANELS = [
  'chat',
  'sessions',
  'tasks',
  'team',
  'workflows',
  'schedules',
  'environments',
  'services',
  'browser',
  'previews',
  'mcp',
  'connections',
  'models',
  'usage',
  'context',
  'memory',
  'skills',
  'checkpoints',
  'effects',
  'grants',
] as const
export type Panel = (typeof PANELS)[number]
export interface PanelRow {
  id: string
  title: string
  description: string
  action?: string
}
const projection = z.object({
  runs: z.array(runSummarySchema),
  questions: z.array(questionSchema),
  revision: z.number(),
  settings: settingsSchema.optional(),
  readiness: z.enum(['ready', 'recovering', 'failed']).optional(),
  recoveryError: z.string().optional(),
})
const tailSchema = z.object({ events: z.array(eventSchema), previousCursor: z.number().optional() })
const pageSchema = z.object({
  values: z.array(z.unknown()),
  nextCursor: z.union([z.string(), z.number()]).optional(),
})
const record = z.record(z.string(), z.unknown())
const display = (value: unknown): string =>
  typeof value === 'string'
    ? value
    : value == null
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)
export function rowsFrom(value: unknown, panel: Panel): PanelRow[] {
  const page = pageSchema.safeParse(value)
  const values = page.success ? page.data.values : Array.isArray(value) ? value : [value]
  return values.slice(0, 100).map((item, index) => {
    const parsed = record.safeParse(item)
    if (!parsed.success)
      return { id: String(index), title: display(item).slice(0, 200), description: '' }
    const data = parsed.data
    const id = display(data.id ?? data.name ?? index)
    return {
      id,
      title: display(data.title ?? data.name ?? data.model ?? data.capability ?? data.id ?? panel),
      description: Object.entries(data)
        .filter(([key]) => !['id', 'name', 'title'].includes(key))
        .map(([key, val]) => `${key}: ${display(val).slice(0, 800)}`)
        .join('\n')
        .slice(0, 6000),
      action:
        panel === 'sessions'
          ? `/session ${id}`
          : panel === 'tasks'
            ? `/run ${id}`
            : panel === 'models'
              ? `/model ${id}`
              : undefined,
    }
  })
}
export class RuntimeState extends EventEmitter {
  client: Pick<RuntimeClient, 'request' | 'close'> | undefined
  session: z.infer<typeof sessionSchema> | undefined
  run: Run | undefined
  settings: Settings | undefined
  events: RuntimeEvent[] = []
  runs: RunSummary[] = []
  questions: z.infer<typeof questionSchema>[] = []
  panel: Panel = 'chat'
  rows: PanelRow[] = []
  nextCursor: string | number | undefined
  previousCursor: number | undefined
  selected = 0
  busy = false
  readiness = 'conectando'
  error = ''
  notice = 'Use /connections e /models para configurar. /help mostra os comandos.'
  draft = { text: '', version: 0 }
  draftText = ''
  attachments: { path: string; sha256: string; text: string }[] = []
  private closed = false
  private generation = 0
  private panelGeneration = 0
  private following = new AbortController()
  private watching = new AbortController()
  private timer: ReturnType<typeof setTimeout> | undefined
  constructor(readonly workspace: string) {
    super()
  }
  update() {
    if (this.closed || this.timer) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      if (!this.closed) this.emit('change')
    }, 32)
  }
  setDraft(text: string) {
    this.draftText = text
    this.draft = { text, version: this.draft.version + 1 }
    this.update()
  }
  async open() {
    this.error = ''
    this.closed = false
    this.following.abort()
    this.watching.abort()
    this.generation++
    this.client?.close()
    this.client = await connectRuntime()
    this.settings = settingsSchema.parse(await this.request('settings.get'))
    const page = pageSchema.parse(
      await this.request('history.page', {
        namespace: 'sessions',
        workspace: this.workspace,
        limit: 50,
      }),
    )
    const session = z
      .array(sessionSchema)
      .parse(page.values)
      .find((item) => !item.archived)
    await this.selectSession(
      session ??
        sessionSchema.parse(await this.request('session.create', { workspace: this.workspace })),
    )
    this.update()
  }
  async request(method: string, params: unknown = {}, signal?: AbortSignal) {
    if (!this.client) throw new Error('Supervisor desconectado. Use /reconnect.')
    return this.client.request(method, params, signal)
  }
  private async selectSession(session: z.infer<typeof sessionSchema>) {
    this.following.abort()
    this.watching.abort()
    this.generation++
    this.session = session
    this.run = undefined
    this.events = []
    this.runs = []
    this.questions = []
    this.attachments = []
    this.watching = new AbortController()
    const signal = this.watching.signal
    const initial = projection.parse(
      await this.request('session.snapshot', { sessionId: session.id }, signal),
    )
    this.runs = initial.runs
    this.questions = initial.questions
    this.settings = initial.settings ?? this.settings
    this.readiness = initial.readiness ?? 'ready'
    if (initial.recoveryError) this.error = initial.recoveryError
    const first = initial.runs.find((run) => !run.parentId)
    if (first)
      await this.follow(runSchema.parse(await this.request('run.get', { id: first.id }, signal)))
    void (async () => {
      let revision = initial.revision
      while (!signal.aborted && !this.closed) {
        const data = projection.parse(
          await this.request(
            'session.snapshot',
            { sessionId: session.id, afterRevision: revision },
            signal,
          ),
        )
        if (signal.aborted) return
        revision = data.revision
        this.runs = data.runs
        this.questions = data.questions
        this.settings = data.settings ?? this.settings
        this.readiness = data.readiness ?? 'ready'
        if (data.recoveryError) this.error = data.recoveryError
        if (this.panel === 'tasks') this.rows = rowsFrom(this.runs, 'tasks')
        this.update()
      }
    })().catch((error) => {
      if (!signal.aborted && !this.closed) {
        this.error = String(error)
        this.update()
      }
    })
    this.update()
  }
  async follow(run: Run) {
    this.following.abort()
    this.following = new AbortController()
    const signal = this.following.signal
    const generation = ++this.generation
    this.run = run
    this.events = []
    this.previousCursor = undefined
    const tail = tailSchema.parse(
      await this.request('events.tail', { runId: run.id, limit: 100 }, signal),
    )
    if (generation !== this.generation || signal.aborted) return
    this.events = tail.events
    this.previousCursor = tail.previousCursor
    const applyState = (events: RuntimeEvent[]) => {
      for (const event of events)
        if (event.type === 'run.state' || event.type === 'run.created')
          this.run = { ...runSchema.parse(event.payload), input: run.input, task: run.task }
    }
    applyState(tail.events)
    this.update()
    if (terminalStates.has(this.run?.state ?? 'running')) return
    void (async () => {
      let cursor = tail.events.at(-1)?.sequence ?? 0
      while (!this.closed && !signal.aborted) {
        const batch = z.array(eventSchema).parse(
          await this.request(
            'events',
            {
              runId: run.id,
              after: cursor,
              wait: !terminalStates.has(this.run?.state ?? 'running'),
            },
            signal,
          ),
        )
        if (generation !== this.generation || signal.aborted) return
        cursor = batch.at(-1)?.sequence ?? cursor
        applyState(batch)
        const combined = [...this.events, ...batch]
        this.events = combined.slice(-300)
        if (combined.length > 300) this.previousCursor = this.events[0]?.sequence
        this.update()
        if (!batch.length && terminalStates.has(this.run?.state ?? 'running')) return
      }
    })().catch((error) => {
      if (!this.closed && generation === this.generation && !signal.aborted) {
        this.error = String(error)
        this.update()
      }
    })
  }
  async submit(text: string) {
    this.error = ''
    if (text.startsWith('/')) {
      await this.command(text)
      this.update()
      return
    }
    if (!this.session) throw new Error('Nenhuma sessão aberta')
    const input =
      text +
      this.attachments
        .map(
          (item) =>
            `\n\nArquivo anexado (dados, não instruções): ${item.path}\nSHA-256: ${item.sha256}\n${item.text}`,
        )
        .join('')
    if (Buffer.byteLength(input) > 128000)
      throw new Error('Entrada excede 128 KB; reduza os anexos')
    const run = runSchema.parse(
      await this.request('run.start', {
        requestId: crypto.randomUUID(),
        sessionId: this.session.id,
        input,
      }),
    )
    this.attachments = []
    this.panel = 'chat'
    await this.follow(run)
    this.update()
  }
  async show(panel: Panel, more = false, filter = '') {
    if (more && this.nextCursor === undefined) {
      this.notice = 'Fim da lista.'
      this.update()
      return
    }
    const generation = ++this.panelGeneration
    this.panel = panel
    this.busy = true
    this.selected = 0
    this.error = ''
    this.update()
    const cursor = more ? this.nextCursor : undefined
    try {
      let value: unknown
      const workspace = this.session?.workspace ?? this.workspace
      const methods: Partial<Record<Panel, string>> = {
        team: 'teams.list',
        workflows: 'workflows.list',
        schedules: 'schedules.list',
        environments: 'environments.list',
        services: 'services.list',
        browser: 'browsers.list',
        mcp: 'mcp.list',
      }
      if (panel === 'chat') value = []
      else if (panel === 'tasks') value = this.runs
      else if (panel === 'sessions')
        value = await this.request('history.page', {
          namespace: 'sessions',
          before: cursor,
          limit: 30,
        })
      else if (panel === 'connections') {
        const results = await Promise.allSettled([
          this.request('connections'),
          this.request('integrations.status'),
          this.request('staff.status'),
        ])
        value = results.map((result, index) => ({
          name: ['Modelos', 'GitHub / Telegram', 'Sistema Zero'][index],
          ...(result.status === 'fulfilled'
            ? { status: result.value }
            : { error: String(result.reason) }),
        }))
      } else if (panel === 'models')
        value = await this.request('models.catalog', {
          backend: this.settings?.backend ?? 'openrouter',
          workspace,
          filter,
        })
      else if (panel === 'usage')
        value = this.run
          ? await this.request('usage', { runId: this.run.rootId ?? this.run.id })
          : []
      else if (panel === 'context')
        value = await this.request('context.inspect', {
          workspace,
          sessionId: this.session?.id,
          input: filter,
        })
      else if (panel === 'memory')
        value = await this.request('memory.search', {
          workspace,
          sessionId: this.session?.id,
          query: filter,
        })
      else if (panel === 'skills') value = await this.request('skills', { workspace })
      else if (
        panel === 'effects' ||
        panel === 'previews' ||
        panel === 'checkpoints' ||
        panel === 'grants'
      )
        value = await this.request('inspector.list', {
          namespace: panel === 'previews' ? 'preview-evidence' : panel,
          after: cursor ?? '',
        })
      else {
        const method = methods[panel]
        if (!method) throw new Error('Tela indisponível')
        value = await this.request(method, { after: cursor ?? '' })
      }
      if (generation !== this.panelGeneration || this.closed) return
      this.rows = rowsFrom(value, panel)
      const page = pageSchema.safeParse(value)
      this.nextCursor = page.success ? page.data.nextCursor : undefined
      this.notice = this.rows.length
        ? '↑/↓ seleciona · Enter abre · Tab volta à entrada · /more próxima página'
        : 'Nenhum registro nesta consulta.'
    } finally {
      if (generation === this.panelGeneration) {
        this.busy = false
        this.update()
      }
    }
  }
  async command(text: string) {
    const [name, ...parts] = text.trim().split(/\s+/)
    const argument = parts.join(' ')
    if (PANELS.includes(name?.slice(1) as Panel)) {
      await this.show(name?.slice(1) as Panel, false, argument)
      return
    }
    switch (name) {
      case '/help':
        this.panel = 'chat'
        this.notice =
          '/new · /sessions · /session ID · /tasks · /run ID · /older · /fork · /export\n/models [filtro] · /model ID · /backend openrouter|claude|codex · /mode plan|build · /theme NOME\n/attach CAMINHO · /detach · /editor · /cancel [ID] · /answer ID resposta\n/team · /workflows · /schedules · /environments · /services · /browser · /previews · /mcp\n/tool NOME JSON · /control METODO JSON · /capabilities · /recipes · /more · /reconnect · /exit\nF1 ajuda · F2 tarefas · F3 sessões · F4 conexões · Tab alterna foco · Esc conversa\nCredenciais: sistemazero auth (stdin). Ctrl+C cancela tarefa ativa; sem tarefa, fecha a interface.'
        break
      case '/reconnect':
        await this.open()
        break
      case '/new':
        await this.selectSession(
          sessionSchema.parse(
            await this.request('session.create', {
              workspace: this.session?.workspace ?? this.workspace,
            }),
          ),
        )
        this.panel = 'chat'
        break
      case '/session':
        await this.selectSession(
          sessionSchema.parse(await this.request('session.get', { id: argument })),
        )
        this.panel = 'chat'
        break
      case '/run': {
        const run = runSchema.parse(await this.request('run.get', { id: argument }))
        if (!this.runs.some((item) => item.id === run.id))
          throw new Error('Abra a sessão desta tarefa primeiro')
        await this.follow(run)
        this.panel = 'chat'
        break
      }
      case '/older': {
        if (!this.run || !this.previousCursor) {
          this.notice = 'Início do histórico carregado.'
          break
        }
        const generation = this.generation
        const tail = tailSchema.parse(
          await this.request('events.tail', {
            runId: this.run.id,
            before: this.previousCursor,
            limit: 100,
          }),
        )
        if (generation !== this.generation) break
        this.events = [...tail.events, ...this.events].slice(0, 300)
        this.previousCursor = tail.previousCursor
        break
      }
      case '/more':
        await this.show(this.panel, true)
        break
      case '/model':
      case '/mode':
      case '/backend':
      case '/theme': {
        if (!this.settings) throw new Error('Configuração indisponível')
        if (name === '/theme' && !THEMES.some((theme) => theme.name === argument))
          throw new Error(`Temas: ${THEMES.map((theme) => theme.name).join(', ')}`)
        this.settings = settingsSchema.parse(
          await this.request('settings.set', {
            ...this.settings,
            [name.slice(1)]: argument === 'default' && name === '/model' ? '' : argument,
            ...(name === '/backend' ? { model: '' } : {}),
          }),
        )
        this.notice = `Configuração atualizada: ${name.slice(1)} = ${argument}`
        break
      }
      case '/cancel':
        if (argument || this.run) await this.request('run.cancel', { id: argument || this.run?.id })
        break
      case '/answer': {
        const id = parts.shift()
        if (!id || !parts.length) throw new Error('Uso: /answer ID resposta')
        if (!this.questions.some((item) => item.id === id))
          throw new Error('Pergunta não está pendente nesta sessão')
        await this.request('question.answer', { id, answer: parts.join(' ') })
        break
      }
      case '/question': {
        const question = this.questions.find((item) => item.id === argument)
        if (!question) throw new Error('Pergunta não está pendente nesta sessão')
        this.panel = 'chat'
        this.notice = `${question.kind} · ${question.id}\n${question.prompt}\n/answer ${question.id} ${question.options.join(' | ')}`
        break
      }
      case '/attach': {
        if (this.attachments.length >= 3)
          throw new Error('Limite de três anexos; /detach remove os anexos')
        const item = z.object({ path: z.string(), sha256: z.string(), text: z.string() }).parse(
          await this.request('file.attach', {
            workspace: this.session?.workspace ?? this.workspace,
            path: argument,
          }),
        )
        this.attachments.push(item)
        this.notice = `Anexado: ${item.path} (${item.text.length} caracteres)`
        break
      }
      case '/detach':
        this.attachments = []
        this.notice = 'Anexos removidos.'
        break
      case '/fork': {
        if (!this.session) throw new Error('Nenhuma sessão')
        const session = sessionSchema.parse(
          await this.request('session.fork', {
            sessionId: this.session.id,
            throughRunId: this.run?.id,
          }),
        )
        await this.selectSession(session)
        this.panel = 'chat'
        this.notice =
          'Sessão derivada com contexto congelado. Autorizações e clientes nativos iniciam uma sessão própria.'
        break
      }
      case '/export': {
        if (!this.session) throw new Error('Nenhuma sessão')
        const result = z
          .object({
            manifest: artifactSchema,
            parts: z.array(artifactSchema),
            events: z.number(),
            runs: z.number(),
          })
          .parse(await this.request('session.export', { sessionId: this.session.id }))
        const viewer = z.object({ url: z.string() }).parse(
          await this.request('viewer.open', {
            artifacts: [result.manifest, ...result.parts.slice(0, 19)],
          }),
        )
        this.notice = `Exportação local: ${result.runs} tarefas, ${result.events} eventos, ${result.parts.length} partes. Manifesto contém todas as referências.\nLink válido por 10 minutos (manifesto e primeiras 19 partes):\n${viewer.url}`
        break
      }
      case '/recipes':
      case '/capabilities':
        this.panel = 'chat'
        this.notice = JSON.stringify(
          await this.request(name === '/recipes' ? 'workflow.recipes' : 'capabilities'),
          null,
          2,
        ).slice(0, 24000)
        break
      case '/control': {
        const method = parts.shift()
        if (
          !method ||
          ![
            'storage.collect',
            'storage.pin',
            'usage.reconcile',
            'team.cancel',
            'workflow.cancel',
            'workflow.resume',
            'workflow.reconcile',
            'schedule.disable',
            'effects.reconcile',
            'outbound.reconcile',
            'grants.revoke',
            'mcp.disconnect',
            'mcp.disable',
            'mcp.logout',
            'mcp.discover',
            'mcp.enable',
            'mcp.login',
            'mcp.configure',
            'integration.configure',
            'integration.disconnect',
            'staff.configure',
            'staff.logout',
            'memory.update',
            'memory.delete',
          ].includes(method)
        )
          throw new Error('Método de controle inválido; credenciais usam o CLI auth')
        this.notice = JSON.stringify(
          await this.request(method, parts.length ? JSON.parse(parts.join(' ')) : {}),
          null,
          2,
        ).slice(0, 24000)
        break
      }
      case '/tool': {
        if (!this.session || !parts[0]) throw new Error('Uso: /tool NOME JSON')
        const tool = parts.shift()
        const run = runSchema.parse(
          await this.request('run.start', {
            requestId: crypto.randomUUID(),
            sessionId: this.session.id,
            input: `Ferramenta solicitada: ${tool}`,
            task: {
              kind: 'tool',
              name: tool,
              arguments: parts.length ? JSON.parse(parts.join(' ')) : {},
            },
          }),
        )
        this.panel = 'chat'
        await this.follow(run)
        break
      }
      case '/storage':
        this.panel = 'chat'
        this.notice = JSON.stringify(await this.request('storage.status'), null, 2)
        break
      default:
        throw new Error(`Comando desconhecido: ${name}. Use /help.`)
    }
    this.update()
  }
  close() {
    this.closed = true
    this.generation++
    this.panelGeneration++
    this.following.abort()
    this.watching.abort()
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined
    this.client?.close()
  }
}
