import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const terreno = process.env.CENARIOS_QA_TERRENO === '1',
  raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, `output/cenarios-reforma/lote8-integracao${terreno ? '-terreno' : ''}`),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  pagina = await browser.newPage(),
  erros = []
pagina.on('pageerror', (e) => erros.push(e.message))
try {
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForFunction(() => window.__cenarios)
  const r = await pagina.evaluate(
    async (u) => {
      const T = await import(u.three),
        C = await import(u.core),
        { compilarCenario } = await import(u.compilar),
        { lerGlb } = await import(u.modelos),
        { MundoDoTeste } = await import(u.fisica),
        d = C.criarDocumentoVazio('integracao', 'Pacote integrado'),
        falhar = () => {
          throw Error('Esta fixture só usa formas próprias, não deve pedir acervo.')
        },
        portas = { modelo: falhar, textura: falhar, terreno: falhar },
        contexto = { equipe: true, bibliotecas: [] },
        fonte = { cenario: d.id, revisao: 7 },
        identidade = (x, y, z) => ({
          posicao: { x, y, z },
          rotacao: { x: 0, y: 0, z: 0 },
          escala: { x: 1, y: 1, z: 1 },
        })
      d.base = { tipo: 'plano', largura: 32, comprimento: 32 }
      d.formas = [{ id: 'f', nome: 'Caixa', tipo: 'caixa', largura: 2, altura: 1, comprimento: 2 }]
      d.instancias = ['a', 'b'].map((id, i) => ({
        id,
        nome: id,
        modelo: 'f',
        grupo: null,
        oculto: false,
        bloqueado: false,
        colisao: 'caixa',
        apoio: { tipo: 'absoluto' },
        transformacao: identidade(i * 6, 0, -6),
        propriedades: { uso: 'ensaio' },
      }))
      d.caminhos = [
        C.CaminhoSchema.parse({
          id: 'trilha',
          nome: 'Trilha',
          grupo: null,
          oculto: false,
          bloqueado: false,
          tipo: 'trilha',
          acabamento: null,
          largura: 2,
          pontos: [
            { x: -12, z: 0 },
            { x: 0, z: 0 },
            { x: 12, z: 6 },
          ],
        }),
      ]
      d.aguas = [
        C.AguaSchema.parse({
          id: 'mar',
          nome: 'Mar',
          grupo: null,
          oculto: false,
          bloqueado: false,
          tipo: 'mar',
          nivel: -1,
        }),
      ]
      if (u.terreno) {
        const h = C.codificarPecaDeAlturas(
            Float64Array.from({ length: C.AMOSTRAS_DA_PECA }, (_, i) => -2 + (i % 65) / 32),
            -10,
            20,
          ),
          bits = new Uint8Array(512)
        bits[0] = 1
        const pintura = C.criarPinturaDeChao({ colunas: 64, linhas: 64 }, 2)
        for (let i = 0; i < 65 * 65; i++) {
          const peso = Math.round(((i % 65) / 64) * 255)
          pintura.pesos[i * 2] = 255 - peso
          pintura.pesos[i * 2 + 1] = peso
        }
        const tinta = C.codificarPecaDePintura(pintura, 0, 0),
          pinturaHash = await C.digestDosBytes(tinta),
          b = C.codificarRecursoDeBuracos(bits),
          digest = await C.digestDosBytes(h),
          buraco = await C.digestDosBytes(b),
          arquivos = new Map([
            [digest, h],
            [buraco, b],
            [pinturaHash, tinta],
          ])
        d.base = {
          tipo: 'terreno',
          cobertura: 'grade',
          origem: { x: -8, z: -8 },
          passo: 0.5,
          colunas: 64,
          linhas: 64,
          min: -10,
          max: 20,
          fundo: -2,
          pecas: [{ coluna: 0, linha: 0, digest }],
          buracos: [{ coluna: 0, linha: 0, digest: buraco }],
          recortes: [
            [
              { x: 3, z: 5 },
              { x: 13, z: 5 },
              { x: 13, z: 15 },
              { x: 3, z: 15 },
            ],
          ],
          solo: {
            camadas: [
              { id: 'verde', nome: 'Grama', cor: '#a4d48c' },
              { id: 'terra', nome: 'Terra', cor: '#bfa37c' },
            ],
            pecas: [{ coluna: 0, linha: 0, digest: pinturaHash }],
          },
        }
        portas.terreno = async (hash) => {
          const b = arquivos.get(hash)
          if (!b) throw Error('Hash de terreno inesperado.')
          return b.slice().buffer
        }
        const bytes = new Uint8Array(await (await fetch(u.lago)).arrayBuffer()),
          sha = await C.digestDosBytes(bytes)
        d.modelos = [
          {
            id: 'lago-modelo',
            nome: 'Lago',
            biblioteca: 'reino',
            modelo: 'lago_nadavel',
            digest: sha,
          },
        ]
        contexto.bibliotecas = [{ id: 'reino', nome: 'Reino', licenca: 'restrita' }]
        const modelos = new Map([['lago-modelo', bytes]])
        for (const [id, url, biblioteca] of [
          ['avatar', u.avatar, 'cute'],
          ['ponte', u.ponte, 'adventure'],
        ]) {
          const b = new Uint8Array(await (await fetch(url)).arrayBuffer())
          modelos.set(id, b)
          d.modelos.push({
            id,
            nome: id,
            biblioteca,
            modelo: id,
            digest: await C.digestDosBytes(b),
          })
        }
        contexto.bibliotecas.push(
          { id: 'cute', nome: 'Cute Characters', licenca: 'restrita' },
          { id: 'adventure', nome: 'Adventure Land', licenca: 'restrita' },
        )
        portas.modelo = async (ref) => {
          const b = modelos.get(ref.id)
          if (!b) throw Error('Modelo inesperado.')
          return b.slice().buffer
        }
        d.instancias.push({
          ...d.instancias[0],
          id: 'ator',
          nome: 'Cute Characters',
          modelo: 'avatar',
          colisao: 'capsula',
          transformacao: identidade(2, 0, -3),
          espelho: { x: true, y: false, z: false },
          propriedades: { ator: true },
        })
        d.aguas.push(
          C.AguaSchema.parse({
            id: 'lago',
            nome: 'Lago de catálogo',
            grupo: null,
            oculto: false,
            bloqueado: false,
            tipo: 'lago',
            modelo: 'lago-modelo',
            centro: { x: 8, z: 10 },
            giro: 0,
            escala: 1,
            nivel: 0,
            profundidade: 2,
            contorno: [
              { x: -4.2, z: -3.6 },
              { x: 4.3, z: -3.6 },
              { x: 4.3, z: 3.6 },
              { x: -4.2, z: 3.6 },
            ],
            recorte: [
              { x: -5, z: -5 },
              { x: 5, z: -5 },
              { x: 5, z: 5 },
              { x: -5, z: 5 },
            ],
            encaixeModelo: {
              nivelLocal: 1.399999976158142,
              materiaisDaAgua: ['agua'],
              materiaisSolidos: ['cor'],
            },
          }),
        )
        d.caminhos[0].pontos = [
          { x: -6, z: 0 },
          { x: 0, z: 0 },
          { x: 16, z: 3 },
        ]
        d.caminhos.push(
          C.CaminhoSchema.parse({
            id: 'ponte',
            nome: 'Ponte de catálogo',
            grupo: null,
            oculto: false,
            bloqueado: false,
            tipo: 'ponte',
            acabamento: 'ponte',
            largura: 2,
            pontos: [
              { x: 8, z: 4 },
              { x: 8, z: 16 },
            ],
            cotas: { de: 0, ate: 0 },
            encaixeModelo: { eixo: 'z', pisoLocal: 0 },
          }),
        )
        const origem = C.criarDocumentoVazio('origem', 'Conjunto de ensaio')
        origem.formas = d.formas
        origem.instancias = [
          {
            ...d.instancias[0],
            id: 'peca',
            transformacao: { ...identidade(0, 0, 0), escala: { x: 1.2, y: 0.8, z: 1.5 } },
          },
        ]
        d.definicoesConjuntos = [
          {
            id: 'def',
            nome: 'Conjunto',
            biblioteca: 'reino',
            conjunto: 'ensaio',
            revisao: 1,
            conteudo: C.capturarFragmento(origem, ['peca'], 'conta'),
          },
        ]
        const transformacao = identidade(18, 0, -4)
        transformacao.rotacao.y = 0.7
        transformacao.escala = { x: 1.2, y: 1.2, z: 1.2 }
        d.montagens = [
          {
            id: 'conjunto',
            nome: 'Conjunto transformado',
            grupo: null,
            oculto: false,
            bloqueado: false,
            definicao: 'def',
            transformacao,
          },
        ]
        const canvas = document.createElement('canvas')
        canvas.width = 8
        canvas.height = 4
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#f4e4ba'
        ctx.fillRect(0, 0, 8, 4)
        ctx.fillStyle = '#d3c7a4'
        ctx.fillRect(0, 0, 4, 4)
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png')),
          imagem = new Uint8Array(await blob.arrayBuffer()),
          imagemHash = await C.digestDosBytes(imagem)
        d.texturas = [
          { id: 'padrao', biblioteca: 'propria', textura: 'padrao', digest: imagemHash },
        ]
        contexto.bibliotecas.push({
          id: 'propria',
          nome: 'Padrão próprio do ensaio',
          licenca: 'propria',
        })
        portas.textura = async () => imagem.slice().buffer
        d.base.solo.camadas[1].textura = { id: 'padrao', repeticaoMetros: 2 }
        d.iluminacao.ceu = { tipo: 'panorama', textura: 'padrao', giro: 0.4, intensidade: 0.8 }
      }
      // O GLB é o acabamento estático; ondas dinâmicas serão restauradas pelo consumidor.
      for (const a of d.aguas)
        a.aparencia = {
          ...(a.aparencia ?? {}),
          ondas: { altura: 0, comprimento: 3, velocidade: 0 },
        }
      const original = JSON.stringify(d),
        ciclos = [],
        provas = [],
        carregados = []
      let pacote, gpuFinal
      const rendererDosCiclos = new T.WebGLRenderer(),
        cenaDoCiclo = new T.Scene(),
        cameraDoCiclo = new T.PerspectiveCamera(50, 1, 0.1, 3000)
      rendererDosCiclos.setSize(32, 32)
      cameraDoCiclo.position.set(20, 15, 20)
      cameraDoCiclo.lookAt(0, 0, 0)
      // Three r184 cria sua DFG_LUT no primeiro material PBR e a mantém até renderer.dispose().
      // Aquecer esse recurso próprio do renderer permite medir somente recursos do pacote.
      const aquecimento = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial())
      cenaDoCiclo.add(aquecimento)
      rendererDosCiclos.render(cenaDoCiclo, cameraDoCiclo)
      cenaDoCiclo.clear()
      aquecimento.geometry.dispose()
      aquecimento.material.dispose()
      const baseGpu = { ...rendererDosCiclos.info.memory }
      try {
        for (let i = 0; i < 3; i++) {
          const p = await compilarCenario(
            d,
            fonte,
            contexto,
            portas,
            new AbortController().signal,
            { preservarHierarquia: (o) => o.propriedades?.ator === true },
          )
          if (JSON.stringify(d) !== original) throw Error('A compilação alterou a autoria.')
          ciclos.push({
            arquivos: p.arquivos.size,
            bytes: [...p.arquivos.values()].reduce((s, b) => s + b.length, 0),
            nos: p.cena.nos.length,
            colisoes: p.cena.colisoes.length,
          })
          pacote = p
          const copias = []
          let alocados
          try {
            for (const n of p.cena.nos) {
              const m = await lerGlb(p.arquivos.get(n.arquivo).slice().buffer)
              copias.push(m)
              const g = new T.Group()
              g.matrixAutoUpdate = false
              g.matrix.fromArray(n.matriz)
              g.add(m.raiz)
              cenaDoCiclo.add(g)
            }
            rendererDosCiclos.render(cenaDoCiclo, cameraDoCiclo)
            alocados = { ...rendererDosCiclos.info.memory }
          } finally {
            for (const m of copias) m.descartar()
            cenaDoCiclo.clear()
          }
          rendererDosCiclos.render(cenaDoCiclo, cameraDoCiclo)
          ciclos[i].gpu = { base: baseGpu, alocados, depois: { ...rendererDosCiclos.info.memory } }
          const controller = new AbortController()
          let cancelou = false
          try {
            await compilarCenario(d, fonte, contexto, portas, controller.signal, {
              progresso: (p) => {
                if (p.etapa === 'arquivos' && p.feitos === 0)
                  controller.abort(new DOMException('Ensaio cancelado', 'AbortError'))
              },
            })
          } catch (e) {
            if (e.name !== 'AbortError') throw e
            cancelou = true
          }
          if (!cancelou) throw Error('Cancelamento entregou um pacote parcial.')
        }
      } finally {
        rendererDosCiclos.dispose()
        gpuFinal = { ...rendererDosCiclos.info.memory }
        rendererDosCiclos.forceContextLoss()
      }
      if (gpuFinal.geometries !== 0 || gpuFinal.textures !== 0)
        throw Error('Renderer não liberou os recursos após o ciclo.')
      const { carregarRecursosDaCompilacao } = await import(
          u.compilar.replace('compilar.ts', 'recursos.ts')
        ),
        { montarSuperficiesDaCompilacao } = await import(
          u.compilar.replace('compilar.ts', 'superficies.ts')
        ),
        { RepresentacoesDoModelo } = await import(
          u.compilar.replace('compilar/compilar.ts', 'representacoes.ts')
        ),
        { matrizDaTransformacao } = await import(
          u.compilar.replace('compilar/compilar.ts', 'matematica.ts')
        ),
        { criarPlanoDoCenario } = await import(
          u.compilar.replace('compilar/compilar.ts', 'plano.ts')
        ),
        referencias = await carregarRecursosDaCompilacao(
          d,
          fonte,
          contexto,
          portas,
          new AbortController().signal,
        ),
        superficies = montarSuperficiesDaCompilacao(
          d,
          fonte,
          contexto,
          referencias.terreno,
          (id) => referencias.modelos.get(id) ?? null,
          (id) => referencias.texturas.get(id)?.textura ?? null,
        ),
        antes = new T.Group(),
        representacoes = [],
        piso =
          d.base.tipo === 'plano'
            ? criarPlanoDoCenario(d.base.largura, d.base.comprimento)
            : undefined,
        raiz = new T.Group(),
        fontes = []
      if (piso) antes.add(piso)
      if (superficies.terreno) antes.add(superficies.terreno.grupo)
      antes.add(superficies.aguas.grupo, superficies.caminhos.grupo)
      for (const o of superficies.preparada.objetos) {
        const rep = new RepresentacoesDoModelo(antes, referencias.modelos.get(o.modelo))
        representacoes.push(rep)
        rep.obter(o.espelho).preencher([
          {
            id: o.id,
            matriz: matrizDaTransformacao(o.transformacao, new T.Matrix4()),
            cor: o.aparencia?.cor,
          },
        ])
      }
      try {
        for (const n of [...pacote.cena.nos, ...pacote.cena.colisoes]) {
          const bytes = pacote.arquivos.get(n.arquivo),
            modelo = await lerGlb(bytes.slice().buffer)
          carregados.push(modelo)
          const matriz = new T.Matrix4().fromArray(n.matriz)
          modelo.raiz.updateWorldMatrix(true, true)
          const caixa = modelo.caixa.clone().applyMatrix4(matriz),
            esperado = n.volume
          for (const eixo of ['x', 'y', 'z'])
            for (const extremo of ['min', 'max'])
              if (Math.abs(caixa[extremo][eixo] - esperado[extremo][eixo]) > 1e-5)
                throw Error(`Volume divergente: ${n.id}`)
          if (n.entidade === 'ator' && pacote.cena.nos.includes(n) && modelo.animacoes.length !== 4)
            throw Error('Os quatro clipes do avatar não foram conservados.')
          if (pacote.cena.nos.includes(n)) {
            const g = new T.Group()
            g.matrixAutoUpdate = false
            g.matrix.copy(matriz)
            g.add(modelo.raiz)
            raiz.add(g)
          } else
            for (const p of modelo.partes)
              fontes.push({ geometria: p.geometria, matriz: matriz.clone().multiply(p.matriz) })
        }
        const fisica = new MundoDoTeste(fontes)
        try {
          const pontos = u.terreno
            ? [
                [0, -6, 1],
                [6, -6, 1],
                [-6, 0, -1.875],
                [16, -4, -0.5],
                [20, 20, -0.25],
              ]
            : [
                [0, -6, 1],
                [6, -6, 1],
                [-10, 0, 0],
                [12, 6, 0],
                [15, 15, 0],
              ]
          for (const [x, z, h] of pontos) {
            const hit = fisica.rastrear(new T.Vector3(x, 5, z), new T.Vector3(x, -5, z))
            if (!hit || Math.abs(hit.ponto.y - h) > 0.001)
              throw Error(`Colisão incorreta em ${x},${z}: ${hit?.ponto.y} esperado ${h}`)
            provas.push({ x, z, altura: hit.ponto.y })
          }
          const fora = u.terreno ? 25 : 17
          if (fisica.rastrear(new T.Vector3(fora, 5, fora), new T.Vector3(fora, -5, fora)))
            throw Error('Piso exportado extrapolou o limite físico.')
          if (
            u.terreno &&
            fisica.rastrear(new T.Vector3(-7.75, 5, -7.75), new T.Vector3(-7.75, -5, -7.75))
          )
            throw Error('O buraco do terreno virou chão sólido.')
        } finally {
          fisica.descartar()
        }
        const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }),
          scene = new T.Scene(),
          camera = new T.PerspectiveCamera(50, 640 / 360, 0.05, 3000)
        try {
          renderer.setSize(640, 360)
          renderer.setClearColor('#83bde0')
          scene.add(raiz, new T.HemisphereLight('#ffffff', '#597040', 3))
          renderer.toneMapping = T.NoToneMapping
          const comparativos = []
          for (const [nome, pos, alvo] of [
            ['geral', [17, 13, 19], [0, 0, -2]],
            ['aproximacao', [6, 3, 8], [0, 0, 0]],
            ['rasante', [-3, 1.16, 4], [5, 0, 0]],
          ]) {
            camera.position.fromArray(pos)
            camera.lookAt(...alvo)
            const render = (grupo) => {
                antes.removeFromParent()
                raiz.removeFromParent()
                scene.add(grupo)
                renderer.render(scene, camera)
                const pixels = new Uint8Array(640 * 360 * 4)
                renderer
                  .getContext()
                  .readPixels(
                    0,
                    0,
                    640,
                    360,
                    renderer.getContext().RGBA,
                    renderer.getContext().UNSIGNED_BYTE,
                    pixels,
                  )
                return { pixels, png: renderer.domElement.toDataURL('image/png').split(',')[1] }
              },
              a = render(antes),
              b = render(raiz)
            let soma = 0,
              maximo = 0,
              diferentes = 0
            for (let i = 0; i < a.pixels.length; i++) {
              const delta = Math.abs(a.pixels[i] - b.pixels[i])
              soma += delta
              maximo = Math.max(maximo, delta)
              if (delta > 16) diferentes++
            }
            comparativos.push({
              nome,
              erroMedio: soma / a.pixels.length,
              maximo,
              canaisAcima16: diferentes,
              antes: a.png,
              depois: b.png,
            })
          }
          const png = comparativos[0].depois,
            recursos = { ...renderer.info.memory },
            arquivos = [...pacote.arquivos].map(([caminho, b]) => {
              const blocos = []
              for (let i = 0; i < b.length; i += 16384)
                blocos.push(String.fromCharCode(...b.subarray(i, i + 16384)))
              return { caminho, base64: btoa(blocos.join('')) }
            })
          return {
            ciclos,
            provas,
            comparativos,
            avisos: pacote.avisos,
            autoriaIntacta: JSON.stringify(d) === original,
            png,
            recursos,
            cena: pacote.cena,
            arquivos,
          }
        } finally {
          renderer.dispose()
          renderer.forceContextLoss()
        }
      } finally {
        for (const m of carregados) m.descartar()
        raiz.clear()
        for (const r of representacoes) r.descartar()
        piso?.geometry.dispose()
        piso?.material.dispose()
        superficies.descartar()
        referencias.descartar()
        antes.clear()
      }
    },
    {
      terreno,
      lago: modulo('output/molda-cenarios/acervo/lago_nadavel.87f49a705905.glb'),
      avatar: modulo('output/cenarios-reforma/lote3-testar-avatar/avatar-cute-ensaio.glb'),
      ponte: modulo('output/molda-cenarios/acervo/ponte_04_pacote.8d256d9aefcc.glb'),
      three: modulo('node_modules/three/build/three.module.js'),
      core: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      compilar: modulo('packages/molda-cenarios-motor/src/compilar/compilar.ts'),
      modelos: modulo('packages/molda-cenarios-motor/src/modelos.ts'),
      fisica: modulo('packages/molda-cenarios-motor/src/teste/colisoes.ts'),
    },
  )
  writeFileSync(resolve(saida, 'pacote-reaberto.png'), Buffer.from(r.png, 'base64'))
  delete r.png
  for (const c of r.comparativos)
    for (const fase of ['antes', 'depois']) {
      writeFileSync(resolve(saida, `${c.nome}-${fase}.png`), Buffer.from(c[fase], 'base64'))
      delete c[fase]
    }
  for (const a of r.arquivos) {
    const p = resolve(saida, a.caminho)
    mkdirSync(resolve(p, '..'), { recursive: true })
    writeFileSync(p, Buffer.from(a.base64, 'base64'))
  }
  const validator = createRequire(resolve(raiz, 'packages/molda/package.json'))('gltf-validator'),
    validacao = []
  for (const a of r.cena.arquivos.filter((a) => a.mime === 'model/gltf-binary')) {
    const v = await validator.validateBytes(
      new Uint8Array(readFileSync(resolve(saida, a.caminho))),
      { uri: a.caminho },
    )
    validacao.push({
      arquivo: a.caminho,
      erros: v.issues.numErrors,
      avisos: v.issues.numWarnings,
      informacoes: v.issues.numInfos,
      mensagens: v.issues.messages,
    })
  }
  writeFileSync(resolve(saida, 'validacao-khronos.json'), JSON.stringify(validacao, null, 2))
  assert.ok(
    validacao.every((v) => v.erros === 0 && v.avisos === 0),
    'Validação glTF dos arquivos do pacote',
  )
  delete r.arquivos
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(r, null, 2))
  assert.deepEqual(erros, [])
  assert.equal(r.autoriaIntacta, true)
  assert.deepEqual(r.ciclos[0], r.ciclos[1])
  assert.deepEqual(r.ciclos[1], r.ciclos[2])
  assert.equal(r.cena.nos.filter((n) => n.entidade === 'a' || n.entidade === 'b').length, 2)
  assert.equal(
    new Set(
      r.cena.nos.filter((n) => n.entidade === 'a' || n.entidade === 'b').map((n) => n.arquivo),
    ).size,
    1,
  )
  for (const c of r.ciclos) assert.deepEqual(c.gpu.depois, c.gpu.base)
  for (const c of r.comparativos) {
    assert.ok(c.erroMedio < 1, `${c.nome}: erro médio`)
    assert.ok(c.canaisAcima16 < 1000, `${c.nome}: divergência de imagem`)
  }
  console.log(
    JSON.stringify(
      {
        ciclos: r.ciclos,
        provas: r.provas,
        comparativos: r.comparativos,
        recursos: r.recursos,
        plano: r.cena.plano,
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
