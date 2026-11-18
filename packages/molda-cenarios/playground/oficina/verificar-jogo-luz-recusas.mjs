import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { esperarConsulta } from './esperar-consulta.mjs'

const saida = resolve(import.meta.dirname, '../../../../output/cenarios-reforma/lote7-recusas')
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
        m = await h.criarMundo('conta', 'Recusas de jogo e luz'),
        c = await h.criarCenario(m.id, 'Autoria protegida'),
        b = await h.criarBiblioteca('conta', { nome: 'Céus QA', licenca: 'restrita' })
      await h.editarMundo(m.id, { bibliotecas: [b.id] })
      return c.id
    }),
    ler = () => p.evaluate(async (id) => await window.__cenarios.host.abrirCenario(id), id),
    aba = (nome) =>
      p.locator('.mld-workshop-tabs').getByRole('button', { name: nome, exact: true }),
    rail = p.locator('nav.mld-workshop-rail'),
    painel = p.locator('aside.mcn-painel'),
    numero = async (nome, n) => {
      const f = painel.getByRole('spinbutton', { name: nome, exact: true })
      await f.fill(String(n))
      await f.press('Tab')
    }
  const espaco = p.getByRole('combobox', { name: 'De quem são', exact: true })
  await espaco.selectOption('equipe')
  await espaco.selectOption('conta')
  await p.getByRole('button', { name: 'Abrir Recusas de jogo e luz', exact: true }).click()
  await p.getByRole('button', { name: 'Abrir Autoria protegida', exact: true }).click()
  await aba('Jogo').click()
  const antes = await ler()
  await rail.getByRole('button', { name: 'Marcador', exact: true }).click()
  await painel.getByRole('textbox', { name: 'Nome do marcador', exact: true }).fill('')
  await painel.getByRole('button', { name: 'Ver prévia do marcador', exact: true }).click()
  await painel.getByRole('alert').filter({ hasText: 'Dê um nome ao marcador' }).waitFor()
  assert.equal((await ler()).revisao, antes.revisao)
  await painel.getByRole('button', { name: 'Cancelar edição do marcador', exact: true }).click()
  await rail.getByRole('button', { name: 'Rota', exact: true }).click()
  await numero('Ponto 2 X', 0)
  await painel.getByRole('button', { name: 'Ver prévia do marcador', exact: true }).click()
  await painel.getByRole('alert').filter({ hasText: 'controles consecutivos iguais' }).waitFor()
  assert.equal((await ler()).revisao, antes.revisao)
  await painel.getByRole('button', { name: 'Cancelar edição do marcador', exact: true }).click()
  // Falha de transporte após enfileirar mantém a autoria local para Tentar novamente.
  await rail.getByRole('button', { name: 'Marcador', exact: true }).click()
  await painel
    .getByRole('textbox', { name: 'Nome do marcador', exact: true })
    .fill('Ponto recuperado')
  await painel.getByRole('button', { name: 'Ver prévia do marcador', exact: true }).click()
  await painel.getByRole('button', { name: 'Guardar marcador', exact: true }).waitFor()
  await p.evaluate(() => {
    const h = window.__cenarios.host,
      original = h.editarCenario.bind(h)
    let falhar = true
    h.editarCenario = (...args) => {
      if (falhar) {
        falhar = false
        return Promise.reject(Error('Falha de transporte do ensaio'))
      }
      return original(...args)
    }
  })
  await painel.getByRole('button', { name: 'Guardar marcador', exact: true }).click()
  const tentar = p.getByRole('button', { name: 'Tentar de novo', exact: true })
  await tentar.waitFor()
  assert.equal((await ler()).revisao, antes.revisao)
  await tentar.click()
  await esperarConsulta(
    p,
    async (id) => (await window.__cenarios.host.abrirCenario(id)).documento.marcadores.length === 1,
    id,
  )
  await p.getByText('Guardado', { exact: true }).waitFor()
  assert.equal((await ler()).revisao, antes.revisao + 1)
  // O rascunho de propriedades não é sobrescrito quando desfazer atualiza a entidade.
  const props = painel
    .locator('details')
    .filter({ has: p.locator('summary').filter({ hasText: /^Propriedades ·/ }) })
  await props.locator('summary').click()
  await props.getByRole('button', { name: 'Adicionar propriedade', exact: true }).click()
  await props.getByRole('textbox', { name: 'Nome da propriedade', exact: true }).fill('destino')
  await props.getByRole('textbox', { name: 'Valor', exact: true }).fill('Praça')
  await props.getByRole('button', { name: 'Guardar propriedades', exact: true }).click()
  await p.getByText('Guardado', { exact: true }).waitFor()
  await props.getByRole('textbox', { name: 'Valor', exact: true }).fill('Horta')
  await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await props.getByRole('button', { name: 'Recarregar propriedades', exact: true }).waitFor()
  assert.equal(
    await props.getByRole('textbox', { name: 'Valor', exact: true }).inputValue(),
    'Horta',
  )
  assert.equal(
    await props.getByRole('button', { name: 'Guardar propriedades', exact: true }).isDisabled(),
    true,
  )
  await props.getByRole('button', { name: 'Recarregar propriedades', exact: true }).click()
  assert.equal(await props.getByRole('textbox', { name: 'Valor', exact: true }).count(), 0)
  await aba('Luz e céu').click()
  await rail.getByRole('button', { name: 'Sol', exact: true }).click()
  await painel.getByRole('button', { name: 'Personalizar o sol', exact: true }).click()
  const antesDoSol = await ler()
  await numero('Direção para o sol X', 0)
  await numero('Direção para o sol Y', 0)
  await numero('Direção para o sol Z', 0)
  await painel.getByRole('alert').filter({ hasText: 'direção diferente de zero' }).waitFor()
  assert.equal(
    await painel.getByRole('button', { name: 'Guardar iluminação', exact: true }).isDisabled(),
    true,
  )
  assert.equal((await ler()).revisao, antesDoSol.revisao)
  await numero('Direção para o sol Y', 1)
  await p.waitForFunction(() =>
    [...document.querySelectorAll('button')].some(
      (b) => b.textContent === 'Guardar iluminação' && !b.disabled,
    ),
  )
  await painel.getByRole('button', { name: 'Cancelar iluminação', exact: true }).click()
  assert.deepEqual((await ler()).documento.iluminacao, antesDoSol.documento.iluminacao)
  await rail.getByRole('button', { name: 'Céu', exact: true }).click()
  await painel.getByRole('button', { name: 'Escolher panorama', exact: true }).click()
  const quadrado = await p.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 16
    c.getContext('2d').fillRect(0, 0, 16, 16)
    return c.toDataURL('image/png').split(',')[1]
  })
  await p.getByLabel('Arquivo de panorama', { exact: true }).setInputFiles({
    name: 'Quadrado.png',
    mimeType: 'image/png',
    buffer: Buffer.from(quadrado, 'base64'),
  })
  await p
    .getByRole('dialog', { name: 'Escolher panorama do céu', exact: true })
    .getByRole('alert')
    .filter({ hasText: 'proporção 2:1' })
    .waitFor()
  const texturas = await p.evaluate(async (id) => {
    const h = window.__cenarios.host,
      d = await h.abrirCenario(id),
      m = await h.obterMundo(d.resumo.mundoId)
    return (await h.listarTexturas(m.bibliotecas[0], { limite: 24 })).itens.length
  }, id)
  assert.equal(texturas, 0)
  await p.getByRole('button', { name: 'Cancelar escolha de textura', exact: true }).click()
  await painel.getByRole('button', { name: 'Cancelar iluminação', exact: true }).click()
  assert.deepEqual(erros, [])
  await p.screenshot({ path: resolve(saida, 'retomada.png') })
  const resultado = {
    nomeInvalido: true,
    rotaInvalida: true,
    falhaDeTransporteSemPerda: true,
    semRevisaoDuplicada: true,
    conflitoDePropriedadesSemSobrescrita: true,
    solSemDirecaoRecusado: true,
    panoramaQuadradoRecusadoAntesDoUpload: true,
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
