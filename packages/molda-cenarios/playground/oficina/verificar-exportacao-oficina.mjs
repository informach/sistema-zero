import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { montarCenaDeCompilacaoDoEnsaio } from './fixture-compilacao.mjs'

const raiz = resolve(import.meta.dirname, '../../../..'),
  ensaiarRaylib = process.env.CENARIOS_QA_RAYLIB === '1',
  saida = resolve(
    raiz,
    ensaiarRaylib
      ? 'output/cenarios-reforma/lote8-raylib/interface'
      : 'output/cenarios-reforma/lote8-interface',
  ),
  fixture = JSON.parse(
    readFileSync(
      resolve(raiz, 'output/cenarios-reforma/lote8-integracao-terreno-juncao/resultado.json'),
      'utf8',
    ),
  ),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`,
  browser = await chromium.launch({ channel: 'chrome', headless: true }),
  resultados = []
mkdirSync(saida, { recursive: true })
const casos =
  process.env.CENARIOS_QA_LAYOUTS === 'todos'
    ? [
        [1440, 900],
        [1024, 768],
        [768, 1024],
        [390, 844],
      ].flatMap(([width, height]) => ['light', 'dark'].map((tema) => ({ width, height, tema })))
    : [{ width: 1440, height: 900, tema: 'light' }]
try {
  for (const [indice, caso] of casos.entries()) {
    const nome = `${caso.width}-${caso.height}-${caso.tema}`,
      context = await browser.newContext({
        viewport: { width: caso.width, height: caso.height },
        hasTouch: caso.width <= 768,
        isMobile: caso.width < 640,
        acceptDownloads: true,
        ...(indice === 0
          ? { recordVideo: { dir: resolve(saida, 'video'), size: { width: 1280, height: 800 } } }
          : {}),
      }),
      pagina = await context.newPage(),
      erros = [],
      avisos = [],
      inicio = Date.now()
    pagina.setDefaultTimeout(20000)
    pagina.on('pageerror', (e) => erros.push(e.message))
    pagina.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') avisos.push(m.text().slice(0, 400))
    })
    try {
      await pagina.goto(`http://127.0.0.1:4541/?vazio=1&tema=${caso.tema}`)
      await pagina.waitForFunction(() => window.__cenarios)
      await pagina.evaluate(() => {
        const criarURL = URL.createObjectURL.bind(URL),
          revogar = URL.revokeObjectURL.bind(URL)
        window.__qaArquivos = { criados: 0, vivos: new Set() }
        URL.createObjectURL = (blob) => {
          const url = criarURL(blob)
          if (['application/zip', 'model/gltf-binary'].includes(blob.type)) {
            window.__qaArquivos.criados++
            window.__qaArquivos.vivos.add(url)
          }
          return url
        }
        URL.revokeObjectURL = (url) => {
          window.__qaArquivos.vivos.delete(url)
          return revogar(url)
        }
      })
      const ids = await pagina.evaluate(montarCenaDeCompilacaoDoEnsaio, {
        core: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
        motor: modulo('packages/molda-cenarios-motor/src/index.ts'),
        autoria: fixture.autoria,
        recursos: fixture.recursosDeAutoria,
      })

      const espaco = pagina.getByRole('combobox', { name: 'De quem são' })
      await espaco.selectOption('equipe')
      await espaco.selectOption('conta')
      await pagina.getByRole('button', { name: 'Abrir Mundo de exportação', exact: true }).click()
      const abrir = pagina.getByRole('button', { name: `Exportar: ${ids.nome}`, exact: true })
      if (caso.width <= 768) await abrir.tap()
      else await abrir.click()
      const dialogo = pagina.getByRole('dialog', { name: 'Exportar cenário' })
      await dialogo.getByRole('button', { name: 'Preparar arquivo' }).waitFor({ state: 'visible' })
      await pagina.waitForFunction(
        () => !document.querySelector('dialog button.mld-btn-3d')?.disabled,
      )
      assert.ok((await dialogo.innerText()).includes('Adventure Land'))
      assert.ok((await dialogo.innerText()).includes('Cute Characters'))
      await pagina.screenshot({ path: resolve(saida, `${nome}-preparo.png`) })
      const videoInicio = (Date.now() - inicio) / 1000,
        medidas = await dialogo.evaluate((d) => ({
          largura: d.getBoundingClientRect().width,
          janela: innerWidth,
          conteudo: d.scrollWidth,
          cliente: d.clientWidth,
        }))
      assert.ok(medidas.largura <= medidas.janela)
      assert.ok(medidas.conteudo <= medidas.cliente + 1)
      await dialogo.getByLabel('Juntar peças estáticas por região').check()
      if (caso.width <= 768)
        await dialogo.getByRole('button', { name: 'Preparar arquivo', exact: true }).tap()
      else await dialogo.getByRole('button', { name: 'Preparar arquivo', exact: true }).click()
      await dialogo
        .getByRole('link', { name: 'Baixar ZIP', exact: true })
        .waitFor({ timeout: 60000 })
      await pagina.screenshot({ path: resolve(saida, `${nome}-pronto.png`) })
      const controlesProntos = await dialogo.evaluate((d) => {
        const r = (e) => {
          const b = e.getBoundingClientRect()
          return { x: b.x, y: b.y, largura: b.width, altura: b.height }
        }
        return {
          fechar: r(
            [...d.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Fechar'),
          ),
          baixar: r(d.querySelector('a[download]')),
          largura: d.scrollWidth,
          cliente: d.clientWidth,
          fundo: getComputedStyle(d.querySelector('.mcn-dialogo-cartao')).backgroundColor,
        }
      })
      assert.ok(controlesProntos.largura <= controlesProntos.cliente + 1)
      for (const c of [controlesProntos.fechar, controlesProntos.baixar]) {
        assert.ok(c.altura >= 44, `Alvo de toque: ${JSON.stringify(c)}`)
        assert.ok(
          c.x >= 0 &&
            c.y >= 0 &&
            c.x + c.largura <= caso.width + 1 &&
            c.y + c.altura <= caso.height + 1,
        )
      }
      const downloadPromise = pagina.waitForEvent('download')
      await dialogo.getByRole('link', { name: 'Baixar ZIP', exact: true }).click()
      const download = await downloadPromise,
        caminhoZip = resolve(saida, `${nome}.zip`)
      await download.saveAs(caminhoZip)
      const zip = await pagina.evaluate(
        async (u) => {
          const { readZipFiles } = await import(u.arquivos),
            { conferirConteudoCompilado } = await import(u.compilar),
            url = document.querySelector('dialog a[download]').href,
            blob = await (await fetch(url)).blob(),
            lido = await readZipFiles(new File([blob], 'cenario.zip'), {
              maxBytes: 300 * 1024 ** 2,
              maxEntries: 9000,
            })
          if (!lido.ok) throw Error(`ZIP não reabriu: ${lido.reason}`)
          const arquivos = new Map(lido.files.map((f) => [f.path, f.bytes])),
            cena = JSON.parse(new TextDecoder().decode(arquivos.get('cenario.json')))
          await conferirConteudoCompilado(
            cena,
            new Map(cena.arquivos.map((a) => [a.caminho, arquivos.get(a.caminho)])),
          )
          const m = [...arquivos.keys()]
          if (!m.includes('index.html') || !m.includes('licencas-modelos.txt'))
            throw Error('ZIP incompleto')
          return {
            bytes: blob.size,
            arquivos: arquivos.size,
            fonte: cena.fonte,
            licencas: cena.licencas,
            atores: cena.nos.filter((n) => n.preservarHierarquia).length,
            terreno: !!cena.terreno,
            aguas: cena.aguas.length,
            caminhos: cena.caminhos.length,
            urls: window.__qaArquivos.vivos.size,
          }
        },
        {
          arquivos: modulo('packages/molda/src/import/arquivos.ts'),
          compilar: modulo('packages/molda-cenarios-motor/src/compilar/index.ts'),
        },
      )
      assert.equal(zip.fonte.revisao, 1)
      assert.ok(zip.terreno && zip.aguas > 0 && zip.caminhos > 0 && zip.atores > 0)
      assert.equal(zip.urls, 1)
      let glb, raylib
      if (indice === 0) {
        await dialogo.getByLabel('Para onde levar').selectOption('glb')
        assert.equal(await pagina.evaluate(() => window.__qaArquivos.vivos.size), 0)
        await dialogo.getByRole('button', { name: 'Preparar arquivo', exact: true }).click()
        await dialogo
          .getByRole('link', { name: 'Baixar GLB', exact: true })
          .waitFor({ timeout: 60000 })
        await pagina.screenshot({ path: resolve(saida, `${nome}-glb.png`) })
        const baixando = pagina.waitForEvent('download')
        await dialogo.getByRole('link', { name: 'Baixar GLB', exact: true }).click()
        const arquivo = await baixando,
          caminho = resolve(saida, 'cenario.glb')
        await arquivo.saveAs(caminho)
        const dados = readFileSync(caminho),
          json = JSON.parse(dados.subarray(20, 20 + dados.readUInt32LE(12)).toString()),
          validator = createRequire(resolve(raiz, 'packages/molda/package.json'))('gltf-validator'),
          v = await validator.validateBytes(new Uint8Array(dados), { uri: 'cenario.glb' })
        assert.equal(json.animations.length, 4)
        assert.equal(v.issues.numErrors, 0)
        assert.equal(v.issues.numWarnings, 0)
        const reaberto = await pagina.evaluate(
          async (u) => {
            const { lerGlb } = await import(u.modelos),
              b = await (
                await fetch(document.querySelector('dialog a[download]').href)
              ).arrayBuffer(),
              m = await lerGlb(b)
            try {
              let peles = 0
              m.raiz.traverse((n) => {
                if (n.isSkinnedMesh) peles++
              })
              return {
                animacoes: m.animacoes.length,
                peles,
                fonte: m.raiz.userData.moldaCenario.fonte,
              }
            } finally {
              m.descartar()
            }
          },
          { modelos: modulo('packages/molda-cenarios-motor/src/modelos.ts') },
        )
        assert.equal(reaberto.animacoes, 4)
        assert.ok(reaberto.peles > 0)
        assert.deepEqual(reaberto.fonte, zip.fonte)
        glb = {
          bytes: dados.length,
          animacoes: json.animations.length,
          erros: v.issues.numErrors,
          avisos: v.issues.numWarnings,
          reaberto,
        }
      }
      if (ensaiarRaylib) {
        await dialogo.getByLabel('Para onde levar').selectOption('raylib')
        assert.equal(await pagina.evaluate(() => window.__qaArquivos.vivos.size), 0)
        assert.equal(
          await dialogo.getByLabel('Juntar peças estáticas por região').isChecked(),
          true,
        )
        assert.equal(
          await dialogo.getByLabel('Juntar peças estáticas por região').isDisabled(),
          true,
        )
        await dialogo.getByRole('button', { name: 'Preparar arquivo', exact: true }).click()
        await dialogo
          .getByRole('link', { name: 'Baixar ZIP', exact: true })
          .waitFor({ timeout: 60000 })
        await pagina.screenshot({ path: resolve(saida, `${nome}-raylib.png`) })
        const baixando = pagina.waitForEvent('download')
        await dialogo.getByRole('link', { name: 'Baixar ZIP', exact: true }).click()
        await (await baixando).saveAs(resolve(saida, `${nome}-raylib.zip`))
        raylib = await pagina.evaluate(
          async (u) => {
            const { readZipFiles } = await import(u.arquivos),
              { conferirConteudoCompilado } = await import(u.compilar),
              blob = await (await fetch(document.querySelector('dialog a[download]').href)).blob(),
              zip = await readZipFiles(new File([blob], 'cenario.zip'), {
                maxBytes: 300 * 1024 ** 2,
                maxEntries: 9000,
              })
            if (!zip.ok) throw Error(`ZIP Raylib recusado: ${zip.reason}`)
            const arquivos = new Map(zip.files.map((f) => [f.path, f.bytes])),
              cena = JSON.parse(new TextDecoder().decode(arquivos.get('cenario.json')))
            await conferirConteudoCompilado(
              cena,
              new Map(cena.arquivos.map((a) => [a.caminho, arquivos.get(a.caminho)])),
            )
            const modelo = cena.arquivos.filter((a) => a.mime === 'model/gltf-binary')
            if (modelo.some((a) => !a.caminho.startsWith('models/')))
              throw Error('Modelo fora de models/')
            for (const nome of [
              'cenario.py',
              'main.py',
              'requisitos-raylib.txt',
              'licencas-modelos.txt',
              'LEIA-ME.txt',
            ])
              if (!arquivos.has(nome)) throw Error(`Pacote Raylib sem ${nome}`)
            if (
              !new TextDecoder()
                .decode(arquivos.get('requisitos-raylib.txt'))
                .includes('raylib==6.0.1.0')
            )
              throw Error('Versão Raylib divergente')
            return {
              bytes: blob.size,
              arquivos: arquivos.size,
              fonte: cena.fonte,
              nos: cena.nos.length,
              aguas: cena.aguas.length,
              caminhos: cena.caminhos.length,
              terreno: !!cena.terreno,
              licencas: cena.licencas,
              urls: window.__qaArquivos.vivos.size,
            }
          },
          {
            arquivos: modulo('packages/molda/src/import/arquivos.ts'),
            compilar: modulo('packages/molda-cenarios-motor/src/compilar/index.ts'),
          },
        )
        assert.deepEqual(raylib.fonte, zip.fonte)
        assert.equal(raylib.urls, 1)
      }
      await dialogo.getByRole('button', { name: 'Fechar', exact: true }).click()
      assert.equal(await pagina.evaluate(() => window.__qaArquivos.vivos.size), 0)
      assert.equal(await abrir.evaluate((b) => document.activeElement === b), true)
      assert.equal(
        await pagina.evaluate(
          async () =>
            JSON.stringify(
              (await window.__cenarios.host.abrirCenario(window.__qaCena.cenario)).documento,
            ) === window.__qaCena.documento,
        ),
        true,
      )
      const interacoes = {}
      if (indice === 0) {
        // Erro de leitura real na porta do host: repetir percorre o compilador e o ZIP de novo.
        await pagina.evaluate(() => {
          const h = window.__cenarios.host,
            ler = h.conteudoDoModelo.bind(h)
          let falhar = true
          h.conteudoDoModelo = async (...a) => {
            if (falhar) {
              falhar = false
              throw Error('Recurso indisponível no ensaio')
            }
            return ler(...a)
          }
          window.__qaRestaurarModelo = () => {
            h.conteudoDoModelo = ler
          }
        })
        await abrir.click()
        await dialogo.getByRole('button', { name: 'Preparar arquivo', exact: true }).click()
        await dialogo
          .getByRole('alert')
          .filter({ hasText: 'Recurso indisponível no ensaio' })
          .waitFor()
        await dialogo.getByRole('button', { name: 'Tentar de novo', exact: true }).click()
        await dialogo.getByRole('button', { name: 'Preparar arquivo', exact: true }).click()
        await dialogo
          .getByRole('link', { name: 'Baixar ZIP', exact: true })
          .waitFor({ timeout: 60000 })
        await dialogo.getByRole('button', { name: 'Fechar', exact: true }).click()
        assert.equal(await pagina.evaluate(() => window.__qaArquivos.vivos.size), 0)
        await pagina.evaluate(() => window.__qaRestaurarModelo())
        interacoes.repeticaoAposErroDeRecurso = true

        // Uma resposta deliberadamente tardia não pode devolver arquivo depois de cancelar.
        await abrir.click()
        await pagina.waitForFunction(
          () => !document.querySelector('dialog button.mld-btn-3d')?.disabled,
        )
        await pagina.evaluate(() => {
          const h = window.__cenarios.host,
            ler = h.conteudoDoModelo.bind(h)
          let primeira = true
          window.__qaLeituras = 0
          h.conteudoDoModelo = async (...a) => {
            window.__qaLeituras++
            if (primeira) {
              primeira = false
              await new Promise((r) => {
                window.__qaLiberar = r
              })
            }
            return ler(...a)
          }
          window.__qaRestaurarModelo = () => {
            h.conteudoDoModelo = ler
          }
        })
        await dialogo.getByRole('button', { name: 'Preparar arquivo', exact: true }).click()
        await pagina.waitForFunction(() => typeof window.__qaLiberar === 'function')
        await dialogo.getByRole('button', { name: 'Cancelar exportação', exact: true }).click()
        assert.equal(
          await dialogo.getByRole('button', { name: 'Preparar arquivo', exact: true }).isDisabled(),
          true,
        )
        await pagina.evaluate(() => {
          window.__qaLiberar()
          window.__qaLiberar = null
        })
        await pagina.waitForFunction(
          () => !document.querySelector('dialog button.mld-btn-3d')?.disabled,
        )
        assert.equal(
          await dialogo.getByRole('link', { name: 'Baixar ZIP', exact: true }).count(),
          0,
        )
        assert.equal(await pagina.evaluate(() => window.__qaArquivos.vivos.size), 0)
        await dialogo.getByRole('button', { name: 'Fechar', exact: true }).click()
        await pagina.evaluate(() => window.__qaRestaurarModelo())
        interacoes.cancelamentoComRespostaTardia = true

        // Fechar e reabrir conserva uma única compilação ativa, até o descarte anterior terminar.
        await abrir.click()
        await pagina.waitForFunction(
          () => !document.querySelector('dialog button.mld-btn-3d')?.disabled,
        )
        await pagina.evaluate(() => {
          const h = window.__cenarios.host,
            ler = h.conteudoDoModelo.bind(h)
          let primeira = true
          window.__qaLeituras = 0
          h.conteudoDoModelo = async (...a) => {
            window.__qaLeituras++
            if (primeira) {
              primeira = false
              await new Promise((r) => {
                window.__qaLiberar = r
              })
            }
            return ler(...a)
          }
          window.__qaRestaurarModelo = () => {
            h.conteudoDoModelo = ler
          }
        })
        await dialogo.getByRole('button', { name: 'Preparar arquivo', exact: true }).click()
        await pagina.waitForFunction(() => typeof window.__qaLiberar === 'function')
        await dialogo.getByRole('button', { name: 'Fechar', exact: true }).click()
        await abrir.click()
        await dialogo.getByRole('button', { name: 'Preparar arquivo', exact: true }).click()
        await pagina.waitForTimeout(150)
        assert.equal(await pagina.evaluate(() => window.__qaLeituras), 1)
        await pagina.evaluate(() => {
          window.__qaLiberar()
          window.__qaLiberar = null
        })
        await dialogo
          .getByRole('link', { name: 'Baixar ZIP', exact: true })
          .waitFor({ timeout: 60000 })
        assert.equal(await pagina.evaluate(() => window.__qaArquivos.vivos.size), 1)
        await dialogo.getByRole('button', { name: 'Fechar', exact: true }).click()
        await pagina.evaluate(() => window.__qaRestaurarModelo())
        interacoes.fecharReabrirSemEncodersParalelos = true
        assert.equal(
          await pagina.evaluate(
            async () =>
              JSON.stringify(
                (await window.__cenarios.host.abrirCenario(window.__qaCena.cenario)).documento,
              ) === window.__qaCena.documento,
          ),
          true,
        )

        // Um cartão antigo não exporta a revisão nova silenciosamente.
        await pagina.evaluate(async () => {
          const h = window.__cenarios.host,
            id = window.__qaCena.cenario
          await h.editarCenario(
            id,
            1,
            [{ tipo: 'cenario.renomear', nome: 'Cena atualizada' }],
            'mudanca-externa',
          )
        })
        await abrir.click()
        await dialogo.getByRole('button', { name: 'Abrir revisão atual', exact: true }).waitFor()
        await pagina.screenshot({ path: resolve(saida, `${nome}-revisao-divergente.png`) })
        await dialogo.getByRole('button', { name: 'Abrir revisão atual', exact: true }).click()
        const exportarNaOficina = pagina.getByRole('button', {
          name: 'Exportar cenário',
          exact: true,
        })
        await exportarNaOficina.waitFor()
        await pagina.waitForFunction(
          () => !document.querySelector('button[aria-label="Exportar cenário"]')?.disabled,
        )
        interacoes.cartaoDesatualizadoRecusado = true

        // O botão respeita o histórico/fila de gravação do próprio controlador.
        await pagina.evaluate(() => {
          const h = window.__cenarios.host,
            mover = h.moverHistorico.bind(h)
          h.moverHistorico = async (...a) => {
            await new Promise((r) => {
              window.__qaLiberarUndo = r
            })
            return mover(...a)
          }
          window.__qaRestaurarHistorico = () => {
            h.moverHistorico = mover
          }
        })
        await pagina.getByRole('button', { name: 'Desfazer', exact: true }).click()
        await pagina.waitForFunction(() => typeof window.__qaLiberarUndo === 'function')
        assert.equal(await exportarNaOficina.isDisabled(), true)
        await pagina.evaluate(() => {
          window.__qaLiberarUndo()
          window.__qaLiberarUndo = null
          window.__qaRestaurarHistorico()
        })
        await pagina.waitForFunction(
          () => !document.querySelector('button[aria-label="Exportar cenário"]')?.disabled,
        )
        await pagina.getByRole('button', { name: 'Refazer', exact: true }).click()
        await pagina.waitForFunction(
          () => !document.querySelector('button[aria-label="Exportar cenário"]')?.disabled,
        )
        await exportarNaOficina.click()
        await dialogo.getByRole('button', { name: 'Preparar arquivo', exact: true }).waitFor()
        const revisaoAntes = await pagina.evaluate(
          async () => (await window.__cenarios.host.abrirCenario(window.__qaCena.cenario)).revisao,
        )
        await pagina.keyboard.press('Control+z')
        await pagina.keyboard.press('Delete')
        assert.equal(
          await pagina.evaluate(
            async () =>
              (await window.__cenarios.host.abrirCenario(window.__qaCena.cenario)).revisao,
          ),
          revisaoAntes,
        )
        await pagina.screenshot({ path: resolve(saida, `${nome}-oficina.png`) })
        await dialogo.getByRole('button', { name: 'Fechar', exact: true }).click()
        interacoes.guardaDeSalvamentoEAtalhos = true
        interacoes.revisaoAposEdicoesIntencionaisDoEnsaio = revisaoAntes
      } else {
        await pagina.getByRole('button', { name: `Abrir ${ids.nome}`, exact: true }).click()
        const exportarNaOficina = pagina.getByRole('button', {
          name: 'Exportar cenário',
          exact: true,
        })
        await exportarNaOficina.waitFor()
        await pagina.waitForFunction(
          () => !document.querySelector('button[aria-label="Exportar cenário"]')?.disabled,
        )
        const b = await exportarNaOficina.boundingBox()
        assert.ok(
          b && b.width >= 44 && b.height >= 44 && b.x >= 0 && b.x + b.width <= caso.width + 1,
        )
        if (caso.width <= 768) await exportarNaOficina.tap()
        else await exportarNaOficina.click()
        await dialogo.getByRole('button', { name: 'Preparar arquivo', exact: true }).waitFor()
        await pagina.waitForFunction(
          () => !document.querySelector('dialog button.mld-btn-3d')?.disabled,
        )
        await pagina.screenshot({ path: resolve(saida, `${nome}-oficina.png`) })
        await dialogo.getByRole('button', { name: 'Fechar', exact: true }).click()
        await pagina.waitForFunction(
          () => document.activeElement?.getAttribute('aria-label') === 'Exportar cenário',
        )
        assert.equal(await exportarNaOficina.evaluate((b) => document.activeElement === b), true)
        interacoes.aberturaNaOficina = true
      }
      assert.deepEqual(erros, [])
      const oficinaLimites = await pagina.evaluate(() => ({
        conteudo: document.documentElement.scrollWidth,
        janela: innerWidth,
      }))
      assert.ok(oficinaLimites.conteudo <= oficinaLimites.janela + 1)
      assert.deepEqual(
        avisos.filter(
          (a) =>
            a !==
            'THREE.GLTFExporter: Creating normalized normal attribute from the non-normalized one.',
        ),
        [],
      )
      resultados.push({
        ...caso,
        medidas,
        controlesProntos,
        oficinaLimites,
        zip,
        glb,
        raylib,
        console: avisos,
        videoInicio,
        autoriaIntacta: true,
        interacoes,
      })
      console.log(`${nome}: ZIP${glb ? '/GLB' : ''}, licença, autoria, foco e descarte conferidos`)
      writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(resultados, null, 2))
    } catch (e) {
      await pagina.screenshot({ path: resolve(saida, `${nome}-falha.png`) }).catch(() => {})
      writeFileSync(
        resolve(saida, `${nome}-falha.json`),
        JSON.stringify(
          {
            erro: String(e),
            erros,
            avisos,
            texto: await pagina
              .locator('body')
              .innerText()
              .catch(() => ''),
          },
          null,
          2,
        ),
      )
      throw e
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
