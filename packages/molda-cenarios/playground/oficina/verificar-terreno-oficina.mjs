import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const saida = resolve('output/cenarios-reforma/lote4-oficina')
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const resultados = []
let pagina
try {
  for (const [tema, largura] of [
    ['light', 1440],
    ['dark', 1366],
    ['light', 1024],
    ['dark', 390],
  ]) {
    const contexto = await browser.newContext({
      viewport: { width: largura, height: 900 },
      hasTouch: largura === 390,
      recordVideo: largura === 1440 ? { dir: resolve(saida, 'movimento') } : undefined,
    })
    const p = await contexto.newPage(),
      erros = []
    pagina = p
    p.on('pageerror', (e) => {
      erros.push(e.message)
      console.error(e.message)
    })
    await p.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await p.waitForFunction(() => window.__cenarios)
    const id = await p.evaluate(async () => {
      const h = window.__cenarios.host,
        m = await h.criarMundo('conta', 'Mundo do terreno')
      const biblioteca = await h.criarBiblioteca('conta', {
        nome: 'Chãos do ensaio',
        licenca: 'propria',
      })
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 32
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#8da567'
      ctx.fillRect(0, 0, 32, 32)
      ctx.fillStyle = '#799452'
      ctx.fillRect(0, 0, 16, 16)
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png')),
        digest = [
          ...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())),
        ]
          .map((v) => v.toString(16).padStart(2, '0'))
          .join('')
      await h.importarTexturas(biblioteca.id, [
        {
          nome: 'Solo de ensaio',
          pasta: '',
          etiquetas: [],
          digest,
          largura: 32,
          altura: 32,
          repeticaoMetros: 2,
          conteudo: blob,
        },
      ])
      await h.editarMundo(m.id, { bibliotecas: [biblioteca.id] })
      return (await h.criarCenario(m.id, 'Relevo')).id
    })
    const espaco = p.getByRole('combobox', { name: 'De quem são', exact: true })
    await espaco.selectOption('equipe')
    await espaco.selectOption('conta')
    await p.getByRole('button', { name: 'Abrir Mundo do terreno', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Relevo', exact: true }).click()
    const ler = () =>
      p.evaluate(async (id) => (await window.__cenarios.host.abrirCenario(id)).documento, id)
    const painel = p.locator('aside.mcn-painel')
    const abrir = async () => {
      const botao = p.getByRole('button', { name: 'Abrir o painel', exact: true })
      if (await botao.count()) await botao.click()
    }
    const numero = async (nome, valor) => {
      const c = painel.getByRole('spinbutton', { name: nome, exact: true })
      await c.fill(String(valor))
      await c.press('Tab')
    }
    const salvo = async () => {
      await p.getByText('Guardado', { exact: true }).waitFor()
      await p.waitForFunction(
        () =>
          ![...document.querySelectorAll('[role="status"]')].some((e) =>
            e.textContent?.includes('Preparando e guardando'),
          ),
      )
    }
    await p.getByRole('button', { name: 'Terreno', exact: true }).click()
    await abrir()
    await painel.getByLabel('Modelo de terreno', { exact: true }).selectOption('colinas')
    await numero('Altura do modelo', 8)
    await painel.getByRole('button', { name: 'Aplicar modelo de terreno', exact: true }).click()
    await p
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar modelo', exact: true })
      .click()
    await p.waitForFunction(
      () =>
        document.querySelector('select') &&
        [...document.querySelectorAll('legend')].some((e) => e.textContent === 'Camadas de chão'),
    )
    await salvo()
    const inicial = await ler()
    assert.equal(inicial.base.tipo, 'terreno')
    assert.ok(inicial.base.pecas.length)
    await painel.getByRole('button', { name: 'Adicionar camada de chão', exact: true }).click()
    await painel.getByLabel('Nome da camada 2', { exact: true }).fill('Terra')
    await painel.getByRole('button', { name: 'Guardar camadas de chão', exact: true }).click()
    await salvo()
    assert.equal((await ler()).base.solo.camadas.length, 2)
    await painel
      .getByRole('button', { name: 'Escolher textura do chão', exact: true })
      .first()
      .click()
    await p
      .getByRole('dialog')
      .getByRole('button', { name: 'Escolher textura Solo de ensaio', exact: true })
      .click()
    await painel.getByRole('button', { name: 'Guardar camadas de chão', exact: true }).click()
    await salvo()
    const texturizado = await ler()
    assert.equal(texturizado.base.solo.camadas[0].textura.id, texturizado.texturas[0].id)
    await painel.getByLabel('Ferramenta', { exact: true }).selectOption('pintar')
    await painel.getByLabel('Camada para pintar', { exact: true }).selectOption('1')
    await painel.getByRole('button', { name: 'Esculpir no cenário', exact: true }).click()
    const c = await p.locator('canvas.mcn-palco-tela').boundingBox()
    assert.ok(c)
    const x = c.x + c.width * 0.52,
      y = c.y + c.height * 0.53
    if (largura === 390) await p.touchscreen.tap(x, y)
    else {
      await p.mouse.move(x, y)
      await p.mouse.down()
      await p.mouse.move(x + 12, y + 5, { steps: 4 })
      await p.mouse.up()
    }
    await salvo()
    const pintado = await ler()
    assert.ok(pintado.base.solo.pecas.length, 'Pintura deve guardar pesos reais')
    await abrir()
    await painel.getByLabel('Ferramenta', { exact: true }).selectOption('furar')
    await painel.getByRole('button', { name: 'Esculpir no cenário', exact: true }).click()
    await p.mouse.click(x, y)
    await salvo()
    assert.ok((await ler()).base.buracos.length)
    await abrir()
    await painel.getByLabel('Ferramenta', { exact: true }).selectOption('fechar')
    await painel.getByRole('button', { name: 'Esculpir no cenário', exact: true }).click()
    await p.mouse.click(x, y)
    await salvo()
    assert.equal((await ler()).base.buracos?.length ?? 0, 0)
    await abrir()
    await painel.getByText('Pintura automática por altura e inclinação', { exact: true }).click()
    await painel.getByRole('button', { name: 'Adicionar regra', exact: true }).click()
    await painel.getByLabel('Camada da regra 1', { exact: true }).selectOption('1')
    await painel.getByRole('button', { name: 'Pintar terreno pelas regras', exact: true }).click()
    await salvo()
    const antesPNG = await ler()
    const downloadPromise = p.waitForEvent('download')
    await painel
      .getByRole('button', { name: 'Exportar alturas em PNG 16 bits', exact: true })
      .click()
    const download = await downloadPromise
    const arquivo = resolve(saida, `alturas-${largura}.png`)
    await download.saveAs(arquivo)
    assert.deepEqual(await ler(), antesPNG)
    await numero('Preto corresponde a', -40)
    await numero('Branco corresponde a', 140)
    await painel.getByLabel('Importar PNG de alturas', { exact: true }).setInputFiles(arquivo)
    await salvo()
    const importado = await ler()
    assert.notDeepEqual(importado.base.pecas, antesPNG.base.pecas)
    await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await salvo()
    assert.deepEqual((await ler()).base, antesPNG.base)
    await p.getByRole('button', { name: 'Refazer', exact: true }).click()
    await salvo()
    assert.deepEqual((await ler()).base, importado.base)
    await painel.getByText('Avançado: tamanho e resolução', { exact: true }).click()
    await numero('Células em X', 128)
    await painel.getByRole('button', { name: 'Aplicar medidas do terreno', exact: true }).click()
    await p
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar medidas', exact: true })
      .click()
    await salvo()
    assert.equal((await ler()).base.colunas, 128)
    if (largura === 1440) {
      const antesInvalido = await ler()
      await painel.getByLabel('Importar PNG de alturas', { exact: true }).setInputFiles({
        name: 'corrompido.png',
        mimeType: 'image/png',
        buffer: Buffer.from('conteudo-invalido'),
      })
      await p.getByRole('alert').filter({ hasText: /PNG/ }).waitFor()
      assert.deepEqual(await ler(), antesInvalido)
      await p.evaluate(() => {
        const h = window.__cenarios.host,
          guardar = h.guardarRecursos
        let falhar = true
        h.guardarRecursos = (...args) => {
          if (falhar) {
            falhar = false
            throw Error('Falha de envio simulada')
          }
          return guardar(...args)
        }
      })
      await painel.getByLabel('Modelo de terreno', { exact: true }).selectOption('ilha')
      await painel.getByRole('button', { name: 'Aplicar modelo de terreno', exact: true }).click()
      await p
        .getByRole('dialog')
        .getByRole('button', { name: 'Confirmar modelo', exact: true })
        .click()
      await p.getByRole('button', { name: 'Tentar de novo', exact: true }).click()
      await salvo()
      assert.notDeepEqual((await ler()).base.pecas, antesInvalido.base.pecas)
      await p.getByRole('button', { name: 'Ver tudo', exact: true }).click()
      let ferramentasComMudanca = 0
      for (const ferramenta of [
        'elevar',
        'abaixar',
        'aplainar',
        'suavizar',
        'nivelar',
        'plato',
        'rampa',
        'ruido',
        'erosao',
        'morro',
        'cratera',
      ]) {
        await painel.getByLabel('Ferramenta', { exact: true }).selectOption(ferramenta)
        if (ferramenta !== 'rampa') await numero('Força', 1)
        if (['nivelar', 'plato'].includes(ferramenta)) await numero('Altura de destino', 3)
        await painel.getByRole('button', { name: 'Esculpir no cenário', exact: true }).click()
        const canvas = await p.locator('canvas.mcn-palco-tela').boundingBox()
        const antes = JSON.stringify((await ler()).base)
        await p.mouse.move(canvas.x + canvas.width * 0.5, canvas.y + canvas.height * 0.53)
        await p.mouse.down()
        if (ferramenta === 'rampa')
          await p.mouse.move(canvas.x + canvas.width * 0.53, canvas.y + canvas.height * 0.55, {
            steps: 6,
          })
        await p.mouse.up()
        await salvo()
        if (JSON.stringify((await ler()).base) !== antes) ferramentasComMudanca++
        assert.equal(await p.getByRole('alert').count(), 0, ferramenta)
      }
      assert.ok(
        ferramentasComMudanca >= 6,
        `Poucas ferramentas atingiram o chão: ${ferramentasComMudanca}`,
      )
      const cancelamento = await p.evaluate(
        async (raiz) => {
          const { processarTerrenoNoWorker } = await import(
            `/@fs/${raiz.replaceAll('\\', '/')}/packages/molda-cenarios/src/oficina/processar-terreno-no-worker.ts`
          )
          const abortador = new AbortController()
          const promessa = processarTerrenoNoWorker(
            {
              base: {
                tipo: 'terreno',
                origem: { x: 0, z: 0 },
                colunas: 2048,
                linhas: 2048,
                passo: 1,
                min: -20,
                max: 100,
                fundo: 0,
                pecas: [],
              },
              estado: null,
              operacao: { tipo: 'receita', receita: { tipo: 'colinas', altura: 12, semente: 77 } },
            },
            abortador.signal,
          ).catch((e) => e.name)
          await new Promise(requestAnimationFrame)
          abortador.abort()
          return await promessa
        },
        resolve(import.meta.dirname, '../../../..'),
      )
      assert.equal(cancelamento, 'AbortError')
    }
    assert.deepEqual(erros, [])
    await p.screenshot({ path: resolve(saida, `terreno-${tema}-${largura}.png`) })
    await painel.evaluate((e) => {
      e.scrollTop = 0
    })
    await p.screenshot({ path: resolve(saida, `ferramentas-${tema}-${largura}.png`) })
    if (largura < 900) {
      await p.getByRole('button', { name: 'Recolher o painel', exact: true }).click()
      await p.screenshot({ path: resolve(saida, `palco-${tema}-${largura}.png`) })
    }
    resultados.push({
      tema,
      largura,
      camadas: 2,
      pintou: true,
      abriuFechouBuraco: true,
      png16: true,
      historico: true,
      reamostrou: true,
      erros,
    })
    await contexto.close()
  }
  writeFileSync(resolve(saida, 'resultados.json'), JSON.stringify(resultados, null, 2))
} catch (e) {
  if (pagina) await pagina.screenshot({ path: resolve(saida, 'falha.png') }).catch(() => {})
  throw e
} finally {
  await browser.close()
}
