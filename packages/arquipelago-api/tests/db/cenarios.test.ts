import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core'
import { CatalogosDeCenarios } from '../../src/application/catalogo-de-cenarios'
import { ServicoDeCenarios } from '../../src/application/servico-de-cenarios'
import { SessoesDeCenarios } from '../../src/application/sessoes-de-cenarios'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDeCatalogos } from '../../src/infrastructure/persistence/drizzle/repositorio-catalogos-cenarios'
import { DrizzleRepositorioDeCenarios } from '../../src/infrastructure/persistence/drizzle/repositorio-cenarios'
import { DrizzleSessoesDeCenarios } from '../../src/infrastructure/persistence/drizzle/repositorio-sessoes-cenarios'
import { rotasDosCenarios } from '../../src/interfaces/http/rotas-dos-cenarios'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'

const url = process.env.ARQUIPELAGO_CENARIOS_TEST_DATABASE_URL
if (url) {
  const u = new URL(url)
  if (
    !['postgres:', 'postgresql:'].includes(u.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    !/^\/arquipelago_test[a-z0-9_]*$/.test(u.pathname)
  )
    throw Error('Use banco local descartável arquipelago_test')
}
let db: DbConnection
beforeAll(async () => {
  if (!url) return
  db = createDbConnection(url, { max: 4 })
  await migrarBancoDeTeste(db)
}, 120_000)
afterAll(async () => {
  await db?.close()
})

test.skipIf(!url)(
  'sessões reais: dono, gesto, revisão e fila atômica entre dois consumidores',
  async () => {
    const autor = { id: randomUUID(), podeEscrever: true, podeRevisar: true },
      outro = { ...autor, id: randomUUID() },
      catalogo = { id: 'fila-qa', digest: 'a'.repeat(64) }
    const cenarios = new ServicoDeCenarios(new DrizzleRepositorioDeCenarios(db.db), async () => ({
      ...catalogo,
      modelos: new Map(),
    }))
    const p = await cenarios.criar(autor, {
      nome: 'Fila QA',
      operacaoId: randomUUID(),
      documento: {
        formato: 'molda-cenario',
        versao: 1,
        id: 'fila-qa',
        nome: 'Fila QA',
        unidade: 'metro',
        eixoVertical: 'y',
        base: { id: 'faisca-v2', versao: '1' },
        catalogo,
        grupos: [],
        instancias: [],
        caminhos: [],
        aguas: [],
        relevo: [],
        marcos: [],
        iluminacao: { noite: false },
      },
    })
    const repo = new DrizzleSessoesDeCenarios(db.db),
      sessoes = new SessoesDeCenarios(repo, cenarios),
      sessao = await sessoes.criar(autor, { projetoId: p.projetoId })
    const estado = {
      revisao: 0,
      revisaoPronta: 0,
      gesto: false,
      ocupado: false,
      modo: 'editando' as const,
      selecionados: [],
    }
    let erro: unknown
    try {
      await sessoes.pulso(outro, sessao.id, estado)
    } catch (e) {
      erro = e
    }
    expect(String(erro)).toContain('outro operador')
    await sessoes.pulso(autor, sessao.id, { ...estado, gesto: true })
    const pedido = { id: randomUUID(), revisaoEsperada: 0, acao: { tipo: 'estado' as const } }
    erro = null
    try {
      await sessoes.pedir(autor, sessao.id, pedido)
    } catch (e) {
      erro = e
    }
    expect(String(erro)).toContain('ocupado')
    await sessoes.pulso(autor, sessao.id, estado)
    erro = null
    try {
      await sessoes.pedir(autor, sessao.id, { ...pedido, revisaoEsperada: 1 })
    } catch (e) {
      erro = e
    }
    expect(String(erro)).toContain('revisão')
    const t = await sessoes.pedir(autor, sessao.id, pedido),
      retry = await sessoes.pedir(autor, sessao.id, pedido)
    expect(retry.id).toBe(t.id)
    const claims = await Promise.all([
      sessoes.proxima(autor, sessao.id),
      sessoes.proxima(autor, sessao.id),
    ])
    expect(claims.filter(Boolean)).toHaveLength(1)
    await sessoes.concluir(autor, sessao.id, t.id, {
      ok: true,
      revisao: 0,
      dados: { origem: 'viewport' },
    })
    expect((await sessoes.tarefa(autor, sessao.id, t.id)).resultado?.dados?.origem).toBe('viewport')
    await cenarios.aplicar(autor, p.projetoId, 0)
    expect((await cenarios.aplicado(autor, 'faisca-v2')).projetoId).toBe(p.projetoId)
  },
)
test.skipIf(!url)(
  'catálogo remoto imutável: digest, versões antigas e permissão administrativa',
  async () => {
    const servico = new CatalogosDeCenarios(new DrizzleRepositorioDeCatalogos(db.db)),
      autor = { id: randomUUID(), podeEscrever: true, podeRevisar: true }
    const modelos = [
      {
        id: 'reino/arvore',
        nome: 'Árvore',
        origem: 'reino',
        caminho: 'natureza/glb/arvore.glb',
        commit: 'a'.repeat(40),
        digest: 'b'.repeat(64),
        dimensoes: [2, 4, 2] as [number, number, number],
        min: [-1, 0, -1] as [number, number, number],
        max: [1, 4, 1] as [number, number, number],
        bytes: 100,
        triangulos: 12,
        arquivo: 'arvore.bbbbbbbbbbbb.glb',
        categoria: 'natureza',
      },
    ]
    const digest = createHash('sha256').update(JSON.stringify(modelos)).digest('hex'),
      id = `qa-${randomUUID()}`
    expect(await servico.registrar(autor, { id, digest, modelos })).toEqual({
      id,
      digest,
      quantidade: 1,
    })
    await servico.registrar(autor, { id, digest, modelos })
    expect((await servico.ler(autor, { id, digest })).modelos).toEqual(modelos)
    const novos = [{ ...modelos[0]!, nome: 'Árvore revisada' }],
      outroDigest = createHash('sha256').update(JSON.stringify(novos)).digest('hex')
    await servico.registrar(autor, { id, digest: outroDigest, modelos: novos })
    expect((await servico.resolver({ id, digest })).modelos.get('reino/arvore')!.nome).toBe(
      'Árvore',
    )
    expect(
      (await servico.resolver({ id, digest: outroDigest })).modelos.get('reino/arvore')!.nome,
    ).toBe('Árvore revisada')
    await expect(servico.registrar(autor, { id, digest: 'c'.repeat(64), modelos })).rejects.toThrow(
      /Digest/,
    )
    await expect(servico.listar({ ...autor, podeEscrever: false })).rejects.toThrow(
      /administradores/,
    )
  },
)
test.skipIf(!url)(
  'Postgres real: revisão e histórico são atômicos em duas sessões e retries',
  async () => {
    const repo = new DrizzleRepositorioDeCenarios(db.db),
      catalogo = async () => ({ id: 'catalogo', digest: 'a'.repeat(64), modelos: new Map() }),
      a = new ServicoDeCenarios(repo, catalogo),
      b = new ServicoDeCenarios(repo, catalogo),
      autor = { id: randomUUID(), podeEscrever: true, podeRevisar: true }
    const documento: DocumentoDeCenario = {
      formato: 'molda-cenario',
      versao: 1,
      id: 'base',
      nome: 'Base',
      unidade: 'metro',
      eixoVertical: 'y',
      base: { id: 'faisca-v2', versao: '1' },
      catalogo: { id: 'catalogo', digest: 'a'.repeat(64) },
      grupos: [],
      instancias: [],
      caminhos: [],
      aguas: [],
      relevo: [],
      marcos: [],
      iluminacao: { noite: false },
    }
    const entrada = { nome: 'Faísca QA', documento, operacaoId: randomUUID() },
      p = await a.criar(autor, entrada)
    expect((await b.criar(autor, entrada)).projetoId).toBe(p.projetoId)
    const op = {
      revisaoEsperada: 0,
      operacaoId: randomUUID(),
      comandos: [{ tipo: 'iluminacao.definir', noite: true }],
    }
    const r = await Promise.all([
      a.editar(autor, p.projetoId, op),
      b.editar(autor, p.projetoId, op),
    ])
    expect(r[0]).toEqual(r[1])
    expect((await repo.ler(p.projetoId))!.revisao).toBe(1)
    expect(await repo.historico(p.projetoId)).toHaveLength(2)
    const concorrentes = await Promise.allSettled([
      a.editar(autor, p.projetoId, {
        revisaoEsperada: 1,
        operacaoId: randomUUID(),
        comandos: [{ tipo: 'projeto.renomear', nome: 'A' }],
      }),
      b.editar(autor, p.projetoId, {
        revisaoEsperada: 1,
        operacaoId: randomUUID(),
        comandos: [{ tipo: 'projeto.renomear', nome: 'B' }],
      }),
    ])
    expect(concorrentes.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect((await repo.ler(p.projetoId))!.revisao).toBe(2)
    expect(await repo.historico(p.projetoId)).toHaveLength(3)
    expect(await repo.aplicar(p.projetoId, 1)).toBe(false)
    expect(await repo.aplicar(p.projetoId, 2)).toBe(true)
    expect((await repo.listar()).find((pj) => pj.id === p.projetoId)!.revisaoAplicada).toBe(2)
    const app = rotasDosCenarios({ cenarios: a, tokenInterno: 'cenario-qa-interno' })
    const cabecalhos = {
      'x-internal-token': 'cenario-qa-interno',
      'x-auth-user-id': autor.id,
      'x-auth-user-role': 'admin',
      'x-auth-user-status': 'active',
    }
    const caminho = `http://localhost/arquipelago/admin/cenarios/projetos/${p.projetoId}`
    expect((await app.handle(new Request(caminho, { headers: cabecalhos }))).status).toBe(200)
    expect(
      (
        await app.handle(
          new Request(caminho, { headers: { ...cabecalhos, 'x-auth-user-role': 'staff' } }),
        )
      ).status,
    ).toBe(403)
    expect(
      (
        await app.handle(
          new Request(caminho, { headers: { ...cabecalhos, 'x-internal-token': 'incorreto' } }),
        )
      ).status,
    ).toBe(401)
    expect(
      (await app.handle(new Request(`${caminho}?revisao=-1`, { headers: cabecalhos }))).status,
    ).toBe(400)
    const stale = await app.handle(
      new Request(`${caminho}/comandos`, {
        method: 'POST',
        headers: { ...cabecalhos, 'content-type': 'application/json' },
        body: JSON.stringify({
          revisaoEsperada: 0,
          operacaoId: randomUUID(),
          comandos: [{ tipo: 'iluminacao.definir', noite: false }],
        }),
      }),
    )
    expect(stale.status).toBe(409)
    expect((await stale.json()).revisaoAtual).toBe(2)
    const restaurar = { revisaoEsperada: 2, origem: 0, operacaoId: randomUUID() }
    const restaurado = await a.restaurar(autor, p.projetoId, restaurar)
    expect(restaurado.revisao).toBe(3)
    expect(restaurado.documento).toEqual(p.documento)
    expect(await b.restaurar(autor, p.projetoId, restaurar)).toEqual(restaurado)
    expect(await repo.historico(p.projetoId)).toHaveLength(4)
  },
)
