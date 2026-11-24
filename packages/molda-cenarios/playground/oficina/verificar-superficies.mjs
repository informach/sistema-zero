import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..')
const saida = resolve(process.argv[2] ?? resolve(raiz, 'output/cenarios-reforma/lote3-superficies'))
const modelo = JSON.parse(
  readFileSync(resolve(raiz, 'output/molda-cenarios/acervo/catalogo.json'), 'utf8'),
).modelos.find((m) => m.arquivo === (process.argv[3] ?? 'morada_banco.a3bf1765ed72.glb'))
assert.ok(modelo)
const modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const pagina = await navegador.newPage({ viewport: { width: 900, height: 650 } })
  const erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  const resultado = await pagina.evaluate(
    async ({ nucleo, motor, tres, modelo }) => {
      const core = await import(nucleo),
        { criarPalco } = await import(motor)
      const conteudo = await (
        await fetch(`/acervo/${encodeURIComponent(modelo.arquivo)}`)
      ).arrayBuffer()
      let d = core.criarDocumentoVazio('apoios', 'Apoios')
      d.modelos = [
        {
          id: 'banco',
          biblioteca: 'qa',
          modelo: modelo.id,
          digest: modelo.digest,
          volume: {
            min: { x: modelo.min[0], y: modelo.min[1], z: modelo.min[2] },
            max: { x: modelo.max[0], y: modelo.max[1], z: modelo.max[2] },
          },
        },
      ]
      d.instancias = [
        {
          id: 'suporte',
          nome: 'Suporte inclinado',
          modelo: 'banco',
          grupo: null,
          bloqueado: false,
          oculto: false,
          colisao: 'caixa',
          espelho: { x: true, y: false, z: false },
          apoio: { tipo: 'absoluto' },
          transformacao: {
            posicao: { x: 2, y: 3, z: 4 },
            rotacao: { x: 0, y: 0.3, z: 0.2 },
            escala: { x: 2, y: 1, z: 2 },
          },
        },
      ]
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:fixed;inset:0;width:800px;height:600px;z-index:100'
      document.body.append(canvas)
      const quadro = () => new Promise(requestAnimationFrame)
      let palco, pronto
      const carregado = new Promise((r) => {
        pronto = r
      })
      const mudancas = [],
        selecoes = []
      palco = criarPalco(canvas, {
        carregarModelo: async () => conteudo,
        movimentoReduzido: true,
        aoMedir: (e) => {
          if (palco?.volumeDoModelo('banco') && e.carregando === 0) pronto()
        },
        aoSelecionar: (id) => selecoes.push(id),
        aoTransformar: (itens) => {
          mudancas.push(itens)
          d = core.executarLote(
            { documento: d, revisao: 0 },
            {
              revisaoEsperada: 0,
              comandos: itens.map((i) => ({
                tipo: 'instancia.atualizar',
                id: i.id,
                alteracoes: {
                  transformacao: i.transformacao,
                  ...(i.apoio ? { apoio: i.apoio } : {}),
                },
              })),
            },
          ).documento
          palco.definirDocumento(d)
        },
      })
      {
        palco.definirDocumento(d)
        await carregado
        palco.definirVista('cima')
        palco.enquadrar()
        await quadro()
        const ponto = (deslocamento = 0) => {
          const r = canvas.getBoundingClientRect()
          return palco.pontoNoChao(r.x + r.width * (0.5 + deslocamento), r.y + r.height / 2)
        }
        palco.definirEncaixe({
          grade: 1,
          angulo: 90,
          origem: { x: 0.25, y: 0.5, z: -0.25 },
          superficie: true,
        })
        // Pontilhões têm frestas entre tábuas: procurar madeira visível, sem preencher o vão com AABB.
        const superficie = [0, 0.03, -0.03, 0.06, -0.06]
          .map(ponto)
          .find((p) => p?.apoio?.tipo === 'objeto')
        if (
          superficie?.apoio?.tipo !== 'objeto' ||
          superficie.apoio.objeto !== 'suporte' ||
          superficie.y < 3
        )
          throw new Error(
            `O ponto não veio da malha real do modelo inclinado: ${JSON.stringify(superficie)}`,
          )
        palco.definirEncaixe({
          grade: 1,
          angulo: 90,
          origem: { x: 0.25, y: 0.5, z: -0.25 },
          superficie: false,
        })
        const grade = ponto()
        if (!grade || Math.abs((grade.x - 0.25) % 1) > 1e-8 || grade.y !== 0)
          throw new Error('A origem da grade não foi aplicada')
        palco.definirEncaixe({
          grade: 1,
          angulo: 90,
          origem: { x: 0.25, y: 0.5, z: -0.25 },
          andar: { altura: 3, nivel: 2 },
        })
        const andar = ponto()
        if (andar?.apoio?.tipo !== 'absoluto' || Math.abs(andar.y - 6.5) > 1e-8)
          throw new Error('O plano do andar não foi aplicado')
        palco.definirEncaixe({ grade: 1, angulo: 90, superficie: true })
        await quadro()
        window.__gestosQA = {
          palco,
          ler: () => d,
          mudancas,
          selecoes,
          coordenadas: async (superficie) => {
            const { PerspectiveCamera, Vector3 } = await import(tres)
            palco.definirEncaixe({
              grade: 1,
              angulo: 90,
              origem: { x: 0.25, y: 0, z: 0 },
              superficie,
            })
            palco.enquadrar()
            palco.definirVista('frente')
            palco.definirSelecao(['suporte'])
            palco.definirFerramenta('mover')
            await quadro()
            const o = d.instancias[0],
              p = core.posicaoNoMundo(d, o),
              v = core.transformarVolume(palco.volumeDoModelo('banco'), {
                ...o.transformacao,
                posicao: p,
              })
            const centro = new Vector3(
              (v.min.x + v.max.x) / 2,
              (v.min.y + v.max.y) / 2,
              (v.min.z + v.max.z) / 2,
            )
            const raio = Math.max(
              1.5,
              new Vector3(v.max.x - v.min.x, v.max.y - v.min.y, v.max.z - v.min.z).length() / 2,
            )
            const distancia = (raio / Math.sin((48 * Math.PI) / 360)) * 1.15
            const r = canvas.getBoundingClientRect(),
              camera = new PerspectiveCamera(48, r.width / r.height, 0.1, 6000)
            camera.position
              .copy(centro)
              .addScaledVector(new Vector3(0, 0.12, 1).normalize(), distancia)
            camera.lookAt(centro)
            camera.updateMatrixWorld(true)
            const fator =
              (new Vector3(p.x, p.y, p.z).distanceTo(camera.position) *
                1.9 *
                Math.tan((48 * Math.PI) / 360) *
                0.9) /
              4
            const alvo = new Vector3(p.x + fator * 0.4, p.y, p.z).project(camera)
            return { x: r.x + ((alvo.x + 1) * r.width) / 2, y: r.y + ((1 - alvo.y) * r.height) / 2 }
          },
        }
        return {
          superficie: { y: superficie.y, apoio: superficie.apoio.tipo },
          grade: { x: grade.x, y: grade.y, z: grade.z },
          andar: andar.y,
        }
      }
    },
    {
      nucleo: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      motor: modulo('packages/molda-cenarios-motor/src/index.ts'),
      tres: modulo('node_modules/three/build/three.module.js'),
      modelo,
    },
  )
  for (const superficie of [false, true]) {
    const p = await pagina.evaluate((ativo) => window.__gestosQA.coordenadas(ativo), superficie)
    await pagina.screenshot({ path: resolve(saida, `alca-${superficie}.png`) })
    await pagina.mouse.move(p.x, p.y)
    await pagina.mouse.down()
    await pagina.mouse.move(p.x + 100, p.y, { steps: 12 })
    await pagina.mouse.up()
    const estado = await pagina.evaluate(() => ({
      doc: window.__gestosQA.ler(),
      gestos: window.__gestosQA.mudancas.length,
    }))
    assert.equal(estado.gestos, superficie ? 2 : 1)
    const o = estado.doc.instancias[0]
    assert.ok(Math.abs((o.transformacao.posicao.x - 0.25) % 1) < 0.001)
    if (superficie) assert.equal(o.apoio.tipo, 'terreno')
  }
  const antes = await pagina.evaluate(() => window.__gestosQA.selecoes.length)
  await pagina.mouse.move(40, 400)
  await pagina.mouse.down()
  await pagina.mouse.move(110, 440, { steps: 8 })
  await pagina.mouse.up()
  assert.equal(await pagina.evaluate(() => window.__gestosQA.selecoes.length), antes)
  await pagina.screenshot({ path: resolve(saida, 'gesto-encaixado.png') })
  await pagina.evaluate(() => {
    window.__gestosQA.palco.destruir()
    window.__gestosQA.palco.destruir()
  })
  assert.deepEqual(erros, [])
  writeFileSync(
    resolve(saida, 'resultado.json'),
    `${JSON.stringify({ modelo: modelo.arquivo, ...resultado, gestos: 2, orbitaSemSelecao: true, erros }, null, 2)}\n`,
  )
  console.log(JSON.stringify({ ...resultado, erros }))
} finally {
  await navegador.close()
}
