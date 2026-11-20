import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Uma página do motor num Chrome local SEM tela, servida numa porta só do computador. É assim que
 * o agente faz o que a oficina faz no navegador (fotografar, converter modelos, exportar) sem
 * janela aberta. A página só fala com este servidor local; o token fica aqui, no processo do
 * agente, e nada sai do computador além das leituras que a oficina já faz.
 */

export interface PaginaSemJanela {
  /** A entrada TypeScript da página, empacotada para o navegador uma vez por processo. */
  entrada: string
  /** Workers que a página cria com `new URL('./x.ts', import.meta.url)`: endereço → entrada. */
  workers?: Record<string, string>
  /** A função global que a página define quando está pronta. */
  pronta: string
  largura?: number
  altura?: number
  /** Caminho de um Chrome/Chromium; sem ele, `MOLDA_CENARIOS_CHROMIUM` ou o Chrome instalado. */
  navegador?: string
  /** O corpo da página (o script entra depois). */
  corpo?: (largura: number, altura: number) => string
  /** Rotas próprias, servidas só ao endereço local. `null`: não é desta rota. */
  rotas?: (url: URL, pedido: Request) => Promise<Response | null> | Response | null
}

export interface PaginaAberta {
  /** Avalia uma expressão na página (promessas são esperadas) e devolve o valor. */
  avaliar<T>(expressao: string, prazoMs?: number): Promise<T>
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
    /** Toda chamada tem prazo: um Chrome parado não segura o agente para sempre. */
    async enviar<T>(
      metodo: string,
      params: Record<string, unknown> = {},
      prazoMs = 60_000,
    ): Promise<T> {
      await aberto
      const id = ++proximo
      return new Promise<T>((ok, falha) => {
        const relogio = setTimeout(() => {
          esperando.delete(id)
          falha(Error(`O Chrome não respondeu a tempo (${metodo}).`))
        }, prazoMs)
        esperando.set(id, {
          ok: (v) => {
            clearTimeout(relogio)
            ok(v as T)
          },
          falha: (e) => {
            clearTimeout(relogio)
            falha(e)
          },
        })
        ws.send(JSON.stringify({ id, method: metodo, params }))
      })
    },
    fechar: () => ws.close(),
  }
}

const PORTA_DO_CHROME = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//

/** Chrome e perfis temporários ainda abertos: a interrupção do processo (Ctrl+C, o cliente do
 * MCP fechando) fecha e apaga o que sobrou, em vez de deixar Chrome sem tela rodando. */
interface Aberto {
  processo: { kill(): void }
  perfil: string
}
const abertos = new Set<Aberto>()
const aoInterromper = (sinal: NodeJS.Signals) => {
  for (const a of abertos) {
    try {
      a.processo.kill()
      rmSync(a.perfil, { recursive: true, force: true })
    } catch {
      // Melhor esforço: o processo está saindo.
    }
  }
  process.exit(sinal === 'SIGINT' ? 130 : 143)
}
function vigiar(item: Aberto) {
  if (!abertos.size) {
    process.on('SIGINT', aoInterromper)
    process.on('SIGTERM', aoInterromper)
  }
  abertos.add(item)
  return () => {
    if (!abertos.delete(item) || abertos.size) return
    process.off('SIGINT', aoInterromper)
    process.off('SIGTERM', aoInterromper)
  }
}

const esperar = (ms: number) =>
  new Promise<'prazo'>((ok) => setTimeout(() => ok('prazo'), Math.max(0, ms)))

/**
 * Abre o Chrome sem tela, já na página, com uma porta de depuração SÓ do computador. Fala com a
 * página pelo protocolo do Chrome direto: o Playwright trava sob o Bun no Windows.
 */
async function abrirPagina(executavel: string, url: string, largura: number, altura: number) {
  const perfil = mkdtempSync(join(tmpdir(), 'sz-cenarios-'))
  const apagarPerfil = () => {
    try {
      rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    } catch {
      // Um arquivo ainda preso no Windows fica para a limpeza da pasta temporária do sistema.
    }
  }
  let processo: Bun.Subprocess<'ignore', 'ignore', 'pipe'>
  try {
    processo = Bun.spawn(
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
      { stdin: 'ignore', stdout: 'ignore', stderr: 'pipe' },
    )
  } catch (falha) {
    apagarPerfil()
    throw falha
  }
  const largar = vigiar({ processo, perfil })
  /** Fecha o Chrome e, depois que ele saiu de vez, apaga o perfil temporário. */
  const fechar = async () => {
    processo.kill()
    await processo.exited
    apagarPerfil()
    largar()
  }
  try {
    const leitor = processo.stderr.getReader(),
      decodificar = new TextDecoder()
    let lido = '',
      porta: string | null = null
    const prazo = Date.now() + 30_000
    while (!porta) {
      // O prazo vale também com o Chrome calado: a leitura corre contra o relógio.
      const parte = await Promise.race([leitor.read(), esperar(prazo - Date.now())])
      if (parte === 'prazo') throw Error('O Chrome não abriu a tempo.')
      if (parte.done) throw Error('O Chrome fechou antes de abrir a porta local.')
      lido += decodificar.decode(parte.value, { stream: true })
      porta = PORTA_DO_CHROME.exec(lido)?.[1] ?? null
    }
    // A saída continua sendo lida e jogada fora: com o cano cheio o Chrome para de andar.
    void (async () => {
      try {
        while (!(await leitor.read()).done) {
          // nada a fazer com ela
        }
      } catch {
        // O Chrome fechou.
      }
    })()
    const alvos = (await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json()) as Array<{
      type: string
      url: string
      webSocketDebuggerUrl: string
    }>
    const alvo = alvos.find((a) => a.type === 'page' && a.url.startsWith(url))
    if (!alvo) throw Error('A página não abriu no Chrome.')
    return { conversa: conversaComPagina(alvo.webSocketDebuggerUrl), fechar }
  } catch (falha) {
    await fechar()
    throw falha
  }
}

const empacotados = new Map<string, Promise<string>>()
/** Uma entrada empacotada para o navegador, uma vez por processo. */
function empacotar(entrada: string): Promise<string> {
  let pronto = empacotados.get(entrada)
  if (!pronto) {
    pronto = (async () => {
      const r = await Bun.build({
        entrypoints: [entrada],
        target: 'browser',
        format: 'esm',
        minify: true,
      })
      if (!r.success || !r.outputs[0])
        throw Error(`Não consegui preparar a página: ${r.logs.join('; ')}`)
      return r.outputs[0].text()
    })()
    empacotados.set(entrada, pronto)
    pronto.catch(() => empacotados.delete(entrada))
  }
  return pronto
}

const CORPO_PADRAO = (largura: number, altura: number) =>
  `<style>html,body{margin:0;background:#c9dbe6}canvas{display:block;width:${largura}px;height:${altura}px}</style><canvas></canvas>`

interface RespostaDaAvaliacao<T> {
  result: { value?: T }
  exceptionDetails?: { exception?: { description?: string }; text?: string }
}

/** Abre a página, espera ficar pronta, entrega o controle a `usar` e fecha tudo no fim. */
export async function comPaginaSemJanela<T>(
  opcoes: PaginaSemJanela,
  usar: (pagina: PaginaAberta) => Promise<T>,
): Promise<T> {
  const largura = opcoes.largura ?? 960,
    altura = opcoes.altura ?? 540,
    workers = Object.entries(opcoes.workers ?? {})
  const [script, ...scriptsDosWorkers] = await Promise.all([
    empacotar(opcoes.entrada),
    ...workers.map(([, entrada]) => empacotar(entrada)),
  ])
  const js = (texto: string) =>
    new Response(texto, { headers: { 'content-type': 'text/javascript' } })
  const servidor = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    // O conteúdo de um modelo grande ou de um pacote exportado vem num pedido só.
    maxRequestBodySize: 600 * 1024 * 1024,
    async fetch(pedido) {
      const url = new URL(pedido.url)
      // Só o próprio endereço local: um nome de outro site apontado para 127.0.0.1 (rebinding)
      // não lê nem grava nada por aqui.
      if (pedido.headers.get('host') !== `127.0.0.1:${servidor.port}`)
        return new Response('recusado', { status: 403 })
      try {
        if (url.pathname === '/')
          return new Response(
            `<!doctype html><html><head><meta charset="utf-8"></head><body>${(opcoes.corpo ?? CORPO_PADRAO)(largura, altura)}<script type="module" src="/pagina.js"></script></body></html>`,
            { headers: { 'content-type': 'text/html; charset=utf-8' } },
          )
        if (url.pathname === '/pagina.js') return js(script!)
        const worker = workers.findIndex(([endereco]) => url.pathname === `/${endereco}`)
        if (worker >= 0) return js(scriptsDosWorkers[worker]!)
        return (await opcoes.rotas?.(url, pedido)) ?? new Response('ausente', { status: 404 })
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
        expression: `typeof globalThis[${JSON.stringify(opcoes.pronta)}] === 'function'`,
        returnByValue: true,
      })
      if (r.result.value) break
      if (conversa.erros.length) throw Error(`A página falhou: ${conversa.erros[0]}`)
      if (Date.now() > prazo) throw Error('A página não carregou a tempo.')
      await Bun.sleep(100)
    }
    return await usar({
      async avaliar<R>(expressao: string, prazoMs = 180_000): Promise<R> {
        const r = await conversa.enviar<RespostaDaAvaliacao<R>>(
          'Runtime.evaluate',
          { expression: expressao, awaitPromise: true, returnByValue: true },
          prazoMs,
        )
        if (r.exceptionDetails)
          throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
        return r.result.value as R
      },
    })
  } finally {
    aberta?.conversa.fechar()
    await aberta?.fechar()
    servidor.stop(true)
  }
}

/** O conteúdo binário de uma leitura, como a página espera. */
export const binario = (dados: ArrayBuffer | Uint8Array<ArrayBuffer>) =>
  new Response(dados, { headers: { 'content-type': 'application/octet-stream' } })
