import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  avatar = resolve(raiz, 'output/cenarios-reforma/lote3-testar-avatar'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote3-testar-recursos')
const meta = JSON.parse(readFileSync(resolve(avatar, 'metadados.json'), 'utf8'))
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const p = await navegador.newPage({ viewport: { width: 1024, height: 768 } })
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
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForLoadState('networkidle')
  const modulo = (pasta) => `/@fs/${resolve(raiz, pasta).replaceAll('\\', '/')}`
  const resultado = await p.evaluate(
    async ({ meta, motor, nucleo }) => {
      const core = await import(nucleo),
        { criarPalco } = await import(motor)
      const bytes = await (await fetch('/qa-avatar.glb')).arrayBuffer()
      const modelo = {
        id: 'avatar',
        biblioteca: 'qa',
        modelo: 'avatar',
        digest: await core.digestDosBytes(new Uint8Array(bytes)),
        volume: {
          min: { x: meta.min[0], y: meta.min[1], z: meta.min[2] },
          max: { x: meta.max[0], y: meta.max[1], z: meta.max[2] },
        },
      }
      const tela = document.createElement('canvas')
      tela.tabIndex = 0
      tela.style.cssText = 'position:fixed;inset:0;z-index:1000;width:800px;height:600px'
      document.body.append(tela)
      let medidas = null,
        modo = 'normal',
        liberar
      const palco = criarPalco(tela, {
        carregarModelo: async () => {
          if (modo === 'falha') throw new Error('Falha de ensaio')
          if (modo === 'lento')
            await new Promise((r) => {
              liberar = r
            })
          return bytes.slice(0)
        },
        aoMedir: (m) => {
          medidas = m
        },
      })
      const doc = core.criarDocumentoVazio('teste', 'Recursos')
      palco.definirDocumento(doc)
      await palco.aguardarRecursos()
      palco.definirVista('frente')
      const esperar = async () => {
        for (let i = 0; i < 4; i++) await new Promise((r) => requestAnimationFrame(r))
      }
      const foto = async () =>
        core.digestDosBytes(new Uint8Array(await (await palco.capturar(600)).arrayBuffer()))
      await esperar()
      const base = { ...medidas },
        antes = await foto(),
        ciclos = []
      for (let i = 0; i < 6; i++) {
        await palco.iniciarTeste({
          modo: 'terceira',
          modelo,
          clipes: { parado: 'parado_relaxado' },
        })
        await esperar()
        const durante = { ...medidas }
        palco.encerrarTeste()
        await esperar()
        ciclos.push({ durante, depois: { ...medidas }, vistaRestaurada: (await foto()) === antes })
      }
      modo = 'falha'
      let falha = false
      try {
        await palco.iniciarTeste({ modo: 'terceira', modelo })
      } catch (e) {
        falha = e.message === 'Falha de ensaio'
      }
      modo = 'lento'
      const controle = new AbortController(),
        pedido = palco.iniciarTeste({ modo: 'terceira', modelo }, controle.signal).then(
          () => null,
          (e) => e.name,
        )
      while (!liberar) await new Promise((r) => setTimeout(r, 10))
      controle.abort()
      liberar()
      const cancelado = await pedido
      modo = 'normal'
      await palco.iniciarTeste({ modo: 'terceira', modelo })
      await esperar()
      palco.definirDocumento({ ...doc, nome: 'Cabeça nova' })
      await esperar()
      const cabecaNovaEncerra = palco.estadoDoTeste() === null
      const apos = { ...medidas },
        vistaRestaurada = (await foto()) === antes
      palco.destruir()
      tela.remove()
      return { base, ciclos, apos, falha, cancelado, cabecaNovaEncerra, vistaRestaurada }
    },
    {
      meta,
      motor: modulo('packages/molda-cenarios-motor/src/index.ts'),
      nucleo: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
    },
  )
  for (const ciclo of resultado.ciclos) {
    assert.ok(
      ciclo.durante.geometrias > resultado.base.geometrias,
      'O modelo real não foi desenhado',
    )
    assert.equal(
      ciclo.depois.geometrias,
      resultado.base.geometrias,
      'Geometria permaneceu depois de sair',
    )
    assert.equal(
      ciclo.depois.texturas,
      resultado.base.texturas,
      'Textura permaneceu depois de sair',
    )
    assert.equal(ciclo.vistaRestaurada, true, 'A câmera da edição mudou ao voltar')
  }
  assert.equal(resultado.falha, true)
  assert.equal(resultado.cancelado, 'AbortError')
  assert.equal(resultado.cabecaNovaEncerra, true)
  assert.equal(resultado.vistaRestaurada, true)
  assert.deepEqual(erros, [])
  writeFileSync(resolve(saida, 'resultados.json'), JSON.stringify({ ...resultado, erros }, null, 2))
  console.log(JSON.stringify({ ...resultado, erros }))
} finally {
  await navegador.close()
}
