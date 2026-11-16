import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { dirname, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

// Publicação interna, retomável: usa o mesmo host HTTP, worker e fotógrafo da oficina.
// Credenciais são lidas do arquivo externo e ficam somente nesta sessão do navegador.
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const i = a.indexOf('=')
    assert.ok(i > 2, 'Use --opcao=valor')
    return [a.slice(2, i), a.slice(i + 1)]
  }),
)
const raiz = resolve(import.meta.dirname, '..')
const dependencias = createRequire(resolve(raiz, 'packages/molda-cenarios/package.json'))
const { chromium } = dependencias('playwright-core')
const base = new URL(args.base ?? '')
assert.equal(base.protocol, 'https:')
assert.ok(
  !base.username &&
    !base.password &&
    !base.port &&
    !base.search &&
    !base.hash &&
    base.pathname === '/',
  'Use somente a origem do staging',
)
assert.ok(
  ['community-staging-66f2.up.railway.app', 'community-kids-staging.up.railway.app'].includes(
    base.hostname,
  ),
  'Somente staging conferido',
)
assert.ok(args.credenciais, 'Informe --credenciais com o arquivo externo')
const pasta = resolve(args.acervo ?? 'output/molda-cenarios/acervo')
const saida = resolve(args.saida ?? 'output/cenarios-reforma/publicacao-acervo')
assert.ok(
  saida.startsWith(resolve(raiz, 'output') + sep),
  'Evidências locais devem ficar em output',
)
mkdirSync(saida, { recursive: true })
const registroAnterior = existsSync(resolve(saida, 'resultado.json'))
  ? JSON.parse(readFileSync(resolve(saida, 'resultado.json'), 'utf8'))
  : null
const original = JSON.parse(readFileSync(resolve(pasta, 'catalogo.json'), 'utf8'))
const catalogo = original.modelos
assert.ok(Array.isArray(catalogo) && catalogo.length > 0)
assert.equal(
  createHash('sha256').update(JSON.stringify(catalogo)).digest('hex'),
  original.digest,
  'O catálogo foi alterado sem atualizar o hash',
)
const limite = args.limite ? Number(args.limite) : catalogo.length
assert.ok(Number.isInteger(limite) && limite > 0)
const nomes = {
  adventure_land: 'Adventure Land',
  reino: 'Reino',
  templo: 'Templo',
  inverno: 'Inverno',
  faroeste: 'Faroeste',
  estadio: 'Estádio',
  doce: 'Vila Doce',
  cidade: 'Cidade',
  camping: 'Camping',
  parque: 'Parque',
  halloween: 'Halloween',
  fazenda: 'Fazenda',
  corrida: 'Corrida',
  Morada: 'Morada',
  escola: 'Escola',
  saude: 'Saúde',
  Fantasy: 'Fantasia',
  'acervo-cidade': 'Cidade complementar',
}
const escolhidos = catalogo.filter((m) => !args.origem || m.origem === args.origem).slice(0, limite)
assert.ok(escolhidos.length)
for (const m of escolhidos) {
  assert.ok(/^[\w.-]+\.glb$/.test(m.arquivo) && nomes[m.origem], 'Entrada fora do acervo esperado')
  const destino = resolve(pasta, m.arquivo)
  if (!existsSync(destino)) {
    assert.match(m.commit, /^[a-f0-9]{40}$/)
    const adaptado = resolve(args.adaptados ?? 'output/faisca-arte', m.arquivo)
    if (!existsSync(adaptado))
      assert.ok(
        /^(biblioteca|biblioteca_aventura)\//.test(m.caminho) &&
          !m.caminho.split('/').includes('..'),
        `Falta a peça adaptada ${m.arquivo}`,
      )
    const recuperado = existsSync(adaptado)
      ? readFileSync(adaptado)
      : execFileSync(
          'git',
          ['-C', resolve(args.repositorio ?? '../artes-3d'), 'show', `${m.commit}:${m.caminho}`],
          { maxBuffer: 80 * 1024 ** 2, stdio: ['ignore', 'pipe', 'pipe'] },
        )
    assert.equal(
      createHash('sha256').update(recuperado).digest('hex'),
      m.digest,
      `A fonte não corresponde ao modelo preparado: ${m.arquivo}`,
    )
    writeFileSync(destino, recuperado)
  }
  const arquivo = readFileSync(destino)
  assert.equal(
    createHash('sha256').update(arquivo).digest('hex'),
    m.digest,
    'O arquivo local mudou',
  )
}
const bundle = resolve(saida, 'host-http.mjs')
execFileSync(
  'bun',
  [
    'build',
    'packages/molda-cenarios/src/oficina/host-http.ts',
    '--target=node',
    `--outfile=${bundle}`,
  ],
  { cwd: raiz, stdio: 'pipe' },
)
const { criarHostHttp } = await import(pathToFileURL(bundle).href)
const processador = resolve(saida, 'processador')
execFileSync(
  process.execPath,
  [
    resolve(dirname(dependencias.resolve('vite/package.json')), 'bin/vite.js'),
    'build',
    '--config',
    'packages/molda-cenarios/playground/acervo/vite.config.ts',
  ],
  {
    cwd: raiz,
    env: { ...process.env, CENARIOS_ACERVO_BUILD_DIR: processador },
    stdio: 'pipe',
    maxBuffer: 8 * 1024 ** 2,
  },
)
const linhas = readFileSync(args.credenciais, 'utf8')
  .replace(/^\uFEFF/, '')
  .split(/\r?\n/)
  .filter((l) => l.length)
assert.ok(
  linhas.length === 2 && linhas[0].includes('@') && linhas[1],
  'Formato do arquivo de credenciais inválido',
)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const contexto = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const conta = await contexto.newPage()
const palco = await contexto.newPage()
const permitidos = new Map(escolhidos.map((m) => [m.arquivo, resolve(pasta, m.arquivo)]))
// Servidor efêmero somente no loopback: código compilado, sem HMR nem acesso ao workspace.
const servidor = createServer((pedido, resposta) => {
  try {
    const caminho = decodeURIComponent(new URL(pedido.url ?? '/', 'http://localhost').pathname)
    resposta.setHeader(
      'content-security-policy',
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self' https:; img-src 'self' data: blob:",
    )
    if (caminho === '/') {
      resposta.setHeader('content-type', 'text/html')
      resposta.end('<!doctype html><title>Processador local de acervo</title>')
      return
    }
    const arquivo = caminho.startsWith('/acervo/')
      ? permitidos.get(caminho.slice(8))
      : resolve(processador, `.${caminho}`)
    if (
      !arquivo ||
      (!caminho.startsWith('/acervo/') &&
        (!arquivo.startsWith(processador + sep) || !caminho.endsWith('.js')))
    ) {
      resposta.writeHead(404)
      resposta.end()
      return
    }
    resposta.setHeader(
      'content-type',
      caminho.endsWith('.glb') ? 'model/gltf-binary' : 'application/javascript',
    )
    resposta.setHeader('content-length', statSync(arquivo).size)
    createReadStream(arquivo).pipe(resposta)
  } catch {
    resposta.writeHead(404)
    resposta.end()
  }
})
await new Promise((resolve, reject) => {
  servidor.once('error', reject)
  servidor.listen(0, '127.0.0.1', resolve)
})
const enderecoLocal = servidor.address()
assert.ok(enderecoLocal && typeof enderecoLocal !== 'string')
let etapa = 'autenticação'
const registro = {
  catalogo: original.digest,
  total: escolhidos.length,
  modelos: [],
  recusados: [],
  bibliotecas: {},
  completo: false,
}
const gravar = () =>
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(registro, null, 2))
try {
  await conta.goto(new URL('/login', base).href)
  await conta.locator('input[type=email]').fill(linhas[0].trim())
  await conta.locator('input[type=password]').fill(linhas[1])
  await conta.getByRole('button', { name: 'Entrar', exact: true }).click()
  await conta.waitForURL((u) => u.pathname !== '/login', { timeout: 30_000 })
  const host = criarHostHttp({
    base: new URL('/api/cenarios', base).href,
    buscar: async (endereco, opcoes = {}) => {
      assert.equal(new URL(endereco).origin, base.origin)
      const r = await contexto.request.fetch(endereco, {
        method: opcoes.method ?? 'GET',
        data: opcoes.body,
        headers: { ...opcoes.headers, origin: base.origin },
        timeout: 120_000,
      })
      return new Response(await r.body(), {
        status: r.status(),
        headers: { 'content-type': r.headers()['content-type'] ?? 'application/json' },
      })
    },
  })
  const equipe = (await host.espacos()).find((e) => e.tipo === 'equipe')
  assert.ok(equipe, 'Esta sessão não tem espaço da equipe')
  const bibliotecas = await host.listarBibliotecas(equipe.id)
  await palco.goto(`http://127.0.0.1:${enderecoLocal.port}`)
  for (const origem of [...new Set(escolhidos.map((m) => m.origem))]) {
    etapa = `coleção ${origem}`
    const nome = nomes[origem]
    const idAnterior = registroAnterior?.bibliotecas?.[origem]
    const mesmoNome = bibliotecas.filter((b) => b.nome === nome)
    let biblioteca = bibliotecas.find((b) => b.id === idAnterior)
    if (!biblioteca) {
      assert.ok(
        mesmoNome.length <= 1,
        `Há mais de uma biblioteca chamada ${nome}; indique os IDs no registro de retomada`,
      )
      biblioteca = mesmoNome[0]
    }
    if (!biblioteca) {
      biblioteca = await host.criarBiblioteca(equipe.id, {
        nome,
        licenca: 'restrita',
        descricao: `Acervo licenciado da equipe. Coleção ${nome}. Uso conforme a licença original dos modelos.`,
      })
      bibliotecas.push(biblioteca)
    }
    assert.equal(biblioteca.licenca, 'restrita', 'Não reutilizar biblioteca sem a licença restrita')
    registro.bibliotecas[origem] = biblioteca.id
    const existentes = new Map()
    let cursor
    do {
      const pagina = await host.listarModelos(biblioteca.id, { limite: 200, cursor })
      for (const m of pagina.itens) existentes.set(m.digest, m)
      cursor = pagina.proximo
    } while (cursor)
    const itens = escolhidos.filter((m) => m.origem === origem)
    for (let i = 0; i < itens.length; i += 12) {
      const lote = itens.slice(i, i + 12)
      const novos = lote.filter((m) => !existentes.has(m.digest))
      if (novos.length) {
        const preparado = await palco.evaluate(
          async ({ metadados, modulo }) => {
            const { prepararArquivos } = await import(modulo)
            const entradas = []
            for (const m of metadados) {
              const r = await fetch(`/acervo/${encodeURIComponent(m.arquivo)}`)
              if (!r.ok) throw Error('Arquivo de acervo ausente')
              entradas.push({ caminho: m.arquivo, arquivo: new File([await r.blob()], m.arquivo) })
            }
            const dados = await prepararArquivos(entradas)
            const base64 = (b) =>
              new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(String(reader.result).split(',')[1])
                reader.onerror = reject
                reader.readAsDataURL(b)
              })
            return {
              recusados: dados.recusados,
              prontos: await Promise.all(
                dados.prontos.map(async (m) => ({
                  ...m,
                  conteudo: await base64(new Blob([m.conteudo])),
                  miniatura: await base64(m.miniatura),
                })),
              ),
            }
          },
          {
            metadados: novos,
            modulo: '/processador.js',
          },
        )
        registro.recusados.push(...preparado.recusados.map((r) => ({ origem, ...r })))
        const modelos = preparado.prontos.map((m) => {
          const meta = novos.find((n) => n.digest === m.digest)
          assert.ok(meta, 'A conversão alterou um GLB já preparado')
          return {
            ...m,
            nome: meta.nome,
            pasta: meta.categoria ?? '',
            etiquetas: [origem],
            conteudo: new Uint8Array(Buffer.from(m.conteudo, 'base64')),
            miniatura: new Blob([Buffer.from(m.miniatura, 'base64')], { type: 'image/webp' }),
          }
        })
        for (const m of await host.importarModelos(biblioteca.id, modelos))
          existentes.set(m.digest, m)
      }
      for (const m of lote) {
        const salvo = existentes.get(m.digest)
        if (salvo)
          registro.modelos.push({
            origem,
            modelo: salvo.id,
            digest: salvo.digest,
            caminho: m.caminho,
          })
      }
      gravar()
      if (novos.length || i + 12 >= itens.length)
        console.log(
          `${nome}: ${Math.min(i + 12, itens.length)}/${itens.length}; ${registro.modelos.length}/${escolhidos.length} conferidos`,
        )
    }
  }
  etapa = 'auditoria de conteúdo registrado'
  registro.auditoria = []
  for (const [origem, bibliotecaId] of Object.entries(registro.bibliotecas)) {
    const esperados = escolhidos.filter((m) => m.origem === origem)
    const encontrados = new Set()
    let cursor
    do {
      const pagina = await host.listarModelos(bibliotecaId, { limite: 200, cursor })
      for (const m of pagina.itens) encontrados.add(m.digest)
      cursor = pagina.proximo
    } while (cursor)
    assert.ok(
      esperados.every((m) => encontrados.has(m.digest)),
      `A coleção ${origem} não confirmou todos os hashes`,
    )
    registro.auditoria.push({ origem, esperados: esperados.length, registrados: encontrados.size })
  }
  etapa = 'captura de bibliotecas'
  await conta.goto(new URL('/molda/cenarios', base).href)
  await conta
    .getByRole('combobox', { name: 'De quem são', exact: true })
    .selectOption({ label: 'Equipe Sistema Zero' })
  await conta.getByRole('button', { name: 'Bibliotecas', exact: true }).click()
  await conta.getByRole('button', { name: 'Abrir Adventure Land', exact: true }).waitFor()
  await conta.evaluate(async () => {
    const imagens = [...document.querySelectorAll('img')]
    for (const imagem of imagens) imagem.loading = 'eager'
    await Promise.all(imagens.map((i) => i.decode().catch(() => undefined)))
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    )
  })
  registro.capas = await conta.evaluate(() =>
    [...document.querySelectorAll('.sz-tool-cover img')].map((i) => ({
      carregada: i.complete && i.naturalWidth > 0,
    })),
  )
  assert.equal(registro.capas.length, Object.keys(registro.bibliotecas).length)
  assert.ok(
    registro.capas.every((c) => c.carregada),
    'Uma capa não carregou na galeria',
  )
  await conta.screenshot({ path: resolve(saida, 'bibliotecas-equipe.png'), fullPage: true })
  registro.completo = registro.modelos.length === escolhidos.length && !registro.recusados.length
  gravar()
  assert.ok(
    registro.completo,
    'Há modelos recusados; consultar o registro antes de concluir a carga',
  )
  console.log('Acervo conferido e guardado nas bibliotecas restritas da equipe')
} catch (e) {
  gravar()
  // Não imprimir URLs assinadas, cookies nem os valores do arquivo de credenciais.
  const erro = String(e.message)
    .replaceAll(linhas[0].trim(), '[conta]')
    .replaceAll(linhas[1], '[segredo]')
    .replace(/https?:\/\/\S+/g, '[endereço]')
  writeFileSync(resolve(saida, 'falha.json'), JSON.stringify({ etapa, erro }, null, 2))
  console.error(
    `Carga interrompida em ${etapa}. Consulte a evidência local sanitizada; pode retomar o comando.`,
  )
  process.exitCode = 1
} finally {
  await browser.close()
  servidor.closeAllConnections()
  await new Promise((resolve) => servidor.close(resolve))
}
