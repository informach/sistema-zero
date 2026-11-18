import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote7-ambiente'),
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
  await pagina.waitForLoadState('networkidle')
  await pagina.evaluate(
    async ({ coreUrl, motorUrl, oficina }) => {
      const core = await import(coreUrl),
        { criarPalco } = await import(motorUrl),
        { criarHostEmMemoria } = await import(`${oficina}/host-memoria.ts`),
        { criarControlador } = await import(`${oficina}/controlador.ts`),
        host = criarHostEmMemoria(),
        mundo = await host.criarMundo('conta', 'Ambiente'),
        cenario = await host.criarCenario(mundo.id, 'Iluminação'),
        biblioteca = await host.criarBiblioteca('conta', {
          nome: 'Panoramas QA',
          licenca: 'propria',
        }),
        ctl = criarControlador(host, await host.abrirCenario(cenario.id))
      const fonte = { grupo: null, oculto: false, bloqueado: false },
        marker = (id, foco) =>
          core.MarcadorSchema.parse({
            ...fonte,
            id,
            nome: id,
            posicao: { x: foco ? 3 : -3, y: 3, z: 3 },
            giro: 0,
            noChao: false,
            objeto: null,
            configuracao: {
              tipo: 'luz',
              luz: {
                tipo: foco ? 'foco' : 'pontual',
                cor: foco ? '#ffbb77' : '#88bbff',
                intensidade: foco ? 100 : 30,
                alcance: 16,
                decaimento: 2,
                sombra: true,
                ...(foco ? { alvo: { x: -3, y: -3, z: -3 }, angulo: 40, penumbra: 0.5 } : {}),
              },
            },
          })
      const criou = ctl.executar([
        {
          tipo: 'forma.definir',
          forma: {
            id: 'caixa',
            nome: 'Caixa',
            tipo: 'caixa',
            largura: 2,
            altura: 2,
            comprimento: 2,
          },
        },
        ...[-3, 0, 3].map((x, i) => ({
          tipo: 'instancia.criar',
          instancia: {
            ...fonte,
            id: `o${i}`,
            nome: `Bloco ${i}`,
            modelo: 'caixa',
            apoio: { tipo: 'absoluto' },
            colisao: 'caixa',
            transformacao: {
              posicao: { x, y: 0, z: -i * 2 },
              rotacao: { x: 0, y: 0, z: 0 },
              escala: { x: 1, y: 1, z: 1 },
            },
          },
        })),
        { tipo: 'marcador.definir', marcador: marker('pontual', false) },
        { tipo: 'marcador.definir', marcador: marker('foco', true) },
      ])
      if (!criou) throw Error(ctl.getState().recusa)
      await ctl.terminar()
      document.querySelector('#root').remove()
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%'
      document.body.append(canvas)
      const estados = [],
        medidas = [],
        gates = new Map(),
        leituras = []
      const palco = criarPalco(canvas, {
        movimentoReduzido: true,
        carregarModelo: async () => {
          throw Error('O laboratório usa formas autorais')
        },
        carregarTextura: async (ref, sinal) => {
          leituras.push(ref.digest)
          // Deliberadamente não coopera com abort: o cache deve rejeitar a resposta atrasada.
          if (gates.has(ref.digest)) await gates.get(ref.digest).promessa
          return host.conteudoDaTextura({ biblioteca: ref.biblioteca, digest: ref.digest }, sinal)
        },
        aoAmbiente: (e) => estados.push(e),
        aoMedir: (e) => medidas.push(e),
      })
      palco.definirDocumento(ctl.getState().documento)
      await palco.aguardarRecursos()
      palco.restaurarCamera({
        posicao: { x: 9, y: 5, z: 13 },
        alvo: { x: 0, y: 1, z: -2 },
        campoDeVisao: 48,
      })
      const panorama = async (id, cores, atrasar = false, altura = 64) => {
        const c = document.createElement('canvas')
        c.width = 128
        c.height = altura
        const ctx = c.getContext('2d')
        cores.forEach((cor, i) => {
          ctx.fillStyle = cor
          ctx.fillRect(i * 32, 0, 32, altura)
        })
        const blob = await new Promise((r) => c.toBlob(r, 'image/png')),
          dados = await blob.arrayBuffer(),
          digest = await core.digestDosBytes(new Uint8Array(dados)),
          [importada] = await host.importarTexturas(biblioteca.id, [
            {
              nome: id,
              pasta: '',
              etiquetas: [],
              digest,
              largura: 128,
              altura,
              repeticaoMetros: 1,
              conteudo: blob,
            },
          ]),
          ref = { id, nome: id, biblioteca: biblioteca.id, textura: importada.id, digest }
        if (atrasar) {
          let liberar
          const promessa = new Promise((r) => {
            liberar = r
          })
          gates.set(digest, { promessa, liberar })
        }
        return ref
      }
      window.__ambienteQA = {
        core,
        host,
        cenario,
        ctl,
        palco,
        estados,
        medidas,
        leituras,
        gates,
        panorama,
        doc: () => ctl.getState().documento,
        antes: JSON.stringify(ctl.getState().documento),
        claro: ctl.getState().documento.iluminacao,
        noite: {
          hora: 22,
          sol: { direcao: { x: -1, y: 1, z: 1 }, cor: '#aabbff', intensidade: 0.05, sombra: true },
          ambiente: { ceu: '#446688', chao: '#223344', intensidade: 0.1 },
          ceu: { tipo: 'cor', cor: '#121c35' },
          nevoa: { tipo: 'linear', cor: '#23334c', perto: 12, longe: 70 },
          sombras: { resolucao: 1024, alcance: 30 },
        },
      }
    },
    {
      coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      motorUrl: modulo('packages/molda-cenarios-motor/src/index.ts'),
      oficina: modulo('packages/molda-cenarios/src/oficina'),
    },
  )
  const quadro = () =>
      pagina.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      ),
    foto = async (nome) => {
      await quadro()
      return pagina.screenshot({ path: resolve(saida, `${nome}.png`) })
    }
  await foto('dia')
  await pagina.evaluate(() => {
    const q = window.__ambienteQA
    for (let i = 0; i < 12; i++)
      q.palco.preverAmbiente(q.doc(), [
        { tipo: 'iluminacao.definir', iluminacao: { ...q.noite, hora: 18 + i / 3 } },
      ])
  })
  await foto('noite-previa')
  const previa = await pagina.evaluate(() => {
    const q = window.__ambienteQA
    return {
      autoral: JSON.stringify(q.doc()) === q.antes,
      revisao: q.ctl.getState().revisao,
      estado: q.estados.at(-1),
    }
  })
  assert.equal(previa.autoral, true)
  assert.equal(previa.estado.luzes, 2)
  assert.equal(previa.estado.sombrasLocais, 2)
  assert.deepEqual(previa.estado.falhas, [])
  await pagina.evaluate(() => window.__ambienteQA.palco.finalizarPreviaDeAmbiente())
  await foto('cancelado')
  const preparo = await pagina.evaluate(async () => {
    const q = window.__ambienteQA,
      antigo = await q.panorama('antigo', ['#ee5566', '#993344', '#bb4455', '#ff7788'], true),
      novo = await q.panorama('novo', ['#bbddff', '#ddbb77', '#88bb99', '#ddccff'])
    q.antigo = antigo
    q.novo = novo
    q.palco.preverAmbiente(q.doc(), [
      { tipo: 'textura.definir', textura: antigo },
      {
        tipo: 'iluminacao.definir',
        iluminacao: {
          hora: 12,
          ceu: { tipo: 'panorama', textura: antigo.id, giro: 0, intensidade: 1 },
        },
      },
    ])
    return q.estados.at(-1)
  })
  assert.equal(preparo.ceu, 'carregando')
  await pagina.evaluate(async () => {
    const q = window.__ambienteQA
    q.palco.finalizarPreviaDeAmbiente()
    q.comandos = [
      { tipo: 'textura.definir', textura: q.novo },
      {
        tipo: 'iluminacao.definir',
        iluminacao: {
          hora: 12,
          ceu: { tipo: 'panorama', textura: q.novo.id, giro: 0, intensidade: 1 },
        },
      },
    ]
    q.palco.preverAmbiente(q.doc(), q.comandos)
    await q.palco.aguardarRecursos()
  })
  const imagemAntes = await foto('panorama')
  await pagina.evaluate(() => {
    const q = window.__ambienteQA
    q.gates.get(q.antigo.digest).liberar()
  })
  const imagemDepois = await foto('panorama-resposta-antiga')
  assert.deepEqual(imagemAntes, imagemDepois)
  await pagina.waitForFunction(() => window.__ambienteQA.estados.at(-1).ceu === 'panorama')
  await pagina.evaluate(() => {
    const q = window.__ambienteQA,
      iluminacao = q.comandos[1].iluminacao
    q.palco.preverAmbiente(q.doc(), [
      q.comandos[0],
      {
        tipo: 'iluminacao.definir',
        iluminacao: { ...iluminacao, ceu: { ...iluminacao.ceu, giro: Math.PI / 2 } },
      },
    ])
  })
  const girado = await foto('panorama-girado')
  assert.notDeepEqual(girado, imagemAntes)
  await pagina.evaluate(() => {
    const q = window.__ambienteQA
    q.palco.preverAmbiente(q.doc(), q.comandos)
  })
  const salvou = await pagina.evaluate(async () => {
    const q = window.__ambienteQA,
      antes = q.ctl.getState().revisao,
      semSalvar = JSON.stringify(q.doc()) === q.antes
    q.palco.finalizarPreviaDeAmbiente(false)
    if (!q.ctl.executar(q.comandos)) throw Error(q.ctl.getState().recusa)
    q.palco.definirDocumento(q.doc())
    await q.ctl.terminar()
    if (q.ctl.getState().salvamento !== 'guardado')
      throw Error(q.ctl.getState().recusa ?? 'Não gravou a confirmação')
    const reaberto = await q.host.abrirCenario(q.cenario.id)
    return {
      semSalvar,
      revisoes: q.ctl.getState().revisao - antes,
      reaberto: reaberto.documento.iluminacao.ceu,
      estado: q.estados.at(-1),
      leituras: q.leituras.filter((d) => d === q.novo.digest).length,
    }
  })
  assert.equal(salvou.semSalvar, true)
  assert.equal(salvou.revisoes, 1)
  assert.equal(salvou.reaberto.textura, 'novo')
  assert.equal(salvou.estado.ceu, 'panorama')
  assert.equal(salvou.leituras, 1)
  const ciclos = []
  for (let i = 0; i < 3; i++) {
    await pagina.evaluate(async () => {
      const q = window.__ambienteQA
      await q.ctl.desfazer()
      q.palco.definirDocumento(q.doc())
      await q.palco.aguardarRecursos()
    })
    await quadro()
    const limpo = await pagina.evaluate(() => window.__ambienteQA.medidas.at(-1))
    await pagina.evaluate(async () => {
      const q = window.__ambienteQA
      await q.ctl.refazer()
      q.palco.definirDocumento(q.doc())
      await q.palco.aguardarRecursos()
    })
    await quadro()
    const ativo = await pagina.evaluate(() => window.__ambienteQA.medidas.at(-1))
    ciclos.push({ limpo, ativo })
  }
  for (const c of ciclos) {
    assert.equal(c.ativo.texturas, ciclos[0].ativo.texturas)
    assert.equal(c.limpo.texturas, ciclos[0].limpo.texturas)
    assert.equal(c.ativo.geometrias, ciclos[0].ativo.geometrias)
  }
  const ciclosLuzes = []
  for (let i = 0; i < 3; i++) {
    await pagina.evaluate(() => {
      const q = window.__ambienteQA
      q.palco.preverAmbiente(
        q.doc(),
        q
          .doc()
          .marcadores.map((m) => ({ tipo: 'marcador.definir', marcador: { ...m, oculto: true } })),
      )
    })
    await quadro()
    const ocultas = await pagina.evaluate(() => ({
      estado: window.__ambienteQA.estados.at(-1),
      medida: window.__ambienteQA.medidas.at(-1),
    }))
    assert.equal(ocultas.estado.luzes, 0)
    await pagina.evaluate(() => window.__ambienteQA.palco.finalizarPreviaDeAmbiente())
    await quadro()
    const retorno = await pagina.evaluate(() => ({
      estado: window.__ambienteQA.estados.at(-1),
      medida: window.__ambienteQA.medidas.at(-1),
    }))
    assert.equal(retorno.estado.luzes, 2)
    assert.ok(ocultas.medida.texturas < retorno.medida.texturas)
    ciclosLuzes.push({ ocultas, retorno })
  }
  for (const c of ciclosLuzes)
    assert.equal(c.retorno.medida.texturas, ciclosLuzes[0].retorno.medida.texturas)
  const invalido = await pagina.evaluate(async () => {
    const q = window.__ambienteQA,
      ref = await q.panorama('quadrado', ['#ccddff', '#99bbcc', '#88aacc', '#ccddee'], false, 128),
      antes = JSON.stringify(q.doc())
    q.palco.preverAmbiente(q.doc(), [
      { tipo: 'textura.definir', textura: ref },
      {
        tipo: 'iluminacao.definir',
        iluminacao: {
          hora: 12,
          ceu: { tipo: 'panorama', textura: ref.id, giro: 0, intensidade: 1 },
        },
      },
    ])
    let mensagem = null
    try {
      await q.palco.aguardarRecursos()
    } catch (e) {
      mensagem = e.message
    }
    q.palco.finalizarPreviaDeAmbiente()
    await q.palco.aguardarRecursos()
    return {
      mensagem,
      autoriaPreservada: JSON.stringify(q.doc()) === antes,
      retorno: q.estados.at(-1),
    }
  })
  assert.match(invalido.mensagem, /2:1/)
  assert.equal(invalido.autoriaPreservada, true)
  assert.equal(invalido.retorno.ceu, 'panorama')
  const teste = await pagina.evaluate(async () => {
    const q = window.__ambienteQA,
      autoria = JSON.stringify(q.doc()),
      vista = q.palco.capturarCamera()
    await q.palco.iniciarTeste({ modo: 'terceira', inicio: { x: 0, y: 0, z: 6 } })
    let protegeu = false
    try {
      q.palco.preverAmbiente(q.doc(), [{ tipo: 'iluminacao.definir', iluminacao: q.noite }])
    } catch {
      protegeu = true
    }
    return { protegeu, autoria, vista }
  })
  await foto('ambiente-no-teste')
  const voltou = await pagina.evaluate(() => {
    const q = window.__ambienteQA
    q.palco.encerrarTeste()
    return { autoria: JSON.stringify(q.doc()), vista: q.palco.capturarCamera() }
  })
  assert.equal(teste.protegeu, true)
  assert.equal(teste.autoria, voltou.autoria)
  assert.ok(
    Math.hypot(...['x', 'y', 'z'].map((e) => teste.vista.posicao[e] - voltou.vista.posicao[e])) <
      1e-8,
  )
  assert.deepEqual(erros, [])
  writeFileSync(
    resolve(saida, 'resultado.json'),
    JSON.stringify(
      {
        previa,
        preparo,
        salvou,
        respostaAntigaInofensiva: true,
        giro: true,
        ciclos,
        ciclosLuzes,
        invalido,
        teste: { protegido: teste.protegeu, autoriaPreservada: true },
        erros,
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify({
      previa: previa.autoral,
      revisoes: salvou.revisoes,
      panorama: salvou.estado.ceu,
      giro: true,
      respostaAntigaInofensiva: true,
      ciclos,
      ciclosLuzes,
      erros,
    }),
  )
  await pagina.evaluate(() => window.__ambienteQA.palco.destruir())
  await contexto.close()
} finally {
  await navegador.close()
}
