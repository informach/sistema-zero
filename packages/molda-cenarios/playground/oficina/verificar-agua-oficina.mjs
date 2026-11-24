import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { esperarConsulta } from './esperar-consulta.mjs'

const saida = resolve(import.meta.dirname, '../../../../output/cenarios-reforma/lote5-oficina')
const raiz = resolve(import.meta.dirname, '../../../..')
const modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true }),
  resultados = []
let pagina
try {
  for (const [tema, largura] of [
    ['light', 1440],
    ['dark', 1366],
    ['light', 1024],
    ['dark', 390],
  ]) {
    const contexto = await navegador.newContext({
      viewport: { width: largura, height: 900 },
      hasTouch: largura === 390,
      ...(largura === 1440 ? { recordVideo: { dir: resolve(saida, 'movimento') } } : {}),
    })
    const p = await contexto.newPage(),
      erros = []
    pagina = p
    p.setDefaultTimeout(10000)
    p.on('pageerror', (e) => erros.push(e.message))
    await p.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await p.waitForFunction(() => window.__cenarios)
    await p.waitForLoadState('networkidle')
    const id = await p.evaluate(async () => {
      const h = window.__cenarios.host,
        m = await h.criarMundo('conta', 'Mundo da água')
      const c = await h.criarCenario(m.id, 'Bacia')
      await h.editarCenario(
        c.id,
        0,
        [
          {
            tipo: 'camada.definir',
            camada: { id: 'agua', nome: 'Águas', bloqueado: false, oculto: false },
          },
        ],
        'qa-camada',
      )
      return c.id
    })
    const espaco = p.getByRole('combobox', { name: 'De quem são', exact: true })
    await espaco.selectOption('equipe')
    await espaco.selectOption('conta')
    await p.getByRole('button', { name: 'Abrir Mundo da água', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Bacia', exact: true }).click()
    const painel = p.locator('aside.mcn-painel'),
      ler = () =>
        p.evaluate(async (id) => (await window.__cenarios.host.abrirCenario(id)).documento, id)
    const abrir = async () => {
      const botao = p.getByRole('button', { name: 'Abrir o painel', exact: true })
      if (await botao.count()) await botao.click()
    }
    const salvo = () => p.getByText('Guardado', { exact: true }).waitFor()
    const numero = async (nome, valor) => {
      const c = painel.getByRole('spinbutton', { name: nome, exact: true })
      await c.fill(String(valor))
      await c.press('Tab')
    }
    const iniciar = async (nome) => {
      await p.getByRole('button', { name: 'Água', exact: true }).click()
      await abrir()
      await painel
        .locator('.mcn-agua-acoes')
        .getByRole('button', { name: nome, exact: true })
        .click()
    }
    const prever = async () => {
      await painel.getByRole('button', { name: 'Ver prévia', exact: true }).click()
      await painel
        .getByRole('heading', { name: 'Prévia · ainda não guardada', exact: true })
        .waitFor()
    }
    const guardar = async () => {
      await painel.getByRole('button', { name: 'Guardar água', exact: true }).click()
      await painel.getByRole('heading', { name: /Águas do cenário/ }).waitFor()
      await salvo()
    }
    await iniciar('Mar')
    await numero('Nível da água', -1)
    await prever()
    assert.equal((await ler()).aguas.length, 0, 'prévia não deve guardar água')
    await guardar()
    assert.equal((await ler()).aguas[0].tipo, 'mar')
    await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await salvo()
    assert.equal((await ler()).aguas.length, 0)
    await p.getByRole('button', { name: 'Refazer', exact: true }).click()
    await salvo()
    assert.equal((await ler()).aguas.length, 1)
    await painel.getByRole('button', { name: 'Mar', exact: true }).first().click()
    await painel.getByLabel('Nome', { exact: true }).fill('Mar da ilha')
    await prever()
    await guardar()
    assert.equal((await ler()).aguas[0].nome, 'Mar da ilha')
    await painel.getByRole('button', { name: 'Ocultar Mar da ilha', exact: true }).click()
    await salvo()
    assert.equal((await ler()).aguas[0].oculto, true)
    await painel.getByRole('button', { name: 'Mostrar Mar da ilha', exact: true }).click()
    await salvo()
    await painel.getByLabel('Camada de Mar da ilha', { exact: true }).selectOption('agua')
    await salvo()
    assert.equal((await ler()).aguas[0].camada, 'agua')
    const semMudanca = await p.evaluate(
      async (id) => (await window.__cenarios.host.abrirCenario(id)).revisao,
      id,
    )
    await painel.getByRole('button', { name: 'Mar da ilha', exact: true }).click()
    await prever()
    await guardar()
    assert.equal(
      await p.evaluate(async (id) => (await window.__cenarios.host.abrirCenario(id)).revisao, id),
      semMudanca,
    )
    await painel.getByRole('button', { name: 'Apagar Mar da ilha', exact: true }).click()
    await p.getByRole('dialog').getByRole('button', { name: 'Apagar', exact: true }).click()
    await salvo()
    assert.equal((await ler()).aguas.length, 0)
    await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await salvo()
    assert.equal((await ler()).aguas[0].nome, 'Mar da ilha')
    if (largura === 1440) {
      await p.getByRole('button', { name: 'Terreno', exact: true }).click()
      await painel.getByLabel('Modelo de terreno', { exact: true }).selectOption('plano')
      await numero('Altura do plano', 10)
      await painel.getByRole('button', { name: 'Aplicar modelo de terreno', exact: true }).click()
      await p
        .getByRole('dialog')
        .getByRole('button', { name: 'Confirmar modelo', exact: true })
        .click()
      await esperarConsulta(
        p,
        async (id) =>
          (await window.__cenarios.host.abrirCenario(id)).documento.base.tipo === 'terreno',
        id,
      )
      await p.waitForFunction(
        () =>
          ![...document.querySelectorAll('[role="status"]')].some((e) =>
            e.textContent?.includes('Preparando e guardando'),
          ),
      )
      await salvo()
      await p.getByText('Carregando o relevo…', { exact: true }).waitFor({ state: 'hidden' })
      const antes = await ler()
      await iniciar('Rio')
      await painel.getByRole('checkbox', { name: 'Suavizar curva', exact: true }).uncheck()
      await painel.getByRole('checkbox', { name: 'Suavizar curva', exact: true }).check()
      await painel.getByRole('button', { name: 'Adicionar por coordenadas', exact: true }).click()
      await numero('Nascente X', -20)
      await painel.getByRole('button', { name: 'Adicionar por coordenadas', exact: true }).click()
      await numero('Foz X', 20)
      await prever()
      assert.deepEqual(await ler(), antes)
      assert.equal(await p.getByRole('button', { name: 'Testar', exact: true }).isEnabled(), false)
      await guardar()
      const rio = await ler()
      assert.equal(rio.aguas.find((a) => a.tipo === 'rio').pontos.length > 2, true)
      assert.notDeepEqual(rio.base, antes.base)
      await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
      await salvo()
      assert.deepEqual(await ler(), antes)
      await p.getByRole('button', { name: 'Refazer', exact: true }).click()
      await salvo()
      assert.deepEqual(await ler(), rio)
      await painel.getByRole('button', { name: 'Rio', exact: true }).last().click()
      await numero('Correnteza', 2)
      await prever()
      await guardar()
      assert.deepEqual((await ler()).base, rio.base, 'editar correnteza não escava novamente')
      await iniciar('Cachoeira')
      await painel.getByRole('button', { name: 'Adicionar por coordenadas', exact: true }).click()
      await numero('Topo Y', 14)
      await painel.getByRole('button', { name: 'Adicionar por coordenadas', exact: true }).click()
      await numero('Base Y', 10)
      await prever()
      await guardar()
      assert.equal((await ler()).aguas.find((a) => a.tipo === 'cachoeira').nado, false)
      await iniciar('Encher de água')
      await painel.getByRole('button', { name: 'Adicionar por coordenadas', exact: true }).click()
      await numero('Nível da água', 11)
      await prever()
      const guardarBtn = painel.getByRole('button', { name: 'Guardar água', exact: true })
      assert.equal(await guardarBtn.isEnabled(), false, 'água na borda exige conferência')
      await p.keyboard.press('Escape')
      assert.equal(
        (await ler()).aguas.some((a) => a.tipo === 'lago'),
        false,
      )
      const antesDaRepresa = await ler()
      await iniciar('Represa')
      await numero('Nível da água', 11)
      for (const [nome, x, z] of [
        ['Ponta A', -20, 5],
        ['Ponta B', 20, 5],
        ['Montante', 0, -10],
      ]) {
        await painel.getByRole('button', { name: 'Adicionar por coordenadas', exact: true }).click()
        await numero(`${nome} X`, x)
        await numero(`${nome} Z`, z)
      }
      await prever()
      const aviso = painel.getByRole('checkbox', { name: /A água alcança a borda/ })
      if (await aviso.count()) await aviso.check()
      await guardar()
      const represa = await ler()
      assert.equal(represa.aguas.find((a) => a.tipo === 'represa').barragem.crista, 12)
      assert.notDeepEqual(represa.base, antesDaRepresa.base)
      await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
      await salvo()
      assert.deepEqual(await ler(), antesDaRepresa)
      await p.getByRole('button', { name: 'Refazer', exact: true }).click()
      await salvo()
      assert.deepEqual(await ler(), represa)
      await p.evaluate(() => {
        const host = window.__cenarios.host,
          guardar = host.guardarRecursos.bind(host)
        let falhar = true
        host.guardarRecursos = (...args) => {
          if (falhar) {
            falhar = false
            throw Error('Falha de envio simulada')
          }
          return guardar(...args)
        }
      })
      await iniciar('Rio')
      await painel.getByLabel('Nome', { exact: true }).fill('Rio da retomada')
      for (const [nome, x] of [
        ['Nascente', -15],
        ['Foz', 15],
      ]) {
        await painel.getByRole('button', { name: 'Adicionar por coordenadas', exact: true }).click()
        await numero(`${nome} X`, x)
        await numero(`${nome} Z`, -20)
      }
      await prever()
      await painel.getByRole('button', { name: 'Guardar água', exact: true }).click()
      await p.getByRole('button', { name: 'Tentar de novo', exact: true }).waitFor()
      assert.deepEqual(await ler(), represa)
      await p.getByRole('button', { name: 'Tentar de novo', exact: true }).click()
      await salvo()
      assert.equal(
        (await ler()).aguas.some((a) => a.nome === 'Rio da retomada'),
        true,
      )
      const reabrir = await ler()
      await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
      await p.getByRole('button', { name: 'Abrir Bacia', exact: true }).click()
      await p.getByRole('button', { name: 'Água', exact: true }).click()
      assert.deepEqual(await ler(), reabrir)
      const baciaId = await p.evaluate(
        async ({ id, coreUrl, controladorUrl }) => {
          const core = await import(coreUrl)
          const { criarControlador } = await import(controladorUrl)
          const h = window.__cenarios.host,
            atual = await h.abrirCenario(id),
            c = await h.criarCenario(atual.resumo.mundoId, 'Baixada com ilha')
          const ctrl = criarControlador(h, await h.abrirCenario(c.id))
          const base = {
            tipo: 'terreno',
            cobertura: 'grade',
            origem: { x: 0, z: 0 },
            colunas: 64,
            linhas: 64,
            passo: 1,
            min: -20,
            max: 40,
            fundo: 10,
            pecas: [],
          }
          const estado = core.abrirEdicaoDeTerreno(base, new Map())
          for (let z = 0; z <= 64; z++)
            for (let x = 0; x <= 64; x++) {
              const raio = Math.hypot(x - 32, z - 32)
              estado.campo.alturas[z * 65 + x] = raio < 3 ? 7 : raio < 18 ? 0 : 10
            }
          const pecas = core.prepararPecasEditadas(base, estado, {
              alturas: { x0: 0, z0: 0, x1: 64, z1: 64 },
            }),
            arquivos = [],
            refs = []
          for (const peca of pecas) {
            const digest = peca.conteudo ? await core.digestDosBytes(peca.conteudo) : null
            if (digest) arquivos.push({ digest, conteudo: peca.conteudo })
            refs.push({ papel: peca.papel, coluna: peca.coluna, linha: peca.linha, digest })
          }
          if (
            !ctrl.executar(
              [{ tipo: 'base.definir', base: core.baseComPecasEditadas(base, refs) }],
              arquivos,
            )
          )
            throw Error('Fixture inválida')
          await ctrl.terminar()
          return c.id
        },
        {
          id,
          coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
          controladorUrl: modulo('packages/molda-cenarios/src/oficina/controlador.ts'),
        },
      )
      await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
      await p.getByRole('button', { name: 'Abrir Baixada com ilha', exact: true }).click()
      await iniciar('Encher de água')
      await numero('Nível da água', 3)
      await painel.getByRole('button', { name: 'Adicionar por coordenadas', exact: true }).click()
      await numero('Baixada X', 42)
      await numero('Baixada Z', 32)
      await prever()
      await guardar()
      const bacia = await p.evaluate(
        async (id) => (await window.__cenarios.host.abrirCenario(id)).documento,
        baciaId,
      )
      assert.ok(bacia.aguas[0].ilhas.length >= 1, 'ilha seca conservada')
      await painel.getByRole('button', { name: 'Lago', exact: true }).click()
      await painel
        .getByRole('button', { name: 'Recalcular contorno ou leito', exact: true })
        .click()
      await numero('Nível da água', 4)
      await prever()
      await guardar()
      const nivelNovo = await p.evaluate(
        async (id) => (await window.__cenarios.host.abrirCenario(id)).documento,
        baciaId,
      )
      assert.equal(nivelNovo.aguas[0].nivel, 4)
      assert.deepEqual(nivelNovo.base, bacia.base)
      assert.ok(nivelNovo.aguas[0].ilhas.length >= 1)
      await p.getByRole('button', { name: 'Ver tudo', exact: true }).click()
      await p.getByRole('button', { name: 'De cima', exact: true }).click()
      await p.screenshot({ path: resolve(saida, 'lago-ilha-preenchido.png') })
      await painel.getByRole('button', { name: 'Lago', exact: true }).click()
      await painel.getByRole('button', { name: 'Copiar água guardada', exact: true }).click()
      await p.getByText(/Escolha copiada|Escolha guardada na ferramenta/).waitFor()
      await painel.getByRole('button', { name: 'Cancelar edição da água', exact: true }).click()
      const destinoId = await p.evaluate(async (id) => {
        const h = window.__cenarios.host,
          origem = await h.abrirCenario(id)
        return (await h.criarCenario(origem.resumo.mundoId, 'Destino da água')).id
      }, baciaId)
      await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
      await p.getByRole('button', { name: 'Abrir Destino da água', exact: true }).click()
      const transferencia = async (nome) => {
        await p.getByRole('button', { name: 'Copiar e colar', exact: true }).click()
        await p.getByRole('dialog').getByRole('button', { name: nome, exact: true }).click()
        await salvo()
      }
      await transferencia('Colar escolha')
      await p
        .getByText('Escolha colada. Desfazer remove toda a colagem em um passo.', { exact: true })
        .waitFor()
      const lerDestino = () =>
        p.evaluate(
          async (id) => (await window.__cenarios.host.abrirCenario(id)).documento,
          destinoId,
        )
      const copiado = await lerDestino()
      assert.equal(copiado.aguas.length, 1)
      assert.equal(copiado.base.tipo, 'plano', 'clipboard não copia o campo de relevo')
      assert.notEqual(copiado.aguas[0].id, nivelNovo.aguas[0].id)
      assert.deepEqual(copiado.aguas[0].contorno, nivelNovo.aguas[0].contorno)
      assert.deepEqual(
        await p.evaluate(
          async (id) => (await window.__cenarios.host.abrirCenario(id)).documento,
          baciaId,
        ),
        nivelNovo,
      )
      await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
      await salvo()
      assert.equal((await lerDestino()).aguas.length, 0)
      await p.getByRole('button', { name: 'Refazer', exact: true }).click()
      await salvo()
      assert.deepEqual(await lerDestino(), copiado)
      await p.getByRole('button', { name: 'Água', exact: true }).click()
      await painel.getByRole('button', { name: 'Lago', exact: true }).click()
      await painel.getByRole('button', { name: 'Cancelar edição da água', exact: true }).click()
      await p.locator('canvas.mcn-palco-tela').focus()
      await p.keyboard.press('Control+d')
      await salvo()
      assert.equal(
        (await lerDestino()).aguas.length,
        2,
        'duplicação rápida inclui a água selecionada',
      )
      await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
      await salvo()
      assert.deepEqual(await lerDestino(), copiado)
      await painel.getByRole('button', { name: 'Lago', exact: true }).click()
      await painel.getByRole('button', { name: 'Cancelar edição da água', exact: true }).click()
      await transferencia('Recortar escolha')
      assert.equal((await lerDestino()).aguas.length, 0)
      await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
      await salvo()
      assert.deepEqual(await lerDestino(), copiado)
      await p.getByRole('button', { name: 'Água', exact: true }).click()
    }
    if (largura === 390) {
      await iniciar('Encher de água')
      await p.getByRole('button', { name: 'Recolher o painel', exact: true }).click()
      const canvas = await p.locator('canvas.mcn-palco-tela').boundingBox()
      await p.touchscreen.tap(canvas.x + canvas.width * 0.5, canvas.y + canvas.height * 0.55)
      await abrir()
      await painel.getByText(/Pontos · 1\/1/).waitFor()
      await painel.getByRole('button', { name: 'Cancelar edição da água', exact: true }).click()
      assert.equal(
        (await ler()).aguas.some((a) => a.tipo === 'lago'),
        false,
      )
    }
    await iniciar('Mar')
    await painel.getByText('Cor, transparência e movimento', { exact: true }).click()
    await p.screenshot({ path: resolve(saida, `agua-${tema}-${largura}.png`) })
    const transbordo = await p.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    assert.equal(transbordo, false, 'a página não deve alargar')
    await painel.getByRole('button', { name: 'Cancelar edição da água', exact: true }).click()
    assert.deepEqual(erros, [])
    resultados.push({
      tema,
      largura,
      mar: true,
      historico: true,
      renomear: true,
      ocultar: true,
      ...(largura === 1440
        ? {
            rio: true,
            cachoeira: true,
            represa: true,
            ilhaSeca: true,
            recalcularNivel: true,
            cancelarVazamento: true,
            falhaRetomada: true,
            reabertura: true,
            transferenciaDeAgua: true,
          }
        : {}),
      erros,
    })
    await contexto.close()
  }
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(resultados, null, 2))
  console.log(JSON.stringify(resultados))
} catch (erro) {
  await pagina?.screenshot({ path: resolve(saida, 'falha.png') }).catch(() => {})
  console.error(await pagina?.locator('[role="alert"]').allTextContents())
  throw erro
} finally {
  await navegador.close()
}
