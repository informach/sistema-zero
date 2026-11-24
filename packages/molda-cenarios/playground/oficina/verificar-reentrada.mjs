import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

// Exercita o palco real: remover e recolocar um modelo enquanto a leitura anterior está em voo.
const raiz = resolve(import.meta.dirname, '../../../..')
const saida = resolve(process.argv[2] ?? resolve(raiz, 'output/cenarios-reforma/reentrada'))
mkdirSync(saida, { recursive: true })
const modulo = (caminho) => `/@fs/${resolve(raiz, caminho).replaceAll('\\', '/')}`
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
const pagina = await navegador.newPage({ viewport: { width: 1024, height: 768 } })
const erros = []
pagina.on('pageerror', (e) => erros.push(e.message))
try {
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  const resultado = await pagina.evaluate(
    async ({ motor, core }) => {
      const { criarPalco } = await import(motor)
      const { criarDocumentoVazio } = await import(core)
      const posicoes = new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0])
      const gltf = {
        asset: { version: '2.0' },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        buffers: [{ byteLength: posicoes.byteLength }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: posicoes.byteLength }],
        accessors: [
          {
            bufferView: 0,
            componentType: 5126,
            count: 3,
            type: 'VEC3',
            min: [0, 0, 0],
            max: [2, 2, 0],
          },
        ],
      }
      const json = new TextEncoder().encode(JSON.stringify(gltf))
      const comprimento = Math.ceil(json.length / 4) * 4
      const bytes = new Uint8Array(20 + comprimento + 8 + posicoes.byteLength)
      const view = new DataView(bytes.buffer)
      view.setUint32(0, 0x46546c67, true)
      view.setUint32(4, 2, true)
      view.setUint32(8, bytes.length, true)
      view.setUint32(12, comprimento, true)
      view.setUint32(16, 0x4e4f534a, true)
      bytes.fill(32, 20, 20 + comprimento)
      bytes.set(json, 20)
      view.setUint32(20 + comprimento, posicoes.byteLength, true)
      view.setUint32(24 + comprimento, 0x004e4942, true)
      bytes.set(new Uint8Array(posicoes.buffer), 28 + comprimento)
      const hash = await crypto.subtle.digest('SHA-256', bytes)
      const digest = [...new Uint8Array(hash)].map((v) => v.toString(16).padStart(2, '0')).join('')
      const vazio = criarDocumentoVazio('qa-reentrada', 'QA reentrada')
      const documento = {
        ...vazio,
        modelos: [{ id: 'triangulo', biblioteca: 'qa', modelo: 'triangulo', digest }],
        instancias: [
          {
            id: 'objeto',
            nome: 'Triângulo',
            modelo: 'triangulo',
            grupo: null,
            bloqueado: false,
            oculto: false,
            apoio: { tipo: 'absoluto' },
            colisao: 'nenhuma',
            transformacao: {
              posicao: { x: 0, y: 0, z: 0 },
              rotacao: { x: 0, y: 0, z: 0 },
              escala: { x: 1, y: 1, z: 1 },
            },
          },
        ],
      }
      const pausa = (ms) => new Promise((r) => setTimeout(r, ms))
      const provas = []
      for (const antigaFalha of [true, false]) {
        const tela = document.createElement('canvas')
        tela.style.cssText = 'width:800px;height:600px'
        document.body.append(tela)
        const leituras = [],
          falhas = []
        const palco = criarPalco(tela, {
          carregarModelo: () =>
            new Promise((resolve, reject) => leituras.push({ resolve, reject })),
          aoFalhar: (_modelo, erro) => falhas.push(erro.message),
        })
        try {
          palco.definirDocumento(documento)
          palco.definirDocumento(vazio)
          palco.definirDocumento(documento)
          if (leituras.length !== 2) throw Error('Esperadas duas leituras independentes')
          if (antigaFalha) leituras[0].reject(Error('Leitura antiga interrompida'))
          else leituras[0].resolve(bytes.buffer.slice(0))
          await pausa(250)
          const ignorouAntiga = palco.volumeDoModelo('triangulo') === null && falhas.length === 0
          leituras[1].resolve(bytes.buffer.slice(0))
          const fim = Date.now() + 5000
          while (palco.volumeDoModelo('triangulo') === null && Date.now() < fim) await pausa(50)
          const volume = palco.volumeDoModelo('triangulo')
          provas.push({ antigaFalha, ignorouAntiga, falhas, volume })
        } finally {
          palco.destruir()
          palco.destruir() // encerramento idempotente
          tela.remove()
        }
      }
      return provas
    },
    {
      motor: modulo('packages/molda-cenarios-motor/src/Palco.ts'),
      core: modulo('packages/molda-cenarios-core/src/v2/documento.ts'),
    },
  )
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify({ resultado, erros }, null, 2))
  assert.deepEqual(erros, [])
  for (const prova of resultado) {
    assert.equal(prova.ignorouAntiga, true, 'A leitura antiga não pode alterar a reentrada')
    assert.deepEqual(prova.falhas, [])
    assert.deepEqual(prova.volume, { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 0 } })
  }
  console.log(
    'Reentrada: falha e sucesso atrasados ignorados; modelo atual carregado no palco real',
  )
} finally {
  await navegador.close()
}
