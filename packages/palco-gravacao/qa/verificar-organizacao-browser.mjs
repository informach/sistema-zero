import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Node controla o navegador também no Windows. Bun só compila a fixture.
const studio = createRequire(new URL('../../studio/package.json', import.meta.url))
const { chromium } = studio('playwright-core')
const blockly = dirname(studio.resolve('blockly/core'))
const pasta = mkdtempSync(join(tmpdir(), 'sz-palco-organizar-'))
assert.equal(dirname(pasta), tmpdir())
const caminho = (url) => fileURLToPath(url).replaceAll('\\', '/')
const entrada = join(pasta, 'entrada.ts')
const bundle = join(pasta, 'fixture.js')
writeFileSync(
  entrada,
  `import * as Blockly from ${JSON.stringify(join(blockly, 'core.js').replaceAll('\\', '/'))};
import ${JSON.stringify(studio.resolve('blockly/blocks').replaceAll('\\', '/'))};
import * as ptBR from ${JSON.stringify(studio.resolve('blockly/msg/pt-br').replaceAll('\\', '/'))};
import {paginaDe} from ${JSON.stringify(caminho(new URL('../src/lib/pagina.ts', import.meta.url)))};
import {organizeBlocks} from ${JSON.stringify(caminho(new URL('../../studio/src/blockly/organize.ts', import.meta.url)))};
Blockly.setLocale(ptBR);Object.assign(window,{fixture:{Blockly,paginaDe,organizeBlocks}});`,
)
let browser
let server
try {
  execFileSync(
    'bun',
    ['build', entrada, '--target', 'browser', '--format', 'esm', '--outfile', bundle],
    {
      cwd: dirname(fileURLToPath(new URL('../../../package.json', import.meta.url))),
      stdio: 'pipe',
      timeout: 30_000,
    },
  )
  const script = readFileSync(bundle)
  server = createServer((req, res) => {
    if (req.url === '/fixture.js') {
      res.writeHead(200, { 'content-type': 'application/javascript' })
      res.end(script)
    } else {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(
        '<!doctype html><html><body style="margin:0"><div id="studio" style="height:700px;width:1000px"></div><script type="module" src="/fixture.js"></script></body></html>',
      )
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  browser = await chromium.launch({
    headless: true,
    timeout: 20_000,
    ...(process.env.SZ_CHECK_CHROMIUM
      ? { executablePath: process.env.SZ_CHECK_CHROMIUM }
      : process.platform === 'win32'
        ? { channel: 'chrome' }
        : {}),
  })
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
  page.setDefaultTimeout(10_000)
  const erros = []
  page.on('pageerror', (error) => erros.push(error.message))
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.waitForFunction(() => Boolean(window.fixture))
  const resultado = await page.evaluate(async () => {
    const { Blockly, paginaDe, organizeBlocks } = window.fixture
    const workspace = Blockly.inject(document.querySelector('#studio'), {
      toolbox: { kind: 'flyoutToolbox', contents: [] },
    })
    let organizacoes = 0
    Blockly.ContextMenuRegistry.registry.register({
      id: 'sz_organize',
      weight: 6,
      scopeType: Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,
      displayText: () => 'Organizar blocos',
      preconditionFn: () => 'enabled',
      callback: () => {
        organizeBlocks(workspace)
        organizacoes++
      },
    })
    for (let i = 0; i < 2; i++) {
      const bloco = workspace.newBlock('math_number')
      bloco.initSvg()
      bloco.render()
      bloco.moveBy(100, 100)
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const pagina = paginaDe(document)
    const primeira = {
      ok: await pagina.organizar(),
      organizacoes,
      posicoes: workspace
        .getTopBlocks(false)
        .map((bloco) => ({ ...bloco.getRelativeToSurfaceXY() })),
    }
    const segunda = { ok: await pagina.organizar(), organizacoes }
    workspace.clear()
    Blockly.defineBlocksWithJsonArray([
      {
        type: 'qa_parent',
        message0: 'Evento %1 %2',
        args0: [
          { type: 'field_input', name: 'NAME', text: 'A' },
          { type: 'input_statement', name: 'DO' },
        ],
        previousStatement: null,
        nextStatement: null,
      },
      { type: 'qa_if', message0: 'Se', previousStatement: null, nextStatement: null },
      {
        type: 'qa_variable',
        message0: 'Criar variável %1',
        args0: [{ type: 'input_value', name: 'VALUE' }],
        previousStatement: null,
        nextStatement: null,
      },
      {
        type: 'qa_number',
        message0: 'Somar %1',
        args0: [{ type: 'field_number', name: 'NUM', value: 1 }],
        previousStatement: null,
        nextStatement: null,
      },
      {
        type: 'qa_visibility',
        message0: 'Deixar o sprite com %1 de visibilidade',
        args0: [{ type: 'input_value', name: 'VALUE' }],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
      },
    ])
    const create = (type) => {
      const block = workspace.newBlock(type)
      block.initSvg()
      block.render()
      return block
    }
    const first = create('qa_parent'),
      next = create('qa_parent'),
      insideNext = create('qa_if')
    next.setFieldValue('B', 'NAME')
    first.nextConnection.connect(next.previousConnection)
    next.getInput('DO').connection.connect(insideNext.previousConnection)
    first.moveBy(60, 60)
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    const outsideRejected = pagina.bloco('Se dentro de Evento A', 'area') === null
    const nextTarget = pagina.bloco('Se dentro de Evento B', 'area')
    const insideAccepted = Boolean(
      nextTarget &&
        document.querySelector(nextTarget.seletor)?.closest('.blocklyDraggable') ===
          insideNext.getSvgRoot(),
    )
    const variable = create('qa_variable'),
      value = create('math_number'),
      nextNumber = create('qa_number')
    value.setFieldValue(2, 'NUM')
    variable.getInput('VALUE').connection.connect(value.outputConnection)
    variable.nextConnection.connect(nextNumber.previousConnection)
    variable.moveBy(400, 60)
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    const fieldOutsideRejected = pagina.campo('1', 'Criar variável') === null
    const fieldInsideAccepted = pagina.campo('2', 'Criar variável') !== null
    // O Blockly pode montar a sombra antes do texto do bloco no grupo SVG.
    // O nome visível do pai continua sendo o alvo, mesmo com o número primeiro no DOM.
    const laterVariable = create('qa_variable'),
      laterValue = create('math_number')
    laterValue.setFieldValue(3, 'NUM')
    laterVariable.getInput('VALUE').connection.connect(laterValue.outputConnection)
    laterVariable.moveBy(400, 220)
    value.setShadow(true)
    variable.getSvgRoot().prepend(value.getSvgRoot())
    const shadowTarget = pagina.bloco('Criar variável', 'area')
    const shadowBeforeNameAccepted = Boolean(
      shadowTarget &&
        document.querySelector(shadowTarget.seletor)?.closest('.blocklyDraggable') ===
          variable.getSvgRoot(),
    )
    const shadowFieldAccepted = pagina.campo('2', 'Criar variável') !== null
    const visibility = create('qa_visibility'),
      percentage = create('math_number')
    percentage.setFieldValue(50, 'NUM')
    percentage.setShadow(true)
    visibility.getInput('VALUE').connection.connect(percentage.outputConnection)
    visibility.moveBy(60, 400)
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    // O campo aparece entre rótulos na tela, mesmo se seu SVG vier depois deles no DOM.
    const inlineShadowAccepted =
      pagina.bloco('Deixar o sprite com 50 de visibilidade', 'area') !== null
    const arithmetic = create('math_arithmetic'),
      left = create('math_number'),
      right = create('math_number')
    left.setFieldValue(1, 'NUM')
    right.setFieldValue(2, 'NUM')
    left.setShadow(true)
    right.setShadow(true)
    arithmetic.getInput('A').connection.connect(left.outputConnection)
    arithmetic.getInput('B').connection.connect(right.outputConnection)
    arithmetic.moveBy(500, 400)
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    // Aqui a sombra é visivelmente o primeiro campo: a ordem correta já é 1 + 2.
    arithmetic.getSvgRoot().prepend(left.getSvgRoot())
    arithmetic.getSvgRoot().append(right.getSvgRoot())
    const leadingShadowAccepted = pagina.bloco('1 + 2', 'area') !== null
    workspace.setScale(0.65)
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    const scaledLabelsAccepted =
      pagina.bloco('1 + 2', 'area') !== null &&
      pagina.bloco('Deixar o sprite com 50 de visibilidade', 'area') !== null &&
      pagina.bloco('Criar variável 2', 'area') !== null
    // A opção ainda está totalmente visível nas duas posições, mas a galeria está andando.
    const gallery = document.querySelector('.blocklyDropDownDiv') ?? document.createElement('div')
    gallery.className = 'blocklyDropDownDiv'
    gallery.style.cssText =
      'display:block;position:fixed;left:100px;top:100px;width:200px;height:200px;overflow:auto'
    gallery.innerHTML =
      '<div style="height:80px"></div><span>pirata</span><div style="height:400px"></div>'
    document.body.append(gallery)
    const beforeScroll = pagina.opcaoNaLista('pirata')
    gallery.scrollTop = 20
    const afterScroll = pagina.opcaoNaLista('pirata')
    const visibleMovementMeasured =
      beforeScroll?.dy === 0 &&
      afterScroll?.dy === 0 &&
      beforeScroll.posicao?.y !== afterScroll.posicao?.y
    gallery.remove()
    const containment = {
      outsideRejected,
      insideAccepted,
      fieldOutsideRejected,
      fieldInsideAccepted,
      shadowBeforeNameAccepted,
      shadowFieldAccepted,
      inlineShadowAccepted,
      leadingShadowAccepted,
      scaledLabelsAccepted,
      visibleMovementMeasured,
    }
    // Uma aba sem frames novos não pode ficar pendurada nem declarar sucesso.
    const original = window.requestAnimationFrame
    window.requestAnimationFrame = () => 0
    let semFrames
    try {
      semFrames = { ok: await pagina.organizar(), organizacoes }
    } finally {
      window.requestAnimationFrame = original
      workspace.dispose()
    }
    return { primeira, segunda, semFrames, containment }
  })
  assert.deepEqual(erros, [])
  assert.equal(resultado.primeira.ok, true)
  assert.equal(resultado.primeira.organizacoes, 1)
  assert.deepEqual(resultado.primeira.posicoes, [
    { x: 32, y: 32 },
    { x: 32, y: 82 },
  ])
  assert.deepEqual(resultado.segunda, { ok: true, organizacoes: 2 })
  assert.deepEqual(resultado.semFrames, { ok: false, organizacoes: 2 })
  assert.deepEqual(resultado.containment, {
    outsideRejected: true,
    insideAccepted: true,
    fieldOutsideRejected: true,
    fieldInsideAccepted: true,
    shadowBeforeNameAccepted: true,
    shadowFieldAccepted: true,
    inlineShadowAccepted: true,
    leadingShadowAccepted: true,
    scaledLabelsAccepted: true,
    visibleMovementMeasured: true,
  })
  console.log(JSON.stringify({ resultado: 'PASS', navegador: browser.version(), casos: resultado }))
} finally {
  await browser?.close()
  if (server) await new Promise((resolve) => server.close(resolve))
  // Pasta exclusiva criada acima, sem caminhos recebidos de fora.
  rmSync(pasta, { recursive: true, force: true })
}
