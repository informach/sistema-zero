/** Conversa, presente, pedido e diário reais. Só playground local; nenhuma escrita remota. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { criarSalvamentoInicial, type SalvamentoGuardado } from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { lugarDaIrie } from '../src/mundo/nuvens'
import { lugarDoFloco } from '../src/mundo/pico'
import { lugarDaMare } from '../src/mundo/recife'
import { lugarDaJade } from '../src/mundo/vale'
import { chaveDaAbertura } from '../src/sistemas/abertura'
import { ITENS } from '../src/sistemas/itens'
import {
  MORADORES_COM_NOVA_AMIZADE,
  type MoradorDoAnel,
  VIDA_NO_ANEL,
} from '../src/sistemas/moradores-do-anel'

const configs = {
  mare: { ilha: 'recife', arquivo: 'recife', lugar: lugarDaMare, altura: 0 },
  floco: { ilha: 'pico', arquivo: 'pico', lugar: lugarDoFloco, altura: 0 },
  jade: { ilha: 'vale-dos-dinos', arquivo: 'vale-dos-dinos', lugar: lugarDaJade, altura: 0 },
  irie: { ilha: 'nuvens', arquivo: 'nuvens', lugar: lugarDaIrie, altura: 7 },
} as const
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-amizade')
mkdirSync(prints, { recursive: true })
const porta = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(new Error('Sem porta'))
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
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const encerrado = new Promise<void>((resolve) => servidor.once('close', () => resolve()))
const limite = setTimeout(() => {
  void browser?.close()
  servidor.kill()
}, 12 * 60_000)

async function passarFalas(page: Page, nome: string) {
  const painel = page.getByRole('dialog', { name: nome, exact: true })
  const lidas: string[] = []
  for (let i = 0; i < 16; i++) {
    const continuar = painel.getByRole('button', { name: 'Continuar', exact: true })
    if (!(await continuar.count())) return lidas
    lidas.push(await painel.locator('.arq-capi-fala').innerText())
    await continuar.click()
  }
  throw new Error('Conversa não chegou às escolhas')
}

async function guardar(page: Page, quem: MoradorDoAnel, amizade: number) {
  await page.waitForFunction(
    ({ quem, amizade }) => {
      const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')
      return s?.salvamento?.moradores?.[quem]?.amizade === amizade
    },
    { quem, amizade },
  )
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null'),
  ) as Promise<SalvamentoGuardado>
}

const resultados: unknown[] = []
try {
  const prazo = Date.now() + 60_000
  while (true) {
    if (servidor.exitCode !== null) throw new Error('Playground encerrou antes de iniciar')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > prazo) throw new Error('Playground não abriu')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const publico of ['kids', 'adulto'] as const)
    for (const celular of [false, true]) {
      for (const quem of publico === 'adulto' ? (['irie'] as const) : MORADORES_COM_NOVA_AMIZADE) {
        if (process.env.ARQUIPELAGO_PUBLICO && process.env.ARQUIPELAGO_PUBLICO !== publico) continue
        if (
          process.env.ARQUIPELAGO_CELULAR &&
          (process.env.ARQUIPELAGO_CELULAR === '1') !== celular
        )
          continue
        if (process.env.ARQUIPELAGO_MORADOR && process.env.ARQUIPELAGO_MORADOR !== quem) continue
        const dados = VIDA_NO_ANEL[quem]
        const config = configs[quem]
        const ilha = ilhasEmVolta().find((i) => i.ilha.id === config.ilha)
        assert.ok(ilha)
        const b = readFileSync(`src/assets/ilhas/${config.arquivo}.glb`)
        const raiz = (
          await new GLTFLoader().parseAsync(
            b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
            '',
          )
        ).scene
        const lugar = config.lugar(
          raiz,
          { ...ilha.centro, y: config.altura },
          giroDaIlha(ilha.ilha),
        )
        assert.ok(lugar)
        const s = criarSalvamentoInicial(new Date())
        s.casa.portaNova = true
        s.pontesVistas = ilhasEmVolta().map((i) => i.ilha.id)
        s.posicao = {
          x: lugar.x + Math.sin(lugar.descanso) * 1.5,
          z: lugar.z + Math.cos(lugar.descanso) * 1.5,
          y: lugar.y + 1.5,
        }
        s.moradores[quem].amizade = 170
        s.inventario = { alface: 10, tomate: 10, milho: 10, pipoca: 10, salada: 10 }
        const context = await browser.newContext({
          viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
          deviceScaleFactor: 0.5,
          isMobile: celular,
          hasTouch: celular,
          reducedMotion: 'reduce',
        })
        context.setDefaultTimeout(60_000)
        try {
          await context.addInitScript(
            ({ s, publico }) => {
              localStorage.setItem('arquipelago:medir', '1')
              localStorage.setItem(
                'arquipelago:conforto',
                JSON.stringify({ menosMovimento: true, qualidade: 'leve' }),
              )
              localStorage.setItem(`arquipelago:abertura:${publico}:perfil-de-teste`, '1')
              if (!localStorage.getItem('arquipelago-playground'))
                localStorage.setItem(
                  'arquipelago-playground',
                  JSON.stringify({
                    revisao: 1,
                    salvamento: s,
                    atualizadoEm: new Date().toISOString(),
                  }),
                )
            },
            { s, publico },
          )
          assert.equal(
            chaveDaAbertura(publico, 'perfil-de-teste'),
            `arquipelago:abertura:${publico}:perfil-de-teste`,
          )
          const page = await context.newPage()
          const erros: string[] = []
          page.on('pageerror', (e) => erros.push(e.message))
          page.on('console', (msg) => {
            if (msg.type() === 'error') erros.push(msg.text())
          })
          const url = `${base}/?posicao=7&publico=${publico}`
          await page.goto(url, { waitUntil: 'domcontentloaded' })
          const conversar = async () => {
            await page.getByText(new RegExp(`Conversar com (a|o) ${dados.nome}$`)).waitFor()
            if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
            else await page.keyboard.press('KeyE')
            await page.getByRole('dialog', { name: dados.nome, exact: true }).waitFor()
          }
          await conversar()
          await passarFalas(page, dados.nome)
          await guardar(page, quem, 180)
          await page.getByRole('button', { name: 'Dar um presente', exact: true }).click()
          const item = Object.keys(dados.gostos)[0]!
          await page.getByRole('button', { name: new RegExp(`${ITENS[item]!.nome} x10$`) }).click()
          const resposta = await passarFalas(page, dados.nome)
          if (dados.pagina) assert.ok(resposta.includes(dados.pagina.entrega))
          await guardar(page, quem, 200)
          await page.getByRole('button', { name: 'Entregar o pedido', exact: true }).click()
          await page.waitForFunction(() => {
            const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')
            return (
              s?.pedidosRemunerados?.length === 1 &&
              s.pedidosRemunerados[0].pagamento === 'creditado'
            )
          })
          await page.getByRole('dialog', { name: dados.nome, exact: true }).waitFor()
          const entrega = await passarFalas(page, dados.nome)
          assert.ok(entrega.includes('Você ganhou 4 moedas por ajudar.'))
          const salvo = await guardar(page, quem, 230)
          assert.equal(salvo.salvamento?.moradores[quem].pedido?.entregue, true)
          const nome = `${publico}-${celular ? 'celular' : 'computador'}-${quem}`
          await page.screenshot({ path: path.join(prints, `${nome}-conversa.png`) })
          await page.getByRole('button', { name: `Tchau, ${dados.nome}`, exact: true }).click()
          await page.reload({ waitUntil: 'domcontentloaded' })
          await conversar()
          await passarFalas(page, dados.nome)
          const relido = await guardar(page, quem, 230)
          assert.deepEqual(relido.salvamento?.inventario, salvo.salvamento?.inventario)
          const carteira = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('arquipelago-playground:galeria') ?? 'null'),
          )
          assert.equal(carteira.saldo, 84)
          assert.equal(Object.keys(carteira.creditos).length, 1)
          await page.getByRole('button', { name: `Tchau, ${dados.nome}`, exact: true }).click()
          if (dados.pagina) {
            await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
            await page.getByRole('button', { name: 'Diário', exact: true }).click()
            const texto = page.getByText(dados.pagina.texto, { exact: true })
            await texto.scrollIntoViewIfNeeded()
            assert.equal(await texto.isVisible(), true)
            await page.screenshot({ path: path.join(prints, `${nome}-diario.png`) })
          }
          assert.deepEqual(erros, [])
          resultados.push({
            publico,
            celular,
            quem,
            amizade: 230,
            pedidoEntregue: true,
            reabriu: true,
            moedas: 4,
            saldo: 84,
            creditos: 1,
            pagina: dados.pagina?.ilha ?? null,
          })
          writeFileSync(path.join(prints, 'resultado.json'), JSON.stringify(resultados, null, 2))
          console.log('PASS', nome)
        } catch (erro) {
          const page = context.pages()[0]
          if (page) {
            const nome = `${publico}-${celular ? 'celular' : 'computador'}-${quem}-falha`
            await page.screenshot({ path: path.join(prints, `${nome}.png`) }).catch(() => {})
            writeFileSync(
              path.join(prints, `${nome}.txt`),
              await page
                .locator('body')
                .innerText()
                .catch(() => 'Página indisponível'),
            )
          }
          throw erro
        } finally {
          await context.close()
        }
      }
    }
} finally {
  clearTimeout(limite)
  await browser?.close()
  servidor.kill()
  await encerrado
}
