import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const saida = resolve(process.argv[2] ?? 'output/cenarios-reforma/lote3-conjuntos-biblioteca')
const raiz = resolve(import.meta.dirname, '../../../..')
const modelo = JSON.parse(
  readFileSync(resolve(raiz, 'output/molda-cenarios/acervo/catalogo.json'), 'utf8'),
).modelos.find((m) => m.arquivo === 'poco_manivela_baixa.209f7e2a54ed.glb')
assert.ok(modelo, 'Poço real ausente')
const modulo = `/@fs/${resolve(raiz, 'packages/molda-cenarios-core/src/v2/index.ts').replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const resultados = []
let pagina
try {
  for (const [tema, largura] of [
    ['light', 1440],
    ['dark', 1440],
    ['light', 1024],
    ['dark', 390],
  ]) {
    const contexto = await browser.newContext({
      viewport: { width: largura, height: 900 },
      hasTouch: largura === 390,
      recordVideo:
        largura === 1440 && tema === 'light'
          ? { dir: resolve(saida, 'movimento'), size: { width: 1440, height: 900 } }
          : undefined,
    })
    const p = await contexto.newPage()
    pagina = p
    const erros = []
    p.on('pageerror', (e) => {
      erros.push(e.message)
      console.error(e.message)
    })
    p.on('console', (m) => {
      if (m.type() === 'error') {
        erros.push(m.text())
        console.error(m.text())
      }
    })
    await p.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await p.waitForLoadState('networkidle')
    await p.waitForFunction(() => window.__cenarios)
    const ids = await p.evaluate(
      async ({ modelo, modulo }) => {
        const core = await import(modulo),
          h = window.__cenarios.host
        const biblioteca = await h.criarBiblioteca('conta', {
          nome: 'Composições',
          licenca: 'propria',
        })
        const tela = document.createElement('canvas')
        tela.width = tela.height = 32
        const ctx = tela.getContext('2d')
        ctx.fillStyle = '#d0ba86'
        ctx.fillRect(0, 0, 32, 32)
        const miniatura = await new Promise((r) => tela.toBlob(r, 'image/png'))
        const bytes = new Uint8Array(await (await fetch(`/acervo/${modelo.arquivo}`)).arrayBuffer())
        const [m] = await h.importarModelos(biblioteca.id, [
          {
            nome: modelo.nome,
            pasta: '',
            etiquetas: [],
            conteudo: bytes,
            digest: modelo.digest,
            miniatura,
            min: modelo.min,
            max: modelo.max,
            triangulos: modelo.triangulos,
          },
        ])
        const fonte = core.criarDocumentoVazio('fonte', 'Jardim')
        fonte.modelos = [
          {
            id: 'poco',
            biblioteca: biblioteca.id,
            modelo: m.id,
            digest: m.digest,
            volume: {
              min: { x: m.min[0], y: m.min[1], z: m.min[2] },
              max: { x: m.max[0], y: m.max[1], z: m.max[2] },
            },
          },
        ]
        fonte.formas = [
          { id: 'base', nome: 'Base', tipo: 'caixa', largura: 6, altura: 0.3, comprimento: 6 },
        ]
        const objeto = {
          id: 'base',
          nome: 'Base',
          grupo: null,
          modelo: 'base',
          bloqueado: false,
          oculto: false,
          colisao: 'caixa',
          apoio: { tipo: 'absoluto' },
          transformacao: {
            posicao: { x: 0, y: 0, z: 0 },
            rotacao: { x: 0, y: 0, z: 0 },
            escala: { x: 1, y: 1, z: 1 },
          },
        }
        fonte.instancias = [
          objeto,
          {
            ...structuredClone(objeto),
            id: 'poco',
            nome: 'Poço',
            modelo: 'poco',
            apoio: {
              tipo: 'objeto',
              objeto: 'base',
              contato: { x: 0, y: 0.3, z: 0 },
              deslocamento: 0,
            },
          },
        ]
        const mundo = await h.criarMundo('conta', 'Biblioteca de conjuntos')
        await h.editarMundo(mundo.id, { bibliotecas: [biblioteca.id] })
        const c = await h.criarCenario(mundo.id, 'Praça'),
          outro = await h.criarCenario(mundo.id, 'Campos')
        fonte.id = c.id
        fonte.nome = 'Praça'
        await h.editarCenario(
          c.id,
          0,
          [{ tipo: 'cenario.restaurar', documento: fonte }],
          crypto.randomUUID(),
        )
        return { cenario: c.id, outro: outro.id, biblioteca: biblioteca.id, mundo: mundo.id }
      },
      { modelo, modulo },
    )
    await p.getByRole('combobox', { name: 'De quem são', exact: true }).selectOption('equipe')
    await p.getByRole('combobox', { name: 'De quem são', exact: true }).selectOption('conta')
    await p.getByRole('button', { name: 'Abrir Biblioteca de conjuntos', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Praça', exact: true }).click()
    const canvas = () => p.locator('canvas.mcn-palco-tela')
    const salvo = () => p.getByText('Guardado', { exact: true }).waitFor()
    const fechar = async () => {
      const b = p.getByRole('button', { name: 'Recolher o painel', exact: true })
      if (await b.isVisible()) await b.click()
    }
    const abrir = async () => {
      const b = p.getByRole('button', { name: 'Abrir o painel', exact: true })
      if (await b.isVisible()) await b.click()
    }
    const tecla = async (t) => {
      await canvas().focus()
      await p.keyboard.press(t)
      await salvo()
    }
    const esperar = async (tarefa) => {
      const fim = Date.now() + 20000
      while (!(await tarefa())) {
        if (Date.now() > fim) throw Error('Estado esperado não chegou')
        await p.waitForTimeout(80)
      }
    }
    await salvo()
    await esperar(
      async () =>
        Number(
          (await p.locator('.mcn-orcamento').textContent())
            ?.match(/[\d.]+/)?.[0]
            .replaceAll('.', ''),
        ) > 0,
    )
    await fechar()
    await tecla('Control+a')
    await p.evaluate(() => {
      const h = window.__cenarios.host,
        guardar = h.guardarMiniaturaDoConjunto.bind(h)
      let falhar = true
      h.guardarMiniaturaDoConjunto = async (...args) => {
        if (falhar) {
          falhar = false
          throw Error('Falha de rede simulada no envio do retrato')
        }
        return guardar(...args)
      }
    })
    await p.getByRole('button', { name: 'Guardar escolha como conjunto', exact: true }).click()
    const dialog = p.getByRole('dialog')
    await dialog.getByRole('textbox', { name: 'Nome', exact: true }).fill('Jardim da Íris')
    await dialog.getByRole('textbox', { name: 'Pasta', exact: true }).fill('Faísca/Campos')
    await dialog
      .getByRole('textbox', { name: 'Etiquetas, separadas por vírgulas', exact: true })
      .fill('flores, praça')
    await dialog.getByRole('button', { name: 'Guardar conjunto', exact: true }).click()
    await dialog.waitFor({ state: 'detached' })
    const catalogo = () =>
      p.evaluate(
        async (id) => (await window.__cenarios.host.listarConjuntos(id)).itens,
        ids.biblioteca,
      )
    await p.getByRole('button', { name: 'Tentar retrato novamente', exact: true }).click()
    await esperar(async () => {
      const c = (await catalogo())[0]
      return c?.miniatura
    })
    const conjunto = (await catalogo())[0]
    assert.equal(conjunto.objetos, 2)
    const foto = await p.evaluate(async (c) => {
      const b = await (await fetch(c.miniatura)).blob(),
        image = await createImageBitmap(b)
      const tela = document.createElement('canvas')
      tela.width = image.width
      tela.height = image.height
      const ctx = tela.getContext('2d')
      ctx.drawImage(image, 0, 0)
      const dados = ctx.getImageData(0, 0, image.width, image.height).data
      let transparentes = 0,
        visiveis = 0
      for (let i = 3; i < dados.length; i += 4) dados[i] === 0 ? transparentes++ : visiveis++
      image.close()
      return { largura: tela.width, altura: tela.height, transparentes, visiveis, bytes: b.size }
    }, conjunto)
    assert.equal(foto.largura, 256)
    assert.equal(foto.altura, 256)
    assert.ok(foto.transparentes > 100 && foto.visiveis > 100)
    assert.ok(foto.bytes < 262144)
    await p.getByRole('button', { name: 'Conjuntos', exact: true }).click()
    await p.getByRole('button', { name: 'Colocar conjunto Jardim da Íris', exact: true }).click()
    await salvo()
    await esperar(() =>
      p.evaluate(
        async (id) =>
          (await window.__cenarios.host.abrirCenario(id)).documento.montagens?.length === 1,
        ids.cenario,
      ),
    )
    await abrir()
    await p.screenshot({ path: resolve(saida, `biblioteca-copia-${tema}-${largura}.png`) })
    await p.getByRole('button', { name: 'Editar conjunto', exact: true }).click()
    await p.getByRole('button', { name: 'Atualizar cópias', exact: true }).waitFor()
    await salvo()
    await fechar()
    await tecla('Control+a')
    await abrir()
    const antes = await p.evaluate(async (id) => {
      const c = await window.__cenarios.host.obterConjunto(id)
      return window.__cenarios.host.abrirCenario(c.cenarioDeEdicaoId)
    }, conjunto.id)
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    await p.getByRole('button', { name: 'Escolher objeto Poço', exact: true }).click()
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    const lugar = p.getByRole('group', { name: 'Lugar', exact: true })
    await lugar.getByRole('spinbutton').nth(0).fill('2')
    await lugar.getByRole('spinbutton').nth(0).press('Tab')
    await esperar(() =>
      p.evaluate(
        async ({ id, rev }) => (await window.__cenarios.host.abrirCenario(id)).revisao > rev,
        { id: antes.resumo.id, rev: antes.revisao },
      ),
    )
    await salvo()
    await fechar()
    assert.equal((await catalogo())[0].revisao, 1, 'Rascunho não deve publicar automaticamente')
    await p.getByRole('button', { name: 'Atualizar cópias', exact: true }).click()
    await esperar(
      async () => (await catalogo())[0].revisao === 2 && Boolean((await catalogo())[0].miniatura),
    )
    await esperar(
      async () =>
        !(await p.getByRole('button', { name: 'Atualizar cópias', exact: true }).isEnabled()),
    )
    await p.screenshot({ path: resolve(saida, `biblioteca-fonte-${tema}-${largura}.png`) })
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await salvo()
    const atualizado = await p.evaluate(
      async (id) => window.__cenarios.host.abrirCenario(id),
      ids.cenario,
    )
    assert.equal(atualizado.documento.definicoesConjuntos[0].revisao, 2)
    await fechar()
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Campos', exact: true }).click()
    await salvo()
    await fechar()
    await p.getByRole('button', { name: 'Conjuntos', exact: true }).click()
    await p.getByRole('button', { name: 'Colocar conjunto Jardim da Íris', exact: true }).click()
    await esperar(() =>
      p.evaluate(
        async (id) =>
          (await window.__cenarios.host.abrirCenario(id)).documento.montagens?.length === 1,
        ids.outro,
      ),
    )
    await salvo()
    await abrir()
    await p.getByRole('button', { name: 'Editar conjunto', exact: true }).click()
    await salvo()
    await fechar()
    await tecla('Control+a')
    await abrir()
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    await p.getByRole('button', { name: 'Escolher objeto Poço', exact: true }).click()
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    const novoLugar = p.getByRole('group', { name: 'Lugar', exact: true })
    await novoLugar.getByRole('spinbutton').nth(0).fill('4')
    await novoLugar.getByRole('spinbutton').nth(0).press('Tab')
    await salvo()
    await fechar()
    await p.getByRole('button', { name: 'Atualizar cópias', exact: true }).click()
    await esperar(
      async () => (await catalogo())[0].revisao === 3 && Boolean((await catalogo())[0].miniatura),
    )
    const revisoes = await p.evaluate(
      async (ids) =>
        Promise.all(
          ids.map(
            async (id) =>
              (await window.__cenarios.host.abrirCenario(id)).documento.definicoesConjuntos[0]
                .revisao,
          ),
        ),
      [ids.cenario, ids.outro],
    )
    assert.deepEqual(revisoes, [3, 3])
    // A resposta de uma publicação pode se perder, e outra pessoa publicar antes da repetição.
    await abrir()
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    await p.getByRole('button', { name: 'Escolher objeto Poço', exact: true }).click()
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    const terceiroLugar = p.getByRole('group', { name: 'Lugar', exact: true })
    await terceiroLugar.getByRole('spinbutton').nth(0).fill('7')
    await terceiroLugar.getByRole('spinbutton').nth(0).press('Tab')
    await salvo()
    await fechar()
    await p.evaluate(() => {
      const h = window.__cenarios.host,
        publicar = h.publicarConjunto.bind(h)
      let perder = true
      h.publicarConjunto = async (id, dados) => {
        const resultado = await publicar(id, dados)
        if (perder) {
          perder = false
          const conteudo = structuredClone(dados.conteudo)
          conteudo.instancias[0].transformacao.posicao.x += 6
          await publicar(id, {
            revisaoEsperada: resultado.conjunto.revisao,
            operacaoId: crypto.randomUUID(),
            conteudo,
          })
          throw Error('Resposta perdida após a publicação simulada')
        }
        return resultado
      }
    })
    await p.getByRole('button', { name: 'Atualizar cópias', exact: true }).click()
    await p.getByText('Resposta perdida após a publicação simulada', { exact: true }).waitFor()
    await p.getByRole('button', { name: 'Atualizar cópias', exact: true }).click()
    await esperar(async () => (await catalogo())[0].revisao === 5)
    await esperar(() =>
      p.evaluate(
        async (id) => Boolean((await window.__cenarios.host.versaoDoConjunto(id, 4)).miniatura),
        conjunto.id,
      ),
    )
    assert.equal(
      await p.evaluate(
        async (id) => (await window.__cenarios.host.versaoDoConjunto(id, 5)).miniatura,
        conjunto.id,
      ),
      null,
      'Retrato antigo sobrescreveu uma publicação posterior',
    )
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await salvo()
    await fechar()
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.getByRole('button', { name: 'Voltar aos mundos', exact: true }).click()
    await p.getByRole('button', { name: 'Bibliotecas', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Composições', exact: true }).click()
    await p.getByRole('button', { name: 'Conjuntos', exact: true }).click()
    await p.getByRole('button', { name: 'Organizar conjunto Jardim da Íris', exact: true }).click()
    const organizar = p.getByRole('dialog')
    await organizar.getByRole('textbox', { name: 'Nome', exact: true }).fill('Poço mágico')
    await organizar.getByRole('textbox', { name: 'Pasta', exact: true }).fill('Faísca/Colina')
    await organizar.getByRole('button', { name: 'Guardar', exact: true }).click()
    await organizar.waitFor({ state: 'detached' })
    await p.getByRole('button', { name: 'Abrir conjunto Poço mágico', exact: true }).waitFor()
    await p.getByRole('searchbox', { name: 'Buscar conjunto', exact: true }).fill('mágico')
    await p.getByRole('button', { name: 'Abrir conjunto Poço mágico', exact: true }).waitFor()
    await p.screenshot({ path: resolve(saida, `biblioteca-catalogo-${tema}-${largura}.png`) })
    await p.getByRole('button', { name: 'Apagar conjunto Poço mágico', exact: true }).click()
    await p.getByRole('dialog').getByRole('button', { name: 'Apagar', exact: true }).click()
    await p.getByRole('dialog').waitFor({ state: 'detached' })
    await esperar(async () => (await catalogo()).length === 0)
    const depoisDeApagar = await p.evaluate(
      async (id) => window.__cenarios.host.abrirCenario(id),
      ids.outro,
    )
    assert.equal(depoisDeApagar.documento.definicoesConjuntos[0].revisao, 5)
    assert.deepEqual(erros, [])
    resultados.push({
      tema,
      largura,
      salvarEscolha: true,
      retrato: foto,
      colocar: true,
      editarFonte: true,
      publicarDuasCenas: true,
      retorno: true,
      organizarBuscarApagar: true,
      repetirFotoSemDuplicar: true,
      respostaPerdidaAposPublicacao: true,
      erros,
    })
    console.log(`Biblioteca conferida: ${tema} ${largura}px`)
    await contexto.close()
  }
  writeFileSync(resolve(saida, 'resultados.json'), JSON.stringify(resultados, null, 2))
  console.log(JSON.stringify(resultados))
} catch (e) {
  if (pagina) await pagina.screenshot({ path: resolve(saida, 'falha.png') }).catch(() => {})
  throw e
} finally {
  await browser.close()
}
