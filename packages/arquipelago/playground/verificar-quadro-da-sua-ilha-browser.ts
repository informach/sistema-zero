/**
 * O Quadro das Cores da sua ilha (C03a) no navegador, com a plataforma falsa e sem banco: o
 * cavalete fica na grama ao lado da trilha do píer, "Ver o Quadro das Cores" abre o painel com os
 * quadros da sua ilha (um feito, um pronto), e nada fala em pintar a ilha. Depois, o projeto
 * autoral (C03b): sem o final do Farol o cavalete dele não existe; com o final, ele aparece ao lado
 * do Farol com um quadro só.
 *
 * No Windows: `bun build playground/verificar-quadro-da-sua-ilha-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-quadro-da-sua-ilha-browser.mjs && node
 * .cache/verificar-quadro-da-sua-ilha-browser.mjs`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import { lugarDoQuadroNaSuaIlha, lugarDoQuadroNoFarol } from '../src/mundo/lugar-do-quadro'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/quadro-da-sua-ilha')
mkdirSync(prints, { recursive: true })
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

const lugar = lugarDoQuadroNaSuaIlha()
const doFarol = lugarDoQuadroNoFarol()
// Na frente do cavalete, olhando para ele (o giro do transporte é para onde o corpo olha).
const frenteDe = (l: typeof lugar) => ({
  x: l.x + Math.sin(l.giro) * 1.8,
  z: l.z + Math.cos(l.giro) * 1.8,
})
const frente = frenteDe(lugar)
const olhar = lugar.giro
const levar = (page: Page, f: { x: number; z: number }, giro: number) =>
  page.evaluate(
    ({ f, giro }) => {
      const ir = (globalThis as { __arquipelagoLevar?: (...a: number[]) => void })
        .__arquipelagoLevar
      if (!ir) throw new Error('Sem transporte de conferência')
      ir(f.x, 2, f.z, giro)
    },
    { f, giro },
  )
/** Um salvamento com o final do Farol já visto, perto do cavalete dele. */
function salvamentoDepoisDoFinal(concluido: boolean) {
  const s = criarSalvamentoInicial(new Date())
  const f = frenteDe(doFarol)
  return JSON.stringify({
    revisao: 1,
    atualizadoEm: new Date().toISOString(),
    salvamento: {
      ...s,
      posicao: { x: f.x, y: 1.6, z: f.z },
      farol: { ...s.farol, pagina: concluido, concluido },
    },
  })
}

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
    const ctx = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: celular,
      hasTouch: celular,
    })
    const page = await ctx.newPage()
    const erros: string[] = []
    page.setDefaultTimeout(60_000)
    page.on('pageerror', (e) => erros.push(e.message))
    await page.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    await page.goto(`${base}/?novo=1&posicao=1&qualidade=leve&em=${frente.x},${frente.z}`)
    await page.waitForFunction(
      () => (globalThis as { __arquipelagoDesenho?: unknown }).__arquipelagoDesenho,
    )
    await levar(page, frente, olhar)
    await page.locator('.arq-acao').filter({ hasText: 'Ver o Quadro das Cores' }).waitFor()
    await page.screenshot({ path: path.join(prints, `${tipo}-1-cavalete.png`) })
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
    else await page.keyboard.press('e')
    await page.getByText('Passos na areia').first().waitFor()
    await page.getByText('A primeira concha').first().waitFor()
    assert.equal(await page.getByText('pinta um pedaço da ilha').count(), 0)
    assert.equal(await page.getByText('Cor de volta').count(), 0)
    await page.getByText('Desafio concluído').first().waitFor()
    await page.getByText('Sua ilha: 1 de 6 desafios feitos.').first().waitFor()
    await page.screenshot({ path: path.join(prints, `${tipo}-2-painel.png`) })
    assert.deepEqual(erros, [])
    console.log(`PASS ${tipo}: o cavalete da praia abre os quadros da sua ilha`)
    await ctx.close()

    // O projeto autoral do Farol: só depois do final.
    for (const concluido of [false, true]) {
      const c = await browser.newContext({
        viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        isMobile: celular,
        hasTouch: celular,
      })
      await c.addInitScript((salvo) => {
        localStorage.setItem('arquipelago:medir', '1')
        localStorage.setItem('arquipelago-playground', salvo)
      }, salvamentoDepoisDoFinal(concluido))
      const p = await c.newPage()
      const errosDoFarol: string[] = []
      p.setDefaultTimeout(60_000)
      p.on('pageerror', (e) => errosDoFarol.push(e.message))
      await p.goto(`${base}/?posicao=8&qualidade=leve`)
      await p.waitForFunction(
        () => (globalThis as { __arquipelagoDesenho?: unknown }).__arquipelagoDesenho,
      )
      await levar(p, frenteDe(doFarol), doFarol.giro)
      const botao = p.locator('.arq-acao').filter({ hasText: 'Ver o Quadro das Cores' })
      if (!concluido) {
        await p.waitForTimeout(4000)
        assert.equal(await botao.count(), 0, 'o cavalete do Farol apareceu antes do final')
      } else {
        await botao.waitFor()
        // A câmera ainda chega atrás do corpo depois do transporte.
        await p.waitForTimeout(2500)
        await p.screenshot({ path: path.join(prints, `${tipo}-3-cavalete-do-farol.png`) })
        if (celular) await p.getByRole('button', { name: 'Usar', exact: true }).tap()
        else await p.keyboard.press('e')
        await p.getByText('Meu jogo do Arquipélago').first().waitFor()
        assert.equal(await p.getByText('Ainda sem desafio').count(), 0)
        await p.getByText('Um jogo todo seu, com os critérios na lista.').first().waitFor()
        await p.screenshot({ path: path.join(prints, `${tipo}-4-painel-do-farol.png`) })
      }
      assert.deepEqual(errosDoFarol, [])
      await c.close()
    }
    console.log(`PASS ${tipo}: o cavalete do Farol só aparece depois do final, com um quadro`)
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
