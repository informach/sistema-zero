import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const saida = resolve(process.argv[2] ?? 'output/cenarios-reforma/lote3-arvore-camadas')
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const resultados = []
let paginaAtual
try {
  for (const [tema, largura] of [
    ['light', 1440],
    ['dark', 1440],
    ['light', 1024],
    ['dark', 390],
  ]) {
    const contexto = await browser.newContext({
      viewport: { width: largura, height: 900 },
      hasTouch: largura === 390,
    })
    const p = await contexto.newPage()
    paginaAtual = p
    const erros = []
    p.on('pageerror', (e) => erros.push(e.message))
    p.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text())
    })
    await p.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await p.waitForFunction(() => window.__cenarios)
    const id = await p.evaluate(async () => {
      const host = window.__cenarios.host
      const mundo = await host.criarMundo('conta', 'Árvore e camadas')
      const criar = async (nome, grande) => {
        const c = await host.criarCenario(mundo.id, nome)
        const instancia = (id, nome, grupo, i) => ({
          id,
          nome,
          grupo,
          modelo: 'forma',
          bloqueado: false,
          oculto: false,
          colisao: 'caixa',
          apoio: { tipo: 'absoluto' },
          transformacao: {
            posicao: { x: (i % 20) * 3, y: 0, z: Math.floor(i / 20) * 3 },
            rotacao: { x: 0, y: 0, z: 0 },
            escala: { x: 1, y: 1, z: 1 },
          },
        })
        const documento = (await host.abrirCenario(c.id)).documento
        documento.formas = [
          {
            id: 'forma',
            nome: 'Caixa',
            tipo: 'caixa',
            largura: 1.2,
            altura: 1.2,
            comprimento: 1.2,
          },
        ]
        documento.instancias = grande
          ? Array.from({ length: 1000 }, (_, i) =>
              instancia(`o-${i}`, `Objeto ${String(i).padStart(4, '0')}`, null, i),
            )
          : [
              instancia('ada', 'Ada', 'flores', 0),
              instancia('bia', 'Bia', 'vila', 1),
              instancia('coral', 'Coral', null, 2),
            ]
        documento.grupos = grande
          ? []
          : [
              { id: 'vila', nome: 'Vila', grupo: null, bloqueado: false, oculto: false },
              { id: 'flores', nome: 'Flores', grupo: 'vila', bloqueado: false, oculto: false },
            ]
        await host.editarCenario(
          c.id,
          0,
          [{ tipo: 'cenario.restaurar', documento }],
          crypto.randomUUID(),
        )
        return c.id
      }
      const id = await criar('Organização', false)
      await criar('Mil objetos', true)
      return id
    })
    const espaco = p.getByRole('combobox', { name: 'De quem são', exact: true })
    await espaco.selectOption('equipe')
    await espaco.selectOption('conta')
    await p.getByRole('button', { name: 'Abrir Árvore e camadas', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Organização', exact: true }).click()
    const ler = () =>
      p.evaluate(async (id) => (await window.__cenarios.host.abrirCenario(id)).documento, id)
    const salvo = () => p.getByText('Guardado', { exact: true }).waitFor()
    const nome = async (titulo, valor, acao) => {
      const dialogo = p.getByRole('dialog', { name: titulo, exact: true })
      await dialogo.getByRole('textbox').fill(valor)
      await dialogo.getByRole('button', { name: acao, exact: true }).click()
      await dialogo.waitFor({ state: 'hidden' })
      await salvo()
    }
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    const arvore = p.getByRole('tree', { name: 'Árvore de objetos', exact: true })
    const abas = p.getByRole('group', { name: 'Organização do cenário', exact: true })
    await arvore.waitFor()
    await p.getByRole('button', { name: 'Escolher objeto Coral', exact: true }).click()
    const antes = await ler()
    await p.getByLabel('Mover escolhidos para pasta', { exact: true }).selectOption('grupo:flores')
    await salvo()
    assert.equal((await ler()).instancias[2].grupo, 'flores')
    assert.deepEqual(
      (await ler()).instancias.map((o) => o.transformacao),
      antes.instancias.map((o) => o.transformacao),
    )
    await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await salvo()
    assert.deepEqual(await ler(), antes)
    await p.getByRole('button', { name: 'Refazer', exact: true }).click()
    await salvo()
    const reorganizado = await ler()
    await p.getByRole('button', { name: 'Escolher pasta Vila', exact: true }).click()
    await p.getByLabel('Mover escolhidos para pasta', { exact: true }).selectOption('grupo:flores')
    await p.getByRole('alert').filter({ hasText: 'Ciclo' }).waitFor()
    assert.deepEqual(await ler(), reorganizado)
    await p.getByRole('button', { name: 'OK', exact: true }).click()
    await arvore.focus()
    await arvore.press('ArrowLeft')
    assert.equal(await arvore.getByRole('treeitem').count(), 1)
    await arvore.press('ArrowRight')
    assert.equal(await arvore.getByRole('treeitem').count(), 5)
    await p.getByLabel('Buscar objetos e pastas', { exact: true }).fill('não existe aqui')
    await p.getByText('Nenhum objeto ou pasta encontrado.', { exact: true }).waitFor()
    await p.getByLabel('Buscar objetos e pastas', { exact: true }).fill('Coral')
    assert.equal(await arvore.getByRole('treeitem').count(), 3)
    await p.getByRole('button', { name: 'Escolher objeto Coral', exact: true }).click()
    await p.getByRole('button', { name: 'Renomear escolhido', exact: true }).click()
    await nome('Renomear escolhido', 'Coralzinho', 'Guardar nome')
    assert.equal((await ler()).instancias[2].nome, 'Coralzinho')
    await p.getByLabel('Buscar objetos e pastas', { exact: true }).fill('')
    await p.getByRole('button', { name: 'Escolher pasta Vila', exact: true }).click()
    await p.getByRole('button', { name: 'Camadas', exact: true }).click()
    await p.getByRole('button', { name: 'Criar camada', exact: true }).click()
    await nome('Criar camada', 'Vegetação', 'Criar camada')
    await p.getByRole('button', { name: 'Renomear camada Vegetação', exact: true }).click()
    await nome('Renomear camada', 'Jardins', 'Guardar nome')
    assert.equal((await ler()).camadas[0].nome, 'Jardins')
    await p.getByRole('button', { name: 'Renomear camada Jardins', exact: true }).click()
    await nome('Renomear camada', 'Vegetação', 'Guardar nome')
    const camada = (await ler()).camadas[0]
    await p.getByLabel('Camada dos escolhidos', { exact: true }).selectOption(camada.id)
    await salvo()
    assert.equal((await ler()).grupos[0].camada, camada.id)
    assert.ok((await ler()).instancias.every((o) => !o.camada))
    await p.getByRole('button', { name: 'Ocultar camada Vegetação', exact: true }).click()
    await salvo()
    await p.waitForFunction(() =>
      document.querySelector('.mcn-orcamento')?.textContent?.startsWith('0 objetos'),
    )
    await p.getByRole('button', { name: 'Ocultar camada Vegetação', exact: true }).click()
    await salvo()
    await p.waitForFunction(() =>
      document.querySelector('.mcn-orcamento')?.textContent?.startsWith('3 objetos'),
    )
    await p.getByRole('button', { name: 'Trancar camada Vegetação', exact: true }).click()
    await salvo()
    assert.equal(await p.getByLabel('Camada dos escolhidos', { exact: true }).isDisabled(), true)
    await p.screenshot({ path: resolve(saida, `camadas-${tema}-${largura}.png`) })
    await abas.getByRole('button', { name: 'Objetos', exact: true }).click()
    assert.equal(
      await p.getByRole('button', { name: 'Trancar Ada', exact: true }).isDisabled(),
      true,
    )
    await p.getByRole('button', { name: 'Escolher objeto Ada', exact: true }).click()
    await p.getByText('Trancado pela pasta ou camada.', { exact: true }).waitFor()
    await p.screenshot({ path: resolve(saida, `arvore-${tema}-${largura}.png`) })
    await p.getByRole('button', { name: 'Voltar aos detalhes', exact: true }).click()
    assert.equal(await p.getByRole('textbox', { name: 'Nome', exact: true }).isDisabled(), true)
    assert.equal(
      await p
        .locator('aside.mcn-painel')
        .getByRole('spinbutton', { name: 'X', exact: true })
        .first()
        .isDisabled(),
      true,
    )
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    await p.getByRole('button', { name: 'Camadas', exact: true }).click()
    await p.getByRole('button', { name: 'Trancar camada Vegetação', exact: true }).click()
    await salvo()
    const comCamada = await ler()
    await p.getByRole('button', { name: 'Apagar camada Vegetação', exact: true }).click()
    await p.getByRole('dialog').getByRole('button', { name: 'Apagar', exact: true }).click()
    await salvo()
    assert.equal((await ler()).camadas, undefined)
    await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await salvo()
    assert.deepEqual(await ler(), comCamada)
    await abas.getByRole('button', { name: 'Objetos', exact: true }).click()
    await p.getByRole('button', { name: 'Escolher objeto Ada', exact: true }).click()
    await p.getByRole('button', { name: 'Criar pasta', exact: true }).click()
    await nome('Criar pasta', 'Abrigo', 'Criar pasta')
    const comPasta = await ler(),
      pasta = comPasta.grupos.find((g) => g.nome === 'Abrigo')
    assert.equal(pasta.grupo, 'flores')
    assert.equal(comPasta.instancias[0].grupo, pasta.id)
    await p.getByRole('button', { name: 'Escolher pasta Abrigo', exact: true }).click()
    await p.getByRole('button', { name: 'Desagrupar pasta', exact: true }).click()
    await salvo()
    assert.equal((await ler()).instancias[0].grupo, 'flores')
    if (largura !== 390) {
      await p
        .getByRole('button', { name: 'Escolher objeto Coralzinho', exact: true })
        .dragTo(
          p
            .getByRole('treeitem')
            .filter({ has: p.getByRole('button', { name: 'Escolher pasta Vila', exact: true }) }),
        )
      await salvo()
      assert.equal((await ler()).instancias[2].grupo, 'vila')
    }
    await p.getByRole('button', { name: 'Escolher pasta Vila', exact: true }).click()
    const antesApagarPasta = await ler()
    if (largura === 390)
      await p.getByRole('button', { name: 'Recolher o painel', exact: true }).click()
    await p.getByRole('button', { name: 'Apagar', exact: true }).click()
    await salvo()
    assert.equal((await ler()).instancias.length, 0)
    assert.equal((await ler()).grupos.length, 0)
    await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await salvo()
    assert.deepEqual(await ler(), antesApagarPasta)
    if (largura === 390)
      await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    await p.getByRole('button', { name: 'Criar pasta', exact: true }).click()
    await nome('Criar pasta', 'Vazio', 'Criar pasta')
    if (largura === 390)
      await p.getByRole('button', { name: 'Recolher o painel', exact: true }).click()
    assert.equal(
      (await ler()).grupos.some((g) => g.nome === 'Vazio'),
      true,
    )
    await p.getByRole('button', { name: 'Apagar', exact: true }).click()
    await salvo()
    assert.equal(
      (await ler()).grupos.some((g) => g.nome === 'Vazio'),
      false,
    )
    const final = await ler()
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Organização', exact: true }).click()
    assert.deepEqual(await ler(), final)
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Mil objetos', exact: true }).click()
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    await arvore.focus()
    await arvore.press('End')
    await arvore.press('Enter')
    await p.getByRole('button', { name: 'Escolher objeto Objeto 0999', exact: true }).waitFor()
    assert.ok((await arvore.getByRole('treeitem').count()) <= 14)
    await p.getByLabel('Buscar objetos e pastas', { exact: true }).fill('Objeto 0500')
    await p.getByRole('button', { name: 'Escolher objeto Objeto 0500', exact: true }).waitFor()
    assert.equal(await arvore.getByRole('treeitem').count(), 1)
    await p.screenshot({ path: resolve(saida, `busca-${tema}-${largura}.png`) })
    assert.deepEqual(erros, [])
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    resultados.push({
      tema,
      largura,
      mover: true,
      cicloRecusado: true,
      nomes: true,
      camadaHerdada: true,
      ocultar: true,
      trancar: true,
      remover: true,
      agrupar: true,
      desagrupar: true,
      arrasto: largura !== 390,
      desfazer: true,
      refazer: true,
      reentrada: true,
      virtualizacao: 1000,
      erros,
    })
    await contexto.close()
  }
  writeFileSync(resolve(saida, 'resultado.json'), `${JSON.stringify(resultados, null, 2)}\n`)
  console.log(JSON.stringify(resultados))
} catch (e) {
  if (paginaAtual && !paginaAtual.isClosed()) {
    await paginaAtual.screenshot({ path: resolve(saida, 'falha.png') })
    writeFileSync(
      resolve(saida, 'falha.json'),
      JSON.stringify(
        { erro: String(e), texto: await paginaAtual.locator('body').innerText() },
        null,
        2,
      ),
    )
  }
  throw e
} finally {
  await browser.close()
}
