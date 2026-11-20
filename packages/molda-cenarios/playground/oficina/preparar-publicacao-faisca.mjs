/** Publica uma cópia da Faísca no host de memória real e guarda o pacote para o /macro de QA.
 * Não acessa a conta da plataforma nem altera a conversão original. Binários ficam em output. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { montarCenaDeCompilacaoDoEnsaio } from './fixture-compilacao.mjs'

const raiz = resolve(import.meta.dirname, '../../../..'),
  original = resolve(raiz, 'output/cenarios-reforma/conversao-faisca/original'),
  saida = resolve(
    process.env.CENARIOS_PUBLICADOS_QA_DIR ??
      resolve(raiz, 'output/cenarios-reforma/lote8-publicacao/macro-qa'),
  ),
  documento = JSON.parse(readFileSync(resolve(original, 'documento.json'), 'utf8')),
  catalogo = JSON.parse(
    readFileSync(resolve(raiz, 'output/molda-cenarios/acervo/catalogo.json'), 'utf8'),
  ).modelos,
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`,
  bibliotecas = new Map(),
  recursos = []
for (const ref of documento.modelos) {
  const m = catalogo.find((m) => m.id === ref.id && m.digest === ref.digest)
  assert.ok(m, `Falta o modelo fixado ${ref.id}`)
  bibliotecas.set(ref.biblioteca, [ref.biblioteca, m.origem, 'restrita'])
  recursos.push({
    tipo: 'modelo',
    digest: ref.digest,
    base64: readFileSync(resolve(raiz, 'output/molda-cenarios/acervo', m.arquivo)).toString(
      'base64',
    ),
  })
}
// Mesmos encaixes por hash já verificados na conversão. Não sobrepõe outra água à existente.
for (const a of documento.aguas) {
  if (
    documento.modelos.find((m) => m.id === a.modelo)?.digest ===
    '87f49a7059052af87ab2d2c162f441b908ce92ded82e4f43936d071a5114fd5b'
  )
    a.encaixeModelo = {
      nivelLocal: 1.4,
      materiaisDaAgua: ['agua'],
      materiaisSolidos: ['cor', 'cor_2'],
    }
}
for (const c of documento.caminhos) {
  if (
    documento.modelos.find((m) => m.id === c.acabamento)?.digest ===
    '65f405847e5ff3b19d6470afbd4ff5da843f61c9c3360a6b5b04e506bb7bae0f'
  )
    c.encaixeModelo = { eixo: 'x', baseLocal: 0, centroTransversalLocal: 0 }
}
const coelho = catalogo.find(
  (m) => m.digest === 'fb30dbf57b56c33727f06acbce729d4759bbd4eeb3892efdcceae2aba30f5e3a',
)
assert.ok(coelho, 'O ensaio precisa do modelo real da Íris já usado pelo piloto')
bibliotecas.set('iris-qa', ['iris-qa', 'Íris · acervo do piloto', 'restrita'])
documento.modelos.push({
  id: 'iris-qa',
  biblioteca: 'iris-qa',
  modelo: coelho.id,
  digest: coelho.digest,
  nome: 'Coelha do piloto',
})
recursos.push({
  tipo: 'modelo',
  digest: coelho.digest,
  base64: readFileSync(resolve(raiz, 'output/molda-cenarios/acervo', coelho.arquivo)).toString(
    'base64',
  ),
})
documento.instancias.push({
  id: 'iris-qa',
  nome: 'Íris de estudo',
  grupo: null,
  bloqueado: false,
  oculto: false,
  modelo: 'iris-qa',
  transformacao: {
    posicao: { x: 19, y: 0, z: 133 },
    rotacao: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },
  apoio: { tipo: 'terreno', referencia: 'volume', deslocamento: 0, inclinar: false },
  colisao: 'nenhuma',
  propriedades: { 'arquipelago.ator': 'iris' },
})
for (const p of documento.base.pecas)
  recursos.push({
    tipo: 'terreno',
    digest: p.digest,
    base64: readFileSync(resolve(original, 'recursos', `${p.digest}.szht`)).toString('base64'),
  })

const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  erros = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (e) => erros.push(e.message))
  page.on('console', (m) => {
    if (m.text().startsWith('QA-Faisca:')) console.log(m.text())
  })
  await page.goto(process.env.CENARIOS_OFICINA_QA_URL ?? 'http://127.0.0.1:4541/?vazio=1')
  await page.waitForFunction(() => window.__cenarios)
  const ids = await page.evaluate(montarCenaDeCompilacaoDoEnsaio, {
    core: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
    motor: modulo('packages/molda-cenarios-motor/src/index.ts'),
    autoria: documento,
    recursos,
    espaco: 'equipe',
    bibliotecas: [...bibliotecas.values()],
  })
  console.log(
    `QA-Faisca: fonte guardada · ${documento.instancias.length} instâncias · ${documento.modelos.length} modelos`,
  )
  // Com CENARIOS_QA_VERSOES=2, publica também uma versão 2 de verdade no mesmo host (a Íris
  // dois metros ao lado, versaoEsperada 1): é a prova da troca 1 → 2 no /macro.
  const versoes = process.env.CENARIOS_QA_VERSOES === '2' ? 2 : 1
  const resultados = await page.evaluate(
    async ({ cenario, publicar, versoes }) => {
      const host = window.__cenarios.host,
        porta = host.publicacoes,
        original = porta.publicar.bind(porta),
        controle = new AbortController(),
        { publicarRevisaoDaOficina } = await import(publicar)
      window.__pacotesFaiscaPublicados = []
      porta.publicar = async (pacote, ...args) => {
        window.__pacotesFaiscaPublicados.push(pacote)
        return original(pacote, ...args)
      }
      const feitos = []
      for (let v = 0; v < versoes; v++) {
        if (v > 0) {
          const aberto = await host.abrirCenario(cenario),
            iris = aberto.documento.instancias.find((o) => o.id === 'iris-qa'),
            p = iris.transformacao.posicao
          await host.editarCenario(
            cenario,
            aberto.revisao,
            [
              {
                tipo: 'instancia.definir',
                instancia: {
                  ...iris,
                  transformacao: { ...iris.transformacao, posicao: { ...p, x: p.x + 2 } },
                },
              },
            ],
            crypto.randomUUID(),
          )
        }
        const revisao = await host.abrirCenario(cenario),
          preparo = await host.prepararExportacao(cenario, revisao.revisao, controle.signal),
          resultado = await publicarRevisaoDaOficina(
            host,
            preparo,
            {
              perfil: { tipo: 'arquipelago-v2', ilha: 'sua-ilha' },
              versaoEsperada: v,
              operacaoId: crypto.randomUUID(),
            },
            controle.signal,
            (p) =>
              console.log(
                `QA-Faisca: v${v + 1} compilação · ${p.etapa} · ${p.feitos ?? ''}/${p.total ?? ''}`,
              ),
            (p) =>
              console.log(`QA-Faisca: v${v + 1} publicação · ${p.etapa} · ${p.feitos}/${p.total}`),
          )
        feitos.push({ resultado, cena: window.__pacotesFaiscaPublicados.at(-1).cena })
      }
      return feitos
    },
    {
      cenario: ids.cenario,
      publicar: modulo('packages/molda-cenarios/src/exportar/publicar.ts'),
      versoes,
    },
  )
  const hash = (b) => createHash('sha256').update(b).digest('hex'),
    gravar = (digest, bytes) => {
      assert.equal(hash(bytes), digest)
      const destino = resolve(saida, 'blobs', digest)
      if (existsSync(destino)) assert.deepEqual(readFileSync(destino), bytes)
      else writeFileSync(destino, bytes, { flag: 'wx' })
    }
  const vistos = new Set(),
    publicacoes = []
  for (const [indice, feito] of resultados.entries()) {
    const publicacao = feito.resultado.publicacao,
      manifesto = Buffer.from(JSON.stringify(feito.cena))
    assert.equal(publicacao.versao, indice + 1)
    assert.equal(hash(manifesto), publicacao.manifesto.digest)
    for (const p of ['blobs', 'perfis', `publicacoes/${publicacao.id}`])
      mkdirSync(resolve(saida, p), { recursive: true })
    gravar(publicacao.manifesto.digest, manifesto)
    for (const a of feito.cena.arquivos) {
      if (vistos.has(a.digest)) continue
      vistos.add(a.digest)
      const base64 = await page.evaluate(
        ({ indice, caminho }) => {
          const b = window.__pacotesFaiscaPublicados[indice].arquivos.get(caminho),
            partes = []
          for (let i = 0; i < b.length; i += 8192)
            partes.push(String.fromCharCode(...b.subarray(i, i + 8192)))
          return btoa(partes.join(''))
        },
        { indice, caminho: a.caminho },
      )
      const bytes = Buffer.from(base64, 'base64')
      assert.equal(bytes.length, a.bytes)
      gravar(a.digest, bytes)
    }
    writeFileSync(
      resolve(saida, 'publicacoes', publicacao.id, 'publicacao.json'),
      JSON.stringify(publicacao, null, 2),
      { flag: 'wx' },
    )
    // O perfil da ilha começa na versão 1; as seguintes ficam ao lado para a troca no ensaio.
    const nome = indice === 0 ? 'sua-ilha.json' : `sua-ilha.v${indice + 1}.json`,
      temporario = resolve(saida, 'perfis', `${nome}.novo`)
    writeFileSync(temporario, JSON.stringify(publicacao, null, 2))
    renameSync(temporario, resolve(saida, 'perfis', nome))
    publicacoes.push(publicacao)
  }
  assert.deepEqual(erros, [])
  const resultado = resultados[0],
    publicacao = publicacoes[0]
  const resumo = {
    versoes: publicacoes.map((p) => ({ id: p.id, versao: p.versao })),
    publicacao,
    instancias: documento.instancias.length,
    modelos: documento.modelos.length,
    nos: resultado.cena.nos.length,
    colisoes: resultado.cena.colisoes.length,
    recursos: vistos.size,
    erros,
  }
  writeFileSync(resolve(saida, 'publicacao-faisca-resultado.json'), JSON.stringify(resumo, null, 2))
  console.log(JSON.stringify(resumo))
} finally {
  await browser.close()
}
