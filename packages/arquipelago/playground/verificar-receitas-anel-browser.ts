/** Receitas no cliente real, com estado local controlado. Não usa serviço nem banco remoto. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { BICHOS_DO_BOSQUE, criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { chromium } from 'playwright-core'
import { BANCADA } from '../src/mundo/medidas'
import { MORADORES_COM_NOVA_AMIZADE } from '../src/sistemas/moradores-do-anel'
import { RECEITAS } from '../src/sistemas/receitas'

const prints =
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-receitas-anel')
mkdirSync(prints, { recursive: true })
const porta = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta local'))
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
const encerrado = new Promise<void>((resolve) => servidor.once('close', () => resolve()))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const limite = setTimeout(() => {
  void browser?.close()
  servidor.kill()
}, 8 * 60_000)
const resultados: unknown[] = []
const novas = RECEITAS.filter(
  (r) =>
    r.origem.tipo === 'colecao' || (r.origem.tipo === 'amizade' && r.origem.morador !== 'bento'),
)
try {
  const prazo = Date.now() + 60_000
  while (true) {
    if (servidor.exitCode !== null) throw Error('Servidor encerrou')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > prazo) throw Error('Servidor não abriu')
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  for (const publico of ['kids', 'adulto'] as const)
    for (const celular of [false, true]) {
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
        isMobile: celular,
        hasTouch: celular,
        reducedMotion: 'reduce',
      })
      const s = criarSalvamentoInicial(new Date())
      s.casa.portaNova = true
      s.posicao = { x: BANCADA.x, y: 2.2, z: BANCADA.z + 1.6 }
      s.bichos.achados = [...BICHOS_DO_BOSQUE]
      s.inventario = {}
      for (const quem of MORADORES_COM_NOVA_AMIZADE) s.moradores[quem].amizade = 100
      for (const r of novas)
        for (const [id, qtd] of Object.entries(r.precisa))
          s.inventario[id] = (s.inventario[id] ?? 0) + qtd
      await context.addInitScript((salvamento) => {
        localStorage.setItem('arquipelago:medir', '1')
        localStorage.setItem(
          'arquipelago:conforto',
          JSON.stringify({ menosMovimento: true, qualidade: 'leve' }),
        )
        if (!localStorage.getItem('arquipelago-playground'))
          localStorage.setItem(
            'arquipelago-playground',
            JSON.stringify({ revisao: 1, atualizadoEm: new Date().toISOString(), salvamento }),
          )
      }, s)
      const p = await context.newPage()
      p.setDefaultTimeout(60_000)
      const erros: string[] = []
      p.on('pageerror', (e) => erros.push(e.message))
      p.on('console', (e) => {
        if (e.type() === 'error') erros.push(e.text())
      })
      const nome = `${publico}-${celular ? 'celular' : 'computador'}`
      try {
        await p.goto(`${base}/?publico=${publico}&posicao=2&qualidade=leve`, {
          waitUntil: 'domcontentloaded',
        })
        // O aviso inclui a tecla E (ou Usar) no mesmo elemento de texto.
        await p.getByText('Ver as receitas').first().waitFor()
        if (celular) await p.getByRole('button', { name: 'Usar', exact: true }).click()
        else await p.keyboard.press('KeyE')
        const bancada = p.getByRole('dialog', { name: 'Bancada', exact: true })
        await bancada.waitFor()
        for (const r of novas) {
          const botao = bancada.getByRole('button', { name: new RegExp(`${r.nome}:`) })
          assert.equal(await botao.isEnabled(), true, r.id)
          await botao.click()
          await p.waitForFunction(
            ({ item, qtd }) =>
              JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')?.salvamento
                ?.inventario?.[item] === qtd,
            { item: r.faz.id, qtd: r.faz.qtd },
          )
          assert.equal(await botao.isEnabled(), false, 'não duplica prato sem ingredientes')
        }
        const largura = await bancada.evaluate((el) => ({
          conteudo: el.scrollWidth,
          caixa: el.clientWidth,
        }))
        assert.ok(largura.conteudo <= largura.caixa + 1)
        await p.screenshot({ path: path.join(prints, `${nome}-bancada.png`) })
        await bancada.getByRole('button', { name: 'Voltar ao jogo', exact: true }).click()
        await p.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
        await p.getByRole('button', { name: 'Diário', exact: true }).click()
        const diario = p.getByRole('dialog', { name: 'Diário', exact: true })
        const titulo = diario.getByText('Receitas: 8 de 12', { exact: true })
        await titulo.scrollIntoViewIfNeeded()
        for (const r of novas) await diario.getByText(r.nome, { exact: true }).waitFor()
        await p.screenshot({ path: path.join(prints, `${nome}-diario.png`) })
        const salvo = await p.evaluate(
          () => JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null').salvamento,
        )
        assert.deepEqual(
          salvo.inventario,
          Object.fromEntries(novas.map((r) => [r.faz.id, r.faz.qtd])),
        )
        await p.reload({ waitUntil: 'domcontentloaded' })
        await p.getByRole('button', { name: 'Abrir o menu', exact: true }).waitFor()
        const reaberto = await p.evaluate(
          () => JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null').salvamento,
        )
        assert.deepEqual(reaberto.inventario, salvo.inventario)
        assert.deepEqual(erros, [])
        resultados.push({ nome, pratos: salvo.inventario, largura, reabriu: true, erros })
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
