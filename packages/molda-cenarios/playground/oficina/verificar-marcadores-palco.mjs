import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote7-guias'),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const p = await navegador.newPage({ viewport: { width: 1440, height: 900 } }),
    erros = []
  p.on('pageerror', (e) => erros.push(e.message))
  p.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForLoadState('networkidle')
  const resultado = await p.evaluate(
    async ({ coreUrl, motorUrl, tresUrl, colisaoUrl }) => {
      const core = await import(coreUrl),
        T = await import(tresUrl),
        { MarcadoresDoPalco } = await import(motorUrl),
        { ColisoesVisiveis } = await import(colisaoUrl)
      document.querySelector('#root').remove()
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%'
      document.body.append(canvas)
      const renderer = new T.WebGLRenderer({ canvas, antialias: true }),
        cena = new T.Scene(),
        camera = new T.PerspectiveCamera(48, 1.6, 0.1, 100),
        marcadores = new MarcadoresDoPalco(),
        d = core.criarDocumentoVazio('qa', 'Guias de jogo')
      renderer.setSize(1440, 900)
      cena.background = new T.Color('#e1eef6')
      const chao = new T.Mesh(
        new T.PlaneGeometry(22, 22),
        new T.MeshBasicMaterial({ color: '#8aab87' }),
      )
      chao.rotation.x = -Math.PI / 2
      cena.add(chao, marcadores.grupo)
      camera.position.set(12, 17, 23)
      camera.lookAt(0, 0, 0)
      const configuracoes = [
        { tipo: 'ponto' },
        { tipo: 'inicio', principal: true },
        { tipo: 'zona', forma: { tipo: 'caixa', tamanho: { x: 3, y: 2, z: 3 } } },
        { tipo: 'zona', forma: { tipo: 'esfera', raio: 1.5 } },
        {
          tipo: 'rota',
          pontos: [
            { x: -1, y: 0, z: -1 },
            { x: 1, y: 0, z: 0 },
            { x: 1, y: 1, z: 2 },
          ],
          fechada: false,
          seguirTerreno: false,
        },
        { tipo: 'camera', alvo: { x: 0, y: 0, z: -3 }, campoDeVisao: 48 },
        {
          tipo: 'luz',
          luz: {
            tipo: 'foco',
            cor: '#ffeebb',
            intensidade: 10,
            alcance: 5,
            decaimento: 2,
            sombra: false,
            alvo: { x: 0, y: -1, z: -2 },
            angulo: 20,
            penumbra: 0.3,
          },
        },
        { tipo: 'regua', fim: { x: 3, y: 0, z: 0 } },
        { tipo: 'escala', altura: 1.17 },
      ]
      d.marcadores = configuracoes.map((configuracao, i) =>
        core.MarcadorSchema.parse({
          id: `m${i}`,
          nome: configuracao.tipo,
          grupo: null,
          bloqueado: false,
          oculto: false,
          posicao: { x: ((i % 3) - 1) * 5, y: 0.05, z: (Math.floor(i / 3) - 1) * 5 },
          giro: 0,
          noChao: false,
          objeto: null,
          configuracao,
        }),
      )
      const antes = JSON.stringify(d),
        estado = marcadores.definir(d, undefined, camera.aspect)
      const renderizar = () => {
        camera.updateMatrixWorld()
        renderer.render(cena, camera)
      }
      renderizar()
      const pixel = new T.Vector3(-5 + 0.25, 0.05 + 0.9, -5).project(camera),
        raio = new T.Raycaster()
      raio.setFromCamera(new T.Vector2(pixel.x, pixel.y), camera)
      const selecionado = marcadores.escolher(raio, camera, 900)?.id
      const ciclos = []
      for (let i = 0; i < 3; i++) {
        marcadores.limpar()
        marcadores.definir(d, undefined, camera.aspect)
        renderizar()
        ciclos.push({
          ...renderer.info.memory,
          desenhos: renderer.info.render.calls,
          linhas: renderer.info.render.lines,
        })
      }
      window.__guiasQA = {
        ciclosDeColisoes: () => {
          const guias = new ColisoesVisiveis(),
            ciclos = []
          chao.updateWorldMatrix(true, false)
          cena.add(guias.grupo)
          try {
            for (let i = 0; i < 3; i++) {
              const estado = guias.definir([{ geometria: chao.geometry, matriz: chao.matrixWorld }])
              renderizar()
              const ativo = {
                ...renderer.info.memory,
                desenhos: renderer.info.render.calls,
                linhas: renderer.info.render.lines,
              }
              guias.limpar()
              renderizar()
              ciclos.push({
                estado,
                ativo,
                limpo: { ...renderer.info.memory, linhas: renderer.info.render.lines },
              })
            }
            return ciclos
          } finally {
            guias.descartar()
            cena.remove(guias.grupo)
            renderizar()
          }
        },
        dia: renderizar,
        noite: () => {
          cena.background.set('#18263e')
          chao.material.color.set('#273d44')
          renderizar()
        },
        ocultar: () => {
          marcadores.grupo.visible = false
          renderizar()
          return renderer.info.render.lines
        },
        destruir: () => {
          marcadores.descartar()
          chao.geometry.dispose()
          chao.material.dispose()
          renderer.dispose()
        },
      }
      return { estado, selecionado, ciclos, semMutacao: JSON.stringify(d) === antes }
    },
    {
      coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      motorUrl: modulo('packages/molda-cenarios-motor/src/jogo/marcadores.ts'),
      tresUrl: modulo('node_modules/three/build/three.module.js'),
      colisaoUrl: modulo('packages/molda-cenarios-motor/src/jogo/colisoes-visiveis.ts'),
    },
  )
  await p.screenshot({ path: resolve(saida, 'dia.png') })
  await p.evaluate(() => window.__guiasQA.noite())
  await p.screenshot({ path: resolve(saida, 'noite.png') })
  const ocultou = await p.evaluate(() => window.__guiasQA.ocultar())
  const ciclosColisoes = await p.evaluate(() => window.__guiasQA.ciclosDeColisoes())
  await p.evaluate(() => window.__guiasQA.destruir())
  assert.deepEqual(resultado.estado.falhas, [])
  assert.equal(resultado.selecionado, 'm0')
  assert.equal(resultado.semMutacao, true)
  assert.equal(ocultou, 0)
  assert.deepEqual(erros, [])
  for (const ciclo of resultado.ciclos) assert.deepEqual(ciclo, resultado.ciclos[0])
  for (const ciclo of ciclosColisoes) {
    assert.deepEqual(ciclo, ciclosColisoes[0])
    assert.equal(ciclo.estado.erro, null)
    assert.equal(ciclo.estado.triangulos, 2)
    assert.equal(ciclo.ativo.geometries - ciclo.limpo.geometries, 1)
    assert.equal(ciclo.limpo.linhas, 0)
  }
  writeFileSync(
    resolve(saida, 'resultado.json'),
    JSON.stringify({ ...resultado, ocultou, ciclosColisoes, erros }, null, 2),
  )
  console.log(JSON.stringify({ ...resultado, ocultou, ciclosColisoes, erros }))
} finally {
  await navegador.close()
}
