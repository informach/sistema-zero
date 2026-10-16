import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type ArtProposal,
  adaptationProposalSchema,
  type CapturePlan,
  capturePlanSchema,
  copyProposalSchema,
  type EditorialProposal,
  type ResearchEvidence,
  researchResultSchema,
  type VideoProposal,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import type { Provider, ProviderStatus, RunRequest } from '../shared/contracts'
import { claudeInput, claudeResult } from './claude-input'
import { JsonRpcClient, type RpcEvent } from './json-rpc'
import { observeLogin } from './login-completion'
import { collectProcess, collectProcessResult, launchNative } from './native-client'
import { canonicalArtProposal, nativeArtProposalSchema } from './provider-art-schema'
import {
  codexArguments,
  decodeNativeImage,
  requireNativeImage,
  validateNativeImagePath,
} from './provider-policy'
import { canonicalVideoProposal, nativeVideoProposalSchema } from './provider-video-schema'
import { observedResearchUrls, validateResearch } from './research-evidence'

type NativeResult = {
  text: string
  images: Buffer[]
  mode: string
  inputTokens: number | null
  outputTokens: number | null
  research?: ResearchEvidence
  editorial?: EditorialProposal
  art?: ArtProposal
  capture?: CapturePlan
  video?: VideoProposal
}
const accountSchema = z.object({
  account: z.object({ type: z.string(), planType: z.string().optional() }).nullable(),
})
const claudeAccountSchema = z.object({
  loggedIn: z.boolean(),
  authMethod: z.string().optional(),
  subscriptionType: z.string().nullable().optional(),
})

async function openCodex(cwd: string, signal?: AbortSignal) {
  const rpc = new JsonRpcClient(launchNative('codex', await codexArguments(cwd, signal), cwd))
  const abort = () => rpc.close()
  signal?.addEventListener('abort', abort, { once: true })
  rpc.once('closed', () => signal?.removeEventListener('abort', abort))
  if (signal?.aborted) rpc.close()
  try {
    await rpc.request('initialize', {
      clientInfo: {
        name: 'sistema_zero_marketing_local',
        title: 'Sistema Zero Marketing',
        version: '0.1.0',
      },
    })
    rpc.notify('initialized')
    return rpc
  } catch (error) {
    rpc.close()
    throw error
  }
}

async function codexAccount(rpc: JsonRpcClient) {
  const value = accountSchema.parse(await rpc.request('account/read', { refreshToken: false }))
  if (value.account?.type !== 'chatgpt')
    throw new Error(
      'Entre no cliente oficial com sua assinatura ChatGPT. Nenhuma API paga será usada.',
    )
  return `ChatGPT ${value.account.planType ?? ''}`.trim()
}

export async function getProviderStatus(
  provider: Provider,
  cwd: string,
  signal?: AbortSignal,
): Promise<ProviderStatus> {
  try {
    if (provider === 'codex') {
      const rpc = await openCodex(cwd, signal)
      try {
        const mode = await codexAccount(rpc)
        const capability = await rpc.request<{ imageGeneration?: boolean }>(
          'modelProvider/capabilities/read',
          {},
        )
        return { provider, available: true, mode, image: capability.imageGeneration === true }
      } finally {
        rpc.close()
      }
    }
    const account = claudeAccountSchema.parse(
      JSON.parse(
        await collectProcess(
          launchNative('claude', ['auth', 'status', '--json'], cwd),
          20000,
          signal,
        ),
      ),
    )
    if (!account.loggedIn || account.authMethod !== 'claude.ai' || !account.subscriptionType) {
      throw new Error(
        'Entre no cliente oficial com sua assinatura Claude. Nenhuma API paga será usada.',
      )
    }
    return { provider, available: true, mode: `Claude ${account.subscriptionType}`, image: false }
  } catch (error) {
    return {
      provider,
      available: false,
      mode: 'Não conectado',
      image: false,
      reason: error instanceof Error ? error.message : 'Cliente indisponível.',
    }
  }
}

export async function loginProvider(
  provider: Provider,
  cwd: string,
  openUrl: (url: string) => Promise<void>,
  signal?: AbortSignal,
) {
  if (signal?.aborted) throw new Error('Operação cancelada.')
  if (provider === 'claude') {
    await collectProcess(launchNative('claude', ['auth', 'login'], cwd), 180000, signal)
    return
  }
  const rpc = await openCodex(cwd, signal)
  const login = observeLogin(rpc, signal)
  try {
    const result = await rpc.request<{ type: string; authUrl?: string; loginId?: string }>(
      'account/login/start',
      {
        type: 'chatgpt',
      },
    )
    if (!result.authUrl || !result.loginId)
      throw new Error('O cliente não forneceu o endereço oficial de login.')
    login.identify(result.loginId)
    const url = new URL(result.authUrl)
    if (
      url.protocol !== 'https:' ||
      !['auth.openai.com', 'auth0.openai.com', 'chatgpt.com'].includes(url.hostname)
    ) {
      throw new Error('Endereço de login inesperado.')
    }
    // Attach rejection immediately while the system browser opens.
    const opening = openUrl(url.href)
    await Promise.all([login.completion, opening])
  } finally {
    login.cancel()
    rpc.close()
  }
}

const videoInstruction =
  'Retorne somente um objeto JSON com as alterações pedidas. Campos permitidos: title (texto até 180 caracteres), subtitle (até 280), accent (hexadecimal #RRGGBB), durationInFrames (inteiro 24 a 1800), trimBefore (inteiro em frames, somente se houver gravação). Preserve campos não solicitados. Não use ferramentas, arquivos, comandos ou código.'

export async function runProvider(
  request: RunRequest,
  cwd: string,
  signal: AbortSignal,
  onProgress: (stage: string) => void,
  sourceImage?: string | string[],
): Promise<NativeResult> {
  await mkdir(cwd, { recursive: true })
  const status = await getProviderStatus(request.provider, cwd, signal)
  if (!status.available) throw new Error(status.reason)
  if (signal.aborted) throw new Error('Operação cancelada.')
  onProgress('Produzindo com sua assinatura')
  const responseSchema =
    request.responseFormat === 'editorial-copy'
      ? copyProposalSchema
      : request.responseFormat === 'editorial-adapt'
        ? adaptationProposalSchema
        : request.responseFormat === 'art'
          ? nativeArtProposalSchema
          : request.responseFormat === 'video'
            ? nativeVideoProposalSchema
            : request.responseFormat === 'capture'
              ? capturePlanSchema
              : undefined
  if (request.provider === 'claude') {
    const prompt = `${request.kind === 'video' ? videoInstruction : responseSchema ? 'Entregue a proposta editorial no schema JSON fornecido. Não use ferramentas.' : 'Escreva apenas a copy solicitada em português. Não use ferramentas.'}\n\n${request.prompt}`
    const input = sourceImage
      ? await claudeInput(prompt, Array.isArray(sourceImage) ? sourceImage : [sourceImage], signal)
      : prompt
    const child = launchNative(
      'claude',
      [
        '--print',
        '--output-format',
        sourceImage ? 'stream-json' : 'json',
        ...(sourceImage ? ['--input-format', 'stream-json', '--verbose'] : []),
        '--safe-mode',
        '--tools',
        '',
        '--strict-mcp-config',
        '--mcp-config',
        '{"mcpServers":{}}',
        '--max-turns',
        // Structured output may finish through Claude's internal output tool, followed by
        // its terminal response. Both belong to one bounded invocation; external tools stay disabled.
        responseSchema ? '2' : '1',
        ...(responseSchema
          ? [
              '--json-schema',
              JSON.stringify(z.toJSONSchema(responseSchema, { target: 'draft-07' })),
            ]
          : []),
      ],
      cwd,
    )
    const completion = collectProcessResult(child, 180000, signal)
    child.stdin.end(input)
    const processResult = await completion,
      raw = processResult.output
    await writeFile(
      path.join(cwd, sourceImage ? 'provider-response.jsonl' : 'provider-response.json'),
      raw,
      'utf8',
    )
    const decoded = claudeResult(raw, Boolean(sourceImage))
    if (processResult.code !== 0) {
      const detail = z
        .object({ subtype: z.string().optional(), errors: z.array(z.string()).optional() })
        .passthrough()
        .safeParse(decoded ?? {})
      const reason = detail.success
        ? [detail.data.subtype, ...(detail.data.errors ?? [])].filter(Boolean).join(': ')
        : ''
      throw new Error(
        `Claude: ${reason || processResult.stderr || `processo encerrado com código ${processResult.code}`}`
          .replace(/(?:Bearer\s+\S+|sk-[\w-]+|eyJ[\w.-]+)/g, '[credencial omitida]')
          .slice(0, 1000),
      )
    }
    const result = z
      .object({
        is_error: z.boolean().optional(),
        result: z.string().optional(),
        structured_output: z.unknown().optional(),
        usage: z
          .object({
            input_tokens: z.number().int().nonnegative().optional(),
            output_tokens: z.number().int().nonnegative().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .parse(decoded)
    if (
      result.is_error ||
      (typeof result.result !== 'string' && result.structured_output === undefined)
    )
      throw new Error('O Claude não concluiu a resposta. Confira o limite da assinatura.')
    const structured = responseSchema
      ? responseSchema.parse(result.structured_output ?? JSON.parse(result.result ?? 'null'))
      : undefined
    const editorial =
        structured && (structured.kind === 'copy' || structured.kind === 'adapt')
          ? structured
          : undefined,
      art = structured?.kind === 'art' ? canonicalArtProposal(structured) : undefined
    return {
      text: structured && 'summary' in structured ? structured.summary : (result.result ?? ''),
      ...(structured?.kind === 'capture' ? { capture: structured } : {}),
      ...(editorial ? { editorial } : {}),
      ...(art ? { art } : {}),
      ...(structured?.kind === 'video' ? { video: canonicalVideoProposal(structured) } : {}),
      images: [],
      mode: status.mode,
      inputTokens: result.usage?.input_tokens ?? null,
      outputTokens: result.usage?.output_tokens ?? null,
    }
  }
  if (['image', 'edit-image'].includes(request.kind) && !status.image)
    throw new Error('Geração nativa de imagem indisponível neste cliente.')
  const rpc = await openCodex(cwd, signal)
  try {
    await codexAccount(rpc)
    const { thread } = await rpc.request<{ thread: { id: string } }>('thread/start', {
      cwd,
      modelProvider: 'openai',
      sandbox: 'read-only',
      approvalPolicy: 'never',
      ephemeral: true,
      config: { web_search: request.kind === 'research' ? 'live' : 'disabled' },
      baseInstructions:
        'Você produz materiais de marketing solicitados pelo usuário. Não leia arquivos, não execute comandos, não use MCP ou agentes. Para imagens, use somente a ferramenta nativa de geração de imagem. Não use APIs externas.',
      developerInstructions:
        request.kind === 'video'
          ? videoInstruction
          : 'Responda em português. Preserve o escopo do pedido.',
    })
    const images: Buffer[] = []
    const imagePaths: string[] = []
    let text = '',
      inputTokens: number | null = null,
      outputTokens: number | null = null
    const observedUrls = new Set<string>()
    let researchCalls = 0
    let imageFailed = false
    const completion = new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        cleanup()
        if (error) reject(error)
        else resolve()
      }
      const onClosed = (error: Error) => finish(error)
      const abort = () => {
        if (activeTurn)
          void rpc
            .request('turn/interrupt', { threadId: thread.id, turnId: activeTurn })
            .catch(() => {})
        finish(new Error('Operação cancelada.'))
      }
      let activeTurn: string | undefined
      const timer = setTimeout(
        () =>
          finish(
            new Error('A tarefa atingiu o limite de tempo. Nenhuma nova geração foi iniciada.'),
          ),
        360000,
      )
      const cleanup = () => {
        clearTimeout(timer)
        signal.removeEventListener('abort', abort)
        rpc.off('notification', event)
        rpc.off('closed', onClosed)
      }
      const event = (notification: RpcEvent) => {
        const params = notification.params
        if (params?.threadId !== thread.id) return
        if (notification.method === 'thread/tokenUsage/updated') {
          const usage = z
            .object({
              total: z.object({
                inputTokens: z.number().int().nonnegative(),
                outputTokens: z.number().int().nonnegative(),
              }),
            })
            .safeParse(params.tokenUsage)
          if (usage.success) {
            inputTokens = usage.data.total.inputTokens
            outputTokens = usage.data.total.outputTokens
          }
        }
        if (notification.method === 'turn/started') activeTurn = (params.turn as { id: string }).id
        if (notification.method === 'item/completed') {
          const item = params.item as {
            type?: string
            text?: string
            result?: string
            savedPath?: string
            failure?: unknown
            action?: unknown
            results?: unknown
          }
          if (item.type === 'agentMessage' && item.text) text = item.text
          if (item.type === 'webSearch') {
            researchCalls++
            if (researchCalls > 12) {
              rpc.close()
              finish(
                new Error(
                  'O provedor excedeu o limite de 12 consultas e a pesquisa foi interrompida.',
                ),
              )
              return
            }
            for (const url of observedResearchUrls([item.action, item.results]))
              observedUrls.add(url)
            onProgress(`Consultando fontes · ${researchCalls} de 12`)
          }
          if (item.type === 'imageGeneration') {
            if (item.failure) imageFailed = true
            else if (item.savedPath) imagePaths.push(item.savedPath)
            else if (item.result && /^[A-Za-z0-9+/=\r\n]+$/.test(item.result))
              images.push(decodeNativeImage(item.result))
          }
        }
        if (notification.method === 'turn/completed') {
          const turn = z
            .object({
              status: z.string(),
              error: z.object({ message: z.string() }).passthrough().nullable().optional(),
            })
            .passthrough()
            .parse(params.turn)
          finish(
            turn.status === 'completed'
              ? undefined
              : new Error(
                  turn.error
                    ? `Codex: ${turn.error.message.replace(/(?:Bearer\s+\S+|sk-[\w-]+|eyJ[\w.-]+)/g, '[credencial omitida]').slice(0, 1000)}`
                    : 'O Codex não concluiu a tarefa. Confira login, cota ou permissões.',
                ),
          )
        }
      }
      rpc.on('notification', event)
      rpc.on('closed', onClosed)
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) finish(new Error('Operação cancelada.'))
    })
    const prompt = ['image', 'edit-image'].includes(request.kind)
      ? `Use a ferramenta nativa de imagem exatamente uma vez para ${request.kind === 'edit-image' ? 'editar a imagem fornecida' : 'gerar uma imagem'}. Não use comandos ou APIs externas. Pedido: ${request.prompt}`
      : request.prompt
    const input: Record<string, unknown>[] = [{ type: 'text', text: prompt, text_elements: [] }]
    for (const file of sourceImage
      ? Array.isArray(sourceImage)
        ? sourceImage
        : [sourceImage]
      : [])
      input.push({ type: 'localImage', path: file })
    await Promise.all([
      completion,
      rpc.request('turn/start', {
        threadId: thread.id,
        input,
        ...(request.kind === 'research'
          ? { outputSchema: z.toJSONSchema(researchResultSchema) }
          : responseSchema
            ? { outputSchema: z.toJSONSchema(responseSchema) }
            : {}),
      }),
    ])
    for (const saved of imagePaths) {
      const resolved = await validateNativeImagePath(saved)
      // Accept only the native result item, never a filename invented in assistant text.
      const data = await readFile(resolved)
      if (data.length > 24_000_000) throw new Error('Imagem gerada acima do limite.')
      images.push(data)
    }
    if (['image', 'edit-image'].includes(request.kind))
      requireNativeImage(imageFailed, images.length)
    await writeFile(
      path.join(cwd, 'provider-response.json'),
      JSON.stringify({
        text,
        inputTokens,
        outputTokens,
        observedUrls: [...observedUrls],
        researchCalls,
      }),
      'utf8',
    )
    const structured = responseSchema ? responseSchema.parse(JSON.parse(text)) : undefined
    const editorial =
        structured && (structured.kind === 'copy' || structured.kind === 'adapt')
          ? structured
          : undefined,
      art = structured?.kind === 'art' ? canonicalArtProposal(structured) : undefined
    return {
      text: structured && 'summary' in structured ? structured.summary : text,
      ...(structured?.kind === 'capture' ? { capture: structured } : {}),
      ...(editorial ? { editorial } : {}),
      ...(art ? { art } : {}),
      images,
      ...(structured?.kind === 'video' ? { video: canonicalVideoProposal(structured) } : {}),
      mode: status.mode,
      inputTokens,
      outputTokens,
      ...(request.kind === 'research'
        ? { research: validateResearch(text, [...observedUrls], researchCalls) }
        : {}),
    }
  } finally {
    rpc.close()
  }
}
