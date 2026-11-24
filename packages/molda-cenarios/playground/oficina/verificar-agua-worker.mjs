import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote5-worker')
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const pagina = await navegador.newPage(),
    erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForLoadState('networkidle')
  const modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
  const resultado = await pagina.evaluate(
    async ({ coreUrl, aguaUrl, terrenoUrl }) => {
      const core = await import(coreUrl),
        { processarAguaNoWorker } = await import(aguaUrl),
        { processarTerrenoNoWorker } = await import(terrenoUrl),
        base = {
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
        },
        original = core.abrirEdicaoDeTerreno(base, new Map()),
        copia = core.clonarEstadoDoTerreno(original),
        rioP = processarAguaNoWorker(
          {
            identidade: { id: 'rio', nome: 'Rio' },
            intencao: {
              tipo: 'rio',
              pontos: [
                { x: 8, z: 32 },
                { x: 56, z: 32 },
              ],
              largura: 4,
              profundidade: 2,
            },
            estado: copia,
          },
          new AbortController().signal,
        )
      const transferiu =
          copia.campo.alturas.byteLength === 0 &&
          copia.pintura.pesos.byteLength === 0 &&
          copia.buracos.celulas.byteLength === 0,
        rio = await rioP,
        mar = await processarAguaNoWorker(
          {
            identidade: { id: 'mar', nome: 'Mar' },
            intencao: { tipo: 'mar', nivel: 0 },
            estado: null,
          },
          new AbortController().signal,
        ),
        terreno = await processarTerrenoNoWorker(
          { base, estado: core.clonarEstadoDoTerreno(original), operacao: { tipo: 'exportar' } },
          new AbortController().signal,
        ),
        png = terreno.tipo === 'png' ? await core.lerPngDeAlturas(terreno.bytes) : null
      let erro = null
      try {
        await processarAguaNoWorker(
          {
            identidade: { id: 'invalido', nome: 'Rio' },
            intencao: { tipo: 'rio', pontos: [], largura: -1 },
            estado: null,
          },
          new AbortController().signal,
        )
      } catch (e) {
        erro = e.name
      }
      const cancelar = new AbortController(),
        cancelado = processarAguaNoWorker(
          {
            identidade: { id: 'cancelado', nome: 'Mar' },
            intencao: { tipo: 'mar', nivel: 0 },
            estado: null,
          },
          cancelar.signal,
        ).catch((e) => e)
      cancelar.abort()
      const cancelamento = await cancelado
      const grande = { ...base, colunas: 2048, linhas: 2048, fundo: 0 },
        estado = core.abrirEdicaoDeTerreno(grande, new Map()),
        controle = new AbortController(),
        inicio = performance.now()
      let terminou = false,
        quadros = 0
      const pesada = processarAguaNoWorker(
        {
          identidade: { id: 'lago', nome: 'Lago' },
          intencao: { tipo: 'lago', ponto: { x: 1024, z: 1024 }, nivel: 1 },
          estado,
        },
        controle.signal,
      ).then(
        (r) => {
          terminou = true
          return r
        },
        (e) => e,
      )
      await new Promise((r) =>
        requestAnimationFrame(() => {
          quadros++
          requestAnimationFrame(() => {
            quadros++
            r()
          })
        }),
      )
      const pendenteAntesDeCancelar = !terminou
      controle.abort()
      const pesadaFinal = await pesada
      return {
        transferiu,
        rio: {
          tipo: rio.agua.tipo,
          estacoes: rio.agua.pontos.length,
          regiao: rio.regioes.alturas,
          alterouLeito: rio.terreno.campo.alturas.some((h) => h < 10),
        },
        mar: mar.agua.tipo,
        png: { largura: png?.largura, altura: png?.altura },
        erro,
        cancelamento: cancelamento.name,
        pesada: {
          quadros,
          pendenteAntesDeCancelar,
          cancelamento: pesadaFinal.name ?? null,
          milisegundos: performance.now() - inicio,
        },
        origemIntacta: original.campo.alturas.every((h) => h === 10),
      }
    },
    {
      coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      aguaUrl: modulo('packages/molda-cenarios/src/oficina/processar-agua-no-worker.ts'),
      terrenoUrl: modulo('packages/molda-cenarios/src/oficina/processar-terreno-no-worker.ts'),
    },
  )
  assert.deepEqual(erros, [])
  assert.equal(resultado.transferiu, true)
  assert.equal(resultado.rio.tipo, 'rio')
  assert.ok(resultado.rio.estacoes > 2)
  assert.equal(resultado.rio.alterouLeito, true)
  assert.equal(resultado.mar, 'mar')
  assert.equal(resultado.erro, 'Error')
  assert.equal(resultado.cancelamento, 'AbortError')
  assert.equal(resultado.origemIntacta, true)
  assert.equal(resultado.pesada.quadros, 2)
  if (resultado.pesada.pendenteAntesDeCancelar)
    assert.equal(resultado.pesada.cancelamento, 'AbortError')
  assert.deepEqual(resultado.png, { largura: 65, altura: 65 })
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify({ ...resultado, erros }, null, 2))
  console.log(JSON.stringify(resultado))
} finally {
  await navegador.close()
}
