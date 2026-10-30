/** Prévia e trabalho reais por espécie, somente com a plataforma local. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import {
  type CartaoDaRotina,
  criarSalvamentoInicial,
  descricaoDoTrabalhoLumi,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import { posicaoDoCanteiro } from '../src/mundo/colisao-da-ilha-central'

const prints =
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-lumis-trabalho')
mkdirSync(prints, { recursive: true })
const porta = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta'))
    s.close(() => resolve(a.port))
  })
})
const base = `http://127.0.0.1:${porta}`
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))
const encerrado = new Promise<void>((r) => servidor.once('close', () => r()))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const limite = setTimeout(() => {
  void browser?.close()
  servidor.kill()
}, 12 * 60_000)
const resultados: unknown[] = []
async function salvo(p: Page): Promise<Salvamento> {
  return p.evaluate(
    () => JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null').salvamento,
  )
}
async function painel(p: Page) {
  await p.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
  await p.getByRole('button', { name: 'Caderno dos Lumis', exact: true }).click()
  await p.getByRole('button', { name: 'Montar a rotina de um Lumi', exact: true }).click()
  return p.getByRole('dialog', { name: 'Rotina', exact: true })
}
try {
  const prazo = Date.now() + 60_000
  while (true) {
    if (servidor.exitCode !== null) throw Error('Servidor encerrou')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > prazo) throw Error('Servidor não abriu')
    await new Promise((r) => setTimeout(r, 200))
  }
  for (const publico of ['kids', 'adulto'] as const)
    for (const celular of [false, true])
      for (const lumi of ['pluma', 'buzio'] as const) {
        browser = await chromium.launch({
          ...(process.env.ARQUIPELAGO_CHROMIUM
            ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
            : { channel: 'chrome' }),
          headless: true,
          args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
        })
        const context = await browser.newContext({
          viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
          deviceScaleFactor: 0.5,
          hasTouch: celular,
          isMobile: celular,
          reducedMotion: 'reduce',
        })
        const agora = new Date()
        const s = criarSalvamentoInicial(agora)
        const c = posicaoDoCanteiro(0)
        s.casa.portaNova = true
        s.posicao = { x: c.x + 3, y: 1.6, z: c.z + 3 }
        s.lumis[lumi] = 1
        s.horta = Array.from({ length: 4 }, (_, i) => ({
          id: `c${i + 1}`,
          semente: 'tomate',
          plantadoEm: '2026-10-28T00:00:00Z',
          regadoEm: '2026-10-28T00:00:00Z',
        }))
        s.inventario = {}
        const lista: CartaoDaRotina[] = [
          { c: 'quando-amanhecer' },
          { c: 'voar-ate', a: 'horta' },
          { c: 'para-cada', d: [{ c: 'colher' }] },
        ]
        s.rotinas[lumi] = lista
        await context.addInitScript((s) => {
          localStorage.setItem('arquipelago:medir', '1')
          localStorage.setItem(
            'arquipelago:conforto',
            JSON.stringify({ menosMovimento: true, qualidade: 'leve' }),
          )
          if (!localStorage.getItem('arquipelago-playground'))
            localStorage.setItem(
              'arquipelago-playground',
              JSON.stringify({ revisao: 1, atualizadoEm: new Date().toISOString(), salvamento: s }),
            )
        }, s)
        const p = await context.newPage()
        p.setDefaultTimeout(60_000)
        const erros: string[] = []
        p.on('pageerror', (e) => erros.push(e.message))
        p.on('console', (e) => {
          if (e.type() === 'error') erros.push(e.text())
        })
        const nome = `${publico}-${celular ? 'celular' : 'computador'}-${lumi}`
        const jornada = lumi === 'pluma' ? 2 : 7
        const tomates = lumi === 'pluma' ? 8 : 20
        try {
          await p.goto(
            `${base}/?cartas=todas&rotina=editor&qualidade=leve&publico=${publico}&posicao=${jornada}`,
            {
              waitUntil: 'domcontentloaded',
            },
          )
          const r = await painel(p)
          await r.getByText(descricaoDoTrabalhoLumi(lumi), { exact: true }).waitFor()
          await r.getByRole('button', { name: 'Montar com blocos', exact: true }).click()
          const editor = p.getByRole('dialog', { name: 'Rotina do Lumi', exact: true })
          await editor.getByText(descricaoDoTrabalhoLumi(lumi), { exact: true }).waitFor()
          if (celular) await editor.getByRole('button', { name: 'Prévia', exact: true }).click()
          await editor.getByText(/Bônus na abertura:/).waitFor()
          assert.match(
            await editor.getByText(/Bônus na abertura:/).innerText(),
            jornada === 2 ? /clima ainda não liberado/ : /clima sol/,
          )
          const antes = await salvo(p)
          await editor.getByRole('button', { name: 'Prever', exact: true }).click()
          await editor.getByText('Prévia encerrada.', { exact: true }).waitFor()
          const previsto = await editor.getByRole('listitem').allTextContents()
          assert.equal(
            previsto.filter((x) => x.startsWith('Colheu')).length,
            lumi === 'pluma' ? 2 : 4,
          )
          assert.deepEqual(await salvo(p), antes, 'a prévia não pode alterar o mundo')
          const largura = await editor.evaluate((el) => ({
            rola: el.scrollWidth,
            cabe: el.clientWidth,
          }))
          assert.ok(largura.rola <= largura.cabe + 1)
          await p.screenshot({ path: path.join(prints, `${nome}-previa.png`) })
          await editor.getByRole('button', { name: 'Guardar rotina', exact: true }).click()
          await editor.waitFor({ state: 'hidden' })
          await r.getByRole('button', { name: 'Testar', exact: true }).click()
          const aviso = p.locator('.arq-rotina-andando')
          await aviso.waitFor()
          await p.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
          const pausado = await salvo(p)
          await p.waitForTimeout(700)
          assert.deepEqual((await salvo(p)).horta, pausado.horta, 'a pausa não pode colher')
          await p.getByRole('button', { name: 'Continuar jogando', exact: true }).click()
          await aviso.waitFor({ state: 'hidden', timeout: 180_000 })
          await p.waitForFunction(
            (esperado) =>
              JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')?.salvamento
                ?.inventario?.tomate === esperado,
            tomates,
          )
          const final = await salvo(p)
          assert.equal(final.horta.filter((x) => x.semente).length, lumi === 'pluma' ? 2 : 0)
          const depois = await painel(p)
          await depois.getByText('Da última vez, a rotina foi até o fim', { exact: true }).click()
          const reais = await depois.locator('.arq-rotina-ultima li').allTextContents()
          assert.deepEqual(reais, previsto)
          await p.screenshot({ path: path.join(prints, `${nome}-real.png`) })
          assert.deepEqual(erros, [])
          resultados.push({
            nome,
            publico,
            jornada,
            tomates: final.inventario.tomate,
            restante: final.horta.filter((x) => x.semente).length,
            previa: previsto,
            real: reais,
            pausa: true,
          })
          writeFileSync(path.join(prints, 'resultado.json'), JSON.stringify(resultados, null, 2))
          console.log('PASS', nome)
        } catch (erro) {
          await p.screenshot({ path: path.join(prints, `${nome}-falha.png`) }).catch(() => {})
          throw erro
        } finally {
          await context.close()
          await browser.close()
          browser = undefined
        }
      }
} finally {
  clearTimeout(limite)
  await browser?.close()
  servidor.kill()
  await encerrado
}
