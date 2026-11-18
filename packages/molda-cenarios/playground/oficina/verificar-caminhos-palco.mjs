import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote6-palco'),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const contexto = await navegador.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: resolve(saida, 'movimento') },
    }),
    pagina = await contexto.newPage(),
    erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForFunction(() => window.__cenarios)
  const resultado = await pagina.evaluate(
    async ({ coreUrl, palcoUrl }) => {
      const core = await import(coreUrl),
        { criarPalco } = await import(palcoUrl)
      document.querySelector('#root').remove()
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%'
      document.body.append(canvas)
      let estado, medidas
      const esperar = (ms = 200) => new Promise((r) => setTimeout(r, ms)),
        p = criarPalco(canvas, {
          carregarModelo: async () =>
            (await fetch('/acervo/caminho_terra_reto.804d14830d95.glb')).arrayBuffer(),
          aoCaminhos: (e) => {
            estado = e
          },
          aoMedir: (e) => {
            medidas = e
          },
        }),
        d = core.criarDocumentoVazio('qa', 'Seis caminhos'),
        comum = {
          nome: 'Caminho',
          grupo: null,
          oculto: false,
          bloqueado: false,
          acabamento: null,
          largura: 2.6,
        }
      d.base = { tipo: 'plano', largura: 64, comprimento: 64 }
      d.caminhos = [
        {
          ...comum,
          id: 'trilha',
          tipo: 'trilha',
          pontos: [
            { x: -15, z: -14 },
            { x: -4, z: -14 },
            { x: 0, z: -10 },
          ],
        },
        {
          ...comum,
          id: 'praca',
          tipo: 'praca',
          pontos: [
            { x: -5, z: -6 },
            { x: 5, z: -6 },
            { x: 5, z: 0 },
            { x: 1, z: 0 },
            { x: 1, z: 4 },
            { x: -5, z: 4 },
          ],
        },
        {
          ...comum,
          id: 'estrada',
          tipo: 'estrada',
          suave: true,
          pontos: [
            { x: -14, z: 8 },
            { x: -5, z: 10 },
            { x: 5, z: 8 },
            { x: 12, z: 12 },
          ],
        },
        {
          ...comum,
          id: 'cerca',
          tipo: 'cerca',
          largura: 0.12,
          pontos: [
            { x: -14, z: 4 },
            { x: -14, z: -7 },
          ],
        },
        {
          ...comum,
          id: 'muro',
          tipo: 'muro',
          largura: 0.3,
          pontos: [
            { x: 14, z: 5 },
            { x: 14, z: -7 },
          ],
        },
        {
          ...comum,
          id: 'ponte',
          tipo: 'ponte',
          cotas: { de: 2, ate: 3 },
          pilares: { espacamento: 4, largura: 0.25 },
          pontos: [
            { x: 6, z: -14 },
            { x: 18, z: -14 },
          ],
        },
      ].map((c) => core.CaminhoSchema.parse(c))
      core.validarDocumento(d)
      p.definirDocumento(d)
      p.enquadrar()
      await p.aguardarRecursos()
      await esperar()
      const nativo = { estado, medidas }
      await p.iniciarTeste({ modo: 'terceira', altura: 1.16, inicio: { x: 8, y: 2.2, z: -14 } })
      await esperar(350)
      const avatar = p.estadoDoTeste()
      p.encerrarTeste()
      const ciclos = []
      for (let i = 0; i < 3; i++) {
        p.definirDocumento({ ...d, caminhos: [] })
        await esperar()
        const vazio = { ...medidas }
        p.definirDocumento(d)
        await esperar()
        ciclos.push({ vazio, cheio: { ...medidas } })
      }
      const bytes = new Uint8Array(
          await (await fetch('/acervo/caminho_terra_reto.804d14830d95.glb')).arrayBuffer(),
        ),
        digest = await core.digestDosBytes(bytes),
        catalogo = {
          ...d,
          modelos: [{ id: 'piso-real', biblioteca: 'qa', modelo: 'piso', digest }],
          caminhos: [
            core.CaminhoSchema.parse({
              ...comum,
              id: 'catalogo',
              tipo: 'trilha',
              acabamento: 'piso-real',
              encaixeModelo: { eixo: 'x' },
              pontos: [
                { x: -12, z: 0 },
                { x: 0, z: 0 },
                { x: 10, z: 8 },
              ],
            }),
          ],
        }
      p.definirDocumento(catalogo)
      await p.aguardarRecursos()
      p.enquadrar()
      await esperar(400)
      window.__caminhosPalcoQA = {
        nativo: () => {
          p.definirDocumento(d)
          p.enquadrar()
        },
        noite: () => p.definirDocumento({ ...catalogo, iluminacao: { hora: 0 } }),
        destruir: () => p.destruir(),
      }
      return {
        nativo,
        avatar,
        ciclos,
        catalogo: { estado, medidas, volume: p.volumeDoModelo('piso-real') },
      }
    },
    {
      coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      palcoUrl: modulo('packages/molda-cenarios-motor/src/Palco.ts'),
    },
  )
  await pagina.screenshot({ path: resolve(saida, 'catalogo-dia.png') })
  await pagina.evaluate(() => window.__caminhosPalcoQA.noite())
  await pagina.waitForTimeout(200)
  await pagina.screenshot({ path: resolve(saida, 'catalogo-noite.png') })
  await pagina.evaluate(() => window.__caminhosPalcoQA.nativo())
  await pagina.waitForTimeout(200)
  await pagina.screenshot({ path: resolve(saida, 'seis-variantes.png') })
  await pagina.evaluate(() => window.__caminhosPalcoQA.destruir())
  await contexto.close()
  assert.deepEqual(erros, [])
  assert.deepEqual(resultado.nativo.estado.falhas, [])
  assert.deepEqual(resultado.catalogo.estado.falhas, [])
  assert.equal(resultado.avatar.noChao, true)
  assert.ok(resultado.avatar.posicao.y > 2)
  for (const ciclo of resultado.ciclos) {
    assert.equal(ciclo.cheio.geometrias, resultado.ciclos[0].cheio.geometrias)
    assert.equal(ciclo.cheio.texturas, resultado.ciclos[0].cheio.texturas)
    assert.equal(ciclo.vazio.geometrias, resultado.ciclos[0].vazio.geometrias)
  }
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify({ ...resultado, erros }, null, 2))
  console.log(
    JSON.stringify({
      nativo: resultado.nativo,
      avatar: resultado.avatar.posicao,
      catalogo: resultado.catalogo,
      erros,
    }),
  )
} finally {
  await navegador.close()
}
