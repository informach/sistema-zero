import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { esperarConsulta } from './esperar-consulta.mjs'

const raiz = resolve(import.meta.dirname, '../../../..'),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`,
  saida = resolve(raiz, 'output/cenarios-reforma/lote6-interface')
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const contexto = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: resolve(saida, 'movimento') },
    }),
    p = await contexto.newPage(),
    erros = [],
    workers = []
  await contexto.grantPermissions(['clipboard-read', 'clipboard-write'])
  p.on('pageerror', (e) => erros.push(e.message))
  p.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  p.on('worker', (w) => workers.push(w.url()))
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForLoadState('networkidle')
  await p.waitForFunction(() => window.__cenarios)
  const dados = await p.evaluate(
    async ({ coreUrl, importarUrl }) => {
      const core = await import(coreUrl),
        { prepararArquivos } = await import(importarUrl)
      const h = window.__cenarios.host,
        m = await h.criarMundo('conta', 'Oficina de caminhos'),
        c = await h.criarCenario(m.id, 'Seis ferramentas')
      await h.editarCenario(
        c.id,
        0,
        [
          {
            tipo: 'base.definir',
            base: {
              tipo: 'terreno',
              cobertura: 'grade',
              origem: { x: -32, z: -32 },
              colunas: 64,
              linhas: 64,
              passo: 1,
              min: -20,
              max: 40,
              fundo: 0,
              pecas: [],
            },
          },
          {
            tipo: 'camada.definir',
            camada: { id: 'vias', nome: 'Circulação', oculto: false, bloqueado: false },
          },
        ],
        'caminhos-qa-base',
      )
      const b = await h.criarBiblioteca('conta', {
          nome: 'Catálogo Caminhos QA',
          licenca: 'restrita',
        }),
        glb = await (await fetch('/acervo/caminho_terra_reto.804d14830d95.glb')).arrayBuffer(),
        { prontos } = await prepararArquivos([
          { caminho: 'Solo do Reino.glb', arquivo: new File([glb], 'Solo do Reino.glb') },
        ]),
        [modelo] = await h.importarModelos(b.id, prontos)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 32
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#b98750'
      ctx.fillRect(0, 0, 32, 32)
      ctx.fillStyle = '#d1af7a'
      ctx.fillRect(0, 0, 16, 16)
      const png = await new Promise((r) => canvas.toBlob(r, 'image/png'))
      await h.importarTexturas(b.id, [
        {
          nome: 'Terra QA',
          pasta: '',
          etiquetas: [],
          digest: await core.digestDosBytes(new Uint8Array(await png.arrayBuffer())),
          largura: 32,
          altura: 32,
          repeticaoMetros: 2,
          conteudo: png,
        },
      ])
      await h.editarMundo(m.id, { bibliotecas: [b.id] })
      return { id: c.id, modelo: modelo.nome }
    },
    {
      coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      importarUrl: modulo('packages/molda-cenarios/src/oficina/importar.ts'),
    },
  )
  const id = dados.id
  const espaco = p.getByRole('combobox', { name: 'De quem são', exact: true })
  await espaco.selectOption('equipe')
  await espaco.selectOption('conta')
  await p.getByRole('button', { name: 'Abrir Oficina de caminhos', exact: true }).click()
  await p.getByRole('button', { name: 'Abrir Seis ferramentas', exact: true }).click()
  await p.getByRole('button', { name: 'Caminhos', exact: true }).click()
  const abrir = p.getByRole('button', { name: 'Abrir o painel', exact: true })
  if (await abrir.count()) await abrir.click()
  const painel = p.locator('aside.mcn-painel'),
    casos = [
      [
        'Trilha',
        [
          [-20, -15],
          [-10, -15],
        ],
      ],
      [
        'Praça',
        [
          [-5, -15],
          [5, -15],
          [0, -5],
        ],
      ],
      [
        'Estrada',
        [
          [-20, 10],
          [-10, 10],
        ],
      ],
      [
        'Cerca',
        [
          [10, -15],
          [20, -15],
        ],
      ],
      [
        'Muro',
        [
          [10, -5],
          [20, -5],
        ],
      ],
      [
        'Ponte',
        [
          [10, 10],
          [20, 10],
        ],
      ],
    ]
  const preencher = async (rotulo, valor) => {
    const campo = painel.getByRole('spinbutton', {
      name: rotulo,
      exact: typeof rotulo === 'string',
    })
    await campo.fill(String(valor))
    await campo.press('Tab')
  }
  for (const [nome, pontos] of casos) {
    console.log(`Criar ${nome}`)
    await p.getByRole('button', { name: nome, exact: true }).first().click()
    await painel.getByRole('textbox', { name: 'Nome', exact: true }).fill(`QA ${nome}`)
    for (const [x, z] of pontos) {
      await painel.getByRole('button', { name: 'Adicionar por coordenadas', exact: true }).click()
      await preencher(/ X$/, x)
      await preencher(/ Z$/, z)
    }
    if (nome === 'Estrada') await preencher('Deslocamento do leito', -0.2)
    if (nome === 'Ponte') {
      await painel.getByRole('checkbox', { name: 'Cabeceiras no terreno', exact: true }).uncheck()
      await preencher('Altura da cabeceira A', 2)
      await preencher('Altura da cabeceira B', 2)
      await painel.getByRole('checkbox', { name: 'Criar pilares', exact: true }).check()
    }
    await painel.getByRole('button', { name: 'Ver prévia', exact: true }).click()
    await painel
      .getByRole('heading', { name: 'Prévia · ainda não guardada', exact: true })
      .waitFor()
    await painel.getByRole('button', { name: 'Guardar caminho', exact: true }).click()
    await painel.getByRole('heading', { name: /Caminhos do cenário/ }).waitFor()
    await p.getByText('Guardado', { exact: true }).waitFor()
    const d = await p.evaluate(
      async (id) => (await window.__cenarios.host.abrirCenario(id)).documento,
      id,
    )
    assert.ok(d.caminhos.some((c) => c.nome === `QA ${nome}`))
  }
  await p.screenshot({ path: resolve(saida, 'seis-ferramentas.png') })
  // Alça real encontrada na imagem do canvas, sem acessar campos privados do Palco.
  const antesDosPontos = await p.evaluate(
    async (id) => (await window.__cenarios.host.abrirCenario(id)).revisao,
    id,
  )
  await p.getByRole('button', { name: 'Trilha', exact: true }).first().click()
  for (const x of [-10, 10]) {
    await painel.getByRole('button', { name: 'Adicionar por coordenadas', exact: true }).click()
    await preencher(/ X$/, x)
    await preencher(/ Z$/, -24)
  }
  await p.getByRole('button', { name: 'Ver tudo', exact: true }).click()
  await p.getByRole('button', { name: 'De cima', exact: true }).click()
  await painel.getByRole('button', { name: 'Mover', exact: true }).click()
  const canvas = p.locator('canvas'),
    imagem = await canvas.screenshot(),
    caixa = await canvas.boundingBox(),
    alca = await p.evaluate(async (base64) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
        img = await createImageBitmap(new Blob([bytes], { type: 'image/png' })),
        c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      img.close()
      const { data } = ctx.getImageData(0, 0, c.width, c.height)
      let x = 0,
        y = 0,
        n = 0
      for (let i = 0; i < data.length; i += 4)
        if (
          data[i] > 240 &&
          data[i + 1] > 90 &&
          data[i + 1] < 125 &&
          data[i + 2] > 130 &&
          data[i + 2] < 175
        ) {
          x += (i / 4) % c.width
          y += Math.floor(i / 4 / c.width)
          n++
        }
      return { x: x / n, y: y / n, n }
    }, imagem.toString('base64'))
  writeFileSync(resolve(saida, 'alcas-canvas.png'), imagem)
  assert.ok(alca.n >= 50 && alca.n < 200, `Alça rosa: ${JSON.stringify(alca)}`)
  await p.mouse.move(caixa.x + alca.x, caixa.y + alca.y)
  await p.mouse.down()
  await p.mouse.move(caixa.x + alca.x + 45, caixa.y + alca.y, { steps: 8 })
  await p.mouse.up()
  await p.waitForFunction(() => {
    const campo = Array.from(document.querySelectorAll('input[type="number"]')).find((input) =>
      Array.from(input.labels ?? []).some((label) => label.textContent.trim().startsWith('Fim X')),
    )
    return campo && Math.abs(Number(campo.value) - 10) > 0.3
  })
  await p.screenshot({ path: resolve(saida, 'alca-depois.png') })
  assert.ok(
    Math.abs(
      Number(await painel.getByRole('spinbutton', { name: 'Fim X', exact: true }).inputValue()) -
        10,
    ) > 0.3,
  )
  assert.equal(
    await p.evaluate(async (id) => (await window.__cenarios.host.abrirCenario(id)).revisao, id),
    antesDosPontos,
  )
  await painel.getByRole('button', { name: 'Cancelar edição do caminho', exact: true }).click()
  await p.getByRole('button', { name: 'Livre', exact: true }).click()
  await painel.getByRole('button', { name: 'QA Trilha', exact: true }).click()
  await preencher('Largura', 3.2)
  await painel.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  await painel.getByRole('heading', { name: 'Prévia · ainda não guardada', exact: true }).waitFor()
  await painel.getByRole('button', { name: 'Cancelar edição do caminho', exact: true }).click()
  const antes = await p.evaluate(async (id) => await window.__cenarios.host.abrirCenario(id), id)
  assert.equal(antes.documento.caminhos.find((c) => c.nome === 'QA Trilha').largura, 2.6)
  await p
    .getByRole('button', { name: /Desfazer/ })
    .first()
    .click()
  await p.getByText('Guardado', { exact: true }).waitFor()
  await esperarConsulta(
    p,
    async (id) => (await window.__cenarios.host.abrirCenario(id)).documento.caminhos.length === 5,
    id,
  )
  await p
    .getByRole('button', { name: /Refazer/ })
    .first()
    .click()
  await esperarConsulta(
    p,
    async (id) => (await window.__cenarios.host.abrirCenario(id)).documento.caminhos.length === 6,
    id,
  )
  const final = await p.evaluate(async (id) => await window.__cenarios.host.abrirCenario(id), id)
  assert.equal(final.documento.caminhos.length, 6)
  assert.equal(final.documento.base.pecas.length, 1)
  const escolherAcabamento = async () => {
    await painel.getByRole('button', { name: 'QA Trilha', exact: true }).click()
    await painel.getByRole('button', { name: 'Escolher peça na biblioteca', exact: true }).click()
    await p.getByRole('button', { name: `Usar ${dados.modelo} no caminho`, exact: true }).click()
    await painel.getByRole('button', { name: 'Escolher textura', exact: true }).click()
    await p.getByRole('button', { name: 'Escolher textura Terra QA', exact: true }).click()
    await painel.getByRole('button', { name: 'Ver prévia', exact: true }).click()
    await painel
      .getByRole('heading', { name: 'Prévia · ainda não guardada', exact: true })
      .waitFor()
  }
  await escolherAcabamento()
  const emPrevia = await p.evaluate(async (id) => await window.__cenarios.host.abrirCenario(id), id)
  assert.equal(emPrevia.revisao, final.revisao)
  assert.equal(emPrevia.documento.modelos.length, 0)
  assert.equal(emPrevia.documento.texturas?.length ?? 0, 0)
  await p.screenshot({ path: resolve(saida, 'catalogo-previa.png') })
  await painel.getByRole('button', { name: 'Cancelar edição do caminho', exact: true }).click()
  await escolherAcabamento()
  await painel.getByRole('button', { name: 'Guardar caminho', exact: true }).click()
  await painel.getByRole('heading', { name: /Caminhos do cenário/ }).waitFor()
  await p.getByText('Guardado', { exact: true }).waitFor()
  const acabamento = await p.evaluate(
    async (id) => await window.__cenarios.host.abrirCenario(id),
    id,
  )
  assert.equal(acabamento.revisao, final.revisao + 1)
  assert.equal(acabamento.documento.modelos.length, 1)
  assert.equal(acabamento.documento.texturas.length, 1)
  assert.equal(acabamento.documento.instancias.length, 0)
  await p
    .getByRole('button', { name: /Desfazer/ })
    .first()
    .click()
  await esperarConsulta(
    p,
    async (id) => (await window.__cenarios.host.abrirCenario(id)).documento.modelos.length === 0,
    id,
  )
  await p
    .getByRole('button', { name: /Refazer/ })
    .first()
    .click()
  await esperarConsulta(
    p,
    async (id) => (await window.__cenarios.host.abrirCenario(id)).documento.modelos.length === 1,
    id,
  )
  await painel.getByRole('button', { name: 'Ocultar QA Trilha', exact: true }).click()
  await painel.getByRole('button', { name: 'Mostrar QA Trilha', exact: true }).waitFor()
  await p.getByText('Guardado', { exact: true }).waitFor()
  assert.equal(
    await p.evaluate(
      async (id) =>
        (await window.__cenarios.host.abrirCenario(id)).documento.caminhos.find(
          (c) => c.nome === 'QA Trilha',
        ).oculto,
      id,
    ),
    true,
  )
  await painel.getByRole('button', { name: 'Mostrar QA Trilha', exact: true }).click()
  await p.getByText('Guardado', { exact: true }).waitFor()
  await painel.getByRole('button', { name: 'Copiar QA Trilha', exact: true }).click()
  await p.getByText(/Escolha copiada|Escolha guardada na ferramenta/).waitFor()
  await p.getByRole('button', { name: 'Copiar e colar', exact: true }).click()
  await p.getByRole('button', { name: 'Colar escolha', exact: true }).click()
  await esperarConsulta(
    p,
    async (id) => (await window.__cenarios.host.abrirCenario(id)).documento.caminhos.length === 7,
    id,
  )
  await p.getByText('Guardado', { exact: true }).waitFor()
  const colado = await p.evaluate(async (id) => await window.__cenarios.host.abrirCenario(id), id)
  const copia = colado.documento.caminhos.find(
    (c) => !acabamento.documento.caminhos.some((a) => a.id === c.id),
  )
  assert.ok(
    copia,
    JSON.stringify({
      antes: acabamento.documento.caminhos.map((c) => c.id),
      depois: colado.documento.caminhos.map((c) => c.id),
      revisaoAntes: acabamento.revisao,
      revisaoDepois: colado.revisao,
    }),
  )
  assert.equal(
    copia.acabamento,
    acabamento.documento.caminhos.find((c) => c.nome === 'QA Trilha').acabamento,
  )
  assert.equal(colado.documento.modelos.length, 1)
  assert.equal(colado.documento.instancias.length, 0)
  await painel
    .getByRole('button', { name: `Apagar ${copia.nome}`, exact: true })
    .last()
    .click()
  await p.getByRole('dialog').getByRole('button', { name: 'Apagar', exact: true }).click()
  await esperarConsulta(
    p,
    async (id) => (await window.__cenarios.host.abrirCenario(id)).documento.caminhos.length === 6,
    id,
  )
  await p.getByText('Guardado', { exact: true }).waitFor()
  await painel
    .getByRole('combobox', { name: 'Camada de QA Trilha', exact: true })
    .selectOption('vias')
  await p.getByText('Guardado', { exact: true }).waitFor()
  assert.equal(
    await p.evaluate(
      async (id) =>
        (await window.__cenarios.host.abrirCenario(id)).documento.caminhos.find(
          (c) => c.nome === 'QA Trilha',
        ).camada,
      id,
    ),
    'vias',
  )
  await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
  await p.getByRole('button', { name: 'Abrir Seis ferramentas', exact: true }).click()
  await p.getByRole('button', { name: 'Caminhos', exact: true }).click()
  const abrirReentrada = p.getByRole('button', { name: 'Abrir o painel', exact: true })
  if (await abrirReentrada.count()) await abrirReentrada.click()
  assert.equal(
    await painel.getByRole('combobox', { name: 'Camada de QA Trilha', exact: true }).inputValue(),
    'vias',
  )
  assert.ok(workers.some((w) => w.includes('caminho.worker')))
  assert.deepEqual(erros, [])
  await contexto.close()
  writeFileSync(
    resolve(saida, 'resultado.json'),
    JSON.stringify(
      {
        revisao: acabamento.revisao,
        caminhos: acabamento.documento.caminhos,
        modelos: acabamento.documento.modelos,
        texturas: acabamento.documento.texturas,
        catalogoEmUmaRevisao: acabamento.revisao === final.revisao + 1,
        nenhumaInstanciaExtra: acabamento.documento.instancias.length === 0,
        cancelamento: true,
        alcasPeloMouse: true,
        historico: true,
        copiarColarRemover: true,
        visibilidade: true,
        camada: true,
        reabertura: true,
        workers,
        erros,
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify({
      variantes: final.documento.caminhos.map((c) => c.tipo),
      cancelamento: true,
      alcasPeloMouse: true,
      historico: true,
      workers: workers.length,
      erros,
    }),
  )
} finally {
  await browser.close()
}
