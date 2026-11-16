import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import {
  cenarioInicialDaFaisca,
  comporEstudoDaFaisca,
  criarClienteCenarios,
} from '../../../output/molda-cenarios/qa-helpers.mjs'

const raiz = resolve(import.meta.dirname, '../../..'),
  saida = resolve(raiz, 'output/molda-cenarios/integracao')
mkdirSync(saida, { recursive: true })
const acesso = JSON.parse(readFileSync(resolve(raiz, 'output/molda-cenarios/local-session.json')))
const acervo = JSON.parse(readFileSync(resolve(raiz, 'output/molda-cenarios/acervo/catalogo.json')))
const cliente = criarClienteCenarios(acesso)
async function api(path, body) {
  const r = await fetch(acesso.url + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      authorization: `Bearer ${acesso.token}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const v = await r.json()
  assert.ok(r.ok, JSON.stringify(v))
  return v
}
const base = cenarioInicialDaFaisca(acervo.digest)
const criado = await api('/projetos', {
  nome: 'Faísca — estudo no Molda',
  documento: base,
  operacaoId: crypto.randomUUID(),
})
const id = criado.projetoId,
  url = `http://127.0.0.1:4531/?projeto=${id}`
writeFileSync(resolve(saida, 'projeto.json'), JSON.stringify({ id, url }))
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
  ],
})
const contexto = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  recordVideo: { dir: resolve(saida, 'video'), size: { width: 1440, height: 960 } },
})
const p = await contexto.newPage(),
  erros = []
p.on('pageerror', (e) => {
  erros.push(e.message)
  console.error(e.message)
})
let revisao = 0,
  sessao
async function pronto() {
  await p.waitForSelector('[data-runtime-pronto=true]', { timeout: 120000 })
  for (let n = 0; n < 80; n++) {
    const daPagina = await p.locator('[data-sessao]').getAttribute('data-sessao')
    sessao = (await cliente.sessoes())
      .filter(
        (s) =>
          s.id === daPagina &&
          s.projetoId === id &&
          s.estado.revisao === revisao &&
          s.estado.revisaoPronta === revisao &&
          !s.estado.ocupado,
      )
      .sort((a, b) => Date.parse(b.expiraEm) - Date.parse(a.expiraEm))[0]
    if (sessao) return
    await p.waitForTimeout(500)
  }
  throw Error('Sessão não ficou pronta')
}
async function comando(acao, esperada = revisao) {
  const r = await cliente.executar(sessao.id, {
    id: crypto.randomUUID(),
    revisaoEsperada: esperada,
    acao,
  })
  assert.ok(r.ok, r.erro)
  revisao = r.revisao
  await pronto()
  return r
}
async function capturar(nome, posicao, alvo) {
  if (posicao) await comando({ tipo: 'camera', posicao, alvo })
  await p.waitForTimeout(500)
  const r = await comando({ tipo: 'capturar' })
  writeFileSync(resolve(saida, `${nome}.png`), Buffer.from(r.dados.imagem.split(',')[1], 'base64'))
}
try {
  await p.goto(url)
  await pronto()
  console.log('Viewport pronto', id)
  const camera = { x: 28, y: 27, z: 174 },
    alvo = { x: 2, y: 7, z: 133 }
  await capturar('praca-antes', camera, alvo)
  const receita = comporEstudoDaFaisca(base, acervo.modelos)
  await comando({ tipo: 'editar', comandos: receita })
  console.log('Composição aplicada por comandos', revisao)
  await capturar('praca-depois', camera, alvo)
  await capturar('conjunto-farol', { x: 56, y: 44, z: 186 }, { x: 3, y: 13, z: 120 })
  await capturar('horta-lago', { x: 60, y: 18, z: 153 }, { x: 33, y: 4, z: 130 })
  await comando({ tipo: 'selecionar', ids: ['poco'] })
  await comando({ tipo: 'enquadrar', ids: ['poco'] })
  const antigo = revisao
  await comando({
    tipo: 'editar',
    comandos: [
      {
        tipo: 'relevo.definir',
        relevo: {
          id: 'qa-relevo',
          tipo: 'elevar',
          centro: { x: 60, z: 150 },
          raio: 8,
          valor: 1,
          intensidade: 0.5,
        },
      },
    ],
  })
  let vencido
  try {
    vencido = await cliente.executar(sessao.id, {
      id: crypto.randomUUID(),
      revisaoEsperada: antigo,
      acao: { tipo: 'selecionar', ids: [] },
    })
  } catch (e) {
    assert.equal(e.status, 403)
    vencido = { ok: false, erro: e.message }
  }
  assert.equal(vencido.ok, false)
  await comando({ tipo: 'desfazer' })
  const lago = base.aguas[0]
  await comando({
    tipo: 'editar',
    comandos: [
      {
        tipo: 'agua.definir',
        agua: { ...lago, centro: { x: 42, z: 127 }, giro: 0.2, escala: 1.05 },
      },
    ],
  })
  await capturar('lago-transformado', { x: 60, y: 18, z: 153 }, { x: 37, y: 4, z: 128 })
  await comando({ tipo: 'desfazer' })
  // Outro navegador recebe a mesma revisão, sem copiar o estado por memória.
  const outro = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
    p2 = await outro.newPage()
  await p2.goto(url)
  await p2.waitForSelector('[data-runtime-pronto=true]', { timeout: 120000 })
  await comando({ tipo: 'editar', comandos: [{ tipo: 'iluminacao.definir', noite: true }] })
  await p2.waitForSelector(`[data-revisao="${revisao}"]`, { timeout: 30000 })
  await capturar('praca-noite', camera, alvo)
  await outro.close()
  await comando({ tipo: 'editar', comandos: [{ tipo: 'iluminacao.definir', noite: false }] })
  await comando({ tipo: 'selecionar', ids: [] })
  const ciclos = []
  for (let i = 0; i < 3; i++) {
    await comando({ tipo: 'testar', ativo: true })
    await p.waitForTimeout(2500)
    const antes = (await comando({ tipo: 'estado' })).dados.runtime.avatar
    await p.keyboard.down('w')
    await p.waitForTimeout(1600)
    await p.keyboard.up('w')
    const depois = (await comando({ tipo: 'estado' })).dados.runtime.avatar
    assert.ok(Math.hypot(depois.x - antes.x, depois.z - antes.z) > 0.4, 'Avatar deve caminhar')
    if (i === 0) {
      await p.keyboard.down('Shift')
      await p.keyboard.down('w')
      await p.waitForTimeout(1000)
      await p.keyboard.up('w')
      await p.keyboard.up('Shift')
      await p.keyboard.press('Space')
      await p.waitForTimeout(500)
      await p.keyboard.down('a')
      await p.waitForTimeout(800)
      await p.keyboard.up('a')
      await capturar('avatar-ensaio')
    }
    await comando({ tipo: 'testar', ativo: false })
    await p.waitForTimeout(1500)
    ciclos.push(
      await p.locator('footer').evaluate((e) => ({
        geometrias: Number(e.dataset.geometrias),
        texturas: Number(e.dataset.texturas),
        medidas: e.innerText,
      })),
    )
  }
  assert.ok(ciclos[2].geometrias <= ciclos[0].geometrias + 10, JSON.stringify(ciclos))
  assert.ok(ciclos[2].texturas <= ciclos[0].texturas + 5, JSON.stringify(ciclos))
  const final = await cliente.projeto(id)
  writeFileSync(
    resolve(saida, 'faisca-estudo.molda.json'),
    JSON.stringify(final.documento, null, 2),
  )
  await api(`/projetos/${id}/aplicar`, { revisao })
  const aplicado = await api('/aplicado/faisca-v2')
  assert.equal(aplicado.revisao, revisao)
  await comando({ tipo: 'camera', posicao: camera, alvo })
  await p.screenshot({ path: resolve(saida, 'editor-final.png') })
  await p.reload()
  await pronto()
  assert.equal(Number(await p.locator('[data-revisao]').getAttribute('data-revisao')), revisao)
  assert.equal(erros.length, 0)
  writeFileSync(
    resolve(saida, 'resultados.json'),
    JSON.stringify(
      { id, url, revisao, erros, ciclos, comandos: receita.length, conflito: vencido.erro },
      null,
      2,
    ),
  )
  console.log('Integração concluída', revisao, JSON.stringify(ciclos))
} finally {
  await contexto.close()
  await browser.close()
}
