import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote4-escultura')
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
let p
try {
  p = await navegador.newPage({ viewport: { width: 1280, height: 800 } })
  const erros = []
  p.on('pageerror', (e) => erros.push(e.message))
  p.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForFunction(() => window.__cenarios)
  const inicio = await p.evaluate(async (raiz) => {
    const fs = raiz.replaceAll('\\', '/'),
      core = await import(`/@fs/${fs}/packages/molda-cenarios-core/src/v2/index.ts`),
      { criarPalco } = await import(`/@fs/${fs}/packages/molda-cenarios-motor/src/index.ts`),
      { criarHostEmMemoria } = await import(
        `/@fs/${fs}/packages/molda-cenarios/src/oficina/host-memoria.ts`
      ),
      { criarControlador } = await import(
        `/@fs/${fs}/packages/molda-cenarios/src/oficina/controlador.ts`
      ),
      { guardarGestoDeTerreno } = await import(
        `/@fs/${fs}/packages/molda-cenarios/src/oficina/terreno-autoria.ts`
      )
    const host = criarHostEmMemoria({ equipe: true }),
      mundo = await host.criarMundo('conta', 'Mundo'),
      c = await host.criarCenario(mundo.id, 'Escultura')
    await host.editarCenario(
      c.id,
      0,
      [
        {
          tipo: 'base.definir',
          base: {
            tipo: 'terreno',
            origem: { x: -32, z: -32 },
            colunas: 64,
            linhas: 64,
            passo: 1,
            min: -10,
            max: 100,
            fundo: 0,
            pecas: [],
            solo: {
              camadas: [
                { id: 'grama', nome: 'Grama', cor: '#80b050' },
                { id: 'terra', nome: 'Terra', cor: '#98704c' },
              ],
              pecas: [],
            },
          },
        },
      ],
      'preparar-terreno-01',
    )
    const aberto = await host.abrirCenario(c.id),
      controlador = criarControlador(host, aberto)
    document.querySelector('#root').remove()
    const canvas = document.createElement('canvas')
    canvas.tabIndex = 0
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%'
    document.body.append(canvas)
    const q = {
      host,
      controlador,
      pronto: false,
      escultura: null,
      enviando: false,
      erros: [],
      gestos: 0,
      documento: aberto.documento,
      core,
      guardarGestoDeTerreno,
      palco: null,
    }
    q.palco = criarPalco(canvas, {
      carregarModelo: async () => {
        throw Error('Sem modelos neste ensaio')
      },
      carregarTerreno: (digest, sinal) => host.conteudoDoTerreno(c.id, digest, sinal),
      aoTerreno: (e) => {
        q.pronto = e.estado === 'pronto'
        if (e.estado === 'erro') q.erros.push(String(e.erro))
      },
      aoPreverTerreno: (e) => {
        q.escultura = e
      },
      aoMedir: (e) => {
        q.medidas = e
      },
      aoEsculpir: (g) => {
        q.gestos++
        q.enviando = true
        q.promessa = guardarGestoDeTerreno(controlador, q.palco, g)
          .catch((e) => q.erros.push(String(e)))
          .finally(() => {
            q.enviando = false
          })
      },
    })
    controlador.subscribe(() => {
      const d = controlador.getState().documento
      if (q.documento !== d) {
        q.documento = d
        q.palco.definirDocumento(d)
      }
    })
    q.palco.definirDocumento(aberto.documento)
    q.palco.enquadrar()
    window.__escultura = q
    return { revisao: aberto.revisao }
  }, raiz)
  await p.waitForFunction(() => window.__escultura.pronto)
  const centro = await p.evaluate(() => {
    const q = window.__escultura
    q.palco.definirEscultura(
      q.core.ParametrosDeTerrenoSchema.parse({
        ferramenta: 'elevar',
        raio: 4,
        forca: 1,
        dureza: 0.8,
        metros: 1.5,
      }),
    )
    return q.palco.pontoNoChao(640, 460)
  })
  assert.ok(centro)
  await p.mouse.move(640, 460)
  await p.mouse.down()
  await p.waitForFunction(() => window.__escultura.escultura?.ativo)
  await p.screenshot({ path: resolve(saida, 'previa.png') })
  const previa = await p.evaluate(
    (p) => window.__escultura.palco.fonteDeAlturas()(p.x, p.z),
    centro,
  )
  assert.ok(Math.abs(previa - 1.5) < 0.01, `Prévia inesperada: ${previa}`)
  await p.mouse.up()
  await p.waitForFunction(() => {
    const q = window.__escultura
    return !q.enviando && q.pronto && q.controlador.getState().salvamento === 'guardado'
  })
  const final = await p.evaluate((p) => {
    const q = window.__escultura
    return {
      altura: q.palco.fonteDeAlturas()(p.x, p.z),
      revisao: q.controlador.getState().revisao,
      gestos: q.gestos,
      erros: q.erros,
    }
  }, centro)
  assert.ok(
    Math.abs(final.altura - 1.5) < 0.01,
    `Soltar o mouse repetiu o carimbo: ${final.altura}`,
  )
  assert.equal(final.revisao, inicio.revisao + 1)
  assert.equal(final.gestos, 1)
  assert.deepEqual(final.erros, [])
  const historico = []
  for (const acao of ['desfazer', 'refazer']) {
    await p.evaluate(async (acao) => {
      const q = window.__escultura
      await q.controlador[acao]()
    }, acao)
    await p.waitForFunction(() => window.__escultura.pronto)
    const altura = await p.evaluate(
      (p) => window.__escultura.palco.fonteDeAlturas()(p.x, p.z),
      centro,
    )
    assert.ok(Math.abs(altura - (acao === 'desfazer' ? 0 : final.altura)) < 0.001)
    historico.push({ acao, altura })
  }
  const revisaoAntesDeCancelar = await p.evaluate(
    () => window.__escultura.controlador.getState().revisao,
  )
  const recursos = []
  for (const cancelamento of ['Escape', 'blur', 'pointercancel', 'toque-duplo']) {
    await p.mouse.move(640, 460)
    await p.mouse.down()
    await p.waitForFunction(() => window.__escultura.escultura?.ativo)
    if (cancelamento === 'Escape') await p.keyboard.press('Escape')
    else
      await p.evaluate((tipo) => {
        const canvas = document.querySelector('canvas')
        if (tipo === 'blur') window.dispatchEvent(new Event('blur'))
        else if (tipo === 'pointercancel')
          canvas.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true }))
        else
          canvas.dispatchEvent(
            new PointerEvent('pointerdown', {
              pointerId: 2,
              pointerType: 'touch',
              isPrimary: false,
              clientX: 650,
              clientY: 460,
              bubbles: true,
            }),
          )
      }, cancelamento)
    await p.mouse.up()
    await p.waitForFunction(() => !window.__escultura.escultura?.ativo)
    await p.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    )
    const cancelado = await p.evaluate((p) => {
      const q = window.__escultura
      return {
        altura: q.palco.fonteDeAlturas()(p.x, p.z),
        revisao: q.controlador.getState().revisao,
        gestos: q.gestos,
        recursos: { geometrias: q.medidas.geometrias, texturas: q.medidas.texturas },
      }
    }, centro)
    assert.equal(cancelado.revisao, revisaoAntesDeCancelar, cancelamento)
    assert.equal(cancelado.gestos, 1, cancelamento)
    assert.ok(Math.abs(cancelado.altura - final.altura) < 0.001, cancelamento)
    recursos.push(cancelado.recursos)
  }
  assert.ok(
    recursos.every((r) => JSON.stringify(r) === JSON.stringify(recursos[0])),
    'Cancelar não acumula geometrias/texturas',
  )
  const reaberto = await p.evaluate(async () => {
    const q = window.__escultura,
      aberto = await q.host.abrirCenario(q.controlador.getState().documento.id)
    return { base: aberto.documento.base, revisao: aberto.revisao }
  })
  assert.equal(reaberto.revisao, revisaoAntesDeCancelar)
  assert.equal(reaberto.base.pecas.length, 1)
  const cabecaNova = await p.evaluate(async () => {
    const q = window.__escultura,
      origem = q.controlador.getState().documento,
      estado = q.palco.estadoDoTerreno()
    estado.campo.alturas.fill(8)
    const tentativa = q
      .guardarGestoDeTerreno(q.controlador, q.palco, {
        documentoDeOrigem: origem,
        estado,
        regioes: { alturas: { x0: 0, z0: 0, x1: 64, z1: 64 } },
      })
      .catch((e) => e.name)
    q.controlador.executar([{ tipo: 'iluminacao.definir', iluminacao: { hora: 8 } }])
    const erro = await tentativa
    await q.controlador.terminar()
    return {
      erro,
      basePreservada:
        JSON.stringify(q.controlador.getState().documento.base) === JSON.stringify(origem.base),
    }
  })
  assert.deepEqual(cabecaNova, { erro: 'AbortError', basePreservada: true })
  assert.deepEqual(erros, [])
  await p.screenshot({ path: resolve(saida, 'guardado.png') })
  writeFileSync(
    resolve(saida, 'resultados.json'),
    JSON.stringify(
      {
        ...final,
        previa,
        centro,
        historico,
        recursos,
        cabecaNova,
        cancelamentos: 4,
        revisaoReaberta: reaberto.revisao,
        erros,
      },
      null,
      2,
    ),
  )
  await p.evaluate(() => window.__escultura.palco.destruir())
} catch (e) {
  if (p) await p.screenshot({ path: resolve(saida, 'falha.png') }).catch(() => {})
  throw e
} finally {
  await navegador.close()
}
