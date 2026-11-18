import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  fonte = resolve(raiz, 'output/cenarios-reforma/conversao-faisca/original'),
  doc = JSON.parse(readFileSync(resolve(fonte, 'documento.json'), 'utf8')),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`,
  navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const p = await navegador.newPage()
  await p.route('**/qa-alturas/**', (r) =>
    r.fulfill({
      path: resolve(
        fonte,
        'recursos',
        `${new URL(r.request().url()).pathname.split('/').at(-1)}.szht`,
      ),
      contentType: 'application/octet-stream',
    }),
  )
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForLoadState('networkidle')
  const r = await p.evaluate(
    async ({ doc, coreUrl, motor, tres }) => {
      const core = await import(coreUrl),
        T = await import(tres),
        { CaminhosDoPalco } = await import(`${motor}/curvas/caminhos.ts`),
        { TerrenoDoPalco } = await import(`${motor}/Terreno.ts`),
        { carregarPecasDeTerreno } = await import(`${motor}/recursos-terreno.ts`),
        { lerGlb } = await import(`${motor}/modelos.ts`),
        { MundoDoTeste } = await import(`${motor}/teste/colisoes.ts`),
        { MovimentoDoTeste } = await import(`${motor}/teste/movimento.ts`),
        recursos = await carregarPecasDeTerreno(
          doc.base,
          (d) => fetch(`/qa-alturas/${d}`).then((r) => r.arrayBuffer()),
          new AbortController().signal,
        ),
        terreno = new TerrenoDoPalco(doc.base, recursos),
        caminhos = new CaminhosDoPalco(),
        modelo = await lerGlb(
          await (await fetch('/acervo/caminho_lajes_reto.65f405847e5f.glb')).arrayBuffer(),
        )
      for (const c of doc.caminhos)
        c.encaixeModelo = { eixo: 'x', baseLocal: 0, centroTransversalLocal: 0 }
      core.validarDocumento(doc)
      const estado = caminhos.definir(
          doc,
          terreno,
          () => modelo,
          () => null,
          new Set(),
        ),
        piso = terreno.fontesDoTeste(),
        completo = [...piso, ...caminhos.fontesDoTeste()],
        percursos = []
      for (const [tipo, fontes] of [
        ['terreno', piso],
        ['caminho', completo],
      ])
        for (const partida of [
          { x: 0, z: 137 },
          { x: 0.4, z: 137 },
          { x: -0.4, z: 137 },
          { x: 0, z: 136.6 },
          { x: 0, z: 137.4 },
        ]) {
          const mundo = new MundoDoTeste(fontes),
            de = new T.Vector3(partida.x, 10, partida.z),
            ate = new T.Vector3(partida.x, -20, partida.z),
            inicio = mundo.rastrear(de, ate).ponto,
            m = new MovimentoDoTeste(mundo, inicio, 1.1700404965322315)
          for (let i = 0; i < 1000; i++) {
            const dx = -3 - m.posicao.x,
              dz = 120 - m.posicao.z,
              d = Math.hypot(dx, dz)
            if (d < 0.4) break
            m.avancar(1 / 60, { x: dx / d, z: dz / d, vertical: 0, correr: false, saltar: false })
          }
          percursos.push({ tipo, partida, posicao: m.posicao.toArray(), noChao: m.noChao })
          mundo.descartar()
        }
      const contatos = [],
        posicao = new T.Vector3(
          ...(
            percursos.find((p) => p.tipo === 'caminho' && p.posicao[2] > 120.45) ??
            percursos.find((p) => p.tipo === 'caminho')
          ).posicao,
        ),
        sondas = [],
        conjunto = new MundoDoTeste(completo)
      for (const passo of [0, 0.02, 0.05, 0.1, 0.2, 0.23, 0.3, 0.4]) {
        const x = posicao.x - passo * 0.17,
          z = posicao.z - passo * 0.985,
          r = conjunto.rastrear(
            new T.Vector3(x, posicao.y + 0.3, z),
            new T.Vector3(x, posicao.y - 0.3, z),
          )
        sondas.push({ passo, ponto: r?.ponto.toArray(), normal: r?.normal.toArray() })
      }
      const elevacoes = [0.001, 0.005, 0.01, 0.02, 0.05, 0.1].map((dy) => {
        const r = conjunto.resolver(
          posicao.clone().add(new T.Vector3(-0.002, dy, -0.01)),
          1.17,
          1.17 * 0.17,
        )
        return { dy, posicao: r.posicao.toArray(), normais: r.normais.map((n) => n.toArray()) }
      })
      conjunto.descartar()
      for (const fonte of caminhos.superficies()) {
        const mundo = new MundoDoTeste([fonte]),
          r = mundo.resolver(posicao.clone().add(new T.Vector3(0, -0.02, 0)), 1.17, 1.17 * 0.17)
        if (r.normais.length)
          contatos.push({
            id: fonte.id,
            posicao: r.posicao.toArray(),
            normais: r.normais.map((n) => n.toArray()),
          })
        mundo.descartar()
      }
      caminhos.descartar()
      terreno.descartar()
      modelo.descartar()
      return { estado, percursos, contatos, sondas, elevacoes }
    },
    {
      doc,
      coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      motor: modulo('packages/molda-cenarios-motor/src'),
      tres: modulo('node_modules/three/build/three.module.js'),
    },
  )
  console.log(JSON.stringify(r))
  assert.deepEqual(r.estado.falhas, [])
  for (const p of r.percursos) {
    assert.ok(p.posicao[2] < 120.45, `O percurso bloqueou: ${JSON.stringify(p)}`)
    assert.equal(p.noChao, true)
  }
} finally {
  await navegador.close()
}
