/**
 * Quem acompanha pela ilha (S01) no navegador, com a plataforma falsa e sem banco: o gato do
 * quarto sai com a criança e a segue pela ilha; com o Mingau adotado, ele é a companhia, e no
 * painel dele a criança escolhe o gato do quarto: o Mingau vai esperar em casa e o gato vem.
 * Com o passarinho (`?pet=passaro`, revisão de 30/10/2026): no menu de pausa nada se mexe, nem o
 * giro; no celular (movimento reduzido emulado) ele voa sem balançar, no computador balança.
 *
 * No Windows: `bun build playground/verificar-companhia-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-companhia-browser.mjs && node .cache/verificar-companhia-browser.mjs`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'

type P = { x: number; y: number; z: number }
type Desenho = { posicao: P; petQueAcompanha: (P & { giro: number }) | null }
const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/companhia')
mkdirSync(prints, { recursive: true })
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

const levar = (page: Page, x: number, z: number) =>
  page.evaluate(
    ({ x, z }) =>
      (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
        x,
        3,
        z,
        0,
      ),
    { x, z },
  )

/** Espera o bichinho do quarto ficar a até 4 m da criança. */
const petPerto = (page: Page) =>
  page.waitForFunction(
    () => {
      const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
      if (!d?.petQueAcompanha) return false
      return Math.hypot(d.petQueAcompanha.x - d.posicao.x, d.petQueAcompanha.z - d.posicao.z) < 4
    },
    undefined,
    { timeout: 30_000 },
  )

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const prazo = Date.now() + 45_000
  while (true) {
    if (servidor.exitCode !== null) throw new Error('O playground encerrou antes de iniciar')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > prazo) throw new Error('O playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  for (const celular of [false, true]) {
    const tipo = celular ? 'celular' : 'computador'
    const abrir = async (url: string) => {
      const ctx = await browser!.newContext({
        viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        isMobile: celular,
        hasTouch: celular,
        reducedMotion: celular ? 'reduce' : 'no-preference',
      })
      const page = await ctx.newPage()
      const erros: string[] = []
      page.setDefaultTimeout(60_000)
      page.on('pageerror', (e) => erros.push(e.message))
      await page.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
      await page.goto(`${base}${url}`)
      await page.waitForFunction(
        () => (globalThis as { __arquipelagoDesenho?: unknown }).__arquipelagoDesenho,
      )
      return { ctx, page, erros }
    }

    // ── Só o gato do quarto: ele sai com ela e segue pela ilha ────────────────────────────────
    {
      const { ctx, page, erros } = await abrir('/?novo=1&posicao=2&qualidade=leve&em=0,14,2')
      await petPerto(page)
      await levar(page, 12, 10)
      await page.waitForTimeout(800)
      await petPerto(page)
      await page.screenshot({ path: path.join(prints, `${tipo}-1-gato-acompanha.png`) })
      assert.deepEqual(erros, [])
      await ctx.close()
    }

    // ── O passarinho: pausa congela tudo; menos movimento tira o balanço ──────────────────────
    {
      const { ctx, page, erros } = await abrir(
        '/?novo=1&posicao=2&qualidade=leve&em=0,14,2&pet=passaro',
      )
      const pet = () =>
        page.evaluate(
          () =>
            (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
              ?.petQueAcompanha ?? null,
        )
      const amostras = async (n: number) => {
        const lista: NonNullable<Awaited<ReturnType<typeof pet>>>[] = []
        for (let i = 0; i < n; i++) {
          const p = await pet()
          assert.ok(p, `${tipo}: sem o passarinho`)
          lista.push(p)
          await page.waitForTimeout(150)
        }
        return lista
      }
      const variacao = (v: number[]) => Math.max(...v) - Math.min(...v)
      await petPerto(page)
      await page.waitForTimeout(2500)
      // Parado perto dela: só a altura pode mudar, e só sem movimento reduzido.
      const parado = await amostras(12)
      const balanco = variacao(parado.map((p) => p.y))
      if (celular) assert.ok(balanco < 0.01, `${tipo}: balançou ${balanco} com menos movimento`)
      else assert.ok(balanco > 0.05, `${tipo}: não balançou (${balanco})`)
      // Ela vai longe, ele corre e vira; a pausa vem no meio da corrida.
      await levar(page, 12, 10)
      await page.waitForTimeout(250)
      if (celular) await page.getByRole('button', { name: 'Abrir o menu' }).tap()
      else await page.keyboard.press('Escape')
      await page.getByRole('dialog', { name: 'Menu do jogo' }).waitFor()
      await page.waitForTimeout(300)
      const pausado = await amostras(8)
      for (const eixo of ['x', 'y', 'z', 'giro'] as const)
        assert.ok(
          variacao(pausado.map((p) => p[eixo])) < 1e-6,
          `${tipo}: o passarinho mexeu ${eixo} na pausa`,
        )
      await page.screenshot({ path: path.join(prints, `${tipo}-0-passarinho-pausa.png`) })
      assert.deepEqual(erros, [])
      console.log(
        `PASS ${tipo}: passarinho ${celular ? 'sem balanço (movimento reduzido)' : `balança ${balanco.toFixed(2)} m`}; parado na pausa`,
      )
      await ctx.close()
    }

    // ── Com o Mingau: ele acompanha; no painel dele, a escolha troca ──────────────────────────
    const { ctx, page, erros } = await abrir(
      '/?novo=1&posicao=2&adotado=1&qualidade=leve&em=0,14,2',
    )
    await page.waitForTimeout(3000)
    assert.equal(
      (await page.evaluate(
        () =>
          (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.petQueAcompanha,
      )) ?? null,
      null,
    )
    await page.locator('.arq-acao').filter({ hasText: 'Cuidar de Mingau' }).waitFor()
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
    else await page.keyboard.press('e')
    const painel = page.getByRole('dialog', { name: /Mingau/ })
    await painel.waitFor()
    const escolha = painel.getByRole('group', { name: 'Quem vai com você pela ilha' })
    assert.equal(
      await escolha.getByRole('button', { name: 'Mingau' }).getAttribute('aria-pressed'),
      'true',
    )
    await escolha.getByRole('button', { name: 'Gato do quarto' }).click()
    await painel.getByText('O gato do quarto vai com você. Mingau espera em casa.').waitFor()
    await page.screenshot({ path: path.join(prints, `${tipo}-2-escolha.png`) })
    await painel.getByRole('button', { name: 'Voltar ao jogo' }).click()
    await petPerto(page)
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento?.companhia ===
        'quarto',
    )
    assert.deepEqual(erros, [])
    console.log(
      `PASS ${tipo}: o gato do quarto acompanha; com o Mingau, a escolha troca e ele espera em casa`,
    )
    await ctx.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
