import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

// O arquivo privado de ensaio contém Lighthouse_01.fbx e seus dois atlas originais.
// Não versionar o ZIP, GLB convertido ou os atlas; o relatório guarda somente medidas.
const raiz = resolve(import.meta.dirname, '../../../..')
const arquivo = resolve(process.argv[2] ?? 'output/cenarios-reforma/fbx-real/farol-original.zip')
const saida = resolve(raiz, 'output/cenarios-reforma/fbx-real')
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
const pagina = await navegador.newPage()
const erros = []
pagina.on('pageerror', (e) => erros.push(e.message))
try {
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  const resultado = await pagina.evaluate(
    async ({ zip, modulo }) => {
      const { prepararArquivos, encerrarPreparacao } = await import(modulo)
      const dados = Uint8Array.from(atob(zip), (c) => c.charCodeAt(0))
      try {
        const r = await prepararArquivos([new File([dados], 'farol-original.zip')])
        return {
          recusados: r.recusados,
          modelos: await Promise.all(
            r.prontos.map(async (m) => {
              const view = new DataView(
                m.conteudo.buffer,
                m.conteudo.byteOffset,
                m.conteudo.byteLength,
              )
              const gltf = JSON.parse(
                new TextDecoder().decode(m.conteudo.subarray(20, 20 + view.getUint32(12, true))),
              )
              return {
                nome: m.nome,
                digest: m.digest,
                min: m.min,
                max: m.max,
                triangulos: m.triangulos,
                bytes: m.conteudo.length,
                imagens: gltf.images?.length ?? 0,
                animacoes: gltf.animations?.length ?? 0,
                miniaturaBytes: m.miniatura.size,
              }
            }),
          ),
        }
      } finally {
        await encerrarPreparacao()
      }
    },
    {
      zip: readFileSync(arquivo).toString('base64'),
      modulo: `/@fs/${resolve(raiz, 'packages/molda-cenarios/src/oficina/importar.ts').replaceAll('\\', '/')}`,
    },
  )
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify({ ...resultado, erros }, null, 2))
  assert.deepEqual(erros, [])
  assert.deepEqual(resultado.recusados, [])
  assert.equal(resultado.modelos.length, 1)
  const farol = resultado.modelos[0]
  assert.ok(farol.imagens > 0, 'O material original precisa continuar texturizado')
  assert.ok(farol.triangulos > 100 && farol.miniaturaBytes > 1000)
  const altura = farol.max[1] - farol.min[1]
  assert.ok(altura > 20 && altura < 30, `A medida em metros do farol ficou incorreta: ${altura}`)
  console.log(
    JSON.stringify({
      fbxBinarioReal: true,
      altura,
      imagens: farol.imagens,
      triangulos: farol.triangulos,
    }),
  )
} finally {
  await navegador.close()
}
