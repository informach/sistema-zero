import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(process.argv[2] ?? 'output/cenarios-reforma/lote3-espalhamento-acervo')
const modelo = JSON.parse(
  readFileSync(resolve(raiz, 'output/molda-cenarios/acervo/catalogo.json'), 'utf8'),
).modelos.find((m) => m.arquivo === 'morada_banco.a3bf1765ed72.glb')
assert.ok(modelo)
const modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
let p
try {
  p = await browser.newPage({ viewport: { width: 1100, height: 800 }, hasTouch: true })
  const erros = []
  p.on('pageerror', (e) => {
    erros.push(e.message)
    console.error(e.message)
  })
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.evaluate(
    async ({ nucleo, motor, modelo }) => {
      const core = await import(nucleo),
        { criarPalco } = await import(motor)
      const bytes = await (await fetch(`/acervo/${modelo.arquivo}`)).arrayBuffer()
      if ((await core.digestDosBytes(new Uint8Array(bytes))) !== modelo.digest)
        throw Error('GLB diferente do catálogo')
      const tela = document.createElement('canvas')
      tela.width = tela.height = 64
      const ctx = tela.getContext('2d')
      ctx.fillStyle = '#eddb9a'
      ctx.fillRect(0, 0, 64, 64)
      ctx.fillStyle = '#509d72'
      ctx.fillRect(0, 0, 32, 32)
      ctx.fillRect(32, 32, 32, 32)
      const png = await new Promise((r) => tela.toBlob(r, 'image/png')),
        imagem = await png.arrayBuffer()
      const alturas = new Float64Array(core.AMOSTRAS_DA_PECA)
      for (let z = 0; z <= 64; z++)
        for (let x = 0; x <= 64; x++) alturas[z * 65 + x] = 2 + (x / 64) ** 2 * 2 + z / 64
      const binario = core.codificarPecaDeAlturas(alturas, -10, 8),
        digest = await core.digestDosBytes(binario)
      let doc = core.criarDocumentoVazio('jardim', 'Jardim do acervo')
      doc.base = {
        tipo: 'terreno',
        origem: { x: -32, z: -32 },
        passo: 1,
        colunas: 64,
        linhas: 64,
        min: -10,
        max: 8,
        fundo: -10,
        pecas: [{ coluna: 0, linha: 0, digest }],
        recortes: [
          [
            { x: 8, z: 6 },
            { x: 11, z: 6 },
            { x: 11, z: 10 },
            { x: 8, z: 10 },
          ],
        ],
      }
      const fonte = core.criarFonteDeAlturas(
        doc.base,
        new Map([[digest, core.lerPecaDeAlturas(binario)]]),
      )
      doc.modelos = [
        {
          id: 'banco',
          biblioteca: 'qa',
          modelo: 'banco',
          digest: modelo.digest,
          volume: {
            min: { x: modelo.min[0], y: modelo.min[1], z: modelo.min[2] },
            max: { x: modelo.max[0], y: modelo.max[1], z: modelo.max[2] },
          },
        },
      ]
      doc.formas = [
        { id: 'flor', nome: 'Flor', tipo: 'cilindro', raio: 0.3, altura: 0.8, lados: 8 },
      ]
      doc.texturas = [
        {
          id: 't',
          biblioteca: 'qa',
          textura: 't',
          digest: await core.digestDosBytes(new Uint8Array(imagem)),
        },
      ]
      const consultaInicial = structuredClone(doc)
      const canvas = document.createElement('canvas')
      canvas.tabIndex = 0
      canvas.style.cssText =
        'position:fixed;left:0;top:0;width:1000px;height:700px;z-index:1000;touch-action:none'
      document.body.append(canvas)
      let previa = null,
        medidas = null,
        gestos = [],
        falhar = false
      const quadro = () => new Promise(requestAnimationFrame)
      const palco = criarPalco(canvas, {
        carregarModelo: async () => {
          if (falhar) throw Error('Falha controlada do acervo')
          return bytes.slice(0)
        },
        carregarTextura: async () => imagem.slice(0),
        carregarTerreno: async () => binario.slice(0).buffer,
        movimentoReduzido: true,
        aoPreverEspalhamento: (e) => {
          previa = e
        },
        aoMedir: (e) => {
          medidas = e
        },
        aoEspalhar: (gesto) => {
          if (gesto.documentoDeOrigem !== doc) throw Error('Aplicação sobre revisão antiga')
          gestos.push(structuredClone(gesto))
          doc = core.executarLote(
            { documento: doc, revisao: 0 },
            {
              revisaoEsperada: 0,
              comandos: [
                {
                  tipo: 'objetos.espalhar',
                  pincelada: {
                    receita: gesto.receita,
                    amostras: gesto.amostras.map((a, i) => ({
                      ...a,
                      id: `c${gestos.length}-${i}`,
                    })),
                  },
                },
              ],
            },
          ).documento
          palco.definirDocumento(doc)
        },
      })
      const configuracao = {
        modelos: [],
        formas: [],
        texturas: [],
        receita: {
          prototipos: [
            {
              nome: 'Banco real',
              modelo: 'banco',
              colisao: 'malha',
              rotacao: { x: 0, y: 0.3, z: 0 },
              escala: { x: 0.8, y: 0.8, z: 0.8 },
              espelho: { x: true, y: false, z: false },
              aparencia: { cor: '#c58956', textura: { id: 't', repeticaoMetros: 1 } },
            },
            {
              nome: 'Flor',
              modelo: 'flor',
              colisao: 'caixa',
              rotacao: { x: 0, y: 0, z: 0 },
              escala: { x: 1, y: 0.5, z: 1 },
              aparencia: { cor: '#df598c' },
            },
          ],
          raio: 7,
          densidade: 30,
          afastamento: 1.5,
          giro: Math.PI,
          tamanhoMin: 0.8,
          tamanhoMax: 1.2,
          semente: 77,
          limite: 100,
          evitarObjetos: false,
          grupo: null,
          camada: null,
        },
      }
      palco.definirDocumento(doc)
      palco.definirFerramenta('espalhar')
      palco.definirEspalhamento(configuracao)
      const esperar = async (f) => {
        const limite = performance.now() + 15000
        while (!f()) {
          if (performance.now() > limite) throw Error('Recursos do pincel não ficaram prontos')
          await quadro()
        }
      }
      await esperar(
        () => palco.fonteDeAlturas() && palco.volumeDoModelo('banco') && medidas?.carregando === 0,
      )
      window.__pincelQA = {
        pronto: () => previa?.pronta && previa.quantidade > 0,
        contar: () => ({
          quantidade: doc.instancias.length,
          gestos: gestos.length,
          previa,
          medidas,
        }),
        verificar: () => {
          const temChao = core.dominioDoChao(doc.base)
          for (const o of doc.instancias) {
            const p = o.transformacao.posicao,
              v = core.volumeNoMundo(doc, o, fonte)
            if (!temChao(p) || Math.abs(v.min.y - fonte(p.x, p.z)) > 1e-7)
              throw Error('Objeto fora do solo real')
            if (o.modelo === 'banco' && (!o.espelho?.x || o.aparencia?.textura?.id !== 't'))
              throw Error('Aparência do catálogo perdida')
          }
          return {
            modelos: [...new Set(doc.instancias.map((o) => o.modelo))],
            quantidade: doc.instancias.length,
          }
        },
        limpar: async (semente) => {
          palco.definirEspalhamento(null)
          doc = structuredClone(consultaInicial)
          palco.definirDocumento(doc)
          await quadro()
          await quadro()
          const base = { ...medidas }
          palco.definirEspalhamento({
            ...configuracao,
            receita: { ...configuracao.receita, semente },
          })
          return base
        },
        trocarRevisao: () => {
          doc = { ...doc, nome: 'Revisão externa' }
          palco.definirDocumento(doc)
        },
        capturar: () => palco.capturar(600),
        falhar: () => {
          falhar = true
          palco.definirEspalhamento(null)
          palco.definirDocumento({ ...consultaInicial, modelos: [] })
          palco.definirEspalhamento({ ...configuracao, modelos: [consultaInicial.modelos[0]] })
        },
        recuperar: () => {
          falhar = false
          palco.recarregarModelos()
        },
        finalizar: () => palco.destruir(),
      }
    },
    {
      nucleo: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      motor: modulo('packages/molda-cenarios-motor/src/index.ts'),
      modelo,
    },
  )
  const ciclos = []
  for (let i = 0; i < 3; i++) {
    await p.mouse.move(490, 420)
    await p.waitForFunction(() => window.__pincelQA.pronto())
    const antes = await p.evaluate(() => window.__pincelQA.contar())
    await p.mouse.down()
    await p.mouse.move(580, 450, { steps: 12 })
    assert.equal((await p.evaluate(() => window.__pincelQA.contar())).quantidade, 0)
    await p.screenshot({ path: resolve(saida, `ciclo-${i}-previa.png`) })
    // Fotografar oculta temporários e precisa restaurá-los para continuar o mesmo gesto.
    assert.ok(await p.evaluate(async () => (await window.__pincelQA.capturar())?.size))
    await p.mouse.up()
    const depois = await p.evaluate(() => window.__pincelQA.contar())
    assert.equal(depois.gestos, i + 1)
    assert.ok(depois.quantidade > 10)
    const conferido = await p.evaluate(() => window.__pincelQA.verificar())
    assert.deepEqual(conferido.modelos.sort(), ['banco', 'flor'])
    await p.screenshot({ path: resolve(saida, `ciclo-${i}-aplicado.png`) })
    const base = await p.evaluate((i) => window.__pincelQA.limpar(78 + i), i)
    ciclos.push({
      antes: antes.medidas,
      aplicado: depois.medidas,
      base,
      quantidade: depois.quantidade,
    })
  }
  assert.deepEqual(
    ciclos.map((c) => [c.base.geometrias, c.base.texturas]),
    Array(3).fill([ciclos[0].base.geometrias, ciclos[0].base.texturas]),
  )
  await p.mouse.move(490, 420)
  await p.waitForFunction(() => window.__pincelQA.pronto())
  await p.mouse.down()
  await p.mouse.move(580, 450, { steps: 8 })
  await p.evaluate(() => window.__pincelQA.trocarRevisao())
  await p.mouse.up()
  assert.equal((await p.evaluate(() => window.__pincelQA.contar())).gestos, 3)
  const cdp = await p.context().newCDPSession(p)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ id: 1, x: 490, y: 420 }],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ id: 1, x: 560, y: 460 }],
  })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  assert.equal((await p.evaluate(() => window.__pincelQA.contar())).gestos, 4)
  await cdp.detach()
  await p.evaluate(() => window.__pincelQA.falhar())
  await p.mouse.move(490, 420)
  await p.waitForFunction(() => window.__pincelQA.contar().previa?.erro)
  await p.mouse.down()
  await p.mouse.up()
  assert.equal((await p.evaluate(() => window.__pincelQA.contar())).gestos, 4)
  await p.evaluate(() => window.__pincelQA.recuperar())
  await p.mouse.move(495, 425)
  await p.waitForFunction(() => window.__pincelQA.pronto())
  await p.evaluate(() => window.__pincelQA.finalizar())
  assert.deepEqual(erros, [])
  writeFileSync(
    resolve(saida, 'resultado.json'),
    JSON.stringify(
      { ciclos, toqueNativo: true, revisaoExterna: true, falhaERecuperacao: true, erros },
      null,
      2,
    ),
  )
  console.log(JSON.stringify({ ciclos, erros }, null, 2))
} catch (e) {
  if (p && !p.isClosed()) {
    await p.screenshot({ path: resolve(saida, 'falha.png') })
    writeFileSync(
      resolve(saida, 'falha.json'),
      JSON.stringify(await p.evaluate(() => window.__pincelQA?.contar()), null, 2) ?? 'null',
    )
  }
  throw e
} finally {
  await browser.close()
}
