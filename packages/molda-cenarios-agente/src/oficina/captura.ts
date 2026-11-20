import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { CenariosHost } from '@sistemazero/molda-cenarios/oficina/autoria'
import type { PedidoDaPagina } from './captura-pagina'

/**
 * Captura SEM janela: abre o Chrome local (sem tela), serve numa porta só do computador uma
 * página com o palco do motor e entrega a ela o cenário, os modelos, as texturas e as peças do
 * relevo, lidos pelo cliente da oficina com o token do agente. Nada sai do computador além das
 * leituras que a oficina já faz. Devolve a imagem (WebP).
 */

export interface OpcoesDaCaptura {
  largura?: number
  altura?: number
  vista?: PedidoDaPagina['vista']
  /** Ids a enquadrar; sem eles, o cenário inteiro. */
  enquadrar?: string[]
  /** Caminho de um Chrome/Chromium; sem ele, `MOLDA_CENARIOS_CHROMIUM` ou o Chrome instalado. */
  navegador?: string
}

/** Onde costuma morar o Chrome em cada sistema (ou `MOLDA_CENARIOS_CHROMIUM`). */
function acharNavegador(pedido?: string): string {
  const env = process.env
  const candidatos = [
    pedido,
    env.MOLDA_CENARIOS_CHROMIUM,
    ...(process.platform === 'win32'
      ? [
          env.PROGRAMFILES && join(env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
          env['PROGRAMFILES(X86)'] &&
            join(env['PROGRAMFILES(X86)'], 'Google/Chrome/Application/chrome.exe'),
          env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
        ]
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']),
  ]
  const achado = candidatos.find((c): c is string => !!c && existsSync(c))
  if (!achado)
    throw Error(
      'Não achei um Chrome neste computador. Informe o caminho em MOLDA_CENARIOS_CHROMIUM.',
    )
  return achado
}

interface MensagemDoChrome {
  id?: number
  result?: unknown
  error?: { message: string }
  method?: string
  params?: { exceptionDetails?: { exception?: { description?: string }; text?: string } }
}

/** Um cliente mínimo do protocolo de depuração do Chrome, pelo WebSocket nativo do Bun. */
function conversaComPagina(endereco: string) {
  const ws = new WebSocket(endereco)
  let proximo = 0
  const esperando = new Map<number, { ok(v: unknown): void; falha(e: Error): void }>()
  const erros: string[] = []
  ws.addEventListener('message', (evento) => {
    const msg = JSON.parse(String(evento.data)) as MensagemDoChrome
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params?.exceptionDetails
      erros.push(d?.exception?.description ?? d?.text ?? 'Erro na página')
    }
    if (msg.id === undefined) return
    const p = esperando.get(msg.id)
    esperando.delete(msg.id)
    if (msg.error) p?.falha(Error(msg.error.message))
    else p?.ok(msg.result)
  })
  const aberto = new Promise<void>((ok, falha) => {
    ws.addEventListener('open', () => ok(), { once: true })
    ws.addEventListener('error', () => falha(Error('Não consegui falar com o Chrome.')), {
      once: true,
    })
  })
  return {
    erros,
    async enviar<T>(metodo: string, params: Record<string, unknown> = {}): Promise<T> {
      await aberto
      const id = ++proximo
      return new Promise<T>((ok, falha) => {
        esperando.set(id, { ok: (v) => ok(v as T), falha })
        ws.send(JSON.stringify({ id, method: metodo, params }))
      })
    },
    fechar: () => ws.close(),
  }
}

const PORTA_DO_CHROME = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//

/**
 * Abre o Chrome sem tela, já na página da captura, com uma porta de depuração SÓ do computador.
 * Fala com a página pelo protocolo do Chrome direto: o Playwright trava sob o Bun no Windows.
 */
async function abrirPagina(executavel: string, url: string, largura: number, altura: number) {
  const perfil = mkdtempSync(join(tmpdir(), 'sz-captura-'))
  const processo = Bun.spawn(
    [
      executavel,
      '--headless=new',
      '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=0',
      `--user-data-dir=${perfil}`,
      `--window-size=${largura},${altura}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--enable-unsafe-swiftshader',
      url,
    ],
    { stdout: 'ignore', stderr: 'pipe' },
  )
  /** Fecha o Chrome e, depois que ele saiu de vez, apaga o perfil temporário. */
  const fechar = async () => {
    processo.kill()
    await processo.exited
    try {
      rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    } catch {
      // Um arquivo ainda preso no Windows fica para a limpeza da pasta temporária do sistema.
    }
  }
  try {
    const leitor = processo.stderr.getReader(),
      decodificar = new TextDecoder()
    let lido = '',
      porta: string | null = null
    const prazo = Date.now() + 30_000
    while (!porta) {
      if (Date.now() > prazo) throw Error('O Chrome não abriu a tempo.')
      const parte = await leitor.read()
      if (parte.done) throw Error('O Chrome fechou antes de abrir a porta local.')
      lido += decodificar.decode(parte.value, { stream: true })
      porta = PORTA_DO_CHROME.exec(lido)?.[1] ?? null
    }
    leitor.releaseLock()
    const alvos = (await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json()) as Array<{
      type: string
      url: string
      webSocketDebuggerUrl: string
    }>
    const alvo = alvos.find((a) => a.type === 'page' && a.url.startsWith(url))
    if (!alvo) throw Error('A página da captura não abriu no Chrome.')
    return { conversa: conversaComPagina(alvo.webSocketDebuggerUrl), fechar }
  } catch (falha) {
    await fechar()
    throw falha
  }
}

let paginaEmpacotada: Promise<string> | null = null
/** O motor empacotado para o navegador, uma vez por processo. */
function scriptDaPagina(): Promise<string> {
  paginaEmpacotada ??= (async () => {
    const r = await Bun.build({
      entrypoints: [resolve(import.meta.dirname, 'captura-pagina.ts')],
      target: 'browser',
      format: 'esm',
      minify: true,
    })
    if (!r.success || !r.outputs[0])
      throw Error(`Não consegui preparar a página da captura: ${r.logs.join('; ')}`)
    return r.outputs[0].text()
  })()
  paginaEmpacotada.catch(() => {
    paginaEmpacotada = null
  })
  return paginaEmpacotada
}

const PAGINA = (
  largura: number,
  altura: number,
) => `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:#c9dbe6}canvas{display:block;width:${largura}px;height:${altura}px}</style>
</head><body><canvas></canvas><script type="module" src="/pagina.js"></script></body></html>`

interface RespostaDaAvaliacao<T> {
  result: { value?: T }
  exceptionDetails?: { exception?: { description?: string }; text?: string }
}

export async function capturarSemJanela(
  host: CenariosHost,
  cenarioId: string,
  opcoes: OpcoesDaCaptura = {},
): Promise<{ imagem: Uint8Array; tipo: 'image/webp'; revisao: number; largura: number }> {
  const largura = Math.min(1920, Math.max(160, Math.round(opcoes.largura ?? 960))),
    altura = Math.min(1080, Math.max(120, Math.round(opcoes.altura ?? (largura * 9) / 16)))
  const aberto = await host.abrirCenario(cenarioId)
  const espacoId = (await host.obterMundo(aberto.resumo.mundoId)).espacoId
  const script = await scriptDaPagina()
  const binario = (dados: ArrayBuffer) =>
    new Response(dados, { headers: { 'content-type': 'application/octet-stream' } })
  const servidor = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(pedido) {
      const url = new URL(pedido.url)
      try {
        if (url.pathname === '/')
          return new Response(PAGINA(largura, altura), {
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        if (url.pathname === '/pagina.js')
          return new Response(script, { headers: { 'content-type': 'text/javascript' } })
        const biblioteca = url.searchParams.get('biblioteca') ?? '',
          digest = url.searchParams.get('digest') ?? ''
        if (url.pathname === '/modelo')
          return binario(await host.conteudoDoModelo({ biblioteca, digest, espacoId }))
        if (url.pathname === '/textura')
          return binario(await host.conteudoDaTextura({ biblioteca, digest, espacoId }))
        const terreno = /^\/terreno\/([a-f0-9]{64})$/.exec(url.pathname)
        if (terreno) return binario(await host.conteudoDoTerreno(cenarioId, terreno[1]!))
        return new Response('ausente', { status: 404 })
      } catch (falha) {
        return new Response(falha instanceof Error ? falha.message : 'falhou', { status: 502 })
      }
    },
  })
  const url = `http://127.0.0.1:${servidor.port}/`
  let aberta: Awaited<ReturnType<typeof abrirPagina>> | null = null
  try {
    aberta = await abrirPagina(acharNavegador(opcoes.navegador), url, largura, altura)
    const { conversa } = aberta
    await conversa.enviar('Runtime.enable')
    await conversa.enviar('Emulation.setDeviceMetricsOverride', {
      width: largura,
      height: altura,
      deviceScaleFactor: 1,
      mobile: false,
    })
    const prazo = Date.now() + 30_000
    while (true) {
      const r = await conversa.enviar<RespostaDaAvaliacao<boolean>>('Runtime.evaluate', {
        expression: "typeof globalThis.capturarCenario === 'function'",
        returnByValue: true,
      })
      if (r.result.value) break
      if (conversa.erros.length) throw Error(`A página da captura falhou: ${conversa.erros[0]}`)
      if (Date.now() > prazo) throw Error('A página da captura não carregou a tempo.')
      await Bun.sleep(100)
    }
    const pedido: PedidoDaPagina = {
      documento: aberto.documento,
      largura,
      vista: opcoes.vista ?? 'livre',
      ...(opcoes.enquadrar?.length ? { enquadrar: opcoes.enquadrar } : {}),
    }
    const r = await conversa.enviar<RespostaDaAvaliacao<string>>('Runtime.evaluate', {
      expression: `globalThis.capturarCenario(${JSON.stringify(pedido)})`,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.exceptionDetails)
      throw Error(
        `A captura falhou: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`,
      )
    if (typeof r.result.value !== 'string') throw Error('A captura não devolveu a imagem.')
    return {
      imagem: Uint8Array.from(Buffer.from(r.result.value, 'base64')),
      tipo: 'image/webp',
      revisao: aberto.revisao,
      largura,
    }
  } finally {
    aberta?.conversa.fechar()
    await aberta?.fechar()
    servidor.stop(true)
  }
}
