import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Locator, Page } from '@playwright/test'

/**
 * O robô de gravação das aulas, dirigido pelo Playwright.
 *
 * As aulas gravadas foram feitas por um robô que lê os gestos entre colchetes do roteiro
 * (`[encaixar "Somar 1" abaixo de "Deixar o sprite"]`) e pergunta à página o que fazer com a mão
 * (`window.__gravacao.agir`, em `packages/palco-gravacao/src/lib/{verbos,pagina}.ts`). Aqui a
 * MESMA biblioteca entra na página do playground e o Playwright faz a mão: mover, clicar,
 * arrastar, segurar e digitar. Se um bloco ensinado mudar de texto, de categoria ou de encaixe,
 * o gesto do roteiro deixa de achar o alvo e o teste reprova com a frase do próprio robô.
 */

const aqui = dirname(fileURLToPath(import.meta.url))
const pacote = resolve(aqui, '../..')
const palco = resolve(pacote, '../palco-gravacao/src/lib')

export interface Alvo {
  seletor?: string
  dentro?: string
  papel?: string
  nome?: string
  rotulo?: string
  texto?: string
  bloco?: { texto: string; area: 'flyout' | 'workspace' | 'toolbox'; abaixo?: boolean }
  u?: number
  v?: number
}

type Passo =
  | { fazer: 'apontar' | 'clicar' | 'clique duplo'; alvo: Alvo }
  | { fazer: 'arrastar'; alvo: Alvo; para: Alvo }
  | {
      fazer: 'esperar'
      alvo: Alvo
      estado?: 'aparecer' | 'sumir' | 'ficar disponível'
      maximo?: number
    }
  | { fazer: 'rolar'; dy: number; alvo?: Alvo }
  | { fazer: 'digitar'; alvo: Alvo; texto: string; substituir?: boolean }
  | { fazer: 'tecla'; tecla: string }
  | { fazer: 'segurar'; alvo?: Alvo; tecla?: string; segundos?: number }
  | { fazer: 'continuar'; acao: string }

export interface JogoDaAula {
  stage: { width: number; height: number }
  targets: { id: string; label: string; x: number; y: number; width: number; height: number }[]
}

let pacoteDoRobo: string | null = null

/** A biblioteca do robô compilada para o navegador (uma vez por processo de teste). */
function roboParaONavegador(): string {
  if (pacoteDoRobo) return pacoteDoRobo
  const pasta = resolve(pacote, '.cache/palco-e2e')
  mkdirSync(pasta, { recursive: true })
  const entrada = resolve(pasta, 'entrada.ts')
  const saida = resolve(pasta, 'robo.js')
  const de = (arquivo: string) => JSON.stringify(resolve(palco, arquivo).replaceAll('\\', '/'))
  // A mesma montagem de `palco-gravacao/src/lib/ponte.tsx`, sem o React.
  writeFileSync(
    entrada,
    `import { arrumacao } from ${de('arrumacao.ts')}
import { paginaDe, pilhasDaArea } from ${de('pagina.ts')}
import { agirNaPagina, jogoVoltando, novoJogoNoEstudio, ocupado, VERBOS } from ${de('verbos.ts')}
window.__instalarRobo = (jogos) => {
  const jogo = novoJogoNoEstudio()
  const arrumar = arrumacao()
  setInterval(() => {
    const { area, caixas } = pilhasDaArea(document)
    void arrumar.passo(area, caixas, () => paginaDe(document).organizar())
  }, 250)
  window.__gravacao = {
    versao: 1,
    verbos: () => VERBOS,
    agir: (acao) => agirNaPagina(acao, jogos, paginaDe(document), jogo),
    ocupado: () => {
      const { area, caixas } = pilhasDaArea(document)
      return ocupado(document) || arrumar.pendente(area, caixas) || jogoVoltando(jogo, paginaDe(document))
    },
  }
}
`,
  )
  execFileSync(
    'bun',
    ['build', entrada, '--target', 'browser', '--format', 'iife', '--outfile', saida],
    {
      cwd: pacote,
      stdio: 'pipe',
      timeout: 60_000,
    },
  )
  pacoteDoRobo = readFileSync(saida, 'utf8')
  return pacoteDoRobo
}

/** Põe o robô na página já aberta, com os jogos prontos da aula (para `tocar prévia arbusto`). */
export async function instalarRobo(page: Page, jogos: readonly JogoDaAula[]): Promise<void> {
  await page.addScriptTag({ content: roboParaONavegador() })
  await page.evaluate((lista) => {
    ;(window as unknown as { __instalarRobo(jogos: unknown): void }).__instalarRobo(lista)
  }, jogos as JogoDaAula[])
}

/**
 * Marca a linha de uma categoria da paleta pelo nome que a criança lê (sem o emoji e sem
 * diferença de acento ou de maiúscula), como o robô a procura.
 */
async function marcarCategoria(page: Page, nome: string): Promise<void> {
  const achou = await page.evaluate((procurado) => {
    const limpo = (texto: string) =>
      texto
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
    for (const marcado of document.querySelectorAll('[data-e2e-categoria]'))
      marcado.removeAttribute('data-e2e-categoria')
    const rotulos = document.querySelectorAll(
      '.blocklyToolbox .blocklyToolboxCategoryLabel, .blocklyToolbox .blocklyTreeLabel',
    )
    for (const rotulo of rotulos) {
      const caixa = rotulo.getBoundingClientRect()
      if (caixa.width === 0 || limpo(rotulo.textContent ?? '') !== limpo(procurado)) continue
      rotulo.setAttribute('data-e2e-categoria', '1')
      return true
    }
    return false
  }, nome)
  if (!achou) throw new Error(`Não achei a categoria "${nome}" na paleta.`)
}

/** O elemento de um alvo do robô. */
function elementoDe(page: Page, alvo: Alvo): Locator {
  const raiz = alvo.dentro ? page.locator(alvo.dentro) : page.locator('body')
  if (alvo.seletor) return raiz.locator(alvo.seletor).first()
  if (alvo.papel)
    return raiz
      .getByRole(alvo.papel as Parameters<Locator['getByRole']>[0], {
        name: alvo.nome,
        exact: true,
      })
      .first()
  if (alvo.rotulo) return raiz.getByLabel(alvo.rotulo, { exact: true }).first()
  if (alvo.bloco?.area === 'toolbox') return page.locator('[data-e2e-categoria="1"]')
  if (alvo.texto) {
    const exato = new RegExp(`^\\s*${escapar(alvo.texto)}\\s*$`)
    return raiz
      .locator('button, [role="button"], [role="menuitem"], [role="option"], .blocklyMenuItem, a')
      .filter({ hasText: exato })
      .filter({ visible: true })
      .or(raiz.getByText(alvo.texto, { exact: true }).filter({ visible: true }))
      .first()
  }
  throw new Error(`Alvo que este executor não sabe achar: ${JSON.stringify(alvo)}`)
}

const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** O ponto da tela de um alvo (o meio dele, ou a fração `u`,`v` da caixa). */
async function pontoDe(page: Page, alvo: Alvo): Promise<{ x: number; y: number }> {
  if (alvo.bloco?.area === 'toolbox') await marcarCategoria(page, alvo.bloco.texto)
  const elemento = elementoDe(page, alvo)
  await elemento.waitFor({ state: 'attached', timeout: 10_000 })
  const caixa = await elemento.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left, y: r.top, width: r.width, height: r.height }
  })
  if (caixa.width === 0 && caixa.height === 0)
    throw new Error(`O alvo não tem tamanho na tela: ${JSON.stringify(alvo)}`)
  return { x: caixa.x + caixa.width * (alvo.u ?? 0.5), y: caixa.y + caixa.height * (alvo.v ?? 0.5) }
}

const pausa = (page: Page, ms: number) => page.waitForTimeout(ms)

async function esperarDesocupar(page: Page): Promise<void> {
  await page.waitForFunction(
    () => !(window as unknown as { __gravacao: { ocupado(): boolean } }).__gravacao.ocupado(),
    undefined,
    { timeout: 30_000, polling: 100 },
  )
}

async function fazer(page: Page, passo: Passo, fundo: number): Promise<void> {
  switch (passo.fazer) {
    case 'apontar': {
      const ponto = await pontoDe(page, passo.alvo)
      await page.mouse.move(ponto.x, ponto.y, { steps: 4 })
      return
    }
    case 'clicar':
    case 'clique duplo': {
      const ponto = await pontoDe(page, passo.alvo)
      await page.mouse.move(ponto.x, ponto.y, { steps: 4 })
      await pausa(page, 60)
      if (passo.fazer === 'clicar') await page.mouse.click(ponto.x, ponto.y)
      else await page.mouse.dblclick(ponto.x, ponto.y)
      return
    }
    case 'arrastar': {
      const de = await pontoDe(page, passo.alvo)
      await page.mouse.move(de.x, de.y, { steps: 4 })
      await page.mouse.down()
      // O Blockly só começa o arrasto depois de alguns pixels: sai devagar, depois anda.
      await page.mouse.move(de.x + 6, de.y + 6, { steps: 3 })
      await pausa(page, 80)
      // O destino é medido com o bloco já na mão, como o robô faz (a paleta pode ter fechado).
      const para = await pontoDe(page, passo.para)
      await page.mouse.move(para.x, para.y, { steps: 25 })
      await pausa(page, 150)
      await page.mouse.up()
      return
    }
    case 'esperar': {
      const estado = passo.estado ?? 'aparecer'
      const elemento = elementoDe(page, passo.alvo)
      const timeout = (passo.maximo ?? 10) * 1000
      if (estado === 'sumir') await elemento.waitFor({ state: 'hidden', timeout })
      else await elemento.waitFor({ state: 'visible', timeout })
      return
    }
    case 'rolar': {
      if (passo.alvo) {
        const ponto = await pontoDe(page, passo.alvo)
        await page.mouse.move(ponto.x, ponto.y)
      }
      await page.mouse.wheel(0, passo.dy)
      await pausa(page, 200)
      return
    }
    case 'digitar': {
      const campo = elementoDe(page, passo.alvo)
      await campo.waitFor({ state: 'visible', timeout: 10_000 })
      await campo.focus()
      if (passo.substituir) await page.keyboard.press('ControlOrMeta+A')
      await page.keyboard.type(passo.texto, { delay: 5 })
      return
    }
    case 'tecla':
      await page.keyboard.press(passo.tecla)
      return
    case 'segurar': {
      const ms = (passo.segundos ?? 1) * 1000
      if (passo.tecla) {
        await page.keyboard.down(passo.tecla)
        await pausa(page, ms)
        await page.keyboard.up(passo.tecla)
        return
      }
      if (!passo.alvo) throw new Error('Segurar sem alvo e sem tecla.')
      const ponto = await pontoDe(page, passo.alvo)
      await page.mouse.move(ponto.x, ponto.y, { steps: 4 })
      await page.mouse.down()
      await pausa(page, ms)
      await page.mouse.up()
      return
    }
    case 'continuar':
      if (fundo > 12) throw new Error(`O gesto não termina: ${passo.acao}`)
      await gesto(page, passo.acao, fundo + 1)
      return
  }
}

const SEGURAR_TECLA = /^segurar tecla (\S+)(?: por (\d+(?:[.,]\d+)?) ?(?:s|seg|segundos?))?$/i

/** Um gesto do roteiro, do jeito que o robô de gravação o faz. */
export async function gesto(page: Page, acao: string, fundo = 0): Promise<void> {
  await esperarDesocupar(page)
  // Verbo do próprio robô (vale em qualquer página, a biblioteca do palco não o conhece).
  const tecla = SEGURAR_TECLA.exec(acao.trim())
  if (tecla?.[1]) {
    const segundos = tecla[2] ? Number(tecla[2].replace(',', '.')) : 1
    await fazer(page, { fazer: 'segurar', tecla: tecla[1], segundos }, fundo)
    return
  }
  const passos = await page.evaluate(
    (texto) =>
      (
        window as unknown as { __gravacao: { agir(acao: string): Promise<unknown[]> } }
      ).__gravacao.agir(texto),
    acao,
  )
  for (const passo of passos as Passo[]) {
    await fazer(page, passo, fundo)
    await pausa(page, 120)
  }
  if (fundo === 0) await esperarDesocupar(page)
}
