/**
 * Captura telas REAIS do kids em staging para a oferta da Comunidade dos Criadores (30/09/2026).
 *
 * Por que existe: a página da oferta mostrava mockups com dados fictícios ("O professor acompanha
 * as conversas", contadores de jogadas), contra as restrições da própria copy. A prova passa a ser
 * a plataforma de verdade, com um perfil de teste. O Playwright não abre o Chrome nesta máquina:
 * usamos o Chrome instalado e o protocolo de depuração (CDP) por WebSocket, com o Bun.
 *
 * Uso (de `packages/funnel`):
 *   KIDS_COOKIES_FILE=C:/…/community-kids-staging.up.railway.app_cookies.txt bun scripts/captura-telas-kids.ts
 *   Opções por env: KIDS_BASE_URL (padrão: staging), CHROME_PATH, KIDS_AULA_PATH (rota de uma aula
 *   com o bloco de experimento), KIDS_OUT (pasta de saída; padrão: public/img/comunidade-dos-criadores),
 *   KIDS_SO (lista de nomes separados por vírgula para capturar só algumas telas).
 *
 * ⚠️ Os cookies são uma sessão de verdade: o arquivo NUNCA entra no repositório (o script recusa um
 * caminho dentro dele) e o perfil do Chrome fica no TEMP e é apagado ao fim. Toda imagem gerada
 * precisa de revisão humana antes do commit (nomes de outros perfis de teste, dados na tela).
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, sep } from 'node:path'

const base = process.env.KIDS_BASE_URL ?? 'https://community-kids-staging.up.railway.app'
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const cookiesFile = process.env.KIDS_COOKIES_FILE
const saida = resolve(process.env.KIDS_OUT ?? 'public/img/comunidade-dos-criadores')
const so = process.env.KIDS_SO?.split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const porta = 9333 + Math.floor(Math.random() * 300)

if (!cookiesFile) {
  console.error('Defina KIDS_COOKIES_FILE com o arquivo Netscape exportado do navegador.')
  process.exit(2)
}
const repo = resolve(import.meta.dir, '..', '..', '..')
const semCaixa = (c: string) => (process.platform === 'win32' ? c.toLowerCase() : c)
if (semCaixa(resolve(cookiesFile)).startsWith(semCaixa(repo + sep))) {
  console.error('O arquivo de cookies não pode ficar dentro do repositório.')
  process.exit(2)
}

type Cookie = {
  name: string
  value: string
  domain: string
  path: string
  secure: boolean
  httpOnly: boolean
  expires: number
}
function lerNetscape(texto: string): Cookie[] {
  const cookies: Cookie[] = []
  for (const linha of texto.split('\n')) {
    const httpOnly = linha.startsWith('#HttpOnly_')
    const limpa = httpOnly ? linha.slice('#HttpOnly_'.length) : linha
    if (!limpa || limpa.startsWith('#')) continue
    const [domain, , path, secure, expires, name, value] = limpa.split('\t')
    if (!domain || !name || value === undefined) continue
    cookies.push({
      name,
      value: value.trim(),
      domain,
      path: path || '/',
      secure: secure === 'TRUE' || name.startsWith('__Host-') || name.startsWith('__Secure-'),
      httpOnly,
      expires: Number(expires) || -1,
    })
  }
  return cookies
}

/** Uma tela: a rota, o que esperar (seletor) e, se precisar, o que fazer antes do print. */
type Tela = {
  nome: string
  rota: string
  espera?: string
  /** JS avaliado na página antes do print (fechar modal, rolar até o bloco…). */
  antes?: string
  /** Altura da janela; a padrão é 800. */
  altura?: number
}
/** Fecha o diálogo aberto (os "Combinados" do Clube, o tutorial): o botão de seguir em frente, ou
 * o de fechar; tenta três vezes porque o React troca o diálogo depois do clique. */
const FECHAR_MODAL = `(async () => {
  const feitos = []
  for (let i = 0; i < 3; i++) {
    const d = [...document.querySelectorAll('[role=dialog], [role=alertdialog]')].find(
      (x) => x.getClientRects().length > 0,
    )
    if (!d) break
    const botoes = [...d.querySelectorAll('button')]
    const b =
      botoes.find((x) => /vamos|entendi|come[cç]ar|fechar|ok|pular/i.test(x.textContent ?? '')) ??
      d.querySelector('button[aria-label*="echar"]') ??
      botoes.at(-1)
    if (!b) break
    b.click()
    feitos.push((b.textContent || b.getAttribute('aria-label') || '').trim())
    await new Promise((r) => setTimeout(r, 500))
  }
  return feitos.length ? 'fechou ' + feitos.join(' › ') : 'sem modal'
})()`
/** Antes de cada print: o "Pular para o conteúdo" some (o CDP deixa o foco visível nele) e nada
 * fica focado. */
const LIMPAR = `(() => {
  document.activeElement?.blur?.()
  let n = 0
  for (const a of document.querySelectorAll('a[href^="#"]'))
    if (/pular para/i.test(a.textContent ?? '')) {
      a.style.display = 'none'
      n++
    }
  return 'limpo ' + n
})()`
const TELAS: Tela[] = [
  {
    nome: 'tela-jornada',
    rota: '/cursos',
    espera: 'main ol, main [class*="journey"]',
    antes: FECHAR_MODAL,
  },
  {
    nome: 'tela-aula',
    rota: process.env.KIDS_AULA_PATH ?? '',
    espera: '.sz-scene-console',
    antes:
      'document.querySelector(".sz-scene-console")?.scrollIntoView({ block: "center" }); "rolou"',
    altura: 860,
  },
  {
    nome: 'tela-aula-topo',
    rota: process.env.KIDS_AULA_PATH ?? '',
    espera: '.sz-scene-console',
    antes: 'window.scrollTo(0, 0); "topo"',
  },
  /** O jogo publicado da criança, como quem recebe o link o vê (a rota sai do Mural). */
  { nome: 'tela-jogo', rota: '', espera: 'main', antes: FECHAR_MODAL },
  { nome: 'tela-estudio-lista', rota: '/estudio', espera: 'main', antes: FECHAR_MODAL },
  { nome: 'tela-pinta', rota: '/pinta', espera: 'main', antes: FECHAR_MODAL },
  {
    nome: 'tela-mural',
    rota: '/mural-dos-criadores',
    espera: 'main article, main [class*="card"]',
    antes: FECHAR_MODAL,
  },
  { nome: 'tela-clube', rota: '/clube-dos-criadores', espera: 'main', antes: FECHAR_MODAL },
  { nome: 'tela-meu-espaco', rota: '/perfil', espera: 'main', antes: FECHAR_MODAL },
]

async function main() {
  const cookies = lerNetscape(await Bun.file(cookiesFile as string).text())
  if (!cookies.length) throw new Error('Nenhum cookie lido do arquivo.')
  const perfil = mkdtempSync(resolve(tmpdir(), 'chrome-kids-'))
  const proc = Bun.spawn(
    [
      chrome,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--hide-scrollbars',
      '--disable-extensions',
      `--user-data-dir=${perfil}`,
      `--remote-debugging-port=${porta}`,
      `--remote-allow-origins=http://127.0.0.1:${porta}`,
      '--window-size=1280,800',
      'about:blank',
    ],
    { stdout: 'ignore', stderr: 'ignore' },
  )
  try {
    // Espera o depurador subir.
    for (let i = 0; i < 40; i++) {
      try {
        await fetch(`http://127.0.0.1:${porta}/json/version`)
        break
      } catch {
        await Bun.sleep(250)
      }
    }
    const alvo = (await (
      await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: 'PUT' })
    ).json()) as { webSocketDebuggerUrl: string }
    const ws = new WebSocket(alvo.webSocketDebuggerUrl)
    let id = 0
    type Pendente = { res: (v: Record<string, unknown>) => void; rej: (e: Error) => void }
    const pendentes = new Map<number, Pendente>()
    const eventos: ((m: { method?: string }) => void)[] = []
    // ⚠️ Um erro do CDP (cookie recusado, navegação que falhou, exceção no evaluate) REJEITA:
    // antes ele voltava como resultado e a foto saía da página de erro do Chrome, em silêncio.
    const send = (method: string, params: Record<string, unknown> = {}) =>
      new Promise<Record<string, unknown>>((res, rej) => {
        const i = ++id
        pendentes.set(i, { res, rej })
        ws.send(JSON.stringify({ id: i, method, params }))
      })
    const derrubar = (motivo: string) => {
      for (const p of pendentes.values()) p.rej(new Error(motivo))
      pendentes.clear()
    }
    await new Promise<void>((r, rej) => {
      ws.onopen = () => r()
      ws.onerror = () => rej(new Error('O WebSocket do Chrome não abriu.'))
    })
    ws.onerror = () => derrubar('O WebSocket do Chrome caiu.')
    ws.onclose = () => derrubar('O Chrome fechou a conexão.')
    ws.onmessage = (ev) => {
      const m = JSON.parse(String(ev.data))
      if (m.id && pendentes.has(m.id)) {
        const p = pendentes.get(m.id) as Pendente
        pendentes.delete(m.id)
        if (m.error)
          p.rej(new Error(`${m.error.message ?? 'erro do CDP'} (${m.error.code ?? '?'})`))
        else p.res(m.result ?? {})
      } else for (const f of [...eventos]) f(m)
    }
    const esperarLoad = () =>
      new Promise<void>((res) => {
        const timer = setTimeout(() => {
          eventos.splice(eventos.indexOf(f), 1)
          res()
        }, 20_000)
        const f = (m: { method?: string }) => {
          if (m.method === 'Page.loadEventFired') {
            clearTimeout(timer)
            eventos.splice(eventos.indexOf(f), 1)
            res()
          }
        }
        eventos.push(f)
      })
    const navegar = async (url: string) => {
      const carga = esperarLoad()
      const r = (await send('Page.navigate', { url })) as { errorText?: string }
      if (r.errorText) throw new Error(`Não abriu ${url}: ${r.errorText}`)
      await carga
    }
    const avaliar = async (expressao: string) => {
      const r = (await send('Runtime.evaluate', {
        expression: expressao,
        returnByValue: true,
        awaitPromise: true,
      })) as { result?: { value?: unknown } }
      return r.result?.value
    }

    await send('Network.enable')
    await send('Page.enable')
    await send('Network.setCookies', { cookies })
    // O Zappy animado (Rive) cai no WebP parado, e nada balança na foto.
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })

    // A sessão é de PERFIL? (sem perfil a borda manda para /perfis)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await navegar(`${base}/`)
    await Bun.sleep(1500)
    const url = String(await avaliar('location.href'))
    if (url.includes('/perfis') || url.includes('/login')) {
      throw new Error(
        `A sessão não é de um perfil (caiu em ${url}). Exporte os cookies logado no perfil.`,
      )
    }
    // A rota da aula, se não veio por env: o "Continuar" da home aponta para a aula atual.
    const aulaDaHome = String(
      (await avaliar(
        '[...document.querySelectorAll("a[href*=\\"/aulas/\\"]")].map(a => a.getAttribute("href"))[0] ?? ""',
      )) ?? '',
    )
    // A rota do jogo publicado: o primeiro "Jogar" do Mural.
    await navegar(`${base}/mural-dos-criadores`)
    await Bun.sleep(1500)
    // A rota do jogo publicado: o primeiro "Jogar" do Mural (os cartões chegam depois da página).
    let jogoDoMural = ''
    for (let i = 0; i < 20 && !jogoDoMural; i++) {
      jogoDoMural = String(
        (await avaliar(
          '[...document.querySelectorAll("main a[href*=\\"/jogar/\\"]")].map(a => a.getAttribute("href"))[0] ?? ""',
        )) ?? '',
      )
      if (!jogoDoMural) await Bun.sleep(250)
    }
    const telas = TELAS.map((t) =>
      t.nome.startsWith('tela-aula') && !t.rota
        ? { ...t, rota: aulaDaHome }
        : t.nome === 'tela-jogo' && !t.rota
          ? { ...t, rota: jogoDoMural }
          : t,
    ).filter((t) => (so ? so.includes(t.nome) : true))

    const linhas: string[] = []
    for (const tela of telas) {
      if (!tela.rota) {
        console.warn(`${tela.nome}: sem rota (KIDS_AULA_PATH, ou um jogo no Mural); pulada.`)
        continue
      }
      for (const escala of [1, 2]) {
        await send('Emulation.setDeviceMetricsOverride', {
          width: 1280,
          height: tela.altura ?? 800,
          deviceScaleFactor: escala,
          mobile: false,
        })
        await navegar(`${base}${tela.rota}`)
        await avaliar('document.fonts.ready.then(() => "fontes")')
        if (tela.espera) {
          for (
            let i = 0;
            i < 40 &&
            !(await avaliar(`Boolean(document.querySelector(${JSON.stringify(tela.espera)}))`));
            i++
          )
            await Bun.sleep(250)
        }
        const feito = tela.antes ? await avaliar(tela.antes) : ''
        await Bun.sleep(1200)
        // Diálogos que chegam DEPOIS dos dados (os "Combinados" do Clube) só existem agora.
        const fechado = await avaliar(FECHAR_MODAL)
        if (fechado !== 'sem modal') await Bun.sleep(600)
        const limpo = await avaliar(LIMPAR)
        await Bun.sleep(300)
        if (escala === 1) console.log(`${tela.nome}: ${feito} · ${fechado} · ${limpo}`)
        const shot = (await send('Page.captureScreenshot', { format: 'webp', quality: 84 })) as {
          data: string
        }
        const arquivo = resolve(saida, `${tela.nome}${escala === 2 ? '@2x' : ''}.webp`)
        const bytes = Buffer.from(shot.data, 'base64')
        await Bun.write(arquivo, bytes)
        const kb = Math.round(bytes.length / 1024)
        const teto = escala === 2 ? 320 : 120
        linhas.push(
          `${tela.nome}${escala === 2 ? '@2x' : ''}: ${1280 * escala}×${(tela.altura ?? 800) * escala}, ${kb} KB${kb > teto ? ` (⚠ acima de ${teto} KB)` : ''}`,
        )
      }
    }
    ws.close()
    console.log(linhas.join('\n'))
  } finally {
    proc.kill()
    await Promise.race([proc.exited, Bun.sleep(5000)])
    try {
      rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    } catch (e) {
      console.warn(`Não apaguei o perfil temporário ${perfil}: ${(e as Error).message}`)
    }
  }
}

await main()
