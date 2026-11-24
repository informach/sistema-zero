import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..')
const modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
const saida = resolve(process.argv[2] ?? resolve(raiz, 'output/cenarios-reforma/terreno-vida'))
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const pagina = await navegador.newPage({ viewport: { width: 1024, height: 768 } })
  const erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  const resultado = await pagina.evaluate(
    async ([nucleo, motor]) => {
      const core = await import(nucleo),
        { criarPalco } = await import(motor)
      const bytes = core.codificarPecaDeAlturas(
        new Float64Array(core.AMOSTRAS_DA_PECA).fill(5),
        0,
        255,
      )
      const digest = await core.digestDosBytes(bytes)
      const doc = core.criarDocumentoVazio('qa-vida', 'Relevo')
      doc.base = {
        tipo: 'terreno',
        origem: { x: -32, z: -32 },
        passo: 1,
        colunas: 64,
        linhas: 64,
        min: 0,
        max: 255,
        fundo: 0,
        pecas: [{ coluna: 0, linha: 0, digest }],
      }
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:fixed;inset:0;width:800px;height:600px'
      document.body.append(canvas)
      const esperar = async (condicao) => {
        const fim = performance.now() + 5000
        while (!condicao()) {
          if (performance.now() > fim) throw new Error('A transição do terreno não terminou')
          await new Promise((r) => setTimeout(r, 10))
        }
      }
      let chamadas = 0,
        liberarAntiga
      const estados = []
      const palco = criarPalco(canvas, {
        carregarModelo: async () => {
          throw new Error('Não há modelos neste ensaio')
        },
        carregarTerreno: () =>
          ++chamadas === 1
            ? new Promise((r) => {
                liberarAntiga = r
              })
            : Promise.resolve(bytes.buffer),
        aoTerreno: ({ estado }) => estados.push(estado),
        movimentoReduzido: true,
      })
      try {
        palco.definirDocumento(doc)
        if (palco.fonteDeAlturas() !== undefined)
          throw new Error('O relevo foi substituído por um plano durante a espera')
        palco.definirDocumento(core.criarDocumentoVazio('plano', 'Plano'))
        palco.definirDocumento(doc)
        await esperar(() => palco.fonteDeAlturas())
        const altura = palco.fonteDeAlturas()(0, 0)
        liberarAntiga(bytes.buffer)
        await new Promise((r) => setTimeout(r, 50))
        if (palco.fonteDeAlturas()(0, 0) !== altura || altura !== 5)
          throw new Error('A leitura antiga substituiu a base atual')
        const antesDeDestruir = estados.length
        palco.destruir()
        await new Promise((r) => setTimeout(r, 50))
        if (estados.length !== antesDeDestruir || palco.fonteDeAlturas() !== undefined)
          throw new Error('O palco descartado manteve o recurso')
      } finally {
        palco.destruir()
      }
      const falhas = []
      const invalido = criarPalco(canvas, {
        carregarModelo: async () => new ArrayBuffer(0),
        carregarTerreno: async () => new Uint8Array(core.BYTES_DA_PECA).buffer,
        aoTerreno: ({ estado, erro }) => falhas.push({ estado, mensagem: erro?.message }),
        movimentoReduzido: true,
      })
      try {
        invalido.definirDocumento(doc)
        await esperar(() => falhas.some((f) => f.estado === 'erro'))
        if (invalido.fonteDeAlturas() !== undefined || invalido.pontoNoChao(100, 100) !== null)
          throw new Error('Um arquivo inválido virou um chão editável')
      } finally {
        invalido.destruir()
        canvas.remove()
      }
      return { reentrada: true, altura: 5, estados, erroExplicito: falhas.at(-1), descarte: true }
    },
    [
      modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      modulo('packages/molda-cenarios-motor/src/index.ts'),
    ],
  )
  assert.deepEqual(erros, [])
  assert.equal(resultado.reentrada, true)
  assert.equal(resultado.erroExplicito.estado, 'erro')
  writeFileSync(
    resolve(saida, 'resultado.json'),
    `${JSON.stringify({ ...resultado, erros }, null, 2)}\n`,
  )
  console.log(JSON.stringify(resultado))
} finally {
  await navegador.close()
}
