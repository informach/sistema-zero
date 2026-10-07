/**
 * Captura telas REAIS do kids em staging para as ofertas da Comunidade dos Criadores.
 *
 * Por que existe: a prova da página é a plataforma de verdade, com um perfil de teste, e não
 * mockup nem ilustração. O Playwright não abre o Chrome nesta máquina: usamos o Chrome instalado e
 * o protocolo de depuração (CDP) por WebSocket, com o Bun.
 *
 * Uso (de `packages/funnel`):
 *   KIDS_COOKIES_FILE=C:/…/community-kids-staging.up.railway.app_cookies.txt bun scripts/captura-telas-kids.ts
 *
 * Opções por env:
 *   KIDS_BASE_URL   padrão: staging            CHROME_PATH   o Chrome instalado
 *   KIDS_OUT        pasta de saída (padrão: public/img/comunidade-dos-criadores)
 *   KIDS_SO         nomes separados por vírgula (`tela-aula,tela-pinta`) para refazer só algumas
 *   KIDS_CURSO      slug do curso das aulas (padrão: cade-todo-mundo)
 *   KIDS_CURSO_CONCLUIDO  curso que o perfil já terminou, para o certificado liberado
 *                   (padrão: nave-contra-asteroides)
 *   KIDS_PROJETO    projeto do Estúdio livre (padrão: Cadê Todo Mundo?)
 *   KIDS_PINTA_PERSONAGEM / KIDS_PINTA_ANIMADO / KIDS_PINTA_CENARIO   desenhos abertos no Pinta
 *                   (padrão: base-3-2 / dumb-animation / dumb-scene-2)
 *   KIDS_PINTA_BUSCA  o que digitar na busca da galeria para os desenhos bonitos subirem (padrão: base)
 *   KIDS_PLANO      plano do Pensa (padrão: ParOuImpar)   KIDS_MOLDA  modelo do Molda (padrão: player-2)
 *   KIDS_PAIS_SENHA_FILE  arquivo FORA do repositório com a senha da conta na primeira linha: com
 *                   ele o roteiro `pais` entra sozinho na Área dos pais (a senha nunca é impressa)
 *   KIDS_PERGUNTA   se o Zappy do Estúdio estiver sem conversa, faz esta pergunta (gasta crédito de IA)
 *   KIDS_CDP_PORT   usa um Chrome JÁ ABERTO com `--remote-debugging-port` e já logado no perfil
 *                   (dispensa o arquivo de cookies e não fecha o navegador ao fim)
 *
 * Cada ROTEIRO leva a plataforma até um estado e tira uma ou mais fotos (1x e @2x). Os roteiros
 * só leem o que já existe no perfil: o personagem do Pinta, o plano do Pensa, a conversa dos
 * Recados e o projeto do Estúdio foram criados à mão no perfil de teste (ver o CLAUDE.md do funil).
 *
 * ⚠️ Os cookies são uma sessão de verdade: o arquivo NUNCA entra no repositório (o script recusa um
 * caminho dentro dele), vencem em poucas horas, e o perfil do Chrome fica no TEMP e é apagado ao
 * fim. ⚠️ A Área dos pais pede a senha da conta e a liberação vale 15 minutos (cookie
 * `sz_kids_parent`): rode `KIDS_SO=pais` com `KIDS_PAIS_SENHA_FILE`, ou exporte os cookies logo
 * depois de entrar nela. ⚠️ Antes de fotografar o Estúdio os blocos são ORGANIZADOS (botão direito
 * numa área vazia › "Organizar blocos") e enquadrados no alto: soltos, eles ficam lá embaixo e
 * sobrepostos. Toda imagem precisa de revisão humana antes do commit (nomes de outros perfis no
 * Mural, dados na tela).
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, sep } from 'node:path'

const base = process.env.KIDS_BASE_URL ?? 'https://community-kids-staging.up.railway.app'
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const cookiesFile = process.env.KIDS_COOKIES_FILE
const saida = resolve(process.env.KIDS_OUT ?? 'public/img/comunidade-dos-criadores')
const so = process.env.KIDS_SO?.split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const curso = process.env.KIDS_CURSO ?? 'cade-todo-mundo'
const cursoConcluido = process.env.KIDS_CURSO_CONCLUIDO ?? 'nave-contra-asteroides'
const projeto = process.env.KIDS_PROJETO ?? 'Cadê Todo Mundo?'
const pintaPersonagem = process.env.KIDS_PINTA_PERSONAGEM ?? 'base-3-2'
const pintaAnimado = process.env.KIDS_PINTA_ANIMADO ?? 'dumb-animation'
const pintaCenario = process.env.KIDS_PINTA_CENARIO ?? 'dumb-scene-2'
const pintaBusca = process.env.KIDS_PINTA_BUSCA ?? 'base'
const plano = process.env.KIDS_PLANO ?? 'ParOuImpar'
const modelo = process.env.KIDS_MOLDA ?? 'player-2'
const senhaPais = process.env.KIDS_PAIS_SENHA_FILE
const pergunta = process.env.KIDS_PERGUNTA
// ⚠️ O token de sessão do kids GIRA a cada renovação: quem usa os cookies primeiro invalida a
// cópia do arquivo. Para rodar o script duas vezes na mesma sessão, anexe a um Chrome já aberto.
const anexar = process.env.KIDS_CDP_PORT ? Number(process.env.KIDS_CDP_PORT) : null
const porta = anexar ?? 9333 + Math.floor(Math.random() * 300)

if (!anexar && !cookiesFile) {
  console.error('Defina KIDS_COOKIES_FILE com o arquivo Netscape exportado do navegador.')
  process.exit(2)
}
const repo = resolve(import.meta.dir, '..', '..', '..')
const semCaixa = (c: string) => (process.platform === 'win32' ? c.toLowerCase() : c)
for (const [arquivo, nome] of [
  [cookiesFile, 'de cookies'],
  [senhaPais, 'da senha'],
] as const) {
  if (arquivo && semCaixa(resolve(arquivo)).startsWith(semCaixa(repo + sep))) {
    console.error(`O arquivo ${nome} não pode ficar dentro do repositório.`)
    process.exit(2)
  }
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
/** Antes de cada foto: o "Pular para o conteúdo" some (o CDP deixa o foco visível nele), nada fica
 * focado e o identificador de perfil sobre o vídeo (marca de depuração) fica invisível. */
const LIMPAR = `(() => {
  document.activeElement?.blur?.()
  for (const a of document.querySelectorAll('a[href^="#"]'))
    if (/pular para/i.test(a.textContent ?? '')) a.style.display = 'none'
  for (const e of document.querySelectorAll('span'))
    if (e.children.length === 0 && /^Perfil [0-9a-f]{6,}/.test(e.textContent.trim()))
      e.style.visibility = 'hidden'
  return 'limpo'
})()`

type Recorte = { x: number; y: number; w: number; h: number }
type Roteiro = {
  /** As fotos que o roteiro tira; `KIDS_SO` filtra por estes nomes (ou pelo nome do roteiro). */
  nomes: string[]
  rodar: () => Promise<void>
}

async function main() {
  const cookies = cookiesFile ? lerNetscape(await Bun.file(cookiesFile).text()) : []
  if (!anexar && !cookies.length) throw new Error('Nenhum cookie lido do arquivo.')
  mkdirSync(saida, { recursive: true })
  const perfil = anexar ? null : mkdtempSync(resolve(tmpdir(), 'chrome-kids-'))
  const proc = anexar
    ? null
    : Bun.spawn(
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
    for (let i = 0; i < 40; i++) {
      try {
        await fetch(`http://127.0.0.1:${porta}/json/version`)
        break
      } catch {
        await Bun.sleep(250)
      }
    }
    // Anexado, usa a aba que já existe (a sessão mora nela); sozinho, abre uma aba nova.
    const alvo = anexar
      ? (
          (await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json()) as {
            type: string
            webSocketDebuggerUrl: string
          }[]
        ).find((aba) => aba.type === 'page')
      : ((await (
          await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: 'PUT' })
        ).json()) as { webSocketDebuggerUrl: string })
    if (!alvo) throw new Error(`Nenhuma aba no Chrome da porta ${porta}.`)
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
    const avaliar = async (expressao: string) => {
      const r = (await send('Runtime.evaluate', {
        expression: expressao,
        returnByValue: true,
        awaitPromise: true,
        userGesture: true,
      })) as { result?: { value?: unknown }; exceptionDetails?: { text?: string } }
      if (r.exceptionDetails) throw new Error(`avaliar: ${r.exceptionDetails.text ?? 'erro'}`)
      return r.result?.value
    }
    const tamanho = (altura: number, escala: number) =>
      send('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: altura,
        deviceScaleFactor: escala,
        mobile: false,
      })
    let altura = 800
    /** Abre uma rota (ou URL inteira), espera as fontes e os dados, fecha o diálogo de entrada. */
    const abrir = async (rota: string, espera = 3000, fechar = true) => {
      // Trocar só o `#section=` não recarrega a página: passa por uma página em branco.
      if (rota.includes('#')) {
        const vazia = esperarLoad()
        await send('Page.navigate', { url: 'about:blank' })
        await vazia
      }
      const url = /^(https?:|about:)/.test(rota) ? rota : `${base}${rota}`
      const carga = esperarLoad()
      const r = (await send('Page.navigate', { url })) as { errorText?: string }
      if (r.errorText) throw new Error(`Não abriu ${url}: ${r.errorText}`)
      await carga
      await avaliar('document.fonts.ready.then(() => "fontes")')
      await Bun.sleep(espera)
      if (fechar) await avaliar(FECHAR_MODAL)
      return String(await avaliar('location.href'))
    }
    const mouse = (type: string, x: number, y: number, extra: Record<string, unknown> = {}) =>
      send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, ...extra })
    const clicarEm = async (x: number, y: number) => {
      await mouse('mouseMoved', x, y, { button: 'none' })
      await mouse('mousePressed', x, y)
      await Bun.sleep(40)
      await mouse('mouseReleased', x, y)
    }
    /** Clica no botão/link cujo texto (ou `aria-label`) contém `rotulo`; `n` escolhe entre vários. */
    const clicar = async (rotulo: string, n = 0, pausa = 900) => {
      const r = (await avaliar(
        `(() => { const t = ${JSON.stringify(rotulo)}.toLowerCase(); const el = [...document.querySelectorAll('button, a, [role=button], [role=tab], [role=menuitem], summary')].filter(e => e.getClientRects().length && ((e.getAttribute('aria-label') || '') + ' ' + (e.textContent || '')).toLowerCase().includes(t))[${n}]; if (!el) return null; el.scrollIntoView({ block: 'center' }); const q = el.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 } })()`,
      )) as { x: number; y: number } | null
      if (!r) throw new Error(`Não achei o botão "${rotulo}".`)
      await clicarEm(r.x, r.y)
      await Bun.sleep(pausa)
    }
    const tem = async (rotulo: string) =>
      Boolean(
        await avaliar(
          `Boolean([...document.querySelectorAll('button, a, summary')].find(e => e.getClientRects().length && ((e.getAttribute('aria-label') || '') + ' ' + (e.textContent || '')).toLowerCase().includes(${JSON.stringify(rotulo)}.toLowerCase())))`,
        ),
      )
    const digitar = (texto: string) => send('Input.insertText', { text: texto })
    const tecla = async (key: string, code: string, vk: number) => {
      const params = { key, code, windowsVirtualKeyCode: vk }
      await send('Input.dispatchKeyEvent', { type: 'keyDown', ...params })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...params })
    }
    const paraFora = () => mouse('mouseMoved', 640, 30, { button: 'none' })
    /** Rola a página E os painéis que rolam por dentro (o `main` do app rola, a janela não). */
    const rolar = async (y: number) => {
      await avaliar(
        `(() => { window.scrollTo(0, ${y}); for (const e of document.querySelectorAll('main, [class*=overflow]')) if (e.scrollHeight > e.clientHeight + 50) e.scrollTop = ${y}; return 1 })()`,
      )
      await Bun.sleep(600)
    }
    const aoTopo = () =>
      avaliar(
        'window.scrollTo(0, 0); document.querySelectorAll("*").forEach((e) => { if (e.scrollTop > 0) e.scrollTop = 0 }); 1',
      )
    type Ponto = { x: number; y: number }
    /** As pilhas de blocos (retângulos na tela), da esquerda para a direita. */
    const pilhas = async () =>
      (await avaliar(
        `[...document.querySelectorAll('.blocklyBlockCanvas > g.blocklyDraggable')].map((b) => b.getBoundingClientRect()).sort((a, b) => a.left - b.left).map((q) => ({ x: q.left, y: q.top, w: q.width, h: q.height }))`,
      )) as { x: number; y: number; w: number; h: number }[]
    /**
     * Um ponto VAZIO e visível da área de blocos. ⚠️ Pegar em cima de um bloco arrasta o BLOCO (e
     * desmonta o programa do aluno de teste), e os botões de zoom ficam sob a barra da aula. Quem
     * diz se está vazio é o elemento sob o ponto, e não a caixa da pilha: no zoom de fábrica a
     * caixa da primeira pilha cobre a área inteira, embora sobre fundo à direita das linhas curtas.
     */
    const vazio = async () => {
      // O espaço de blocos demora a montar depois de abrir o projeto: tenta por alguns segundos.
      for (let i = 0; i < 12; i++) {
        const r = (await avaliar(
          `(() => { const s = [...document.querySelectorAll('.blocklySvg')].map((e) => e.getBoundingClientRect()).find((q) => q.width > 200 && q.height > 200); if (!s) return null; const bs = [...document.querySelectorAll('.blocklyBlockCanvas > g.blocklyDraggable')].map((b) => b.getBoundingClientRect()); if (!bs.length) return null; const livre = (x, y) => { const el = document.elementFromPoint(x, y); return Boolean(el?.closest('.blocklySvg')) && !el.closest('.blocklyDraggable, .blocklyZoom, .blocklyTrash, .blocklyScrollbarHandle, .blocklyFlyout') }; for (let y = s.top + 30; y < Math.min(s.bottom, innerHeight) - 20; y += 22) for (let x = s.left + 30; x < Math.min(s.right, innerWidth) - 30; x += 22) { if ([[0, 0], [-12, 0], [12, 0], [0, -12], [0, 12]].every(([dx, dy]) => livre(x + dx, y + dy))) return { x, y } } return null })()`,
        )) as Ponto | null
        if (r) return r
        await Bun.sleep(700)
      }
      throw new Error('Não achei um ponto vazio na área de blocos.')
    }
    /** Botão direito numa área vazia › "Organizar blocos" (o texto EXATO: logo abaixo fica "Apagar os N blocos"). */
    const organizarBlocos = async () => {
      const p = await vazio()
      await mouse('mouseMoved', p.x, p.y, { button: 'none' })
      await mouse('mousePressed', p.x, p.y, { button: 'right' })
      await Bun.sleep(60)
      await mouse('mouseReleased', p.x, p.y, { button: 'right' })
      await Bun.sleep(900)
      const item = (await avaliar(
        `(() => { const e = [...document.querySelectorAll('.blocklyMenuItem')].find((x) => x.textContent.trim() === 'Organizar blocos'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })()`,
      )) as Ponto | null
      if (!item) throw new Error('O menu do espaço de blocos não trouxe "Organizar blocos".')
      await clicarEm(item.x, item.y)
      await Bun.sleep(1500)
    }
    /** Ctrl + roda até a primeira pilha ter mais ou menos `largura` px (cada passo muda ~24%). */
    const zoomDosBlocos = async (largura: number) => {
      for (let i = 0; i < 14; i++) {
        const w = (await pilhas())[0]?.w
        if (!w) throw new Error('Não há blocos no espaço.')
        if (w <= largura * 1.05 && w >= largura * 0.8) return
        const p = await vazio()
        await send('Input.dispatchMouseEvent', {
          type: 'mouseWheel',
          x: p.x,
          y: p.y,
          deltaX: 0,
          deltaY: w > largura ? 120 : -120,
          modifiers: 2,
        })
        await Bun.sleep(350)
      }
    }
    /** Arrasta o ESPAÇO (por um ponto vazio) até a primeira pilha começar em (x, y). */
    const enquadrarBlocos = async (x: number, y: number) => {
      const p = (await pilhas())[0]
      if (!p) throw new Error('Não há blocos no espaço.')
      const de = await vazio()
      const [dx, dy] = [x - p.x, y - p.y]
      await mouse('mouseMoved', de.x, de.y, { button: 'none' })
      await mouse('mousePressed', de.x, de.y)
      const passos = Math.max(1, Math.round(Math.hypot(dx, dy) / 20))
      for (let k = 1; k <= passos; k++) {
        await mouse('mouseMoved', de.x + (dx * k) / passos, de.y + (dy * k) / passos, {
          buttons: 1,
        })
        await Bun.sleep(8)
      }
      await mouse('mouseReleased', de.x + dx, de.y + dy)
      await Bun.sleep(700)
    }
    /** Id estável de seção importada (espelha `members/src/domain/learning/learning-import.ts`). */
    const secao = (aula: string, chave: string) => {
      const hash = new Bun.CryptoHasher('sha256')
        .update(`sz-learning-v1:${aula}:section:${chave}`)
        .digest('hex')
      return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
    }

    const linhas: string[] = []
    const quer = (nome: string) => !so || so.includes(nome)
    /** A foto: 1x e @2x, inteira ou só o recorte. Nome fora do `KIDS_SO` é pulado. */
    const foto = async (nome: string, recorte?: Recorte) => {
      if (!quer(nome)) return
      for (const escala of [1, 2]) {
        await tamanho(altura, escala)
        await Bun.sleep(escala === 2 ? 700 : 200)
        await avaliar(LIMPAR)
        const params: Record<string, unknown> = { format: 'webp', quality: escala === 2 ? 80 : 86 }
        if (recorte)
          params.clip = {
            x: recorte.x,
            y: recorte.y + Number(await avaliar('window.scrollY')),
            width: recorte.w,
            height: recorte.h,
            scale: 1,
          }
        const shot = (await send('Page.captureScreenshot', params)) as { data: string }
        const bytes = Buffer.from(shot.data, 'base64')
        await Bun.write(resolve(saida, `${nome}${escala === 2 ? '@2x' : ''}.webp`), bytes)
        const kb = Math.round(bytes.length / 1024)
        const teto = escala === 2 ? 320 : 120
        const [w, h] = recorte ? [recorte.w, recorte.h] : [1280, altura]
        linhas.push(
          `${nome}${escala === 2 ? '@2x' : ''}: ${w * escala}×${h * escala}, ${kb} KB${kb > teto ? ` (⚠ acima de ${teto} KB)` : ''}`,
        )
      }
      await tamanho(altura, 1)
    }

    await send('Network.enable')
    await send('Page.enable')
    if (cookies.length) await send('Network.setCookies', { cookies })
    // O Zappy animado (Rive) cai no WebP parado, e nada balança na foto.
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })
    await tamanho(altura, 1)

    // A sessão é de PERFIL? (sem perfil a borda manda para /perfis)
    const inicio = await abrir('/', 1500)
    if (inicio.includes('/perfis') || inicio.includes('/login'))
      throw new Error(
        `A sessão não é de um perfil (caiu em ${inicio}). Exporte os cookies logado no perfil.`,
      )

    let aulas: string[] | null = null
    /** As aulas do curso, na ordem da trilha (o endereço usa o UUID, que só existe no banco). */
    const aulasDoCurso = async () => {
      if (aulas) return aulas
      await abrir(`/cursos/${curso}`)
      aulas = (await avaliar(
        '[...new Set([...document.querySelectorAll("main a[href*=\\"/aulas/\\"]")].map((a) => a.getAttribute("href").split("/aulas/")[1]))]',
      )) as string[]
      if (aulas.length < 2) throw new Error(`O curso ${curso} não mostrou as aulas na trilha.`)
      return aulas
    }
    const abrirSecao = async (indice: number, chave: string) => {
      const aula = (await aulasDoCurso())[indice] as string
      await abrir(`/cursos/${curso}/aulas/${aula}#section=${secao(aula, chave)}`, 4000)
    }
    /** Abre na galeria o cartão cujo `aria-label` começa por "Abrir <nome>". */
    const abrirCartao = async (nome: string) => {
      const r = (await avaliar(
        `(() => { const b = [...document.querySelectorAll('main button')].find(e => (e.getAttribute('aria-label') || '').toLowerCase().startsWith(${JSON.stringify(`abrir ${nome} (`.toLowerCase())})); if (!b) return null; b.scrollIntoView({ block: 'center' }); const q = b.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 } })()`,
      )) as { x: number; y: number } | null
      if (!r) throw new Error(`Não achei "${nome}" na galeria.`)
      await clicarEm(r.x, r.y)
      await Bun.sleep(5000)
      await avaliar(FECHAR_MODAL)
      if (await tem('Entendi!')) await clicar('Entendi!')
    }

    const ROTEIROS: Record<string, Roteiro> = {
      aula: {
        nomes: [
          'tela-regra-desligada',
          'tela-regra-ligada',
          'tela-aprendizagem',
          'tela-aula',
          'tela-pausa',
          'tela-ajuda',
        ],
        rodar: async () => {
          // A experiência do toque: a mesma regra desligada e ligada, na vista ampliada.
          await abrirSecao(0, 'toque-e-resposta')
          await clicar('Recomeçar com a reação desligada')
          await clicar('Tocar no arbusto')
          await clicar('Ampliar experiência', 0, 1200)
          await foto('tela-regra-desligada')
          await clicar('Ligar a reação ao toque')
          await clicar('Tocar no arbusto', 0, 1200)
          await foto('tela-regra-ligada')
          if (await tem('Ver a explicação')) await clicar('Ver a explicação')
          altura = 920
          await foto('tela-aprendizagem')
          altura = 800
          await clicar('Voltar à fase', 0, 1200)
          await aoTopo()
          await foto('tela-aula')
          // O vídeo toca alguns segundos e pausa: a explicação parada ao lado do experimento.
          await clicarEm(89, 441)
          await Bun.sleep(9000)
          await clicarEm(89, 441)
          await Bun.sleep(800)
          await mouse('mouseMoved', 300, 300, { button: 'none' })
          await foto('tela-pausa')
          // O pedido de ajuda só é ESCRITO: enviar é uma mensagem real para a equipe.
          await clicar('Preciso de ajuda', 0, 1200)
          await avaliar('document.querySelector("textarea")?.focus(); 1')
          await digitar('Não entendi por que o coelho só aparece quando a reação está ligada.')
          await Bun.sleep(500)
          await foto('tela-ajuda')
        },
      },
      'aula-estudio': {
        nomes: ['tela-estudio', 'tela-aula-estudio'],
        rodar: async () => {
          await abrirSecao(0, 'primeiro-achado')
          await clicar('Expandir', 0, 2500)
          await organizarBlocos()
          await zoomDosBlocos(490)
          await enquadrarBlocos(236, 142)
          await paraFora()
          await foto('tela-estudio')
          await clicar('Reduzir', 0, 1500)
          await aoTopo()
          // Na atividade reduzida o programa inteiro cabe ao lado do vídeo.
          await zoomDosBlocos(313)
          await enquadrarBlocos(916, 366)
          await aoTopo()
          await paraFora()
          await foto('tela-aula-estudio')
        },
      },
      'aula-extras': {
        nomes: ['tela-jogo-pronto', 'tela-contador', 'tela-certificado'],
        rodar: async () => {
          await abrirSecao(0, 'apresentacao')
          // Dois esconderijos (o arbusto e as pedras) pela posição DO JOGO, e não da tela: o
          // layout da fase muda e um clique cravado em pixels caía fora do jogo (07/10/2026).
          const jogo = (await avaliar(
            `(() => { const f = [...document.querySelectorAll('main iframe')].filter((e) => !(e.src || '').includes('vimeo')).at(-1); if (!f) return null; const r = f.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } })()`,
          )) as { x: number; y: number; w: number; h: number } | null
          if (!jogo) throw new Error('O jogo pronto não apareceu na fase.')
          for (const [fx, fy] of [
            [0.24, 0.62],
            [0.47, 0.62],
          ] as const) {
            await clicarEm(jogo.x + jogo.w * fx, jogo.y + jogo.h * fy)
            await Bun.sleep(900)
          }
          await paraFora()
          await foto('tela-jogo-pronto')
          await abrirSecao(1, 'variavel-achados')
          await clicar('Ampliar experiência', 0, 1200)
          await clicar('Tocar no arbusto')
          await clicar('Tocar nas pedras')
          await foto('tela-contador')
          // O certificado sai do curso que o perfil de teste JÁ CONCLUIU (`KIDS_CURSO_CONCLUIDO`):
          // num curso em andamento o bloco aparece trancado, com cadeado, e a foto não diz nada.
          await abrir(`/cursos/${cursoConcluido}`)
          const ultima = (await avaliar(
            '[...document.querySelectorAll("main a[href*=\\"/aulas/\\"]")].at(-1)?.getAttribute("href") ?? ""',
          )) as string
          if (!ultima) throw new Error(`O curso ${cursoConcluido} não mostrou as aulas na trilha.`)
          await abrir(ultima, 4000)
          // O número identifica o certificado de teste (abriria a validação em staging): some da foto.
          await avaliar(
            `(() => { for (const e of document.querySelectorAll('p, span, div')) if (e.children.length === 0 && /^N[ºo°]\\s*SZ-\\d{4}-/.test(e.textContent.trim())) e.style.visibility = 'hidden'; return 'ok' })()`,
          )
          // O bloco do certificado pode vir depois de um vídeo: a foto mira o botão dele.
          const achou = await avaliar(
            `(() => { const b = [...document.querySelectorAll('main button')].find((e) => /Baixar certificado/.test(e.textContent || '')); if (!b) return false; b.scrollIntoView({ block: 'center' }); return true })()`,
          )
          if (!achou) await aoTopo()
          await Bun.sleep(800)
          await foto('tela-certificado')
        },
      },
      jornada: {
        nomes: [
          'tela-jornada',
          'tela-catalogo',
          'tela-jornada-postos',
          'tela-ferias',
          'tela-conquistas',
          'tela-missoes',
        ],
        rodar: async () => {
          await abrir('/cursos')
          await rolar(590)
          await foto('tela-jornada')
          await rolar(1075)
          await foto('tela-catalogo')
          await abrir('/perfil', 4000)
          await rolar(425)
          await foto('tela-jornada-postos')
          await rolar(2430)
          await foto('tela-ferias')
          await rolar(3150)
          await foto('tela-conquistas')
          await abrir('/', 4000)
          await rolar(1040)
          await foto('tela-missoes')
        },
      },
      pinta: {
        nomes: [
          'tela-pinta-galeria',
          'tela-pinta',
          'tela-animacao',
          'tela-exportacao',
          'tela-pinta-vetor',
        ],
        rodar: async () => {
          // A galeria só mostra "Guardado na sua conta" depois de falar com a nuvem. A busca traz
          // para o alto os personagens mais bonitos (o topo da galeria é o que foi mexido por último).
          await abrir('/pinta', 9000)
          await avaliar('document.querySelector(\'input[placeholder*="Buscar"]\')?.focus(); 1')
          await digitar(pintaBusca)
          await Bun.sleep(1800)
          await avaliar('document.activeElement?.blur?.(); 1')
          await aoTopo()
          await paraFora()
          await Bun.sleep(1500)
          await foto('tela-pinta-galeria')
          await abrirCartao(pintaPersonagem)
          await clicar('Aproximar', 0, 500)
          await paraFora()
          await Bun.sleep(1500)
          await foto('tela-pinta')
          // O personagem animado, no terceiro quadro, com o fantasma do quadro anterior.
          await abrir('/pinta', 9000)
          await abrirCartao(pintaAnimado)
          await clicar('Aproximar', 0, 500)
          await clicar(': quadro 3')
          await clicar('Fantasma do quadro anterior')
          await paraFora()
          await Bun.sleep(1500)
          await foto('tela-animacao')
          await clicar('Baixar', 0, 1800)
          await foto('tela-exportacao')
          await tecla('Escape', 'Escape', 27)
          await abrir('/pinta', 9000)
          await abrirCartao(pintaCenario)
          await paraFora()
          await Bun.sleep(1500)
          await foto('tela-pinta-vetor')
        },
      },
      estudio: {
        nomes: [
          'tela-estudio-lista',
          'tela-zappy',
          'tela-codigo',
          'tela-estudio-levar',
          'tela-materiais',
          'tela-trazer-do-pinta',
        ],
        rodar: async () => {
          await abrir('/estudio', 9000)
          await foto('tela-estudio-lista')
          await clicar(`Abrir projeto ${projeto}`, 0, 5000)
          await avaliar(FECHAR_MODAL)
          await organizarBlocos()
          await zoomDosBlocos(490)
          await enquadrarBlocos(215, 96)
          await clicar('Abrir Zappy', 0, 2500)
          if (
            pergunta &&
            !(await avaliar(
              'Boolean(document.querySelector("[class*=zappy] [data-role=user], [class*=Zappy] [data-role=user]"))',
            ))
          ) {
            await avaliar('document.querySelector("textarea")?.focus(); 1')
            await digitar(pergunta)
            await clicar('Perguntar', 0, 22_000)
          }
          await avaliar(
            'document.querySelectorAll("*").forEach((e) => { if (e.scrollTop > 0 && e.getBoundingClientRect().left > 800) e.scrollTop = 0 }); 1',
          )
          await foto('tela-zappy')
          await clicar('Fechar Zappy')
          // Ponte: os blocos, o código gerado e o jogo lado a lado.
          await clicar('Ponte', 0, 3000)
          await clicar('script.js', 0, 1500)
          // Na Ponte a área de blocos é estreita: o programa encolhe para aparecer inteiro.
          await zoomDosBlocos(340)
          await enquadrarBlocos(206, 96)
          await paraFora()
          await foto('tela-codigo')
          await clicar('Blocos', 0, 1500)
          await zoomDosBlocos(490)
          await enquadrarBlocos(215, 96)
          await clicar('Mais opções', 0, 1000)
          await foto('tela-estudio-levar')
          await clicar('Imagens', 0, 2000)
          await foto('tela-materiais', { x: 300, y: 190, w: 680, h: 425 })
          await clicar('Trazer do Pinta', 0, 2200)
          // "base-3-2" › "base-3": a janela mostra o personagem e os irmãos dele na galeria.
          await digitar(pintaPersonagem.replace(/-\d+$/, ''))
          await Bun.sleep(1500)
          await avaliar('document.activeElement?.blur?.(); 1')
          await foto('tela-trazer-do-pinta', { x: 240, y: 150, w: 800, h: 500 })
        },
      },
      pensa: {
        nomes: ['tela-pensa', 'tela-pensa-conversa', 'tela-planejamento'],
        rodar: async () => {
          await abrir('/pensa', 5000)
          // O botão "Continuar" do cartão do plano certo.
          const r = (await avaliar(
            `(() => { const h = [...document.querySelectorAll('main h3')].find(e => e.textContent.trim() === ${JSON.stringify(plano)}); const b = [...(h?.closest('article, li, div')?.parentElement?.querySelectorAll('button') ?? [])].find(e => /continuar/i.test(e.textContent)); if (!b) return null; const q = b.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 } })()`,
          )) as { x: number; y: number } | null
          if (!r) throw new Error(`Não achei o plano "${plano}" no Pensa.`)
          await clicarEm(r.x, r.y)
          await Bun.sleep(5000)
          await foto('tela-pensa')
          await clicar('Zerar a Bagunça', 0, 3000)
          await clicar('Equipe', 0, 1500)
          await foto('tela-planejamento')
          await clicar('Fechar')
          await rolar(370)
          await foto('tela-pensa-conversa')
        },
      },
      molda: {
        nomes: ['tela-molda'],
        rodar: async () => {
          await abrir('/molda', 6000)
          await clicar(`Modelo ${modelo}`, 0, 7000)
          await avaliar(FECHAR_MODAL)
          await foto('tela-molda')
        },
      },
      comunidade: {
        nomes: [
          'tela-mural',
          'tela-cartao-jogo',
          'tela-jogo-publicado',
          'tela-clube',
          'tela-recados',
          'tela-recados-conversa',
          'tela-como-fazer',
        ],
        rodar: async () => {
          await abrir('/mural-dos-criadores', 5000)
          await clicar('Mais jogados', 0, 2500)
          const jogo = String(
            (await avaliar(
              '[...document.querySelectorAll("main a[href*=\\"/jogar/\\"]")].map((a) => a.getAttribute("href"))[0] ?? ""',
            )) ?? '',
          )
          await rolar(240)
          await foto('tela-mural')
          // ⚠️ O cartão sai CORTADO no meio do código QR: inteiro, ele seria lido pela câmera e
          // levaria o visitante da oferta ao ambiente de teste.
          await clicar('Cartão do jogo', 0, 2500)
          await foto('tela-cartao-jogo', { x: 448, y: 94, w: 384, h: 436 })
          if (jogo) {
            await abrir(jogo, 6000)
            await clicarEm(640, 430)
            await tecla('Enter', 'Enter', 13)
            await Bun.sleep(1800)
            for (let i = 0; i < 3; i++) {
              await tecla(' ', 'Space', 32)
              await Bun.sleep(200)
            }
            await foto('tela-jogo-publicado')
          }
          // Os Combinados do Clube abrem sozinhos na primeira visita; depois, pelo botão.
          await abrir('/clube-dos-criadores', 5000, false)
          if (
            !(await avaliar(
              'Boolean([...document.querySelectorAll("[role=dialog]")].find((d) => d.getClientRects().length))',
            ))
          )
            await clicar('Combinados', 0, 1200)
          await foto('tela-clube', { x: 340, y: 105, w: 600, h: 590 })
          await abrir('/recados')
          await foto('tela-recados')
          const conversa = String(
            (await avaliar(
              '[...document.querySelectorAll("main a[href^=\\"/recados/\\"]")].map((a) => a.getAttribute("href"))[0] ?? ""',
            )) ?? '',
          )
          if (conversa) {
            await abrir(conversa)
            await foto('tela-recados-conversa')
          }
          await abrir('/como-fazer', 4000)
          await foto('tela-como-fazer')
        },
      },
      espaco: {
        nomes: ['tela-quarto', 'tela-avatar'],
        rodar: async () => {
          await abrir('/quarto', 9000)
          await avaliar('window.scrollTo(0, 318); 1')
          await Bun.sleep(1500)
          await foto('tela-quarto')
          await abrir('/meu-avatar', 9000)
          await clicar('Cabelo', 0, 1200)
          await mouse('mouseMoved', 900, 300, { button: 'none' })
          await foto('tela-avatar')
        },
      },
      entrada: {
        nomes: ['tela-senha'],
        rodar: async () => {
          // Sem sessão a borda mostra a entrada; os cookies voltam ao fim.
          const { cookies: atuais } = (await send('Network.getAllCookies')) as {
            cookies: (Cookie & { sameSite?: string })[]
          }
          await send('Network.clearBrowserCookies')
          try {
            await abrir('/esqueci-senha', 3500)
            await foto('tela-senha')
          } finally {
            await send('Network.setCookies', {
              cookies: atuais.map(({ name, value, domain, path, secure, httpOnly, expires }) => ({
                name,
                value,
                domain,
                path,
                secure,
                httpOnly,
                expires,
              })),
            })
          }
        },
      },
      /**
       * Só roda com `KIDS_SO=pais`. Entra na Área dos pais com a senha do arquivo
       * (`KIDS_PAIS_SENHA_FILE`) ou com os cookies exportados logo depois da senha. É o ÚLTIMO
       * roteiro: a gestão de perfis tira a sessão do perfil da criança.
       */
      pais: {
        nomes: ['pais'],
        rodar: async () => {
          if (!so?.includes('pais')) return
          let onde = await abrir('/responsavel', 4000)
          if (!onde.includes('/responsavel')) {
            if (!senhaPais)
              throw new Error(
                `A Área dos pais pediu a senha (caiu em ${onde}). Defina KIDS_PAIS_SENHA_FILE ou exporte os cookies logo depois de entrar nela.`,
              )
            const senha = (await Bun.file(senhaPais).text())
              .replace(/^\uFEFF/, '')
              .split(/\r?\n/)[0]
              ?.trim()
            if (!senha) throw new Error('O arquivo da senha está vazio.')
            await abrir('/perfis?manage=1', 3000)
            await clicar('Área dos pais', 0, 1200)
            await avaliar('document.querySelector("[role=dialog] input, dialog input")?.focus(); 1')
            await digitar(senha)
            await clicar('Entrar', 0, 4000)
            onde = await abrir('/responsavel', 4000)
            if (!onde.includes('/responsavel'))
              throw new Error('A senha da Área dos pais não foi aceita.')
          }
          so.push(
            'tela-pais-painel',
            'tela-pais-conversa',
            'tela-pais-perfil',
            'tela-pais-indicacao',
            'tela-pais-atendimento',
            'tela-pais-chamado',
          )
          // O painel de cada criança, cortado ANTES da lista de ferramentas (na conta de teste ela
          // diz "Não incluído na conta"), e as perguntas para conversar sobre uma criação.
          altura = 1400
          await tamanho(altura, 1)
          await Bun.sleep(900)
          await foto('tela-pais-painel', { x: 166, y: 28, w: 948, h: 592 })
          await foto('tela-pais-conversa', { x: 288, y: 845, w: 704, h: 440 })
          altura = 800
          // Editar perfil: a visibilidade para os colegas. Só abre e cancela, nunca salva.
          await abrir('/perfis?manage=1', 3500)
          const perfil = (await avaliar(
            `(() => { const b = [...document.querySelectorAll('button')].find((e) => e.getClientRects().length && e.getBoundingClientRect().height > 100 && !/adicionar/i.test(e.textContent)); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })()`,
          )) as Ponto | null
          if (!perfil) throw new Error('Não achei um perfil na gestão de perfis.')
          await clicarEm(perfil.x, perfil.y)
          await Bun.sleep(1800)
          await foto('tela-pais-perfil', { x: 400, y: 132, w: 480, h: 536 })
          await clicar('Cancelar', 0, 1500)
          // O cartão do programa de indicações.
          await abrir('/perfis?manage=1', 3500)
          altura = 1800
          await tamanho(altura, 1)
          await Bun.sleep(900)
          const cartao = (await avaliar(
            `(() => { const h = [...document.querySelectorAll('h2')].find((x) => /embaixador/i.test(x.textContent)); if (!h) return null; let c = h; for (let i = 0; i < 8 && c.parentElement; i++) { c = c.parentElement; const r = c.getBoundingClientRect(); if (r.width > 660) return { x: r.left - 16, y: r.top - 16, w: r.width + 32, h: r.height + 32 } } return null })()`,
          )) as Recorte | null
          if (cartao) await foto('tela-pais-indicacao', cartao)
          altura = 800
          // Atendimento: a entrada e o formulário de chamado ABERTO (enviar seria um chamado real).
          await abrir('/responsavel/ajuda', 3500)
          await foto('tela-pais-atendimento', { x: 160, y: 24, w: 960, h: 600 })
          await clicar('Abrir chamado', 0, 1800)
          await foto('tela-pais-chamado', { x: 160, y: 24, w: 960, h: 600 })
          await clicar('Cancelar', 0, 800)
        },
      },
    }

    for (const [nome, roteiro] of Object.entries(ROTEIROS)) {
      if (so && !so.includes(nome) && !roteiro.nomes.some((n) => so.includes(n))) continue
      // Roteiro pedido pelo NOME (`KIDS_SO=pinta`): todas as fotos dele entram.
      if (so?.includes(nome)) so.push(...roteiro.nomes)
      try {
        altura = 800
        await tamanho(altura, 1)
        await roteiro.rodar()
        console.log(`${nome}: feito`)
      } catch (e) {
        // Um roteiro que tropeça (um botão que mudou de nome) não derruba os outros.
        console.warn(`${nome}: PAROU — ${(e as Error).message}`)
      }
    }
    ws.close()
    console.log(linhas.join('\n'))
  } finally {
    if (proc && perfil) {
      proc.kill()
      await Promise.race([proc.exited, Bun.sleep(5000)])
      try {
        rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
      } catch (e) {
        console.warn(`Não apaguei o perfil temporário ${perfil}: ${(e as Error).message}`)
      }
    }
  }
}

await main()
