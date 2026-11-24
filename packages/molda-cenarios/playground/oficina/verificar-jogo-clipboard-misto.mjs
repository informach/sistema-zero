import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { esperarConsulta } from './esperar-consulta.mjs'

const saida = resolve(import.meta.dirname, '../../../../output/cenarios-reforma/lote7-misto')
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  p = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
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
        m = await h.criarMundo('conta', 'Clipboard de objetos e jogo')
      return (await h.criarCenario(m.id, 'Referências internas')).id
    }),
    ler = () => p.evaluate(async (id) => await window.__cenarios.host.abrirCenario(id), id),
    esperar = (objetos, marcadores) =>
      esperarConsulta(
        p,
        async ({ id, objetos, marcadores }) => {
          const d = (await window.__cenarios.host.abrirCenario(id)).documento
          return d.instancias.length === objetos && d.marcadores.length === marcadores
        },
        { id, objetos, marcadores },
      ),
    aba = (nome) =>
      p.locator('.mld-workshop-tabs').getByRole('button', { name: nome, exact: true }),
    rail = p.locator('nav.mld-workshop-rail'),
    painel = p.locator('aside.mcn-painel')
  const espaco = p.getByRole('combobox', { name: 'De quem são', exact: true })
  await espaco.selectOption('equipe')
  await espaco.selectOption('conta')
  await p.getByRole('button', { name: 'Abrir Clipboard de objetos e jogo', exact: true }).click()
  await p.getByRole('button', { name: 'Abrir Referências internas', exact: true }).click()
  await rail.getByRole('button', { name: 'Blocos', exact: true }).click()
  await p.getByRole('button', { name: 'Colocar bloco', exact: true }).click()
  await esperar(1, 0)
  await p.getByText('Guardado', { exact: true }).waitFor()
  const objeto = (await ler()).documento.instancias[0]
  await aba('Jogo').click()
  // O inspector do objeto continua disponível na aba Jogo, com colisão e propriedades.
  await painel.getByText('Mais opções', { exact: true }).click()
  await painel
    .getByRole('combobox', { name: 'Quando o personagem encosta', exact: true })
    .selectOption('capsula')
  await p.getByText('Guardado', { exact: true }).waitFor()
  assert.equal((await ler()).documento.instancias[0].colisao, 'capsula')
  await rail.getByRole('button', { name: 'Marcador', exact: true }).click()
  await painel
    .getByRole('textbox', { name: 'Nome do marcador', exact: true })
    .fill('Entrada da oficina')
  await painel.getByText('Associação e organização', { exact: true }).click()
  await painel
    .getByRole('combobox', { name: 'Objeto associado', exact: true })
    .selectOption(objeto.id)
  await painel.getByRole('button', { name: 'Ver prévia do marcador', exact: true }).click()
  await painel.getByRole('button', { name: 'Guardar marcador', exact: true }).click()
  await esperar(1, 1)
  await p.getByText('Guardado', { exact: true }).waitFor()
  const antes = await ler()
  await p.keyboard.press('Control+A')
  const transferir = async (nome) => {
    await p.getByRole('button', { name: 'Copiar e colar', exact: true }).click()
    await p.getByRole('button', { name: nome, exact: true }).click()
  }
  await transferir('Copiar escolha')
  await transferir('Colar escolha')
  await esperar(2, 2)
  await p.getByText('Guardado', { exact: true }).waitFor()
  const depois = await ler(),
    copia = depois.documento.instancias.find((o) => o.id !== objeto.id),
    marcador = depois.documento.marcadores.find((m) => m.id !== antes.documento.marcadores[0].id)
  assert.ok(copia)
  assert.equal(marcador.objeto, copia.id)
  assert.equal(copia.colisao, 'capsula')
  assert.equal(depois.revisao, antes.revisao + 1)
  await rail.getByRole('button', { name: 'Apagar', exact: true }).click()
  await esperar(1, 1)
  await p.getByText('Guardado', { exact: true }).waitFor()
  await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
  await p.getByRole('button', { name: 'Abrir Referências internas', exact: true }).click()
  await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await esperar(2, 2)
  await p.getByText('Guardado', { exact: true }).waitFor()
  const reaberto = (await ler()).documento
  assert.equal(reaberto.marcadores.find((m) => m.id === marcador.id).objeto, copia.id)
  assert.equal(reaberto.instancias.find((o) => o.id === copia.id).colisao, 'capsula')
  assert.deepEqual(erros, [])
  const resultado = {
    selecaoMistaPorTeclado: true,
    colisaoNoInspectorDeJogo: true,
    clipboardMisto: true,
    associacaoInternaRemapeada: true,
    colagemAtomica: true,
    apagarEUndoAposReabrir: true,
    erros,
  }
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(resultado, null, 2))
  console.log(JSON.stringify(resultado))
} catch (e) {
  await p.screenshot({ path: resolve(saida, 'falha.png') })
  writeFileSync(
    resolve(saida, 'falha.txt'),
    `${e.stack}\n${erros.join('\n')}\n${await p.locator('body').innerText()}`,
  )
  throw e
} finally {
  await browser.close()
}
