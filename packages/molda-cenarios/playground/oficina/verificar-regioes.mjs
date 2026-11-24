import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { esperarConsulta } from './esperar-consulta.mjs'

/**
 * A ferramenta Regiões da aba Jogo no navegador (lote 7 da conclusão, 22/11/2026), com o
 * playground da oficina (`bun run dev:oficina`, porta 4541): "Regiões" no trilho, dois toques no
 * chão, nome, prévia e guardar; a segunda região encostada ganha a primeira como vizinha (o par
 * nos dois lados); editar e apagar. As fotos vão para `output/cenarios-reforma/regioes`.
 */
const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/regioes')
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  contexto = await browser.newContext({ viewport: { width: 1440, height: 900 } }),
  p = await contexto.newPage(),
  erros = []
p.on('pageerror', (e) => erros.push(e.message))
p.on('console', (m) => {
  if (m.type() === 'error') erros.push(m.text())
})
try {
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForFunction(() => window.__cenarios)
  const id = await p.evaluate(async () => {
    const h = window.__cenarios.host,
      m = await h.criarMundo('conta', 'Mundo das regiões'),
      c = await h.criarCenario(m.id, 'Vale grande')
    return c.id
  })
  const regioes = async (esperado) =>
    esperarConsulta(
      p,
      async ({ id, esperado }) => {
        const d = (await window.__cenarios.host.abrirCenario(id)).documento
        return (d.regioes ?? []).length === esperado ? (d.regioes ?? []) : null
      },
      { id, esperado },
    )
  const aba = (nome) =>
      p.locator('.mld-workshop-tabs').getByRole('button', { name: nome, exact: true }),
    rail = p.locator('nav.mld-workshop-rail'),
    painel = p.locator('aside.mcn-painel')
  // A lista foi lida antes do mundo novo: trocar o espaço e voltar a recarrega.
  const espaco = p.getByRole('combobox', { name: 'De quem são', exact: true })
  await espaco.selectOption('equipe')
  await espaco.selectOption('conta')
  await p.getByRole('button', { name: 'Abrir Mundo das regiões', exact: true }).click()
  await p.getByRole('button', { name: 'Abrir Vale grande', exact: true }).click()
  await aba('Jogo').click()
  const canvas = p.locator('canvas').first()
  await canvas.waitFor()
  const caixa = await canvas.boundingBox()
  assert.ok(caixa, 'o palco não apareceu')
  const toque = async (fx, fy) =>
    p.mouse.click(caixa.x + caixa.width * fx, caixa.y + caixa.height * fy)

  // 1. A primeira região: dois cantos opostos no chão.
  await rail.getByRole('button', { name: 'Regiões', exact: true }).click()
  await painel.getByText('Toque em dois cantos opostos').waitFor()
  await toque(0.35, 0.55)
  await toque(0.5, 0.75)
  await painel.getByRole('heading', { name: 'Nova região', exact: true }).waitFor()
  await painel.getByRole('textbox', { name: 'Nome da região', exact: true }).fill('Vila')
  await painel.getByRole('button', { name: 'Ver prévia da região', exact: true }).click()
  await painel.getByRole('heading', { name: 'Prévia · ainda não guardada', exact: true }).waitFor()
  await p.screenshot({ path: resolve(saida, '01-previa-da-vila.png') })
  await painel.getByRole('button', { name: 'Guardar região', exact: true }).click()
  const [vila] = await regioes(1)
  assert.equal(vila.nome, 'Vila')
  assert.ok(vila.caixa.x1 > vila.caixa.x0 && vila.caixa.z1 > vila.caixa.z0)

  // 2. A segunda, encostada pelo "Encaixar na vizinha", com a Vila como vizinha.
  await painel.getByRole('button', { name: 'Nova região', exact: true }).click()
  await toque(0.52, 0.55)
  await toque(0.68, 0.75)
  await painel.getByRole('textbox', { name: 'Nome da região', exact: true }).fill('Floresta')
  await painel.getByRole('button', { name: 'Encaixar na vizinha', exact: true }).click()
  const vizinha = painel.getByRole('checkbox', { name: /Vila/ })
  if (!(await vizinha.isChecked())) await vizinha.check()
  await painel.getByRole('button', { name: 'Ver prévia da região', exact: true }).click()
  await painel.getByRole('button', { name: 'Guardar região', exact: true }).click()
  const duas = await regioes(2)
  const floresta = duas.find((r) => r.nome === 'Floresta')
  assert.ok(floresta, 'a Floresta não foi guardada')
  assert.deepEqual(floresta.vizinhas, [vila.id])
  assert.deepEqual(duas.find((r) => r.id === vila.id).vizinhas, [floresta.id])
  // O "Encaixar na vizinha" encostou as bordas de verdade (revisão do lote 7): sem folga entre as
  // duas e sem área em comum.
  const cv = duas.find((r) => r.id === vila.id).caixa,
    cf = floresta.caixa,
    folga = Math.hypot(
      Math.max(0, cf.x0 - cv.x1, cv.x0 - cf.x1),
      Math.max(0, cf.z0 - cv.z1, cv.z0 - cf.z1),
    )
  assert.ok(folga < 1e-6, `a Floresta ficou a ${folga} m da Vila depois do Encaixar`)
  await p.screenshot({ path: resolve(saida, '02-vila-e-floresta.png') })

  // 3. A lista mostra as duas; editar e apagar a Floresta tira a vizinhança da Vila.
  await painel.getByRole('button', { name: 'Floresta', exact: true }).click()
  await painel.getByRole('heading', { name: 'Editar região', exact: true }).waitFor()
  await p.screenshot({ path: resolve(saida, '03-editar-floresta.png') })
  await painel.getByRole('button', { name: 'Apagar região', exact: true }).click()
  const uma = await regioes(1)
  assert.deepEqual(uma[0].vizinhas, [])

  // 4. Revisão do lote 7: o rascunho de Regiões vale como os do Jogo.
  const contar = () =>
    p.evaluate(
      async (id) =>
        ((await window.__cenarios.host.abrirCenario(id)).documento.regioes ?? []).length,
      id,
    )
  // 4a. Marcando os cantos: os ladrilhos do jogo ficam desligados, o Ctrl+Z não mexe no cenário (a
  // Floresta apagada não volta) e o Escape fecha a ferramenta.
  await painel.getByRole('button', { name: 'Nova região', exact: true }).click()
  await painel.getByText('Toque em dois cantos opostos').waitFor()
  assert.ok(
    await rail.getByRole('button', { name: 'Início', exact: true }).isDisabled(),
    'o ladrilho Início ficou ligado com a ferramenta Regiões aberta',
  )
  await p.keyboard.press('Control+z')
  await p.keyboard.press('Escape')
  await painel.getByText('Toque em dois cantos opostos').waitFor({ state: 'detached' })
  await p.waitForTimeout(1500)
  assert.equal(await contar(), 1, 'o Ctrl+Z com a ferramenta Regiões aberta desfez o cenário')
  assert.equal(await painel.getByRole('button', { name: 'Floresta', exact: true }).count(), 0)
  // 4b. Começar uma região e trocar de aba não trava a oficina.
  await painel.getByRole('button', { name: 'Nova região', exact: true }).click()
  await painel.getByText('Toque em dois cantos opostos').waitFor()
  await aba('Objetos').click()
  assert.ok(
    await p.getByRole('button', { name: 'Desfazer', exact: true }).isEnabled(),
    'a oficina ficou travada depois de trocar de aba no meio de uma região',
  )
  await aba('Jogo').click()
  assert.equal(await painel.getByText('Toque em dois cantos opostos').count(), 0)
  assert.deepEqual(erros, [])
  console.log(
    'Regiões: criar com dois toques, vizinha em par, encaixe, editar, apagar e as guardas da oficina.',
  )
} finally {
  await browser.close()
}
