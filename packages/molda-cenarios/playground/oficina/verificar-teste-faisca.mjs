import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  fonte = resolve(raiz, 'output/cenarios-reforma/conversao-faisca/original'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote3-testar-faisca')
const documento = JSON.parse(readFileSync(resolve(fonte, 'documento.json'), 'utf8'))
const catalogo = JSON.parse(
  readFileSync(resolve(raiz, 'output/molda-cenarios/acervo/catalogo.json'), 'utf8'),
).modelos
const arquivos = Object.fromEntries(
  documento.modelos.map((ref) => {
    const m = catalogo.find((m) => m.id === ref.id && m.digest === ref.digest)
    assert.ok(m, `Modelo fixado ausente: ${ref.id}`)
    return [ref.digest, m.arquivo]
  }),
)
const avatar = resolve(raiz, 'output/cenarios-reforma/lote3-testar-avatar'),
  meta = JSON.parse(readFileSync(resolve(avatar, 'metadados.json'), 'utf8'))
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
let p
try {
  const contexto = await navegador.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: resolve(saida, 'movimento'), size: { width: 1440, height: 900 } },
  })
  p = await contexto.newPage()
  const erros = []
  p.on('pageerror', (e) => erros.push(e.message))
  p.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  await p.route('**/qa-avatar.glb', (r) =>
    r.fulfill({
      path: resolve(avatar, 'avatar-cute-ensaio.glb'),
      contentType: 'model/gltf-binary',
    }),
  )
  await p.route('**/qa-alturas/**', (r) => {
    const digest = new URL(r.request().url()).pathname.split('/').at(-1)
    if (!/^[a-f0-9]{64}$/.test(digest)) return r.abort()
    return r.fulfill({
      path: resolve(fonte, 'recursos', `${digest}.szht`),
      contentType: 'application/octet-stream',
    })
  })
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForLoadState('networkidle')
  const modulo = (pasta) => `/@fs/${resolve(raiz, pasta).replaceAll('\\', '/')}`
  const antes = JSON.stringify(documento)
  const inicio = await p.evaluate(
    async ({ documento, arquivos, meta, motor, nucleo }) => {
      const core = await import(nucleo),
        { criarPalco } = await import(motor)
      const bytes = new Uint8Array(await (await fetch('/qa-avatar.glb')).arrayBuffer())
      const personagem = {
        id: 'qa-avatar',
        biblioteca: 'qa',
        modelo: 'qa-avatar',
        digest: await core.digestDosBytes(bytes),
        volume: {
          min: { x: meta.min[0], y: meta.min[1], z: meta.min[2] },
          max: { x: meta.max[0], y: meta.max[1], z: meta.max[2] },
        },
      }
      const tela = document.createElement('canvas')
      tela.tabIndex = 0
      tela.style.cssText =
        'position:fixed;inset:0;z-index:1000;width:100vw;height:100vh;touch-action:none'
      document.body.append(tela)
      let ultimaMedida = null
      const palco = criarPalco(tela, {
        carregarModelo: async (ref) =>
          ref.id === 'qa-avatar'
            ? bytes.buffer.slice(0)
            : fetch(`/acervo/${arquivos[ref.digest]}`).then((r) => {
                if (!r.ok) throw Error('Modelo ausente')
                return r.arrayBuffer()
              }),
        carregarTerreno: async (digest) =>
          fetch(`/qa-alturas/${digest}`).then((r) => r.arrayBuffer()),
        aoMedir: (valor) => {
          ultimaMedida = valor
        },
      })
      palco.definirDocumento(documento)
      await palco.aguardarRecursos()
      palco.definirVista('frente')
      const casa = documento.marcadores.find((m) => m.nome === 'lugar:casa').posicao
      const altura = palco.fonteDeAlturas()(casa.x, casa.z)
      await new Promise((r) => setTimeout(r, 150))
      const base = structuredClone(ultimaMedida)
      await palco.iniciarTeste({
        modo: 'terceira',
        inicio: { x: casa.x, y: altura, z: casa.z },
        modelo: personagem,
        clipes: {
          parado: 'parado_relaxado',
          andando: 'andar_frente',
          correndo: 'correr_frente',
          saltando: 'pulo_no_ar',
        },
      })
      window.__ensaioFaisca = { palco, documento, base, medida: () => ultimaMedida }
      return { altura: palco.estadoDoTeste().altura, inicio: palco.estadoDoTeste().posicao, base }
    },
    {
      documento: structuredClone(documento),
      arquivos,
      meta,
      motor: modulo('packages/molda-cenarios-motor/src/index.ts'),
      nucleo: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
    },
  )
  assert.ok(inicio.altura > 1.1 && inicio.altura < 1.25)
  await p.waitForTimeout(300)
  await p.screenshot({ path: resolve(saida, 'morada-terceira.png') })
  const percurso = async (alvos, modo, correr = false) => {
    return p.evaluate(
      async ({ alvos, modo, correr }) => {
        const { palco } = window.__ensaioFaisca
        palco.comandarTeste({ modo, percurso: 'iniciar' })
        palco.entradaDoTeste({ correr })
        for (const alvo of alvos) {
          const fim = performance.now() + 25000
          let ultimo = palco.estadoDoTeste().posicao,
            paradoEm = performance.now()
          while (true) {
            const e = palco.estadoDoTeste(),
              dx = alvo.x - e.posicao.x,
              dz = alvo.z - e.posicao.z,
              distancia = Math.hypot(dx, dz)
            if (distancia < 0.45) break
            if (performance.now() > fim)
              throw Error(
                `Percurso não alcançou ${alvo.x},${alvo.z}; parou em ${e.posicao.x.toFixed(2)},${e.posicao.y.toFixed(2)},${e.posicao.z.toFixed(2)}`,
              )
            if (Math.hypot(e.posicao.x - ultimo.x, e.posicao.z - ultimo.z) > 0.1) {
              ultimo = e.posicao
              paradoEm = performance.now()
            }
            if (performance.now() - paradoEm > 2500)
              throw Error(
                `Caminho bloqueado perto de ${e.posicao.x.toFixed(2)},${e.posicao.y.toFixed(2)},${e.posicao.z.toFixed(2)}`,
              )
            palco.entradaDoTeste({ lado: dx / distancia, frente: -dz / distancia })
            await new Promise((r) => setTimeout(r, 50))
          }
        }
        palco.entradaDoTeste({ lado: 0, frente: 0 })
        await new Promise((r) => setTimeout(r, 200))
        palco.comandarTeste({ percurso: 'finalizar' })
        return palco.estadoDoTeste()
      },
      { alvos, modo, correr },
    )
  }
  const praca = await percurso([{ x: 0, z: 137 }], 'terceira')
  assert.ok(praca.percurso.caminhada > 11 && praca.percurso.caminhada < 15)
  await p.screenshot({ path: resolve(saida, 'praca-terceira.png') })
  const horta = await percurso([{ x: 20, z: 139 }], 'primeira')
  assert.ok(horta.percurso.caminhada > 18 && horta.percurso.caminhada < 24)
  await p.screenshot({ path: resolve(saida, 'horta-primeira.png') })
  const ponte = await percurso(
    [
      { x: 20, z: 147 },
      { x: 32, z: 147 },
      { x: 39, z: 136 },
      { x: 39, z: 131.9 },
      { x: 39, z: 122.1 },
    ],
    'terceira',
  )
  assert.ok(ponte.percurso.caminhada > 35)
  await p.screenshot({ path: resolve(saida, 'ponte-terceira.png') })
  await percurso(
    [
      { x: 39, z: 131.9 },
      { x: 39, z: 136 },
      { x: 32, z: 147 },
      { x: 20, z: 147 },
      { x: 20, z: 139 },
      { x: 0, z: 137 },
    ],
    'terceira',
    true,
  )
  const farol = await percurso(
    [
      { x: -3, z: 120 },
      { x: -3, z: 106 },
    ],
    'terceira',
  )
  assert.ok(farol.posicao.y > 8, 'O personagem não subiu a escadaria do Farol')
  assert.ok(
    farol.percurso.caminhada >= farol.percurso.direta - 0.02,
    'A subida de degraus foi perdida pelo medidor',
  )
  await p.screenshot({ path: resolve(saida, 'farol-terceira.png') })
  const final = await p.evaluate(() => {
    const q = window.__ensaioFaisca
    q.palco.encerrarTeste()
    return { documento: JSON.stringify(q.documento), base: q.base, apos: q.medida() }
  })
  assert.equal(final.documento, antes)
  assert.deepEqual(erros, [])
  writeFileSync(
    resolve(saida, 'resultados.json'),
    JSON.stringify(
      {
        alturaNativa: inicio.altura,
        casaPraca: praca.percurso,
        pracaHorta: horta.percurso,
        hortaPonte: ponte.percurso,
        pracaFarol: farol.percurso,
        autoriaPreservada: true,
        erros,
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify({
      altura: inicio.altura,
      casaPraca: praca.percurso.caminhada,
      pracaHorta: horta.percurso.caminhada,
      hortaPonte: ponte.percurso.caminhada,
      farolAltura: farol.posicao.y,
      erros,
    }),
  )
  await p.evaluate(() => {
    window.__ensaioFaisca.palco.destruir()
  })
  await contexto.close()
} catch (e) {
  if (p) await p.screenshot({ path: resolve(saida, 'falha.png') }).catch(() => {})
  throw e
} finally {
  await navegador.close()
}
