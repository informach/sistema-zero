import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

// Prova de transporte do lote 1: só leitura, sem criar ou editar projetos reais.
// O domínio foi conferido no Railway para o serviço gateway do ambiente staging.
const [arquivo, pasta] = process.argv.slice(2)
assert.ok(arquivo && pasta, 'Informe arquivo externo de credenciais e pasta de evidências')
const linhas = readFileSync(arquivo, 'utf8')
  .replace(/^\uFEFF/, '')
  .split(/\r?\n/)
  .filter((linha) => linha.length)
assert.ok(linhas.length === 2 && linhas[0].includes('@') && linhas[1])
const ambiente = {
  ...process.env,
  MOLDA_CENARIOS_URL: 'https://api-gateway-staging-9fa3.up.railway.app',
  MOLDA_CENARIOS_EMAIL: linhas[0].trim(),
  MOLDA_CENARIOS_SENHA: linhas[1],
}
// Não deixar uma sessão herdada substituir as credenciais explicitamente indicadas.
delete ambiente.MOLDA_CENARIOS_TOKEN
delete ambiente.MOLDA_CENARIOS_SESSION_FILE
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const saida = resolve(pasta)
mkdirSync(saida, { recursive: true })
const resultado = { cli: null, mcp: null }
let etapa = 'CLI'

async function cli(...args) {
  const processo = spawn('bun', ['--no-env-file', resolve(raiz, 'src/oficina/cli.ts'), ...args], {
    cwd: raiz,
    env: ambiente,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    timeout: 90_000,
  })
  let texto = ''
  processo.stdout.on('data', (parte) => {
    texto += parte
  })
  // Erros do subprocesso podem conter dados da conta. Não os registrar nas evidências.
  processo.stderr.resume()
  await new Promise((aceitar, recusar) => {
    processo.once('error', recusar)
    processo.once('close', (codigo) =>
      codigo === 0 ? aceitar() : recusar(Error('CLI recusou a consulta')),
    )
  })
  return JSON.parse(texto)
}

let cliente
try {
  const espacos = await cli('espacos')
  assert.ok(Array.isArray(espacos))
  const equipe = espacos.find((espaco) => espaco.tipo === 'equipe')
  assert.ok(equipe, 'A conta precisa ter acesso ao espaço da equipe')
  const bibliotecas = await cli('bibliotecas', equipe.id)
  assert.ok(Array.isArray(bibliotecas) && bibliotecas.length > 0)
  resultado.cli = { espacos: espacos.length, bibliotecas: bibliotecas.length, acessoEquipe: true }

  etapa = 'MCP'
  cliente = new Client({ name: 'qa-cenarios-lote1', version: '1.0.0' })
  const transporte = new StdioClientTransport({
    command: 'bun',
    args: ['--no-env-file', resolve(raiz, 'src/oficina/mcp.ts')],
    cwd: raiz,
    env: Object.fromEntries(
      Object.entries(ambiente).filter(([, valor]) => typeof valor === 'string'),
    ),
    stderr: 'pipe',
  })
  transporte.stderr?.resume()
  await cliente.connect(transporte)
  const ferramentas = await cliente.listTools()
  assert.ok(ferramentas.tools.some((f) => f.name === 'editar_cenario'))
  const resposta = await cliente.callTool({
    name: 'listar_bibliotecas',
    arguments: { espacoId: equipe.id },
  })
  assert.notEqual(resposta.isError, true)
  const lista = JSON.parse(resposta.content.find((parte) => parte.type === 'text').text)
  assert.ok(Array.isArray(lista))
  assert.deepEqual(lista.map((b) => b.id).sort(), bibliotecas.map((b) => b.id).sort())
  resultado.mcp = {
    ferramentas: ferramentas.tools.map((f) => f.name),
    bibliotecas: lista.length,
    mesmasBibliotecas: true,
  }
  writeFileSync(
    resolve(saida, 'resultado.json'),
    JSON.stringify({ ...resultado, somenteLeitura: true, aprovado: true }, null, 2),
  )
  console.log('CLI e MCP: leitura autenticada no gateway de staging aprovada, sem alterar projetos')
} catch {
  // Somente a etapa, nunca tokens, senha, email ou a resposta inteira do serviço.
  writeFileSync(
    resolve(saida, 'resultado.json'),
    JSON.stringify({ ...resultado, etapa, aprovado: false }, null, 2),
  )
  console.error(`Ensaio de staging recusado na etapa ${etapa}`)
  process.exitCode = 1
} finally {
  await cliente?.close()
}
