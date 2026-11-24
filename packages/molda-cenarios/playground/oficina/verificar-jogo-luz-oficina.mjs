import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { esperarConsulta } from './esperar-consulta.mjs'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote7-interface'),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  contexto = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: resolve(saida, 'movimento') },
  }),
  p = await contexto.newPage(),
  erros = []
p.on('pageerror', (e) => erros.push(e.message))
p.on('console', (m) => {
  if (m.type() === 'error') erros.push(m.text())
})
try {
  await contexto.grantPermissions(['clipboard-read', 'clipboard-write'])
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForFunction(() => window.__cenarios)
  const id = await p.evaluate(async (coreUrl) => {
    const core = await import(coreUrl),
      h = window.__cenarios.host,
      m = await h.criarMundo('conta', 'Oficina de jogo e luz'),
      c = await h.criarCenario(m.id, 'Entradas e ambiente'),
      b = await h.criarBiblioteca('conta', { nome: 'Panoramas QA', licenca: 'restrita' }),
      canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#c8e2f2'
    ctx.fillRect(0, 0, 64, 32)
    ctx.fillStyle = '#df9863'
    ctx.fillRect(0, 16, 32, 16)
    const png = await new Promise((r) => canvas.toBlob(r, 'image/png'))
    await h.importarTexturas(b.id, [
      {
        nome: 'Horizonte QA',
        pasta: '',
        etiquetas: [],
        largura: 64,
        altura: 32,
        digest: await core.digestDosBytes(new Uint8Array(await png.arrayBuffer())),
        repeticaoMetros: 1,
        conteudo: png,
      },
    ])
    await h.editarMundo(m.id, { bibliotecas: [b.id] })
    // Adaptador externo controlado no host do ensaio; não simula o serviço remoto Molda.
    h.texturasMolda = {
      listar: async () => [
        {
          origem: 'molda',
          id: 'ceu-qa',
          nome: 'Céu 360 QA',
          miniatura: null,
          revisao: '1',
          atualizadoEm: 0,
        },
      ],
      preparar: async (bibliotecaId) =>
        (await h.listarTexturas(bibliotecaId, { busca: 'Horizonte QA', limite: 24 })).itens[0],
    }
    return c.id
  }, modulo('packages/molda-cenarios-core/src/v2/index.ts'))
  const ler = () => p.evaluate(async (id) => await window.__cenarios.host.abrirCenario(id), id),
    salvo = async (esperado) =>
      esperarConsulta(
        p,
        async ({ id, esperado }) => {
          const d = await window.__cenarios.host.abrirCenario(id)
          return (
            (esperado.marcadores === undefined ||
              d.documento.marcadores.length === esperado.marcadores) &&
            (esperado.revisao === undefined || d.revisao === esperado.revisao) &&
            (!esperado.propriedade ||
              d.documento.marcadores.find((m) => m.nome === 'QA Marcador')?.propriedades
                ?.destino === 'Horta')
          )
        },
        { id, esperado },
      ),
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
  await p.getByRole('button', { name: 'Abrir Oficina de jogo e luz', exact: true }).click()
  await p.getByRole('button', { name: 'Abrir Entradas e ambiente', exact: true }).click()
  await aba('Jogo').click()
  for (const [n, nome] of [
    'Início',
    'Marcador',
    'Zona em caixa',
    'Zona em esfera',
    'Zona poligonal',
    'Rota',
    'Câmera',
    'Régua',
    'Escala',
  ].entries()) {
    console.log(`Criar ${nome}`)
    await rail.getByRole('button', { name: nome, exact: true }).click()
    await painel.getByRole('textbox', { name: 'Nome do marcador', exact: true }).fill(`QA ${nome}`)
    await numero('Posição X', n * 4 - 16)
    if (nome === 'Início') await numero('Giro do marcador', 90)
    if (nome === 'Zona em caixa') await numero('Tamanho da zona X', 6)
    if (nome === 'Rota') {
      await numero('Ponto 2 X', 9)
      await painel.getByRole('checkbox', { name: 'Acompanhar o terreno', exact: true }).uncheck()
    }
    if (nome === 'Câmera') await numero('Campo de visão', 55)
    if (nome === 'Escala') await numero('Altura de referência', 1.17)
    const antes = await ler()
    await painel.getByRole('button', { name: 'Ver prévia do marcador', exact: true }).click()
    await painel
      .getByRole('heading', { name: 'Prévia · ainda não guardada', exact: true })
      .waitFor()
    assert.equal((await ler()).revisao, antes.revisao)
    assert.equal(await p.getByRole('button', { name: 'Testar', exact: true }).isDisabled(), true)
    await painel.getByRole('button', { name: 'Guardar marcador', exact: true }).click()
    await salvo({ marcadores: n + 1 })
    await painel.getByRole('heading', { name: 'Preparar a exploração', exact: true }).waitFor()
    await p.getByText('Guardado', { exact: true }).waitFor()
    assert.equal((await ler()).revisao, antes.revisao + 1)
  }
  await p.screenshot({ path: resolve(saida, 'jogo.png') })
  const doc = (await ler()).documento
  assert.equal(
    doc.marcadores.find((m) => m.nome === 'QA Zona em caixa').configuracao.forma.tamanho.x,
    6,
  )
  assert.equal(doc.marcadores.find((m) => m.nome === 'QA Rota').configuracao.pontos[1].x, 9)
  assert.equal(doc.marcadores.find((m) => m.nome === 'QA Câmera').configuracao.campoDeVisao, 55)
  // Mesmo editor de propriedades, aplicado ao marcador já guardado.
  await painel.getByRole('button', { name: 'QA Marcador', exact: true }).click()
  const propriedades = painel
    .locator('details')
    .filter({ has: p.locator('summary').filter({ hasText: /^Propriedades ·/ }) })
  await propriedades.locator('summary').click()
  await propriedades.getByRole('button', { name: 'Adicionar propriedade', exact: true }).click()
  await propriedades
    .getByRole('textbox', { name: 'Nome da propriedade', exact: true })
    .fill('destino')
  await propriedades.getByRole('textbox', { name: 'Valor', exact: true }).fill('Horta')
  await propriedades.getByRole('button', { name: 'Guardar propriedades', exact: true }).click()
  await salvo({ propriedade: true })
  // Cancelar um rascunho não altera histórico, inclusive ao trocar a aba.
  await painel.getByRole('button', { name: 'Editar marcador', exact: true }).click()
  await numero('Posição X', 42)
  const antesDeCancelar = await ler()
  await aba('Luz e céu').click()
  assert.equal((await ler()).revisao, antesDeCancelar.revisao)
  for (const [n, nome] of ['Luz pontual', 'Foco de luz'].entries()) {
    await rail.getByRole('button', { name: nome, exact: true }).click()
    await painel.getByRole('textbox', { name: 'Nome do marcador', exact: true }).fill(`QA ${nome}`)
    await numero('Intensidade da luz', 18 + n)
    await painel.getByRole('checkbox', { name: 'Projetar sombra', exact: true }).check()
    await painel.getByRole('button', { name: 'Ver prévia do marcador', exact: true }).click()
    await painel.getByRole('button', { name: 'Guardar marcador', exact: true }).click()
    await salvo({ marcadores: 10 + n })
    await p.getByText('Guardado', { exact: true }).waitFor()
  }
  const antesDaLuz = await ler()
  await rail.getByRole('button', { name: 'Noite', exact: true }).click()
  await rail.getByRole('button', { name: 'Céu', exact: true }).click()
  await painel.getByRole('button', { name: 'Escolher panorama', exact: true }).click()
  await p.getByRole('button', { name: 'Escolher textura Horizonte QA', exact: true }).click()
  // Arquivo local percorre o decoder e a importação autorizada já usados em Chãos.
  const arquivoDePanorama = await p.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 32
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#d1b390'
    ctx.fillRect(0, 0, 64, 32)
    return c.toDataURL('image/png').split(',')[1]
  })
  await painel.getByRole('button', { name: 'Escolher panorama', exact: true }).click()
  await p.getByLabel('Arquivo de panorama', { exact: true }).setInputFiles({
    name: 'Céu importado QA.png',
    mimeType: 'image/png',
    buffer: Buffer.from(arquivoDePanorama, 'base64'),
  })
  await p
    .getByRole('dialog', { name: 'Escolher panorama do céu', exact: true })
    .waitFor({ state: 'detached' })
  await painel.getByRole('button', { name: 'Escolher panorama', exact: true }).click()
  await p.getByRole('button', { name: 'Trazer panorama do Molda', exact: true }).click()
  await p.getByRole('button', { name: 'Trazer Céu 360 QA', exact: true }).click()
  await p
    .getByRole('dialog', { name: 'Escolher panorama do céu', exact: true })
    .waitFor({ state: 'detached' })
  await numero('Giro do panorama', 45)
  await rail.getByRole('button', { name: 'Névoa', exact: true }).click()
  await painel.getByRole('button', { name: 'Personalizar névoa', exact: true }).click()
  await numero('Início da névoa', 20)
  await numero('Fim da névoa', 200)
  const guardarLuz = painel.getByRole('button', { name: 'Guardar iluminação', exact: true })
  await p.waitForFunction(() =>
    [...document.querySelectorAll('button')].some(
      (b) => b.textContent === 'Guardar iluminação' && !b.disabled,
    ),
  )
  assert.equal((await ler()).revisao, antesDaLuz.revisao)
  await p.screenshot({ path: resolve(saida, 'luz-previa.png') })
  await guardarLuz.click()
  await salvo({ revisao: antesDaLuz.revisao + 1 })
  await p.getByText('Guardado', { exact: true }).waitFor()
  const depoisDaLuz = await ler()
  assert.equal(depoisDaLuz.documento.iluminacao.hora, 22)
  assert.equal(depoisDaLuz.documento.iluminacao.ceu.tipo, 'panorama')
  assert.equal(depoisDaLuz.documento.iluminacao.nevoa.longe, 200)
  await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await salvo({ revisao: depoisDaLuz.revisao + 1 })
  assert.deepEqual((await ler()).documento.iluminacao, antesDaLuz.documento.iluminacao)
  await p.getByRole('button', { name: 'Refazer', exact: true }).click()
  await salvo({ revisao: depoisDaLuz.revisao + 2 })
  assert.deepEqual((await ler()).documento.iluminacao, depoisDaLuz.documento.iluminacao)
  await p.getByRole('button', { name: 'Testar', exact: true }).click()
  await p.getByRole('combobox', { name: 'Lugar de entrada', exact: true }).selectOption('centro')
  await p.getByRole('button', { name: 'Entrar no cenário', exact: true }).click()
  await p.locator('header').getByRole('button', { name: 'Editar', exact: true }).waitFor()
  await p.locator('header').getByRole('button', { name: 'Editar', exact: true }).click()
  console.log('Clipboard e reabertura')
  await aba('Jogo').click()
  await painel.getByRole('button', { name: 'QA Marcador', exact: true }).click()
  await rail.getByRole('button', { name: 'Duplicar', exact: true }).click()
  await salvo({ marcadores: 12 })
  await p.getByText('Guardado', { exact: true }).waitFor()
  await p.getByRole('button', { name: 'Copiar e colar', exact: true }).click()
  await p.getByRole('button', { name: 'Copiar escolha', exact: true }).click()
  await p.getByRole('button', { name: 'Copiar e colar', exact: true }).click()
  await p.getByRole('button', { name: 'Colar escolha', exact: true }).click()
  await salvo({ marcadores: 13 })
  await p.getByText('Guardado', { exact: true }).waitFor()
  await rail.getByRole('button', { name: 'Apagar', exact: true }).click()
  await salvo({ marcadores: 12 })
  await p.getByText('Guardado', { exact: true }).waitFor()
  await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await salvo({ marcadores: 13 })
  await p.getByText('Guardado', { exact: true }).waitFor()
  // Colocação através do hook e da captura compartilhada, além do ensaio do motor.
  await painel.getByRole('button', { name: 'QA Início', exact: true }).click()
  await painel.getByRole('button', { name: 'Editar marcador', exact: true }).click()
  const antesDeColocar = Number(
    await painel.getByRole('spinbutton', { name: 'Posição X', exact: true }).inputValue(),
  )
  await painel.getByRole('button', { name: 'Colocar no cenário', exact: true }).click()
  const tela = p.locator('canvas.mcn-palco-tela'),
    caixa = await tela.boundingBox()
  await tela.click({ position: { x: caixa.width * 0.55, y: caixa.height * 0.65 } })
  assert.notEqual(
    Number(await painel.getByRole('spinbutton', { name: 'Posição X', exact: true }).inputValue()),
    antesDeColocar,
  )
  await painel.getByRole('button', { name: 'Ver prévia do marcador', exact: true }).click()
  await painel.getByRole('button', { name: 'Guardar marcador', exact: true }).click()
  await p.getByText('Guardado', { exact: true }).waitFor()
  const guardadoAntesDeSair = await ler()
  await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
  await p.getByRole('button', { name: 'Abrir Entradas e ambiente', exact: true }).click()
  assert.deepEqual((await ler()).documento, guardadoAntesDeSair.documento)
  await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await salvo({ revisao: guardadoAntesDeSair.revisao + 1 })
  await p.getByText('Guardado', { exact: true }).waitFor()
  assert.notDeepEqual(
    (await ler()).documento.marcadores.find((m) => m.nome === 'QA Início').posicao,
    guardadoAntesDeSair.documento.marcadores.find((m) => m.nome === 'QA Início').posicao,
  )
  assert.deepEqual(erros, [])
  writeFileSync(
    resolve(saida, 'resultado.json'),
    JSON.stringify(
      {
        marcadores: 11,
        propriedades: true,
        cancelar: true,
        panorama: true,
        importacaoDeImagem: true,
        seletorMoldaComAdaptadorControlado: true,
        nevoa: true,
        umaRevisaoPorGuarda: true,
        undoRedo: true,
        testarCentro: true,
        clipboard: true,
        colocacaoPeloPalco: true,
        reabrirComHistorico: true,
        erros,
      },
      null,
      2,
    ),
  )
  console.log(
    'Interface de Jogo e Luz: criação, prévia, guarda, propriedades, cancelamento, panorama, névoa, undo/redo e Testar aprovados.',
  )
} catch (erro) {
  await p.screenshot({ path: resolve(saida, 'falha.png') }).catch(() => {})
  writeFileSync(
    resolve(saida, 'falha.txt'),
    `${erro.stack}\n${erros.join('\n')}\n${await p
      .locator('body')
      .innerText()
      .catch(() => '')}`,
  )
  throw erro
} finally {
  await contexto.close()
  await browser.close()
}
