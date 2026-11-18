import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote6-pontes'),
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
    async ({ coreUrl, tres, motor }) => {
      const core = await import(coreUrl),
        T = await import(tres),
        { CaminhosDoPalco } = await import(`${motor}/curvas/caminhos.ts`),
        { lerGlb } = await import(`${motor}/modelos.ts`),
        { MundoDoTeste } = await import(`${motor}/teste/colisoes.ts`),
        { MovimentoDoTeste } = await import(`${motor}/teste/movimento.ts`)
      document.querySelector('#root').remove()
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%'
      document.body.append(canvas)
      const renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
      renderer.setSize(1440, 900)
      const cena = new T.Scene(),
        camera = new T.PerspectiveCamera(45, 1.6, 0.05, 200),
        sol = new T.DirectionalLight('#fff4df', 2),
        ambiente = new T.HemisphereLight('#ffffff', '#6e8064', 2),
        caminhos = new CaminhosDoPalco(),
        chao = new T.Mesh(
          new T.PlaneGeometry(64, 32).rotateX(-Math.PI / 2),
          new T.MeshStandardMaterial({ color: '#a4ce8c', roughness: 1 }),
        ),
        d = core.criarDocumentoVazio('qa', 'Pontes reais'),
        modelos = new Map(),
        resultados = [],
        definicoes = [
          { id: 'aventura', arquivo: 'ponte_04_pacote.8d256d9aefcc.glb', eixo: 'z' },
          { id: 'reino', arquivo: 'pontilhao_tabuas.5f24d8c293fe.glb', eixo: 'x' },
          { id: 'templo', arquivo: 'ponte_arco_madeira.5c72fbc606c6.glb', eixo: 'x', largura: 1.9 },
        ]
      d.base = { tipo: 'plano', largura: 64, comprimento: 32 }
      camera.position.set(20, 22, 34)
      camera.lookAt(0, 2, 0)
      sol.position.set(-6, 20, 10)
      cena.background = new T.Color('#b5d9ed')
      cena.add(chao, sol, ambiente, caminhos.grupo)
      const desenhar = () => {
        camera.updateMatrixWorld()
        renderer.render(cena, camera)
      }
      for (const [indice, def] of definicoes.entries()) {
        const bytes = new Uint8Array(await (await fetch(`/acervo/${def.arquivo}`)).arrayBuffer()),
          m = await lerGlb(bytes.buffer),
          ref = {
            id: def.id,
            modelo: def.id,
            biblioteca: 'qa',
            digest: await core.digestDosBytes(bytes),
          }
        d.modelos.push(ref)
        modelos.set(def.id, m)
        const fonte = new MundoDoTeste(
            m.partes.map((p) => ({ geometria: p.geometria, matriz: p.matriz })),
          ),
          larguraOriginal =
            m.caixa.max[def.eixo === 'x' ? 'z' : 'x'] - m.caixa.min[def.eixo === 'x' ? 'z' : 'x'],
          largura = def.largura ?? 2.6,
          escala = largura / larguraOriginal,
          min = m.caixa.min[def.eixo],
          max = m.caixa.max[def.eixo],
          amostras = []
        for (let i = 1; i < 100; i++) {
          const longitudinal = min + ((max - min) * i) / 100,
            x = def.eixo === 'x' ? longitudinal : 0,
            z = def.eixo === 'z' ? longitudinal : 0,
            hit = fonte.rastrear(
              new T.Vector3(x, m.caixa.max.y + 1, z),
              new T.Vector3(x, m.caixa.min.y - 1, z),
            )
          if (hit && hit.normal.y > 0.67)
            amostras.push({ d: longitudinal, y: hit.ponto.y, normal: hit.normal.y })
        }
        fonte.descartar()
        if (amostras.length < 2) throw Error(`Não encontrei cabeceiras transitáveis em ${def.id}`)
        const primeiro = amostras[0],
          ultimo = amostras.at(-1),
          pisoLocal = (primeiro.y + ultimo.y) / 2,
          comprimento = (ultimo.d - primeiro.d) * escala,
          centro = (indice - 1) * 18,
          c = core.CaminhoSchema.parse({
            id: def.id,
            nome: def.id,
            grupo: null,
            oculto: false,
            bloqueado: false,
            tipo: 'ponte',
            acabamento: def.id,
            largura,
            pontos: [
              { x: centro - comprimento / 2, z: 0 },
              { x: centro + comprimento / 2, z: 0 },
            ],
            cotas: { de: 3, ate: 3 },
            encaixeModelo: {
              eixo: def.eixo,
              pisoLocal,
              inicioLocal: primeiro.d,
              fimLocal: ultimo.d,
              centroTransversalLocal: 0,
            },
          })
        d.caminhos.push(c)
        const semPilares = caminhos.definir(
          d,
          null,
          (id) => modelos.get(id) ?? null,
          () => null,
          new Set(),
        )
        desenhar()
        const solidosOriginais = caminhos
          .superficies()
          .filter((s) => s.id === def.id && s.parte === 'modelo/0')
        const cp = {
            ...c,
            pilares: {
              espacamento: comprimento / 3,
              largura: 0.25,
              ...(def.id === 'aventura' ? { afastamentoLateral: 0.3 } : {}),
            },
          },
          comPilares = caminhos.definir(
            { ...d, caminhos: [...d.caminhos.slice(0, -1), cp] },
            null,
            (id) => modelos.get(id) ?? null,
            () => null,
            new Set(),
          ),
          solidos = solidosOriginais,
          baseDoTabuleiro = new MundoDoTeste(solidos),
          comparacoes = []
        for (const parte of caminhos
          .superficies()
          .filter((s) => s.id === def.id && s.parte?.startsWith('pilar/'))) {
          const pos = parte.geometria.getAttribute('position')
          for (let i = 0; i < pos.count; i += 3) {
            const a = new T.Vector3().fromBufferAttribute(pos, i).applyMatrix4(parte.matriz),
              b = new T.Vector3().fromBufferAttribute(pos, i + 1).applyMatrix4(parte.matriz),
              cc = new T.Vector3().fromBufferAttribute(pos, i + 2).applyMatrix4(parte.matriz),
              normal = b.clone().sub(a).cross(cc.clone().sub(a))
            if (normal.y < normal.length() * 1e-3) continue
            for (const ponto of [
              [1 / 3, 1 / 3, 1 / 3],
              [0.6, 0.2, 0.2],
              [0.2, 0.6, 0.2],
              [0.2, 0.2, 0.6],
            ].map(([wa, wb, wc]) =>
              a.clone().multiplyScalar(wa).addScaledVector(b, wb).addScaledVector(cc, wc),
            )) {
              const hit = baseDoTabuleiro.rastrear(
                new T.Vector3(ponto.x, -10, ponto.z),
                new T.Vector3(ponto.x, 20, ponto.z),
              )
              comparacoes.push({
                parte: parte.parte,
                erro: hit ? ponto.y - hit.ponto.y : null,
                ...(hit && Math.abs(ponto.y - hit.ponto.y) > 0.001
                  ? {
                      ponto: ponto.toArray(),
                      face: [a.toArray(), b.toArray(), cc.toArray()],
                      normal: normal.clone().normalize().toArray(),
                      destino: hit.ponto.toArray(),
                    }
                  : {}),
              })
            }
          }
        }
        baseDoTabuleiro.descartar()
        // Manter na imagem a configuração de apoio realmente conferida acima.
        d.caminhos[d.caminhos.length - 1] = cp
        caminhos.definir(
          d,
          null,
          (id) => modelos.get(id) ?? null,
          () => null,
          new Set(),
        )
        const mundo = new MundoDoTeste(solidos),
          x0 = c.pontos[0].x + 0.35,
          x1 = c.pontos[1].x - 0.4
        const percursos = []
        for (const direcao of [1, -1]) {
          const de = direcao === 1 ? x0 : x1,
            ate = direcao === 1 ? x1 : x0,
            inicio = mundo.rastrear(new T.Vector3(de, 15, 0), new T.Vector3(de, -1, 0))
          if (!inicio) throw Error(`Cabeceira sem piso: ${def.id}`)
          const mov = new MovimentoDoTeste(mundo, inicio.ponto, 1.17)
          for (let i = 0; i < 1800 && (ate - mov.posicao.x) * direcao > 0; i++)
            mov.avancar(1 / 60, { x: direcao, z: 0, vertical: 0, correr: false, saltar: false })
          for (let i = 0; i < 60; i++)
            mov.avancar(1 / 60, { x: 0, z: 0, vertical: 0, correr: false, saltar: false })
          percursos.push({
            direcao,
            chegou: (mov.posicao.x - ate) * direcao >= -0.05,
            posicao: mov.posicao.toArray(),
            noChao: mov.noChao,
          })
        }
        mundo.descartar()
        resultados.push({
          id: def.id,
          volume: { min: m.caixa.min.toArray(), max: m.caixa.max.toArray() },
          encaixe: c.encaixeModelo,
          comprimento,
          semPilares,
          comPilares,
          comparacoes,
          percursos,
          pilares: cp.pilares,
          largura,
        })
      }
      const estado = caminhos.definir(
        d,
        null,
        (id) => modelos.get(id) ?? null,
        () => null,
        new Set(),
      )
      desenhar()
      const ciclos = []
      for (let i = 0; i < 3; i++) {
        caminhos.limpar()
        const estado = caminhos.definir(
          d,
          null,
          (id) => modelos.get(id) ?? null,
          () => null,
          new Set(),
        )
        desenhar()
        ciclos.push({
          estado,
          ...renderer.info.memory,
          desenhos: renderer.info.render.calls,
          triangulos: renderer.info.render.triangles,
        })
      }
      window.__pontesQA = {
        noite: () => {
          sol.intensity = 0.1
          ambiente.intensity = 0.3
          cena.background.set('#223b50')
          desenhar()
        },
        destruir: () => {
          caminhos.descartar()
          for (const m of modelos.values()) m.descartar()
          chao.geometry.dispose()
          chao.material.dispose()
          renderer.dispose()
        },
      }
      return {
        resultados,
        estado,
        ciclos,
        medidas: {
          desenhos: renderer.info.render.calls,
          triangulos: renderer.info.render.triangles,
          ...renderer.info.memory,
        },
      }
    },
    {
      coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      tres: modulo('node_modules/three/build/three.module.js'),
      motor: modulo('packages/molda-cenarios-motor/src'),
    },
  )
  await p.screenshot({ path: resolve(saida, 'pontes-dia.png') })
  await p.evaluate(() => window.__pontesQA.noite())
  await p.screenshot({ path: resolve(saida, 'pontes-noite.png') })
  await p.evaluate(() => window.__pontesQA.destruir())
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify({ ...resultado, erros }, null, 2))
  console.log(
    JSON.stringify({
      resultados: resultado.resultados.map((r) => ({
        id: r.id,
        largura: r.largura,
        pilares: r.pilares,
        avisos: r.comPilares.avisos,
        amostras: r.comparacoes.length,
        erroMaximo: Math.max(
          0,
          ...r.comparacoes.filter((c) => c.erro !== null).map((c) => Math.abs(c.erro)),
        ),
        percursos: r.percursos,
      })),
      ciclos: resultado.ciclos,
      erros,
    }),
  )
  assert.deepEqual(erros, [])
  assert.deepEqual(resultado.estado.falhas, [])
  for (const r of resultado.resultados) {
    assert.deepEqual(r.comPilares.falhas, [])
    assert.ok(r.comparacoes.length > 0)
    assert.equal(
      new Set(r.comparacoes.map((c) => c.parte)).size,
      4,
      `${r.id}: dois pares internos de pilares`,
    )
    for (const percurso of r.percursos) {
      assert.equal(percurso.chegou, true, `${r.id}: direção ${percurso.direcao}`)
      assert.equal(percurso.noChao, true, `${r.id}: chegada apoiada`)
    }
    for (const parte of new Set(r.comparacoes.map((c) => c.parte)))
      assert.ok(
        r.comparacoes.some((c) => c.parte === parte && c.erro !== null),
        'Pilar sem contato real',
      )
    for (const c of r.comparacoes.filter((c) => c.erro !== null))
      assert.ok(Math.abs(c.erro) < 0.001, `${r.id}: ${JSON.stringify(c)}`)
  }
  for (const ciclo of resultado.ciclos) {
    assert.deepEqual(ciclo.estado.falhas, [])
    assert.equal(ciclo.geometries, resultado.medidas.geometries)
    assert.equal(ciclo.textures, resultado.medidas.textures)
    assert.equal(ciclo.triangulos, resultado.medidas.triangulos)
  }
} finally {
  await navegador.close()
}
