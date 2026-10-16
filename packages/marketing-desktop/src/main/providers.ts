import { mkdir, readFile, realpath } from 'node:fs/promises'
import { z } from 'zod'
import type { Provider, ProviderStatus, RunRequest } from '../shared/contracts'
import { JsonRpcClient, type RpcEvent } from './json-rpc'
import { collectProcess, launchNative } from './native-client'

type NativeResult = { text: string; images: Buffer[]; mode: string }
const accountSchema = z.object({
  account: z.object({ type: z.string(), planType: z.string().optional() }).nullable(),
})
const claudeAccountSchema = z.object({
  loggedIn: z.boolean(),
  authMethod: z.string().optional(),
  subscriptionType: z.string().nullable().optional(),
})

async function openCodex(cwd: string) {
  const rpc = new JsonRpcClient(launchNative('codex', ['app-server', '--stdio'], cwd))
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

export async function getProviderStatus(provider: Provider, cwd: string): Promise<ProviderStatus> {
  try {
    if (provider === 'codex') {
      const rpc = await openCodex(cwd)
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
      JSON.parse(await collectProcess(launchNative('claude', ['auth', 'status', '--json'], cwd))),
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
  const rpc = await openCodex(cwd)
  try {
    const result = await rpc.request<{ type: string; authUrl?: string }>('account/login/start', {
      type: 'chatgpt',
    })
    if (!result.authUrl) throw new Error('O cliente não forneceu o endereço oficial de login.')
    const url = new URL(result.authUrl)
    if (
      url.protocol !== 'https:' ||
      !['auth.openai.com', 'auth0.openai.com', 'chatgpt.com'].includes(url.hostname)
    ) {
      throw new Error('Endereço de login inesperado.')
    }
    const completion = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup()
        reject(new Error('Login expirou.'))
      }, 180000)
      const onClose = () => {
        cleanup()
        reject(new Error('Login interrompido.'))
      }
      const onAbort = () => {
        cleanup()
        reject(new Error('Operação cancelada.'))
      }
      const onEvent = (event: RpcEvent) => {
        if (event.method === 'account/login/completed') {
          cleanup()
          if (event.params?.success === true) resolve()
          else reject(new Error('Login não concluído.'))
        }
      }
      const cleanup = () => {
        clearTimeout(timer)
        rpc.off('closed', onClose)
        rpc.off('notification', onEvent)
        signal?.removeEventListener('abort', onAbort)
      }
      rpc.on('closed', onClose)
      rpc.on('notification', onEvent)
      signal?.addEventListener('abort', onAbort, { once: true })
      if (signal?.aborted) onAbort()
    })
    // Attach rejection immediately while the system browser opens.
    const opening = openUrl(url.href)
    await Promise.all([completion, opening])
  } finally {
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
  sourceImage?: string,
): Promise<NativeResult> {
  await mkdir(cwd, { recursive: true })
  const status = await getProviderStatus(request.provider, cwd)
  if (!status.available) throw new Error(status.reason)
  if (signal.aborted) throw new Error('Operação cancelada.')
  onProgress('Produzindo com sua assinatura')
  if (request.provider === 'claude') {
    const prompt = `${request.kind === 'video' ? videoInstruction : 'Escreva apenas a copy solicitada em português. Não use ferramentas.'}\n\n${request.prompt}`
    const child = launchNative(
      'claude',
      [
        '--print',
        '--output-format',
        'json',
        '--safe-mode',
        '--tools',
        '',
        '--strict-mcp-config',
        '--mcp-config',
        '{"mcpServers":{}}',
        '--max-turns',
        '1',
      ],
      cwd,
    )
    const completion = collectProcess(child, 180000, signal)
    child.stdin.end(prompt)
    const result = JSON.parse(await completion) as { is_error?: boolean; result?: string }
    if (result.is_error || typeof result.result !== 'string')
      throw new Error('O Claude não concluiu a resposta. Confira o limite da assinatura.')
    return { text: result.result, images: [], mode: status.mode }
  }
  if (['image', 'edit-image'].includes(request.kind) && !status.image)
    throw new Error('Geração nativa de imagem indisponível neste cliente.')
  const rpc = await openCodex(cwd)
  try {
    await codexAccount(rpc)
    const { thread } = await rpc.request<{ thread: { id: string } }>('thread/start', {
      cwd,
      modelProvider: 'openai',
      sandbox: 'read-only',
      approvalPolicy: 'never',
      ephemeral: true,
      baseInstructions:
        'Você produz materiais de marketing solicitados pelo usuário. Não leia arquivos, não execute comandos, não use MCP ou agentes. Para imagens, use somente a ferramenta nativa de geração de imagem. Não use APIs externas.',
      developerInstructions:
        request.kind === 'video'
          ? videoInstruction
          : 'Responda em português. Preserve o escopo do pedido.',
    })
    const images: Buffer[] = []
    const imagePaths: string[] = []
    let text = ''
    let imageFailed = false
    const completion = new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        cleanup()
        if (error) reject(error)
        else resolve()
      }
      const onClosed = () => finish(new Error('O Codex encerrou antes de concluir.'))
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
        if (notification.method === 'turn/started') activeTurn = (params.turn as { id: string }).id
        if (notification.method === 'item/completed') {
          const item = params.item as {
            type?: string
            text?: string
            result?: string
            savedPath?: string
            failure?: unknown
          }
          if (item.type === 'agentMessage' && item.text) text = item.text
          if (item.type === 'imageGeneration') {
            if (item.failure) imageFailed = true
            else if (item.savedPath) imagePaths.push(item.savedPath)
            else if (item.result && /^[A-Za-z0-9+/=\r\n]+$/.test(item.result))
              images.push(Buffer.from(item.result, 'base64'))
          }
        }
        if (notification.method === 'turn/completed') {
          const turn = params.turn as { status?: string }
          finish(
            turn.status === 'completed'
              ? undefined
              : new Error('O Codex não concluiu a tarefa. Confira login, cota ou permissões.'),
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
    if (sourceImage) input.push({ type: 'localImage', path: sourceImage })
    await Promise.all([completion, rpc.request('turn/start', { threadId: thread.id, input })])
    for (const saved of imagePaths) {
      const resolved = await realpath(saved)
      // Accept only the native result item, never a filename invented in assistant text.
      const data = await readFile(resolved)
      if (data.length > 24_000_000) throw new Error('Imagem gerada acima do limite.')
      images.push(data)
    }
    if (['image', 'edit-image'].includes(request.kind) && (imageFailed || images.length === 0)) {
      throw new Error(
        'A geração nativa não entregou uma imagem válida. O resultado não foi marcado como concluído.',
      )
    }
    return { text, images, mode: status.mode }
  } finally {
    rpc.close()
  }
}
