import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote3-testar-fisica')
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
let p
try {
  p = await navegador.newPage({ viewport: { width: 1024, height: 768 } })
  const erros = []
  p.on('pageerror', (e) => erros.push(e.message))
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForLoadState('networkidle')
  const modulo = (pasta) => `/@fs/${resolve(raiz, pasta).replaceAll('\\', '/')}`
  const resultados = []
  for (const caso of ['rampa', 'espelho', 'conjunto', 'agua']) {
    const resultado = await p.evaluate(
      async ({ caso, motor, nucleo }) => {
        const core = await import(nucleo),
          { criarPalco } = await import(motor)
        let d = core.criarDocumentoVazio('teste', 'Física')
        const objeto = {
          id: 'rampa',
          nome: 'Rampa',
          modelo: 'rampa',
          grupo: null,
          oculto: false,
          bloqueado: false,
          colisao: 'malha',
          apoio: { tipo: 'absoluto' },
          transformacao: {
            posicao: { x: 0, y: 0, z: 0 },
            rotacao: { x: 0, y: 0, z: 0 },
            escala: { x: 1, y: 1, z: 1 },
          },
        }
        d.formas = [
          { id: 'rampa', nome: 'Rampa', tipo: 'rampa', largura: 3, altura: 1, comprimento: 4 },
        ]
        d.instancias = [objeto]
        let inicio = { x: 0, y: 0, z: -4 },
          entrada = { frente: -1, lado: 0 }
        if (caso === 'espelho') {
          objeto.espelho = { x: false, y: false, z: true }
          inicio.z = 4
          entrada.frente = 1
        }
        if (caso === 'conjunto') {
          const conteudo = core.capturarConteudoDeConjunto(d, ['rampa'], 'qa')
          d = core.criarDocumentoVazio('teste', 'Conjunto')
          const { definicao, comandos } = core.referenciarConjunto(d, {
            biblioteca: 'qa',
            conjunto: 'conjunto',
            revisao: 1,
            nome: 'Rampa',
            conteudo,
          })
          d = core.executarLote(
            { documento: d, revisao: 0 },
            {
              revisaoEsperada: 0,
              comandos: [
                ...comandos,
                {
                  tipo: 'montagem.definir',
                  montagem: {
                    id: 'copia',
                    nome: 'Rampa em conjunto',
                    grupo: null,
                    oculto: false,
                    bloqueado: false,
                    definicao: definicao.id,
                    transformacao: {
                      posicao: { x: 5, y: 0, z: 0 },
                      rotacao: { x: 0, y: Math.PI / 2, z: 0 },
                      escala: { x: 1, y: 1, z: 1 },
                    },
                  },
                },
              ],
            },
          ).documento
          inicio = { x: 1, y: 0, z: 0 }
          entrada = { frente: 0, lado: 1 }
        }
        if (caso === 'agua') {
          d = core.criarDocumentoVazio('teste', 'Nado')
          d.base = {
            tipo: 'terreno',
            origem: { x: -32, z: -32 },
            colunas: 64,
            linhas: 64,
            passo: 1,
            min: -10,
            max: 10,
            fundo: -2,
            pecas: [],
          }
          const contorno = [
            { x: -2, z: -2 },
            { x: 2, z: -2 },
            { x: 2, z: 2 },
            { x: -2, z: 2 },
          ]
          d.aguas = [
            {
              id: 'lago',
              nome: 'Lago',
              grupo: null,
              oculto: false,
              bloqueado: false,
              tipo: 'lago',
              modelo: null,
              centro: { x: 0, z: 0 },
              giro: 0,
              escala: 1,
              nivel: 0,
              profundidade: 3,
              contorno,
              recorte: contorno,
            },
          ]
          inicio = { x: -1, y: -2, z: 0 }
          entrada = { frente: 0, lado: 1 }
        }
        const original = JSON.stringify(d),
          tela = document.createElement('canvas')
        tela.tabIndex = 0
        tela.style.cssText = 'position:fixed;inset:0;z-index:1000;width:100vw;height:100vh'
        document.body.append(tela)
        const palco = criarPalco(tela, {
          carregarModelo: async () => {
            throw Error('Não há GLB neste ensaio')
          },
        })
        palco.definirDocumento(d)
        await palco.aguardarRecursos()
        palco.definirVista('frente')
        await palco.iniciarTeste({ modo: 'terceira', inicio, altura: 1.16 })
        palco.comandarTeste({ percurso: 'iniciar' })
        palco.entradaDoTeste(entrada)
        await new Promise((r) => setTimeout(r, caso === 'agua' ? 1800 : 3300))
        const estado = palco.estadoDoTeste()
        let saiuDaAgua = null
        if (caso === 'agua') {
          await new Promise((r) => setTimeout(r, 2800))
          saiuDaAgua = palco.estadoDoTeste()
        }
        palco.entradaDoTeste({ frente: 0, lado: 0 })
        window.__fisicaQA = { palco, tela }
        return { caso, estado, saiuDaAgua, autoriaPreservada: JSON.stringify(d) === original }
      },
      {
        caso,
        motor: modulo('packages/molda-cenarios-motor/src/index.ts'),
        nucleo: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      },
    )
    if (caso === 'agua') {
      assert.equal(resultado.estado.nadando, true)
      assert.equal(resultado.estado.noChao, false)
      assert.equal(resultado.estado.percurso.caminhada, 0)
      assert.equal(resultado.saiuDaAgua.nadando, false)
      assert.ok(resultado.saiuDaAgua.percurso.caminhada > 0.5)
    } else
      assert.ok(
        resultado.estado.posicao.y > 0.55 && resultado.estado.posicao.y < 1.25,
        `Não subiu ${caso}: ${JSON.stringify(resultado.estado.posicao)}`,
      )
    assert.equal(resultado.autoriaPreservada, true)
    await p.screenshot({ path: resolve(saida, `${caso}.png`) })
    resultados.push(resultado)
    await p.evaluate(() => {
      window.__fisicaQA.palco.destruir()
      window.__fisicaQA.tela.remove()
    })
    console.log(`Física real conferida: ${caso}`)
  }
  assert.deepEqual(erros, [])
  writeFileSync(resolve(saida, 'resultados.json'), JSON.stringify({ resultados, erros }, null, 2))
} catch (e) {
  if (p) await p.screenshot({ path: resolve(saida, 'falha.png') }).catch(() => {})
  throw e
} finally {
  await navegador.close()
}
