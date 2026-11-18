import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote4-material')
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
const resultados = []
try {
  for (const quantidade of [1, 4, 8]) {
    const p = await navegador.newPage({ viewport: { width: 1280, height: 800 } })
    const erros = []
    p.on('pageerror', (e) => erros.push(e.message))
    p.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text())
    })
    await p.goto('http://127.0.0.1:4541/?vazio=1')
    await p.waitForFunction(() => window.__cenarios)
    const resultado = await p.evaluate(
      async ({ raiz, quantidade }) => {
        const local = raiz.replaceAll('\\', '/'),
          core = await import(`/@fs/${local}/packages/molda-cenarios-core/src/v2/index.ts`),
          { criarPalco } = await import(`/@fs/${local}/packages/molda-cenarios-motor/src/index.ts`)
        document.querySelector('#root').remove()
        const canvas = document.createElement('canvas')
        canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%'
        document.body.append(canvas)
        const tela = document.createElement('canvas')
        tela.width = tela.height = 32
        const ctx = tela.getContext('2d')
        ctx.fillStyle = '#f5e7c0'
        ctx.fillRect(0, 0, 32, 32)
        ctx.fillStyle = '#50806c'
        ctx.fillRect(0, 0, 16, 16)
        ctx.fillRect(16, 16, 16, 16)
        const imagem = await new Promise((r) => tela.toBlob(r, 'image/png')),
          bytes = await imagem.arrayBuffer(),
          digestImagem = await core.digestDosBytes(new Uint8Array(bytes)),
          d = core.criarDocumentoVazio('qa', 'Solo')
        d.base = {
          tipo: 'terreno',
          origem: { x: -32, z: -32 },
          passo: 1,
          colunas: 64,
          linhas: 64,
          min: -10,
          max: 100,
          fundo: 0,
          pecas: [],
          solo: {
            camadas: Array.from({ length: quantidade }, (_, i) => ({
              id: `c${i}`,
              nome: `Solo ${i}`,
              cor: '#ffffff',
              textura: { id: 'chao', repeticaoMetros: i + 1 },
            })),
            pecas: [],
          },
        }
        const pintura = core.criarPinturaDeChao(d.base, quantidade)
        d.base.recortes = [
          [
            { x: -4, z: -4 },
            { x: 4, z: -4 },
            { x: 4, z: 4 },
            { x: -4, z: 4 },
          ],
        ]
        for (let z = 0; z <= 64; z++)
          for (let x = 0; x <= 64; x++) {
            const i = (z * 65 + x) * quantidade,
              faixa = Math.min(quantidade - 1, Math.floor((x / 65) * quantidade))
            pintura.pesos.fill(0, i, i + quantidade)
            pintura.pesos[i + faixa] = 255
          }
        const conteudo = core.codificarPecaDePintura(pintura, 0, 0),
          digest = await core.digestDosBytes(conteudo)
        d.base.solo.pecas = [{ coluna: 0, linha: 0, digest }]
        d.texturas = [
          {
            id: 'chao',
            nome: 'Trama de teste',
            biblioteca: 'qa',
            textura: 'chao',
            digest: digestImagem,
          },
        ]
        let terrenoPronto = false,
          texturasProntas = false,
          medidas = null,
          falha = null
        const palco = criarPalco(canvas, {
          carregarModelo: async () => {
            throw new Error('Não há modelo neste ensaio')
          },
          carregarTerreno: async () => conteudo.buffer,
          carregarTextura: async () => {
            // Exercita também a textura de espera na GPU, em todos os ciclos.
            while (!terrenoPronto) await new Promise((r) => setTimeout(r, 10))
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
            return bytes
          },
          aoTerreno: (e) => {
            terrenoPronto = e.estado === 'pronto'
            if (e.estado === 'erro') falha = String(e.erro)
          },
          aoTexturas: (e) => {
            texturasProntas = !e.carregando && !e.falhas.length
          },
          aoMedir: (e) => {
            medidas = e
          },
        })
        palco.definirDocumento(core.validarDocumento(d))
        palco.enquadrar()
        const esperar = async () => {
          const limite = performance.now() + 15000
          while (!(terrenoPronto && texturasProntas && medidas)) {
            if (falha) throw Error(falha)
            if (performance.now() > limite) throw Error('Solo não ficou pronto')
            await new Promise((r) => setTimeout(r, 25))
          }
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
          return { ...medidas }
        }
        const inicial = await esperar(),
          ciclos = []
        for (let i = 0; i < 3; i++) {
          terrenoPronto = false
          medidas = null
          palco.definirDocumento(core.criarDocumentoVazio('qa', 'Plano'))
          const plano = await esperar()
          terrenoPronto = false
          medidas = null
          palco.definirDocumento(d)
          const solo = await esperar()
          ciclos.push({ plano, solo })
        }
        window.__materialTerreno = palco
        window.__materialDocumento = d
        return { quantidade, medidas: inicial, ciclos, soloPronto: terrenoPronto, texturasProntas }
      },
      { raiz, quantidade },
    )
    await p.screenshot({ path: resolve(saida, `solo-${quantidade}.png`) })
    if (quantidade === 8) {
      await p.evaluate(async () => {
        window.__materialTerreno.definirDocumento({
          ...window.__materialDocumento,
          iluminacao: { hora: 21 },
        })
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      })
      await p.screenshot({ path: resolve(saida, 'solo-8-noite.png') })
    }
    await p.evaluate(() => window.__materialTerreno.destruir())
    assert.deepEqual(erros, [])
    assert.ok(resultado.medidas.triangulos >= 8192)
    writeFileSync(resolve(saida, `recursos-${quantidade}.json`), JSON.stringify(resultado, null, 2))
    for (const ciclo of resultado.ciclos) {
      for (const campo of ['geometrias', 'texturas']) {
        assert.equal(ciclo.solo[campo], resultado.medidas[campo])
        assert.equal(ciclo.plano[campo], resultado.ciclos[0].plano[campo])
      }
    }
    resultados.push({ ...resultado, erros })
    console.log(`Solo real compilado: ${quantidade} camadas`)
    await p.close()
  }
  writeFileSync(resolve(saida, 'resultados.json'), JSON.stringify(resultados, null, 2))
} finally {
  await navegador.close()
}
