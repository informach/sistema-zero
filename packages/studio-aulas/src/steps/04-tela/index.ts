import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Browser, type BrowserContext, chromium, type Page } from '@playwright/test'
import { loadRoteiroFile } from '../../roteiro/parse'
import type { Cena } from '../../roteiro/schema'
import { aviso, etapa, ok, passo } from '../../util/log'
import {
  AUTOMATION_FILE,
  assertAulaExiste,
  aulaPaths,
  REPO_ROOT,
  resolverProjetoInicial,
} from '../../util/paths'
import { RITMO, TELA_ALTURA, TELA_LARGURA } from './config'
import type { TelaBalao, TelaCenaRange, TelaTimeline } from './timeline'

// URL /@fs/ do módulo de automação (Vite serve arquivos do monorepo por caminho
// absoluto com barras normais). Injetado no playground → resolve blockly/studio
// para a MESMA instância do editor.
const INJECT_URL = `/@fs/${AUTOMATION_FILE.replace(/\\/g, '/')}`

/**
 * Espelho ESTRUTURAL da AulasAPI do harness (harness/automation.ts) — duplicado
 * de PROPÓSITO: importar o tipo de lá puxaria o harness (Blockly/JSX) para o
 * typecheck do CI, que cobre só src/ (gotcha 3 do CLAUDE.md). Os callbacks do
 * page.evaluate rodam NO BROWSER, onde o módulo injetado define globalThis.__aulas.
 */
interface AulasNoBrowser {
  esperarPronto(): Promise<boolean>
  criarProjetoAula(id: string, nome: string, extensoes: string[]): Promise<string>
  criarProjetoDeBase(base: unknown, id: string, nome: string, extensoes: string[]): Promise<string>
  exportarProjeto(id: string): Promise<unknown>
  esconderPreview(): Promise<void>
  abrirCategoria(nome: string): Promise<void>
  pegarBloco(tipo: string, encaixarEm?: string): Promise<unknown>
  configurarCampo(campo: string, valor: string | number, tipo?: string): Promise<void>
  zoom(nivel: 'perto' | 'longe' | 'ajustar' | number): Promise<void>
  medirAncora(bloco: string, campo?: string): Promise<AncoraMedida | null>
  testar(ms: number): Promise<void>
}

declare global {
  // Só existe no contexto do BROWSER (após o injetar); o pipeline Node nunca o lê.
  var __aulas: AulasNoBrowser
}

/**
 * Sobe o playground REAL do Estúdio e resolve com a URL na PORTA REAL + um parar().
 * O Vite auto-incrementa a porta se a padrão (5173) estiver ocupada, então NÃO dá
 * para assumir 5173 — a porta é capturada do stdout do próprio Vite.
 */
async function subirPlayground(): Promise<{ url: string; parar: () => void }> {
  // node:child_process (não Bun.spawn): este módulo roda sob NODE (o Playwright
  // não conecta o pipe de debug sob Bun). O Vite do playground roda via `bun`.
  const proc: ChildProcess = spawn('bun', ['run', '--filter', '@sistemazero/studio', 'dev'], {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'inherit'], // pipa o stdout p/ capturar a porta
    shell: true, // Windows: acha o bun.exe no PATH
  })
  const parar = () => {
    try {
      if (process.platform === 'win32' && proc.pid) {
        // taskkill /T mata a árvore (o kill do pid do shell deixa vite/esbuild órfãos).
        spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'])
      } else {
        proc.kill()
      }
    } catch {
      /* já morto */
    }
  }
  // O Vite COLORE a porta com códigos ANSI (…:\e[1m5173\e[22m/), então é preciso
  // limpá-los antes de casar o número. (regex via fromCharCode: evita o char de
  // controle literal no fonte, que o Biome barra.)
  const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')
  try {
    const url = await new Promise<string>((resolve, reject) => {
      let buf = ''
      const timer = setTimeout(() => reject(new Error('Playground não subiu em 90s')), 90_000)
      proc.stdout?.on('data', (d: Buffer) => {
        const txt = d.toString()
        process.stdout.write(txt) // mantém os logs do Vite visíveis no console
        buf += txt
        const m = buf.replace(ANSI, '').match(/http:\/\/(?:127\.0\.0\.1|localhost):(\d+)/)
        if (m) {
          clearTimeout(timer)
          resolve(`http://127.0.0.1:${m[1]}`)
        }
      })
    })
    return { url, parar }
  } catch (e) {
    parar()
    throw e
  }
}

/** Injeta o módulo de automação (window.__aulas) na página atual, via /@fs/. */
async function injetar(page: Page): Promise<void> {
  await page.evaluate((url) => import(/* @vite-ignore */ url), INJECT_URL)
  const ok = await page.evaluate(() => Boolean(globalThis.__aulas))
  if (!ok) throw new Error('automação não carregou (window.__aulas ausente)')
}

/**
 * Etapa 4 — grava o passo a passo no PLAYGROUND REAL do Estúdio: semeia um
 * projeto vazio (com Jogo 2D), esconde o preview (blocos ocupam a tela toda),
 * arrasta os blocos de verdade com zoom e destaque, e escreve a timeline
 * (faixas de cena + balões com coordenadas + escala) para a montagem.
 */
export async function gravarTela(slug: string): Promise<TelaTimeline> {
  const paths = aulaPaths(slug)
  assertAulaExiste(paths)
  const roteiro = loadRoteiroFile(paths.roteiro)
  const praticas = roteiro.cenas.filter((c) => c.tipo === 'pratica' && c.acoes?.length)
  if (!praticas.length) {
    throw new Error('Nenhuma cena de prática com ações no roteiro — nada a gravar.')
  }

  mkdirSync(paths.telaDir, { recursive: true })
  etapa(`Tela — ${roteiro.meta.titulo}`)
  const { url: playgroundUrl, parar: pararPlayground } = await subirPlayground()

  const projetoId = `aula-gravacao-${slug}`
  const cenasRange: TelaCenaRange[] = []
  const baloes: TelaBalao[] = []
  let browser: Browser | undefined
  let context: BrowserContext | undefined
  let videoPath: string | null = null

  try {
    // Headful: no Windows o chrome-headless-shell trava no launch; o Chromium
    // completo (headed) é confiável e grava vídeo igual.
    browser = await chromium.launch({ headless: false })
    context = await browser.newContext({
      viewport: { width: TELA_LARGURA, height: TELA_ALTURA },
      recordVideo: { dir: paths.telaDir, size: { width: TELA_LARGURA, height: TELA_ALTURA } },
    })
    const page = await context.newPage()
    page.setDefaultTimeout(120_000)
    // videoT0 = início REAL da gravação (o recordVideo começa na criação do
    // contexto). Cena/balão são relativos a ISTO → batem com o vídeo na montagem.
    // O "lead" de setup (lista→criar→editor→esconder preview) fica ANTES da 1ª
    // cena e é PULADO pelo corte (telaInicioS já inclui o lead).
    const videoT0 = Date.now()
    const agora = () => Date.now() - videoT0

    // 1. Semeia o projeto na lista do playground. `vazio` = do zero; senão parte
    //    do PROJETO FINAL da aula anterior (é assim que o curso encadeia: cada
    //    aula começa de onde a anterior terminou).
    await page.goto(playgroundUrl, { waitUntil: 'domcontentloaded' })
    await injetar(page)
    const nomeProjeto = `Aula: ${roteiro.meta.titulo}`
    const inicialPath = resolverProjetoInicial(slug, roteiro.meta.projetoInicial)
    if (inicialPath) {
      if (!existsSync(inicialPath)) {
        throw new Error(
          `projetoInicial não encontrado: ${inicialPath}\n` +
            `Exporte o jogo do fim da aula anterior (no Estúdio: ⋯ → Exportar para o Estúdio) e salve aí.`,
        )
      }
      const base: unknown = JSON.parse(readFileSync(inicialPath, 'utf8'))
      passo(`começando do projeto: ${roteiro.meta.projetoInicial}`)
      await page.evaluate(
        ([b, id, nome, ext]) => globalThis.__aulas.criarProjetoDeBase(b, id, nome, ext),
        [base, projetoId, nomeProjeto, roteiro.meta.extensoes] as [
          unknown,
          string,
          string,
          string[],
        ],
      )
    } else {
      await page.evaluate(([id, nome, ext]) => globalThis.__aulas.criarProjetoAula(id, nome, ext), [
        projetoId,
        nomeProjeto,
        roteiro.meta.extensoes,
      ] as [string, string, string[]])
    }

    // 2. Abre o editor desse projeto e re-injeta a automação.
    await page.goto(`${playgroundUrl}/editor/${encodeURIComponent(projetoId)}`, {
      waitUntil: 'domcontentloaded',
    })
    await injetar(page)
    const pronto = await page.evaluate(() => globalThis.__aulas.esperarPronto())
    if (!pronto) throw new Error('Blockly não ficou pronto no editor')
    await page.waitForTimeout(2500) // editor assenta (frames, layout medido)

    // 3. Esconde o preview → os blocos ocupam a tela toda (nada atrás do preview).
    await page.evaluate(() => globalThis.__aulas.esconderPreview())
    await page.waitForTimeout(700)

    // 4. Passo a passo (o cronômetro já corre desde o início da gravação).
    for (const cena of praticas) {
      passo(`cena ${cena.id}`)
      const inicioMs = agora()
      for (const acao of cena.acoes ?? []) {
        await executarAcao(page, cena, acao, agora, baloes)
      }
      cenasRange.push({ id: cena.id, inicioMs, fimMs: agora() })
    }

    // 5. Exporta o PROJETO FINAL desta aula (base + blocos montados) → será o
    //    `inicial` da PRÓXIMA aula. É o elo que encadeia o curso.
    const projetoFinal = await page.evaluate(
      (id) => globalThis.__aulas.exportarProjeto(id),
      projetoId,
    )
    writeFileSync(paths.projetoFinal, JSON.stringify(projetoFinal, null, 2))
    ok(`projeto final: ${paths.projetoFinal}`)
  } finally {
    // Limpeza sempre — inclusive se algo falhar (senão o Vite fica órfão).
    if (context) {
      const video = context.pages()[0]?.video()
      await context.close()
      if (video) videoPath = await video.path()
    }
    await browser?.close()
    pararPlayground()
    if (videoPath) renameSync(videoPath, join(paths.telaDir, 'tela.webm'))
  }

  const timeline: TelaTimeline = {
    slug,
    geradoEm: new Date().toISOString(),
    video: 'tela.webm',
    largura: TELA_LARGURA,
    altura: TELA_ALTURA,
    cenas: cenasRange,
    baloes,
  }
  writeFileSync(paths.telaTimeline, JSON.stringify(timeline, null, 2))
  ok(`vídeo + timeline em ${paths.telaDir}`)
  return timeline
}

type AncoraMedida = { x: number; y: number; w: number; h: number; escala: number }

async function executarAcao(
  page: Page,
  cena: Cena,
  acao: NonNullable<Cena['acoes']>[number],
  agora: () => number,
  baloes: TelaBalao[],
): Promise<void> {
  switch (acao.tipo) {
    case 'abrirCategoria': {
      await page.evaluate((n: string) => globalThis.__aulas.abrirCategoria(n), acao.categoria)
      await page.waitForTimeout(RITMO.aposCategoriaMs)
      return
    }
    case 'pegarBloco': {
      await page.evaluate(
        ([t, e]: [string, string | undefined]) => globalThis.__aulas.pegarBloco(t, e),
        [acao.bloco, acao.encaixarEm] as [string, string | undefined],
      )
      await page.waitForTimeout(RITMO.aposEncaixeMs)
      return
    }
    case 'configurarCampo': {
      await page.evaluate(
        ([c, v, t]: [string, string | number, string | undefined]) =>
          globalThis.__aulas.configurarCampo(c, v, t),
        [acao.campo, acao.valor, acao.bloco] as [string, string | number, string | undefined],
      )
      await page.waitForTimeout(RITMO.aposCampoMs)
      return
    }
    case 'balao': {
      const rect = await page.evaluate(
        ([b, c]: [string, string | undefined]) => globalThis.__aulas.medirAncora(b, c),
        [acao.ancora.bloco, acao.ancora.campo] as [string, string | undefined],
      )
      if (rect) {
        const apareceMs = agora()
        baloes.push({
          cenaId: cena.id,
          texto: acao.texto,
          x: rect.x,
          y: rect.y,
          w: rect.w,
          h: rect.h,
          escala: rect.escala,
          apareceMs,
          escondeMs: apareceMs + RITMO.balaoMs,
        })
        await page.waitForTimeout(RITMO.balaoMs)
      } else {
        aviso(`balão sem âncora encontrada (${acao.ancora.bloco}) — pulado`)
      }
      return
    }
    case 'testar': {
      const ms = acao.segundos ? acao.segundos * 1000 : RITMO.testarMs
      await page.evaluate((m: number) => globalThis.__aulas.testar(m), ms)
      return
    }
    case 'pausar': {
      await page.waitForTimeout(acao.segundos * 1000)
      return
    }
    case 'zoom': {
      await page.evaluate(
        (n: 'perto' | 'longe' | 'ajustar' | number) => globalThis.__aulas.zoom(n),
        acao.nivel,
      )
      await page.waitForTimeout(300)
      return
    }
  }
}
