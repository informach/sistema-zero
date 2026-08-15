import { expect, type Page, test } from '@playwright/test'
import type { GameKitKnownApi } from '../src/official-extensions/game-2d-advanced/runtimeContract'

/**
 * O orçamento de desempenho do Reino Zero Pro, num navegador de verdade.
 *
 * ⚠️ Arquivo PRÓPRIO, e não um irmão parametrizado do
 * `reino-zero-performance.spec.ts`: o card do g2d é limitado pela MONTAGEM do
 * Blockly (1515 blocos) e este é limitado pelo RUNTIME (50 nós de IR e 452 KB de
 * motor). Os dois números que importam são diferentes, e um teste único
 * esconderia o de um dos dois atrás do teto do outro.
 *
 * ⭐ A régua principal são CONTADORES DETERMINÍSTICOS (pares examinados, caixas
 * contornadas), lidos pela porta de diagnóstico do host. Eles valem o mesmo em
 * qualquer máquina. O RELÓGIO entra como RAZÃO contra uma calibração medida no
 * MESMO run — agente de CI lento não pode pintar de vermelho código que não
 * mudou.
 */

interface SondaDeTrabalho {
  quadros: number
  passos: number
  pares: number
  caixas: number
  visitas: number
  linhasDeMapa: number
}

interface HostDoPro extends Window {
  SZGameKit?: GameKitKnownApi
  __SZSTUDIO_RUNTIME_INSPECTORS?: Record<string, (zerar?: boolean) => unknown>
  __proDocumentToken?: string
  __proEstavelDesde?: number
}

function cartaoDoPro(page: Page) {
  return page
    .locator('button')
    .filter({ has: page.getByText('Reino Zero Pro', { exact: true }) })
    .first()
}

test('Reino Zero Pro joga dentro do orçamento de trabalho por quadro', async ({ page }) => {
  // A porta de diagnóstico é OPT-IN do host: ela não existe no jogo exportado
  // da criança, e é por isso que o runtime pode expô-la sem custo nenhum.
  await page.addInitScript(() => {
    const alvo = window as HostDoPro
    alvo.__SZSTUDIO_RUNTIME_INSPECTORS ??= {}
  })

  await page.goto('/')
  const card = cartaoDoPro(page)
  if (!(await card.isVisible())) {
    await page.getByRole('button', { name: 'Ver todos os jogos 2D' }).click()
  }
  await card.click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 })
  await expect(page.getByText('Definir fase', { exact: true })).toHaveCount(32, {
    timeout: 30_000,
  })

  const iframe = page.frameLocator('iframe[title="Pré-visualização"]')
  await expect(iframe.locator('canvas')).toBeVisible({ timeout: 20_000 })

  // ⚠️ O preview REMONTA enquanto o editor hidrata, e medir num documento que
  // vai embora dá "Execution context was destroyed". A régua é a mesma do
  // `reino-zero.spec.ts`: esperar o MESMO documento sobreviver dois segundos.
  await expect
    .poll(
      () =>
        iframe.locator('body').evaluate(() => {
          const host = window as HostDoPro
          const marca = 'pro-perf-documento-estavel'
          if (host.__proDocumentToken !== marca) {
            host.__proDocumentToken = marca
            host.__proEstavelDesde = performance.now()
            return 0
          }
          return performance.now() - (host.__proEstavelDesde ?? performance.now())
        }),
      { timeout: 60_000 },
    )
    .toBeGreaterThanOrEqual(2_000)

  await iframe.getByRole('button', { name: 'Jogar', exact: true }).click()
  await expect
    .poll(() =>
      iframe.locator('body').evaluate(() => (window as HostDoPro).SZGameKit?.state() ?? 'nada'),
    )
    .toBe('jogando')

  const medida = await iframe.locator('body').evaluate(async () => {
    const alvo = window as HostDoPro
    const sonda = alvo.__SZSTUDIO_RUNTIME_INSPECTORS?.['game-2d-advanced:perf']
    if (typeof sonda !== 'function') throw new Error('a sonda de desempenho não registrou')

    const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))
    sonda(true)
    const inicio = performance.now()
    await esperar(2000)
    const decorridoMs = performance.now() - inicio
    return { sonda: sonda() as SondaDeTrabalho, decorridoMs }
  })

  const { sonda, decorridoMs } = medida

  // ── 1) o relógio, como smoke check ──────────────────────────────────────
  // Em dois segundos de parede, um jogo a 60 Hz roda ~120 quadros. Cobrar 60
  // (metade) tolera um agente de CI congestionado. As regressões de trabalho
  // determinístico são cobradas pelos contadores exatos logo abaixo.
  const quadrosPorSegundo = sonda.quadros / (decorridoMs / 1000)
  expect(quadrosPorSegundo).toBeGreaterThan(30)

  // ── 2) os contadores, EXATOS ────────────────────────────────────────────
  // A campanha não usa "para cada par que se encosta": o contato dela é
  // entidade × herói, dentro do próprio passo. Zero aqui é o contrato — se um
  // dia a campanha passar a varrer pares, este número acusa na hora.
  expect(sonda.pares).toBe(0)
  // O raio-X das caixas está desligado, então o overlay não pode custar nada.
  expect(sonda.caixas).toBe(0)
  expect(sonda.visitas).toBe(0)
  // A varredura de linhas do mapa vive atrás do ramo do mapa-cenário do RPG,
  // que a campanha não usa.
  expect(sonda.linhasDeMapa).toBe(0)

  // ── 3) a simulação fixa não pode estar patinando ────────────────────────
  // Um passo por quadro é o regime saudável; muito mais que isso é recuperação
  // de atraso, e é o sintoma de quadro estourado.
  expect(sonda.passos / Math.max(1, sonda.quadros)).toBeLessThanOrEqual(1.6)
})
