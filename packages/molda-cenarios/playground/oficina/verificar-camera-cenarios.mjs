import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(process.argv[2] ?? 'output/cenarios-reforma/lote3-camera')
const fs = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const p = await browser.newPage({ viewport: { width: 1024, height: 900 } })
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForLoadState('networkidle')
  const resultados = []
  for (const [tipo, largura, altura] of [
    ['plano', 800, 600],
    ['plano', 300, 800],
    ['terreno', 800, 600],
  ]) {
    const resultado = await p.evaluate(
      async ({ corePath, motorPath, largura, altura, tipo }) => {
        const core = await import(corePath),
          motor = await import(motorPath)
        const caixa = document.createElement('div')
        caixa.style.cssText = `position:fixed;left:0;top:0;width:${largura}px;height:${altura}px;z-index:99999`
        const canvas = document.createElement('canvas')
        canvas.style.cssText = 'width:100%;height:100%'
        caixa.append(canvas)
        document.body.append(caixa)
        const palco = motor.criarPalco(canvas, {
          carregarModelo: async () => {
            throw Error('Somente formas neste ensaio')
          },
          movimentoReduzido: true,
        })
        try {
          const doc = core.criarDocumentoVazio('grande', 'Enquadramento extenso')
          doc.base =
            tipo === 'plano'
              ? { tipo: 'plano', largura: 8192, comprimento: 8192 }
              : {
                  tipo: 'terreno',
                  origem: { x: -4096, z: -4096 },
                  passo: 2,
                  colunas: 4096,
                  linhas: 4096,
                  min: -1000,
                  max: 1000,
                  fundo: 0,
                  pecas: [],
                }
          doc.formas = [
            {
              id: 'marco',
              nome: 'Marco de ensaio',
              tipo: 'caixa',
              largura: 80,
              altura: 100,
              comprimento: 80,
            },
          ]
          doc.instancias = [-4000, 4000].map((x, i) => ({
            id: `p${i}`,
            nome: `Marco ${i}`,
            modelo: 'marco',
            grupo: null,
            bloqueado: false,
            oculto: false,
            colisao: 'caixa',
            apoio: { tipo: 'absoluto' },
            aparencia: { cor: '#ff0000' },
            transformacao: {
              posicao: { x, y: 0, z: 0 },
              rotacao: { x: 0, y: 0, z: 0 },
              escala: { x: 2, y: 3, z: 2 },
            },
          }))
          palco.definirDocumento(doc)
          await palco.aguardarRecursos()
          await new Promise(requestAnimationFrame)
          await new Promise(requestAnimationFrame)
          palco.enquadrar()
          await new Promise(requestAnimationFrame)
          const foto = await palco.capturar(largura),
            bitmap = await createImageBitmap(foto)
          const tela = document.createElement('canvas')
          tela.width = bitmap.width
          tela.height = bitmap.height
          const ctx = tela.getContext('2d')
          ctx.drawImage(bitmap, 0, 0)
          bitmap.close()
          const dados = ctx.getImageData(0, 0, tela.width, tela.height).data
          let esquerda = 0,
            direita = 0
          for (let i = 0; i < dados.length; i += 4) {
            const x = (i / 4) % tela.width
            if (dados[i] > 80 && dados[i] > dados[i + 1] * 1.5 && dados[i] > dados[i + 2] * 1.5) {
              if (x < tela.width * 0.45) esquerda++
              if (x > tela.width * 0.55) direita++
            }
          }
          return {
            tipo,
            largura,
            altura,
            esquerda,
            direita,
            foto: Array.from(new Uint8Array(await foto.arrayBuffer())),
          }
        } finally {
          palco.destruir()
          caixa.remove()
        }
      },
      {
        corePath: fs('packages/molda-cenarios-core/src/v2/index.ts'),
        motorPath: fs('packages/molda-cenarios-motor/src/index.ts'),
        largura,
        altura,
        tipo,
      },
    )
    const { foto, ...registro } = resultado
    writeFileSync(resolve(saida, `vista-${tipo}-${largura}.webp`), Buffer.from(foto))
    assert.ok(
      resultado.esquerda > 3 && resultado.direita > 3,
      `Marcos a 8 km não ficaram ambos visíveis: ${JSON.stringify(registro)}`,
    )
    resultados.push(registro)
  }
  writeFileSync(resolve(saida, 'resultados.json'), JSON.stringify(resultados, null, 2))
  console.log(JSON.stringify(resultados))
} finally {
  await browser.close()
}
