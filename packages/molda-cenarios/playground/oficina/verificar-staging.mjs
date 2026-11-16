import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

// Credenciais ficam no arquivo externo indicado; não entram no código nem nas evidências.
const [endereco, credenciais, pasta] = process.argv.slice(2)
const base = new URL(endereco ?? '')
assert.ok(
  base.protocol === 'https:' &&
    ['community-staging-66f2.up.railway.app', 'community-kids-staging.up.railway.app'].includes(
      base.hostname,
    ),
  'Use o endereço conferido do staging',
)
assert.ok(credenciais && pasta, 'Informe arquivo externo de credenciais e pasta de evidências')
const linhas = readFileSync(credenciais, 'utf8')
  .replace(/^\uFEFF/, '')
  .split(/\r?\n/)
  .filter((l) => l.length)
const email = linhas[0]?.trim(),
  senha = linhas[1]
assert.ok(
  email?.includes('@') && senha && linhas.length === 2,
  'O arquivo precisa ter email e senha em duas linhas',
)
const saida = resolve(pasta)
mkdirSync(saida, { recursive: true })
const sanear = (s) => String(s).replaceAll(senha, '[segredo]').replaceAll(email, '[conta de teste]')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const contexto = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const pagina = await contexto.newPage()
const identificador = `QA Cenários ${Date.now()}`
let etapa = 'entrar'
const criados = { mundo: null, biblioteca: null }
const pedidos = [],
  erros = []
pagina.on('pageerror', (e) => erros.push(sanear(e.message)))
pagina.on('response', (r) => {
  const u = new URL(r.url())
  if (u.pathname.startsWith('/api/cenarios') || r.request().method() === 'PUT')
    pedidos.push({
      origem: u.origin,
      caminho: u.pathname,
      metodo: r.request().method(),
      status: r.status(),
    })
})
try {
  await pagina.goto(new URL('/molda/cenarios', base).href)
  if (new URL(pagina.url()).pathname === '/login') {
    await pagina.locator('input[type=email]').fill(email)
    await pagina.locator('input[type=password]').fill(senha)
    await pagina.getByRole('button', { name: 'Entrar', exact: true }).click()
    await pagina.waitForURL((u) => u.pathname !== '/login', { timeout: 30_000 })
  }
  await pagina.goto(new URL('/molda/cenarios', base).href)
  etapa = 'conferir acesso'
  const acesso = await contexto.request.get(new URL('/api/cenarios/acesso', base).href)
  assert.equal(acesso.status(), 200)
  assert.deepEqual(await acesso.json(), { aberto: true })
  await pagina.getByRole('heading', { name: 'Cenários', exact: true }).waitFor({ timeout: 30_000 })
  await pagina
    .getByRole('combobox', { name: 'De quem são', exact: true })
    .selectOption({ label: 'Equipe Sistema Zero' })
  const espacos = await (
    await contexto.request.get(new URL('/api/cenarios/espacos', base).href)
  ).json()
  const equipe = espacos.find((e) => e.tipo === 'equipe')
  assert.ok(equipe)
  await pagina.screenshot({ path: resolve(saida, 'inicio-equipe.png') })
  if (process.env.CENARIOS_QA_SOMENTE_ACESSO === '1') {
    writeFileSync(
      resolve(saida, 'acesso.json'),
      JSON.stringify({ acesso: true, equipe: true, pedidos, erros }, null, 2),
    )
    console.log('Staging: conta da equipe autenticada e oficina acessível')
  } else {
    etapa = 'criar biblioteca'
    await pagina.getByRole('button', { name: 'Bibliotecas', exact: true }).click()
    await pagina.getByRole('button', { name: 'Criar biblioteca', exact: true }).first().click()
    await pagina
      .getByRole('dialog')
      .getByLabel('Nome', { exact: true })
      .fill(`${identificador} biblioteca`)
    await pagina.getByRole('dialog').getByRole('button', { name: 'Criar', exact: true }).click()
    await pagina
      .getByRole('heading', { name: `${identificador} biblioteca`, exact: true })
      .waitFor()
    criados.biblioteca = new URL(pagina.url()).searchParams.get('biblioteca')
    assert.match(criados.biblioteca, /^[a-f0-9-]{36}$/)
    writeFileSync(
      resolve(saida, 'estado-teste.json'),
      JSON.stringify({ identificador, criados }, null, 2),
    )
    etapa = 'trazer GLB'
    const posicoes = new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0])
    const gltf = {
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
      materials: [
        {
          pbrMetallicRoughness: {
            baseColorFactor: [0.15, 0.7, 0.3, 1],
            metallicFactor: 0,
            roughnessFactor: 1,
          },
          doubleSided: true,
        },
      ],
      buffers: [{ byteLength: posicoes.byteLength }],
      bufferViews: [{ buffer: 0, byteLength: posicoes.byteLength }],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 3,
          type: 'VEC3',
          min: [0, 0, 0],
          max: [2, 2, 0],
        },
      ],
    }
    const json = Buffer.from(JSON.stringify(gltf)),
      n = Math.ceil(json.length / 4) * 4
    const glb = Buffer.alloc(28 + n + posicoes.byteLength)
    glb.writeUInt32LE(0x46546c67, 0)
    glb.writeUInt32LE(2, 4)
    glb.writeUInt32LE(glb.length, 8)
    glb.writeUInt32LE(n, 12)
    glb.writeUInt32LE(0x4e4f534a, 16)
    glb.fill(32, 20, 20 + n)
    glb.set(json, 20)
    glb.writeUInt32LE(posicoes.byteLength, 20 + n)
    glb.writeUInt32LE(0x004e4942, 24 + n)
    glb.set(new Uint8Array(posicoes.buffer), 28 + n)
    const escolher = pagina.waitForEvent('filechooser')
    await pagina.getByRole('button', { name: 'Trazer modelos', exact: true }).click()
    const opcao = pagina
      .getByRole('dialog')
      .getByRole('button', { name: 'Arquivos ou pacote ZIP', exact: true })
    if (await opcao.isVisible()) await opcao.click()
    await (await escolher).setFiles({
      name: 'modelo_qa.glb',
      mimeType: 'model/gltf-binary',
      buffer: glb,
    })
    await pagina
      .getByRole('status')
      .filter({ hasText: '1 modelo novo na biblioteca' })
      .waitFor({ timeout: 60_000 })
    const modelos = await (
      await contexto.request.get(
        new URL(`/api/cenarios/bibliotecas/${criados.biblioteca}/modelos`, base).href,
      )
    ).json()
    assert.equal(modelos.total, 1)
    assert.ok(pedidos.some((r) => r.metodo === 'PUT' && r.status >= 200 && r.status < 300))
    await pagina.screenshot({ path: resolve(saida, 'modelo-guardado.png') })
    etapa = 'montar cenário'
    await pagina.getByRole('button', { name: 'Voltar às bibliotecas', exact: true }).click()
    await pagina.getByRole('button', { name: 'Meus mundos', exact: true }).click()
    await pagina.getByRole('button', { name: 'Criar mundo', exact: true }).first().click()
    await pagina.getByRole('dialog').getByLabel('Nome', { exact: true }).fill(identificador)
    await pagina.getByRole('dialog').getByRole('button', { name: 'Criar', exact: true }).click()
    await pagina.getByRole('heading', { name: identificador, exact: true }).waitFor()
    criados.mundo = new URL(pagina.url()).searchParams.get('mundo')
    assert.match(criados.mundo, /^[a-f0-9-]{36}$/)
    writeFileSync(
      resolve(saida, 'estado-teste.json'),
      JSON.stringify({ identificador, criados }, null, 2),
    )
    await pagina.getByRole('button', { name: 'Escolher bibliotecas', exact: true }).click()
    await pagina
      .getByRole('dialog')
      .getByLabel(`${identificador} biblioteca`, { exact: false })
      .check()
    await pagina.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click()
    await pagina.getByRole('button', { name: 'Criar cenário', exact: true }).first().click()
    await pagina
      .getByRole('dialog')
      .getByLabel('Nome', { exact: true })
      .fill(`${identificador} cenário`)
    await pagina.getByRole('dialog').getByRole('button', { name: 'Criar', exact: true }).click()
    await pagina.getByRole('heading', { name: `${identificador} cenário`, exact: true }).waitFor()
    const cenarioId = new URL(pagina.url()).searchParams.get('cenario')
    const gravacao = pagina.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.endsWith(`/cenarios/${cenarioId}/lotes`) &&
        r.request().method() === 'POST',
    )
    await pagina.getByRole('button', { name: 'Pôr Modelo qa no cenário', exact: true }).click()
    assert.equal((await gravacao).status(), 200)
    await pagina.getByText('Guardado', { exact: true }).waitFor()
    await pagina.reload()
    await pagina.getByRole('heading', { name: `${identificador} cenário`, exact: true }).waitFor()
    const salvo = await (
      await contexto.request.get(new URL(`/api/cenarios/cenarios/${cenarioId}`, base).href)
    ).json()
    assert.equal(salvo.documento.instancias.length, 1)
    assert.equal(salvo.documento.modelos[0].digest, modelos.itens[0].digest)
    await pagina.screenshot({ path: resolve(saida, 'cenario-reaberto.png') })
    assert.deepEqual(erros, [])
    writeFileSync(
      resolve(saida, 'resultado.json'),
      JSON.stringify(
        {
          upload: true,
          retomada: true,
          espacoEquipe: true,
          revisao: salvo.revisao,
          pedidos,
          erros,
        },
        null,
        2,
      ),
    )
    console.log('Staging: upload direto, edição e reabertura aprovados no espaço da equipe')
  }
} catch (e) {
  writeFileSync(
    resolve(saida, 'falha.json'),
    JSON.stringify({ etapa, erro: sanear(e.message), pedidos, erros, criados }, null, 2),
  )
  console.error(
    `Ensaio de staging falhou na etapa: ${etapa}. Evidência sanitizada na pasta indicada.`,
  )
  process.exitCode = 1
} finally {
  for (const [tipo, id] of [
    ['mundos', criados.mundo],
    ['bibliotecas', criados.biblioteca],
  ]) {
    if (id && /^[a-f0-9-]{36}$/.test(id)) {
      const r = await contexto.request
        .delete(new URL(`/api/cenarios/${tipo}/${id}`, base).href)
        .catch(() => null)
      if (!r?.ok()) {
        console.error(`A limpeza da entidade de teste ${tipo} precisa ser conferida.`)
        process.exitCode = 1
      }
    }
  }
  await browser.close()
}
