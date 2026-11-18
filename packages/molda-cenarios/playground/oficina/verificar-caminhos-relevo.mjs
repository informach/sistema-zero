import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote6-relevo'),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } }),
    erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForLoadState('networkidle')
  const resultado = await pagina.evaluate(
    async ({ coreUrl, tres, motor }) => {
      const core = await import(coreUrl),
        T = await import(tres),
        { CaminhosDoPalco } = await import(`${motor}/curvas/caminhos.ts`),
        { TerrenoDoPalco } = await import(`${motor}/Terreno.ts`),
        { MundoDoTeste } = await import(`${motor}/teste/colisoes.ts`),
        { lerGlb } = await import(`${motor}/modelos.ts`)
      document.querySelector('#root').remove()
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%'
      document.body.append(canvas)
      const renderer = new T.WebGLRenderer({ canvas, antialias: true }),
        cena = new T.Scene(),
        camera = new T.PerspectiveCamera(45, 1.6, 0.05, 200),
        sol = new T.DirectionalLight('#fff1dc', 2),
        ambiente = new T.HemisphereLight('#ffffff', '#65714f', 2),
        d = core.criarDocumentoVazio('qa', 'Estrada e módulos em relevo'),
        modelos = new Map(),
        caminhos = new CaminhosDoPalco()
      renderer.setSize(1440, 900)
      d.base = {
        tipo: 'terreno',
        cobertura: 'grade',
        origem: { x: -32, z: -32 },
        colunas: 64,
        linhas: 64,
        passo: 1,
        min: -10,
        max: 20,
        fundo: 0,
        pecas: [],
      }
      const terreno = new TerrenoDoPalco(d.base, new Map()),
        original = core.clonarEstadoDoTerreno(terreno.estado),
        tudo = { alturas: { x0: 0, z0: 0, x1: 64, z1: 64 } }
      for (let z = 0; z <= 64; z++)
        for (let x = 0; x <= 64; x++)
          original.campo.alturas[z * 65 + x] =
            2 + (x - 32) * 0.08 + (z - 32) * 0.05 + Math.sin((z - 32) * 0.6) * 0.35
      terreno.prever(original, tudo)
      camera.position.set(23, 24, 30)
      camera.lookAt(0, 2, 0)
      sol.position.set(-8, 18, 6)
      cena.background = new T.Color('#b5d9ed')
      cena.add(terreno.grupo, caminhos.grupo, sol, ambiente)
      const arquivos = [
        ['cerca', 'cerca_01_pacote.d3801d31a4a9.glb'],
        ['muro', 'muro_ameias_reto_3_5m.fe03f543e2b5.glb'],
        ['piso', 'caminho_terra_reto.804d14830d95.glb'],
      ]
      for (const [id, arquivo] of arquivos) {
        const bytes = new Uint8Array(await (await fetch(`/acervo/${arquivo}`)).arrayBuffer())
        modelos.set(id, await lerGlb(bytes.buffer))
        d.modelos.push({
          id,
          modelo: id,
          biblioteca: 'qa',
          digest: await core.digestDosBytes(bytes),
        })
      }
      const comum = {
        nome: 'Ensaio',
        grupo: null,
        oculto: false,
        bloqueado: false,
        encaixeModelo: { eixo: 'x', baseLocal: 0 },
      }
      d.caminhos = [
        {
          ...comum,
          id: 'cerca',
          tipo: 'cerca',
          acabamento: 'cerca',
          largura: 0.1924,
          altura: 0.6001,
          comprimentoDoModulo: 2.2276,
          pontos: [
            { x: -14, z: -6 },
            { x: -4, z: -6 },
            { x: -1, z: -2 },
          ],
        },
        {
          ...comum,
          id: 'muro',
          tipo: 'muro',
          acabamento: 'muro',
          largura: 1.22,
          altura: 3,
          comprimentoDoModulo: 3.5,
          pontos: [
            { x: 4, z: -10 },
            { x: 4, z: 0 },
            { x: 10, z: 4 },
          ],
        },
        {
          ...comum,
          id: 'estrada',
          tipo: 'estrada',
          acabamento: 'piso',
          largura: 2.6,
          suave: true,
          pontos: [
            { x: -14, z: 8 },
            { x: -4, z: 6 },
            { x: 6, z: 9 },
            { x: 12, z: 6 },
          ],
          molde: { deslocamento: -0.15, borda: 2, suavizacao: 8 },
        },
      ].map((c) => core.CaminhoSchema.parse(c))
      core.validarDocumento(d)
      const definir = () =>
          caminhos.definir(
            d,
            terreno,
            (id) => modelos.get(id) ?? null,
            () => null,
            new Set(),
          ),
        desenhar = () => {
          camera.updateMatrixWorld()
          renderer.render(cena, camera)
        },
        antes = definir()
      desenhar()
      const posAntes = caminhos
          .superficies()
          .filter((s) => s.id === 'estrada')
          .map((s) => s.geometria.getAttribute('position').array.slice()),
        operacao = core.prepararOperacaoDeCaminho(d.caminhos[2], original),
        imutavel = Array.from(original.campo.alturas),
        b = new T.Vector3(),
        errosDeBase = [],
        fontesOriginais = new Map()
      for (const [id, m] of modelos)
        fontesOriginais.set(
          id,
          m.partes.map((p) => p.geometria.getAttribute('position').array.slice()),
        )
      terreno.prever(operacao.terreno, operacao.regioes)
      caminhos.atualizarTerreno(operacao.regioes)
      const depois = definir()
      for (const s of caminhos.superficies().filter((s) => s.id === 'cerca' || s.id === 'muro')) {
        const p = s.geometria.getAttribute('position')
        for (let i = 0; i < p.count; i++) {
          b.fromBufferAttribute(p, i).applyMatrix4(s.matriz)
          const diferenca = b.y - core.alturaDoCampo(operacao.terreno.campo, b.x, b.z)
          if (diferenca < 0.00001) errosDeBase.push(diferenca)
        }
      }
      const posDepois = caminhos
          .superficies()
          .filter((s) => s.id === 'estrada')
          .map((s) => s.geometria.getAttribute('position').array),
        alterouPiso = posDepois.some((p, j) => Array.from(p).some((v, i) => v !== posAntes[j][i])),
        mundo = new MundoDoTeste(caminhos.fontesDoTeste()),
        bloqueio = mundo.rastrear(
          new T.Vector3(3, terreno.altura(4, -5) + 1, -5),
          new T.Vector3(5, terreno.altura(4, -5) + 1, -5),
        )
      mundo.descartar()
      const fontesPreservadas = [...modelos].every(([id, m]) =>
          m.partes.every((p, i) =>
            Array.from(p.geometria.getAttribute('position').array).every(
              (v, j) => v === fontesOriginais.get(id)[i][j],
            ),
          ),
        ),
        origemPreservada = Array.from(original.campo.alturas).every((v, i) => v === imutavel[i])
      desenhar()
      const ciclos = []
      for (let i = 0; i < 3; i++) {
        caminhos.limpar()
        const estado = definir()
        desenhar()
        ciclos.push({
          estado,
          ...renderer.info.memory,
          desenhos: renderer.info.render.calls,
          triangulos: renderer.info.render.triangles,
        })
      }
      window.__relevoQA = {
        antes: () => {
          terreno.prever(original, tudo)
          caminhos.atualizarTerreno(tudo)
          definir()
          desenhar()
        },
        depois: () => {
          terreno.prever(operacao.terreno, tudo)
          caminhos.atualizarTerreno(tudo)
          definir()
          desenhar()
        },
        noite: () => {
          sol.intensity = 0.1
          ambiente.intensity = 0.3
          cena.background.set('#223b50')
          desenhar()
        },
        destruir: () => {
          caminhos.descartar()
          terreno.descartar()
          for (const m of modelos.values()) m.descartar()
          renderer.dispose()
        },
      }
      return {
        antes,
        depois,
        alterouPiso,
        fontesPreservadas,
        origemPreservada,
        menorErroDeBase: Math.min(...errosDeBase),
        basesConferidas: errosDeBase.length,
        muroBloqueia: Boolean(bloqueio),
        ciclos,
      }
    },
    {
      coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      tres: modulo('node_modules/three/build/three.module.js'),
      motor: modulo('packages/molda-cenarios-motor/src'),
    },
  )
  await pagina.evaluate(() => window.__relevoQA.antes())
  await pagina.screenshot({ path: resolve(saida, 'antes.png') })
  await pagina.evaluate(() => window.__relevoQA.depois())
  await pagina.screenshot({ path: resolve(saida, 'depois.png') })
  await pagina.evaluate(() => window.__relevoQA.noite())
  await pagina.screenshot({ path: resolve(saida, 'noite.png') })
  await pagina.evaluate(() => window.__relevoQA.destruir())
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify({ ...resultado, erros }, null, 2))
  console.log(JSON.stringify({ ...resultado, erros }))
  assert.deepEqual(erros, [])
  assert.deepEqual(resultado.antes.falhas, [])
  assert.deepEqual(resultado.depois.falhas, [])
  assert.equal(resultado.alterouPiso, true)
  assert.equal(resultado.fontesPreservadas, true)
  assert.equal(resultado.origemPreservada, true)
  assert.ok(resultado.basesConferidas > 0)
  assert.ok(resultado.menorErroDeBase > -0.00001)
  assert.equal(resultado.muroBloqueia, true)
  for (const ciclo of resultado.ciclos) assert.deepEqual(ciclo, resultado.ciclos[0])
} finally {
  await navegador.close()
}
