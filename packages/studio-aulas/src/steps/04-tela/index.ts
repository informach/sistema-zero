import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Browser, type BrowserContext, chromium, type Page } from '@playwright/test'
import { loadRoteiroFile } from '../../roteiro/parse'
import type { Cena } from '../../roteiro/schema'
import { aviso, etapa, ok, passo } from '../../util/log'
import { assertAulaExiste, aulaPaths, PACKAGE_ROOT } from '../../util/paths'
import { HARNESS_URL, RITMO, TELA_ALTURA, TELA_LARGURA } from './config'
import type { TelaBalao, TelaCenaRange, TelaTimeline } from './timeline'

/** Sobe o harness Vite e resolve quando responder. Devolve um `parar()`. */
async function subirHarness(): Promise<() => void> {
  // node:child_process (não Bun.spawn): este módulo roda sob NODE (o Playwright
  // não conecta o pipe de debug sob Bun). O Vite em si segue rodando via `bun`.
  const proc: ChildProcess = spawn('bun', ['x', 'vite', '--config', 'harness/vite.config.ts'], {
    cwd: PACKAGE_ROOT,
    stdio: 'inherit',
    shell: true, // Windows: acha o bun.exe no PATH
  })
  const parar = () => {
    try {
      // No Windows, matar só o pid (do shell) deixa vite/esbuild órfãos segurando
      // a porta. taskkill /T mata a árvore inteira.
      if (process.platform === 'win32' && proc.pid) {
        spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'])
      } else {
        proc.kill()
      }
    } catch {
      /* já morto */
    }
  }
  const limite = Date.now() + 60_000
  while (Date.now() < limite) {
    try {
      const res = await fetch(HARNESS_URL)
      if (res.ok) return parar
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  parar()
  throw new Error('Harness Vite não respondeu em 60s')
}

/**
 * Etapa 4 — grava o passo a passo da tela do Estúdio (só as cenas de PRÁTICA),
 * com cursor animado e encaixe confiável, e escreve a timeline (faixas de cena +
 * balões com coordenadas) para a montagem.
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
  const pararHarness = await subirHarness()

  const ext = roteiro.meta.extensoes.join(',')
  const cenasRange: TelaCenaRange[] = []
  const baloes: TelaBalao[] = []
  let browser: Browser | undefined
  let context: BrowserContext | undefined
  let videoPath: string | null = null

  try {
    // Headful de propósito: no Windows o chrome-headless-shell trava no launch
    // (Timeout ...ms). O Chromium completo (headed) é confiável e grava vídeo
    // igual — e numa ferramenta LOCAL ver a janela montando a aula até ajuda.
    browser = await chromium.launch({ headless: false })
    context = await browser.newContext({
      viewport: { width: TELA_LARGURA, height: TELA_ALTURA },
      recordVideo: { dir: paths.telaDir, size: { width: TELA_LARGURA, height: TELA_ALTURA } },
    })
    const videoT0 = Date.now()
    const agora = () => Date.now() - videoT0

    const page = await context.newPage()
    await page.goto(`${HARNESS_URL}/?ext=${encodeURIComponent(ext)}`)
    // Compile a frio do Estúdio (Monaco/Blockly) pode passar de 30s.
    await page.waitForFunction(() => Boolean((globalThis as any).__aulas), null, {
      timeout: 120_000,
    })
    const pronto = await page.evaluate(() => (globalThis as any).__aulas.esperarPronto())
    if (!pronto) throw new Error('Blockly não ficou pronto no harness')
    // Deixa o editor assentar (render dos frames, layout medido).
    await page.waitForTimeout(2500)

    for (const cena of praticas) {
      passo(`cena ${cena.id}`)
      const inicioMs = agora()
      for (const acao of cena.acoes ?? []) {
        await executarAcao(page, cena, acao, agora, baloes)
      }
      cenasRange.push({ id: cena.id, inicioMs, fimMs: agora() })
    }
  } finally {
    // Limpeza sempre — inclusive se o launch/goto falhar (senão o Vite fica órfão).
    if (context) {
      const video = context.pages()[0]?.video()
      await context.close()
      if (video) videoPath = await video.path()
    }
    await browser?.close()
    pararHarness()
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

async function executarAcao(
  page: Page,
  cena: Cena,
  acao: NonNullable<Cena['acoes']>[number],
  agora: () => number,
  baloes: TelaBalao[],
): Promise<void> {
  switch (acao.tipo) {
    case 'abrirCategoria': {
      await page.evaluate(
        (n: string) => (globalThis as any).__aulas.abrirCategoria(n),
        acao.categoria,
      )
      await page.waitForTimeout(RITMO.aposCategoriaMs)
      return
    }
    case 'pegarBloco': {
      await page.evaluate(
        ([t, e]: [string, string | undefined]) => (globalThis as any).__aulas.pegarBloco(t, e),
        [acao.bloco, acao.encaixarEm] as [string, string | undefined],
      )
      await page.waitForTimeout(RITMO.aposEncaixeMs)
      return
    }
    case 'configurarCampo': {
      await page.evaluate(
        ([c, v, t]: [string, string | number, string | undefined]) =>
          (globalThis as any).__aulas.configurarCampo(c, v, t),
        [acao.campo, acao.valor, acao.bloco] as [string, string | number, string | undefined],
      )
      await page.waitForTimeout(RITMO.aposCampoMs)
      return
    }
    case 'balao': {
      const rect = (await page.evaluate(
        ([b, c]: [string, string | undefined]) => (globalThis as any).__aulas.medirAncora(b, c),
        [acao.ancora.bloco, acao.ancora.campo] as [string, string | undefined],
      )) as { x: number; y: number; w: number; h: number } | null
      if (rect) {
        const apareceMs = agora()
        baloes.push({
          cenaId: cena.id,
          texto: acao.texto,
          ...rect,
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
      await page.evaluate((m: number) => (globalThis as any).__aulas.testar(m), ms)
      return
    }
    case 'pausar': {
      await page.waitForTimeout(acao.segundos * 1000)
      return
    }
    case 'zoom': {
      await page.evaluate(
        (n: 'perto' | 'longe' | 'ajustar' | number) => (globalThis as any).__aulas.zoom(n),
        acao.nivel,
      )
      await page.waitForTimeout(300)
      return
    }
  }
}
