/**
 * O filhote do Vale (fase4-03) no playground. Executar no pacote:
 * bun build playground/verificar-filhote-browser.ts --target=node --external playwright-core --outfile .cache/verificar-filhote-browser.mjs
 * node .cache/verificar-filhote-browser.mjs
 * ARQUIPELAGO_CHROMIUM escolhe o navegador; ARQUIPELAGO_PRINTS escolhe a pasta dos prints;
 * ARQUIPELAGO_TELA=computador|celular roda uma tela só.
 *
 * Dois começos, cada um num contexto limpo (nada da fila do salvamento passa de um ao outro):
 * - "ovo": os três ninhos já cuidados. A Jade entrega o ovo e o chão quente esquenta o primeiro dia.
 * - "choca": o ovo com dois dias. O terceiro choca; o filhote ganha nome, comida e carinho.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import {
  criarSalvamentoInicial,
  DIAS_PARA_CHOCAR,
  NINHOS_DO_VALE,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import { FALA_DO_OVO, OVO_NOVO } from '../src/sistemas/filhote-do-vale'

type P = { x: number; y: number; z: number }
type Desenho = { posicao: P; ilhasCompletas: number; noChao: boolean }
const port = await new Promise<number>((resolve, reject) => {
  const reserva = createServer()
  reserva.once('error', reject)
  reserva.listen(0, '127.0.0.1', () => {
    const endereco = reserva.address()
    if (!endereco || typeof endereco === 'string') return reject(new Error('Sem porta local'))
    reserva.close(() => resolve(endereco.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints =
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-filhote-do-vale')
mkdirSync(prints, { recursive: true })
const vale = ilhasEmVolta().find((i) => i.ilha.id === 'vale-dos-dinos')
if (!vale) throw new Error('Vale fora do anel')
const giro = giroDaIlha(vale.ilha)
const bytes = readFileSync('src/assets/ilhas/vale-dos-dinos.glb')
const modelo = (
  await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  )
).scene
const local = (nome: string) => {
  const no = modelo.getObjectByName(nome)
  if (!no) throw new Error(`Sem âncora ${nome}`)
  return { x: no.position.x, y: no.position.y, z: no.position.z }
}
const mundo = (p: P): P => ({
  x: vale.centro.x + p.x * Math.cos(giro) + p.z * Math.sin(giro),
  y: p.y,
  z: vale.centro.z - p.x * Math.sin(giro) + p.z * Math.cos(giro),
})
const rumo = (a: P, b: P) => Math.atan2(b.x - a.x, b.z - a.z)
const PE = CORPO.doCentroAoPe + CORPO.folga
const pe = local('pe-do-vulcao')
const morador = local('morador')
const chegada = local('chegada')
const paraChegada = (() => {
  const dx = chegada.x - morador.x
  const dz = chegada.z - morador.z
  const d = Math.hypot(dx, dz)
  return { x: dx / d, z: dz / d }
})()
/** Diante da Jade, longe do alcance do chão quente (2,2 m). */
const diante = mundo({
  x: morador.x + paraChegada.x * 1.6,
  y: morador.y,
  z: morador.z + paraChegada.z * 1.6,
})
/** Ao lado do chão quente, com o passeio do filhote todo ao alcance. */
const juntoAoOvo = mundo({ x: pe.x + 2, y: pe.y, z: pe.z + 0.2 })
const chaoQuente = mundo(pe)
/** Com o ovo à esquerda da tela, ainda ao alcance. */
const deLado = mundo({ x: pe.x + 1.4, y: pe.y, z: pe.z + 1.2 })

/** O `em=` do playground começaria um salvamento novo: a posição vai no próprio salvamento. */
function salvamento(filhote: Salvamento['vale']['filhote'], onde: P): Salvamento {
  const s = criarSalvamentoInicial(new Date())
  return {
    ...s,
    posicao: { x: onde.x, y: onde.y + 1.2, z: onde.z },
    inventario: { ...s.inventario, alface: 2 },
    vale: { ...s.vale, pegadas: true, escavacao: 3, ninhos: [...NINHOS_DO_VALE], filhote },
  }
}

const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let servidorPronto = false
server.stdout.on('data', (d) => {
  if (String(d).includes('Arquipélago no ar')) servidorPronto = true
})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const deadline = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou')
    try {
      if (servidorPronto && (await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() > deadline) throw new Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const telas = process.env.ARQUIPELAGO_TELA
    ? [process.env.ARQUIPELAGO_TELA === 'celular']
    : [false, true]
  for (const celular of telas) {
    const tipo = celular ? 'celular' : 'computador'

    /** Um contexto limpo com o salvamento semeado, de pé em `onde`, com a ilha completa. */
    async function abrir(semente: Salvamento, onde: P, olhar: P) {
      const context = await browser!.newContext({
        viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
        isMobile: celular,
        hasTouch: celular,
      })
      context.setDefaultTimeout(180_000)
      await context.addInitScript(
        ({ guardado }) => {
          localStorage.setItem('arquipelago:medir', '1')
          localStorage.setItem(
            'arquipelago:conforto',
            JSON.stringify({ menosMovimento: true, qualidade: 'leve' }),
          )
          // Só na primeira abertura: depois, o jogo guarda o que mudou.
          if (!localStorage.getItem('qa-semeado')) {
            localStorage.setItem('qa-semeado', '1')
            localStorage.setItem('arquipelago-playground', guardado)
          }
        },
        {
          guardado: JSON.stringify({
            revisao: 1,
            salvamento: semente,
            atualizadoEm: new Date().toISOString(),
          }),
        },
      )
      const page = await context.newPage()
      await page.emulateMedia({ reducedMotion: celular ? 'reduce' : 'no-preference' })
      const erros: string[] = []
      page.on('pageerror', (e) => erros.push(e.message))
      await page.goto(`${baseURL}/?posicao=6`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForFunction(
        () =>
          ((globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
            ?.ilhasCompletas ?? 0) > 0,
      )
      await page.locator('canvas').click()
      await dePe(page, onde, olhar)
      const guardado = await page.evaluate(() => localStorage.getItem('arquipelago-playground'))
      console.log(`${tipo}: salvamento no começo`, JSON.parse(guardado ?? '{}').salvamento?.vale)
      return { context, page, erros }
    }

    async function dePe(page: Page, p: P, olhar: P) {
      await page.evaluate(
        ({ p, g }) => {
          const ir = (globalThis as { __arquipelagoLevar?: (...args: number[]) => void })
            .__arquipelagoLevar
          if (!ir) throw new Error('Sem transporte de conferência')
          ir(p.x, p.y + 1.2, p.z, g)
        },
        { p, g: rumo(p, olhar) + Math.PI },
      )
      await page.waitForFunction(
        ({ p, pe }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return (
            d?.noChao &&
            Math.hypot(d.posicao.x - p.x, d.posicao.z - p.z) < 0.3 &&
            Math.abs(d.posicao.y - pe - p.y) < 0.15
          )
        },
        { p, pe: PE },
      )
    }

    async function falhou(page: Page, nome: string, erro: unknown): Promise<never> {
      await page.screenshot({ path: path.join(prints, `filhote-${tipo}-falha-${nome}.png`) })
      const texto = await page.locator('[role=dialog]').allInnerTexts()
      console.log(`${tipo}: falhou em ${nome}`, texto)
      throw erro
    }

    async function usar(page: Page, rotulo: string) {
      await page.locator('.arq-acao').filter({ hasText: rotulo }).waitFor()
      if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
      else {
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
        await page.keyboard.press('KeyE')
      }
    }

    // 1. A Jade entrega o ovo; o chão quente esquenta o primeiro dia.
    if (!celular) {
      const { context, page, erros } = await abrir(salvamento(null, diante), diante, mundo(morador))
      try {
        await usar(page, 'Conversar com a Jade')
        const conversa = page.getByRole('dialog', { name: 'Jade', exact: true })
        await conversa.getByText('Você cuidou dos três ninhos.').waitFor()
        for (const fala of FALA_DO_OVO) {
          await conversa.getByRole('button', { name: 'Continuar' }).click()
          await conversa.getByText(fala).waitFor()
        }
        await conversa.getByRole('button', { name: 'Tchau, Jade' }).click()
        await conversa.waitFor({ state: 'detached' })
        await page.waitForFunction(
          () =>
            JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento?.vale
              ?.filhote?.ovo === 0,
        )
        console.log(`${tipo}: a Jade entregou o ovo`)
        // De lado para o ovo: de costas para ele, o avatar o esconde no print.
        await dePe(page, deLado, mundo({ x: pe.x - 0.6, y: pe.y, z: pe.z + 1.2 }))
        await usar(page, 'Aquecer o ovo')
        await page.getByText('O ovo ficou quentinho. Faltam 2 dias para ele chocar.').waitFor()
        await page.locator('.arq-acao').filter({ hasText: 'Ver o ovo' }).waitFor()
        await page.waitForTimeout(2500)
        await page.screenshot({ path: path.join(prints, `filhote-${tipo}-ovo.png`) })
        console.log(`${tipo}: o ovo esquentou o primeiro dia`)
      } catch (erro) {
        await falhou(page, 'ovo', erro)
      }
      if (erros.length) throw new Error(erros.join('\n'))
      await context.close()
    }

    // 2. O terceiro dia choca; o filhote ganha nome, comida e carinho.
    {
      const ovo = { ...OVO_NOVO, ovo: DIAS_PARA_CHOCAR - 1, aquecidoEm: '2026-01-01' }
      const { context, page, erros } = await abrir(
        salvamento(ovo, juntoAoOvo),
        juntoAoOvo,
        chaoQuente,
      )
      try {
        await usar(page, 'Aquecer o ovo')
        await page.getByText('O ovo rachou e um tricerátopo filhote nasceu.').waitFor()
        await usar(page, 'Dar um nome ao filhote')
        const painel = page.getByRole('dialog', { name: 'Filhote de tricerátopo' })
        await painel.getByLabel('Nome').fill('Tricê')
        await painel.getByRole('button', { name: 'Dar o nome' }).click()
        const cuidar = page.getByRole('dialog', { name: 'Tricê' })
        await cuidar.getByText('Tricê adorou o nome.', { exact: false }).waitFor()
        await cuidar.getByRole('button', { name: 'Dar comida' }).click()
        await cuidar.getByText('Agora ele quer carinho.').waitFor()
        await cuidar.getByRole('button', { name: 'Fazer carinho' }).click()
        await cuidar
          .getByText('Hoje ele foi bem cuidado. Faltam 4 dias para ele crescer.')
          .waitFor()
        await cuidar.getByText('Já comeu hoje').waitFor()
        await page.waitForTimeout(1500)
        await page.screenshot({ path: path.join(prints, `filhote-${tipo}-painel.png`) })
        if (
          celular &&
          (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
        )
          throw new Error('O painel ultrapassa a largura do celular')
        await cuidar.getByRole('button', { name: 'Voltar ao jogo' }).click()
        await cuidar.waitFor({ state: 'detached' })
        await page.locator('.arq-acao').filter({ hasText: 'Cuidar de Tricê' }).waitFor()
        await page.waitForFunction(() => {
          const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento
          return s?.vale?.filhote?.dias === 1 && s.vale.filhote.nome === 'Tricê'
        })
        await page.waitForTimeout(4000)
        await page.screenshot({ path: path.join(prints, `filhote-${tipo}-no-vale.png`) })
        console.log(`${tipo}: nasceu, ganhou nome, comida e carinho, e o dia contou`)
      } catch (erro) {
        await falhou(page, 'choca', erro)
      }
      if (erros.length) throw new Error(erros.join('\n'))
      await context.close()
    }
  }
} finally {
  await browser?.close()
  server.kill()
}
