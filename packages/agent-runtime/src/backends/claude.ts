import type { Query, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import { processEnvironment } from '../process/environment'
import type { Processes } from '../process/manager'
import type { AgentBackend, BackendEvent, BackendRequest, InterruptReceipt } from './contract'
import { claudeAccount } from './native-process'
import { SdkProcess } from './protocol/sdk-process'
export class ClaudeBackend implements AgentBackend {
  private active = new Map<string, Query>()
  constructor(
    private processes: Processes,
    private directory: string,
  ) {}
  async models(workspace: string, signal: AbortSignal) {
    const account = await claudeAccount(this.processes, workspace, this.directory, signal)
    if (!account.certified || !account.connected)
      throw new Error('Claude Code requires a certified version and subscription login')
    const { query } = await import('@anthropic-ai/claude-agent-sdk')
    const controller = new AbortController()
    const abort = () => controller.abort()
    const deadline = setTimeout(abort, 15000)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    let child: SdkProcess | undefined
    async function* input(): AsyncGenerator<SDKUserMessage> {
      if (!controller.signal.aborted)
        await new Promise<void>((resolve) =>
          controller.signal.addEventListener('abort', () => resolve(), { once: true }),
        )
      yield* []
    }
    const conversation = query({
      prompt: input(),
      options: {
        cwd: workspace,
        pathToClaudeCodeExecutable: account.executable,
        env: processEnvironment(),
        settingSources: [],
        settings: { disableAllHooks: true },
        strictMcpConfig: true,
        mcpServers: {},
        tools: [],
        abortController: controller,
        extraArgs: { restricted: null, 'safe-mode': null },
        spawnClaudeCodeProcess: (options) => {
          if (options.command !== account.executable) throw new Error('Unexpected executable')
          child = new SdkProcess(this.processes, options)
          return child
        },
      },
    })
    try {
      return await conversation.supportedModels()
    } finally {
      clearTimeout(deadline)
      signal.removeEventListener('abort', abort)
      controller.abort()
      conversation.close()
      if (child) await child.done
    }
  }
  async *start(request: BackendRequest, signal: AbortSignal): AsyncGenerator<BackendEvent> {
    const account = await claudeAccount(this.processes, request.workspace, this.directory, signal)
    if (!account.certified)
      throw new Error(`Claude Code ${account.version} is not certified; expected 2.1.299`)
    if (!account.connected)
      throw new Error('Claude subscription login required. Run sistemazero auth claude login.')
    const { query } = await import('@anthropic-ai/claude-agent-sdk')
    const controller = new AbortController()
    let child: SdkProcess | undefined
    const readonlyTools = ['Read', 'Grep', 'Glob', 'AskUserQuestion']
    const conversation = query({
      prompt: request.run.input,
      options: {
        cwd: request.workspace,
        pathToClaudeCodeExecutable: account.executable,
        env: processEnvironment(),
        settingSources: [],
        extraArgs: { ...(!request.bridge ? { 'safe-mode': null } : {}), restricted: null },
        strictMcpConfig: true,
        settings: { disableAllHooks: true },
        mcpServers: request.bridge
          ? {
              sistemazero: {
                type: 'http',
                url: request.bridge.url,
                headers: { Authorization: `Bearer ${request.bridge.token}` },
              },
            }
          : {},
        tools: request.bridge
          ? []
          : request.run.mode === 'plan'
            ? readonlyTools
            : [...readonlyTools, 'Edit', 'Write', 'Bash'],
        permissionMode: request.run.mode === 'plan' ? 'plan' : 'default',
        permissionPrompts: 'host',
        model: request.run.model || undefined,
        resume: request.nativeSessionId,
        includePartialMessages: true,
        maxTurns: request.run.maxSteps,
        maxBudgetUsd: request.run.maxCost,
        systemPrompt: { type: 'preset', preset: 'claude_code', append: request.instructions },
        abortController: controller,
        spawnClaudeCodeProcess: (options) => {
          if (options.command !== account.executable)
            throw new Error('SDK attempted to launch an unexpected executable')
          child = new SdkProcess(this.processes, options)
          return child
        },
        canUseTool: async (name, input, options) => {
          if (request.bridge)
            return name.startsWith('mcp__sistemazero__')
              ? { behavior: 'allow', updatedInput: input }
              : { behavior: 'deny', message: 'Only the managed Sistema Zero registry is exposed' }
          if (name === 'AskUserQuestion') {
            const { z } = await import('zod')
            const questions = z
              .object({
                questions: z
                  .array(
                    z.object({
                      question: z.string(),
                      options: z.array(z.object({ label: z.string() })).optional(),
                    }),
                  )
                  .max(10),
              })
              .parse(input)
            const answers: Record<string, string> = {}
            for (const question of questions.questions)
              answers[question.question] = await request.ask(
                question.question,
                question.options?.map((option) => option.label) ?? [],
                'input',
                AbortSignal.any([signal, options.signal]),
              )
            return { behavior: 'allow', updatedInput: { ...input, answers } }
          }
          if (readonlyTools.includes(name)) return { behavior: 'allow', updatedInput: input }
          if (request.run.mode === 'plan')
            return { behavior: 'deny', message: 'Plan mode forbids mutations' }
          const preview = JSON.stringify(input, null, 2)
          if (Buffer.byteLength(preview) > 12000)
            return { behavior: 'deny', message: 'Split this operation into reviewable steps' }
          const answer = await request.ask(
            `Claude Code · ${name}\n${preview}`,
            ['approve', 'deny'],
            'approval',
            AbortSignal.any([signal, options.signal]),
          )
          return answer === 'approve'
            ? { behavior: 'allow', updatedInput: input }
            : { behavior: 'deny', message: 'Operation denied by user' }
        },
      },
    })
    this.active.set(request.run.id, conversation)
    let stopping: Promise<InterruptReceipt> | undefined
    const abort = () => {
      stopping = this.interrupt(request.run.id)
      void stopping.finally(() => controller.abort(signal.reason))
    }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    let completed = false
    try {
      for await (const message of conversation) {
        signal.throwIfAborted()
        if (message.type === 'system' && message.subtype === 'init')
          yield { type: 'session', sessionId: message.session_id }
        else if (
          message.type === 'stream_event' &&
          message.event.type === 'content_block_delta' &&
          message.event.delta.type === 'text_delta'
        )
          yield { type: 'text', text: message.event.delta.text }
        else if (message.type === 'assistant') {
          for (const content of message.message.content)
            if (content.type === 'tool_use')
              yield { type: 'progress', name: content.name, detail: content.id }
        } else if (message.type === 'result') {
          yield {
            type: 'usage',
            value: {
              billing: 'subscription',
              estimate: true,
              estimatedCostUsd: message.total_cost_usd,
              models: message.modelUsage,
              turns: message.num_turns,
            },
          }
          if (message.subtype !== 'success' || message.is_error)
            throw new Error(
              message.subtype === 'success'
                ? message.result
                : message.errors.join('\n').slice(0, 16000),
            )
          completed = true
          yield { type: 'completed', text: message.result }
          return
        }
      }
      if (!completed) throw new Error('Claude Code ended without a successful result')
    } finally {
      signal.removeEventListener('abort', abort)
      if (stopping) await stopping
      this.active.delete(request.run.id)
      conversation.close()
      if (child) await child.done
    }
  }
  async interrupt(runId: string): Promise<InterruptReceipt> {
    const conversation = this.active.get(runId)
    if (!conversation) return { requested: false, acknowledged: false }
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        conversation.interrupt(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Native interrupt timeout')), 1500)
        }),
      ])
      return { requested: true, acknowledged: true }
    } catch (error) {
      conversation.close()
      return {
        requested: true,
        acknowledged: false,
        reason: error instanceof Error ? error.message : 'Interrupt failed',
      }
    } finally {
      clearTimeout(timer)
    }
  }
}
