import { beforeEach, describe, expect, mock, test } from 'bun:test'
import {
  type AnaliseDosMembros,
  AplicacaoDoManifestoSchema,
  ConferenciaDoManifestoSchema,
  type CurriculoDeBlocos,
  type DesafioDoManifesto,
  type ManifestoDeDesafios,
  ManifestoDeDesafiosSchema,
  POSTOS_DA_JORNADA,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import type { PortaDosMembros } from '../../src/domain/membros.port'
import { createServer } from '../../src/interfaces/http/server'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'
import { membrosDeMentira } from '../fakes/membros'
import { RepositorioEmMemoria } from '../fakes/memoria'

const TOKEN = 'token-interno-de-teste'
const ADMIN = '66666666-6666-4666-8666-666666666666'
const AGORA = new Date('2026-10-28T15:00:00Z')

const projeto = { files: { 'index.html': '', 'style.css': '', 'script.js': '' } }
const item = (slug: string, over: Partial<DesafioDoManifesto> = {}): DesafioDoManifesto => ({
  slug,
  publico: 'kids',
  ilha: 'bosque',
  tipo: 'quadro-das-cores',
  quadro: 1,
  ordem: 0,
  publicar: true,
  conteudo: {
    versao: 1,
    titulo: `Desafio ${slug}`,
    enunciado: 'Faça o bicho chegar.',
    dicas: [],
    projetoInicial: projeto,
    gabarito: projeto,
    objetivos: [{ id: 'o1', label: 'Chega', rule: { type: 'usesBlock', block: 'x' } }],
    recompensa: { cor: true, moedas: 20, moedasExtra: 0 },
    blocosManuais: { acrescentar: [], retirar: [] },
  },
  ...over,
})
const manifesto = (desafios: DesafioDoManifesto[], escopo?: ManifestoDeDesafios['escopo']) =>
  ManifestoDeDesafiosSchema.parse({
    formato: 'arquipelago-desafios',
    versao: 1,
    ...(escopo ? { escopo } : {}),
    desafios,
  })

const curriculo: CurriculoDeBlocos = { versao: 1, cursos: [], catalogo: [] }
const analiseOk: AnaliseDosMembros = {
  blocosDoGabarito: [],
  blocosDesconhecidos: [],
  vista: [{ id: 'o1', label: 'Chega', kind: 'game' }],
  problemas: [],
  gabarito: [{ id: 'o1', passou: true }],
  inicial: [{ id: 'o1', passou: false }],
}

let desafios: DesafiosEmMemoria
let analisar: ReturnType<typeof mock>
let app: ReturnType<typeof createServer>

beforeEach(() => {
  desafios = new DesafiosEmMemoria()
  analisar = mock(async () => analiseOk)
  const membros = membrosDeMentira({
    analisarObjetivos: analisar as unknown as PortaDosMembros['analisarObjetivos'],
    lerCurriculo: async () => curriculo,
    lerJornada: async () => ({
      kids: { versao: 1, postos: [...POSTOS_DA_JORNADA] },
      adulto: { versao: 0, configurada: false, etapas: [] },
    }),
  })
  const politica = {
    modo: 'aberto' as const,
    publicos: new Set(['kids' as const]),
    lista: new Set<string>(),
  }
  const leituras = new LeiturasDosMembros(membros)
  let n = 0
  app = createServer({
    logger: createLogger({ level: 'error' }),
    servico: new ServicoDoJogo(new RepositorioEmMemoria(), politica, () => AGORA),
    cartas: new ServicoDasCartas(politica, leituras),
    equipe: new ServicoDaEquipe(
      desafios,
      membros,
      leituras,
      new ConferenciaDoMapa(membros, createLogger({ level: 'error' })),
      () => AGORA,
      () => `88888888-8888-4888-8888-${String(++n).padStart(12, '0')}`,
    ),
    desafios: desafiosDesligados(politica),
    cliente: { dir: '/nao-existe', servirMapas: false },
    tokenInterno: TOKEN,
    readiness: async () => {},
  })
})

const cabecalhos = (papel = 'admin') => ({
  'x-internal-token': TOKEN,
  'x-auth-user-id': ADMIN,
  'x-auth-user-role': papel,
  'x-auth-user-status': 'active',
})

async function chamar(metodo: string, caminho: string, corpo?: unknown, papel = 'admin') {
  const headers = cabecalhos(papel)
  const r = await app.handle(
    new Request(`http://local/arquipelago/admin${caminho}`, {
      method: metodo,
      headers: corpo === undefined ? headers : { ...headers, 'content-type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),
  )
  return { status: r.status, json: (await r.json().catch(() => null)) as Record<string, unknown> }
}

async function conferir(m: ManifestoDeDesafios, papel = 'admin') {
  const r = await chamar('POST', '/manifestos/conferir', { manifesto: m }, papel)
  expect(r.status).toBe(200)
  return ConferenciaDoManifestoSchema.parse(r.json)
}

async function subir(m: ManifestoDeDesafios) {
  const c = await conferir(m)
  const r = await chamar('POST', '/manifestos/aplicar', { manifesto: m, impressao: c.impressao })
  expect(r.status).toBe(200)
  return { conferencia: c, aplicacao: AplicacaoDoManifestoSchema.parse(r.json) }
}

describe('manifesto de desafios', () => {
  test('edição concorrente durante a gravação informa a linha sem esconder os demais resultados', async () => {
    await subir(manifesto([item('existente', { quadro: 2 })]))
    const alterado = item('existente', {
      quadro: 2,
      conteudo: { ...item('existente').conteudo, titulo: 'Título do arquivo' },
    })
    const m = manifesto([item('primeiro'), alterado, item('ultimo', { quadro: 3 })])
    const c = await conferir(m)
    const gravar = desafios.gravar.bind(desafios)
    let concorreu = false
    desafios.gravar = async (e) => {
      if (!concorreu) {
        concorreu = true
        await gravar({ ...e, conteudo: { ...alterado.conteudo, titulo: 'Edição concorrente' } })
      }
      return gravar(e)
    }
    const r = await chamar('POST', '/manifestos/aplicar', { manifesto: m, impressao: c.impressao })
    expect(r.status).toBe(200)
    const a = AplicacaoDoManifestoSchema.parse(r.json)
    expect(a.itens.map((d) => [d.slug, d.acao, d.publicado])).toEqual([
      ['primeiro', 'criar', true],
      ['existente', 'conflito', false],
      ['ultimo', 'criar', true],
    ])
    expect(a.itens[1]?.problemas[0]?.codigo).toBe('DESAFIO_DESATUALIZADO')
    const atual = [...desafios.linhas.values()].find((d) => d.metadados.slug === 'existente')
    expect(atual?.conteudo).toMatchObject({ titulo: 'Edição concorrente' })
    expect(atual?.revisaoPublicada).toBe(1)
  })

  test('edição durante a análise não publica a revisão nova nem aborta as outras linhas', async () => {
    const m = manifesto([item('concorrente'), item('seguinte', { quadro: 2 })])
    const c = await conferir(m)
    let concorreu = false
    analisar.mockImplementation(async () => {
      if (!concorreu) {
        concorreu = true
        const d = [...desafios.linhas.values()].find((d) => d.metadados.slug === 'concorrente')
        if (!d) throw new Error('O rascunho deve existir antes da análise de publicação')
        await desafios.gravar({
          id: d.id,
          revisaoBase: d.revisao,
          metadados: d.metadados,
          conteudo: { ...item('concorrente').conteudo, titulo: 'Edição nova' },
          por: ADMIN,
          agora: AGORA,
        })
      }
      return analiseOk
    })
    const r = await chamar('POST', '/manifestos/aplicar', { manifesto: m, impressao: c.impressao })
    expect(r.status).toBe(200)
    const a = AplicacaoDoManifestoSchema.parse(r.json)
    expect(a.itens.map((d) => [d.slug, d.acao, d.publicado])).toEqual([
      ['concorrente', 'criar', false],
      ['seguinte', 'criar', true],
    ])
    expect(a.itens[0]?.problemas[0]?.codigo).toBe('DESAFIO_DESATUALIZADO')
    const atual = [...desafios.linhas.values()].find((d) => d.metadados.slug === 'concorrente')
    expect(atual).toMatchObject({ revisao: 2, revisaoPublicada: null, situacao: 'rascunho' })
  })

  test('o pacote da ilha cria e publica tudo; subir de novo dá tudo igual e não grava nada', async () => {
    const m = manifesto(
      [
        item('corrida'),
        item('corrida-pedras', {
          tipo: 'desafio-do-dia',
          quadro: null,
          ordem: 10,
          conteudo: {
            ...item('x').conteudo,
            recompensa: { cor: false, moedas: 10, moedasExtra: 5 },
          },
        }),
      ],
      'ilha',
    )
    const { conferencia, aplicacao } = await subir(m)
    expect(conferencia.contagem).toMatchObject({ criar: 2, atualizar: 0, igual: 0, publica: 2 })
    expect(aplicacao.itens.map((i) => [i.slug, i.acao, i.publicado])).toEqual([
      ['corrida', 'criar', true],
      ['corrida-pedras', 'criar', true],
    ])
    const revisoes = [...desafios.linhas.values()].map((d) => d.revisao)
    const deNovo = await subir(m)
    expect(deNovo.conferencia.contagem).toMatchObject({
      criar: 0,
      atualizar: 0,
      igual: 2,
      publica: 0,
    })
    expect(deNovo.conferencia.itens.every((i) => i.analise === null)).toBe(true)
    expect([...desafios.linhas.values()].map((d) => d.revisao)).toEqual(revisoes)
  })

  test('um desafio só atualiza o que mudou e acrescenta o novo; o que não está no arquivo fica', async () => {
    await subir(manifesto([item('corrida'), item('outro', { quadro: 2 })]))
    const mudou = item('corrida', {
      conteudo: { ...item('corrida').conteudo, titulo: 'A corrida dos bichos' },
    })
    const { conferencia, aplicacao } = await subir(manifesto([mudou, item('novo', { quadro: 3 })]))
    expect(conferencia.itens.map((i) => [i.slug, i.acao])).toEqual([
      ['corrida', 'atualizar'],
      ['novo', 'criar'],
    ])
    expect(aplicacao.itens.every((i) => i.publicado)).toBe(true)
    const porSlug = new Map([...desafios.linhas.values()].map((d) => [d.metadados.slug, d]))
    expect(porSlug.get('corrida')?.situacao).toBe('publicado')
    expect(porSlug.get('corrida')?.alteradoDepoisDePublicar).toBe(false)
    expect(porSlug.get('outro')?.situacao).toBe('publicado')
    expect(porSlug.size).toBe(3)
  })

  test('publicar falso grava em rascunho; com problema na análise fica em rascunho e os outros seguem', async () => {
    analisar.mockImplementation(async (e: { objetivos: { label: string }[] }) =>
      e.objetivos[0]?.label === 'Quebrado'
        ? {
            ...analiseOk,
            problemas: [{ codigo: 'GABARITO_NAO_PASSA', mensagem: 'O gabarito não passa.' }],
          }
        : analiseOk,
    )
    const quebrado = item('quebrado', {
      quadro: 2,
      conteudo: {
        ...item('quebrado').conteudo,
        objetivos: [{ id: 'o1', label: 'Quebrado', rule: { type: 'usesBlock', block: 'x' } }],
      },
    })
    const { conferencia, aplicacao } = await subir(
      manifesto([item('rascunho', { publicar: false }), quebrado, item('bom', { quadro: 3 })]),
    )
    expect(conferencia.contagem).toMatchObject({ criar: 3, comProblema: 1, publica: 1 })
    expect(aplicacao.itens.map((i) => [i.slug, i.publicado, i.problemas.length])).toEqual([
      ['rascunho', false, 0],
      ['quebrado', false, 1],
      ['bom', true, 0],
    ])
    const situacoes = Object.fromEntries(
      [...desafios.linhas.values()].map((d) => [d.metadados.slug, d.situacao]),
    )
    expect(situacoes).toEqual({ rascunho: 'rascunho', quebrado: 'rascunho', bom: 'publicado' })
  })

  test('quadro de outro desafio e desafio arquivado são conflito e não gravam', async () => {
    await subir(manifesto([item('dono-do-quadro'), item('arquivar', { quadro: 2 })]))
    const arquivar = [...desafios.linhas.values()].find((d) => d.metadados.slug === 'arquivar')
    if (!arquivar) throw new Error('sem desafio')
    expect(
      (await chamar('POST', `/desafios/${arquivar.id}/arquivar`, { revisaoBase: arquivar.revisao }))
        .status,
    ).toBe(200)
    const { conferencia, aplicacao } = await subir(
      manifesto([item('intruso'), item('arquivar', { quadro: 4 })]),
    )
    expect(conferencia.itens.map((i) => [i.slug, i.acao, i.conflito?.codigo])).toEqual([
      ['intruso', 'conflito', 'QUADRO_OCUPADO'],
      ['arquivar', 'conflito', 'DESAFIO_ARQUIVADO'],
    ])
    expect(aplicacao.itens.every((i) => i.acao === 'conflito' && !i.publicado)).toBe(true)
    expect(desafios.linhas.size).toBe(2)
  })

  test('o quadro sai de um desafio e vai para outro no mesmo arquivo sem conflito', async () => {
    await subir(manifesto([item('a'), item('b', { quadro: 2 })]))
    const { conferencia } = await subir(
      manifesto([item('a', { quadro: 3 }), item('b', { quadro: 1 })]),
    )
    expect(conferencia.contagem.conflito).toBe(0)
  })

  test('em fila, quem libera o quadro grava antes, mesmo vindo depois no arquivo', async () => {
    await subir(manifesto([item('a'), item('b', { quadro: 2 })]))
    // "a" vai para o 2, que ainda é do "b"; o "b" vai para o 3, livre.
    const { conferencia, aplicacao } = await subir(
      manifesto([item('a', { quadro: 2 }), item('b', { quadro: 3 })]),
    )
    expect(conferencia.contagem.conflito).toBe(0)
    expect(aplicacao.itens.map((i) => [i.slug, i.acao, i.publicado])).toEqual([
      ['a', 'atualizar', true],
      ['b', 'atualizar', true],
    ])
    const quadros = Object.fromEntries(
      [...desafios.linhas.values()].map((d) => [d.metadados.slug, d.metadados.quadro]),
    )
    expect(quadros).toEqual({ a: 2, b: 3 })
  })

  test('troca em roda e quadro de quem não sai são conflito já na conferência', async () => {
    await subir(manifesto([item('a'), item('b', { quadro: 2 }), item('c', { quadro: 3 })]))
    const roda = await conferir(manifesto([item('a', { quadro: 2 }), item('b', { quadro: 1 })]))
    expect(roda.itens.map((i) => [i.slug, i.conflito?.codigo])).toEqual([
      ['a', 'TROCA_DE_QUADRO'],
      ['b', 'TROCA_DE_QUADRO'],
    ])
    // "b" quer o 3, que é do "c" (fora do arquivo): conflito. Então o 2 do "b" não fica livre
    // para o "a", que também vira conflito em vez de quebrar no meio do aplicar.
    const preso = await subir(manifesto([item('a', { quadro: 2 }), item('b', { quadro: 3 })]))
    expect(preso.conferencia.itens.map((i) => [i.slug, i.conflito?.codigo])).toEqual([
      ['a', 'QUADRO_OCUPADO'],
      ['b', 'QUADRO_OCUPADO'],
    ])
    expect(preso.conferencia.itens[0]?.conflito?.mensagem).toContain('"b"')
    expect(preso.aplicacao.itens.every((i) => i.acao === 'conflito')).toBe(true)
  })

  test('o quadro publicado segura o lugar até publicar de novo', async () => {
    await subir(manifesto([item('a'), item('b', { quadro: 2 })]))
    // "b" muda o rascunho para o 3 mas não publica: o 2 publicado continua dele.
    const semPublicar = await conferir(
      manifesto([item('a', { quadro: 2 }), item('b', { quadro: 3, publicar: false })]),
    )
    expect(semPublicar.itens.map((i) => [i.slug, i.acao, i.conflito?.codigo ?? null])).toEqual([
      ['a', 'conflito', 'QUADRO_OCUPADO'],
      ['b', 'atualizar', null],
    ])
    // Fora do arquivo vale o mesmo: o rascunho de "b" no 3, publicado no 2.
    await subir(manifesto([item('b', { quadro: 3, publicar: false })]))
    const novo = await subir(manifesto([item('c', { quadro: 2 })]))
    expect(novo.conferencia.itens[0]?.conflito?.codigo).toBe('QUADRO_OCUPADO')
    expect(novo.aplicacao.itens[0]?.acao).toBe('conflito')
    // Publicando o "b" pelo arquivo, o 2 fica livre para o "c" no mesmo arquivo.
    const junto = await subir(manifesto([item('c', { quadro: 2 }), item('b', { quadro: 3 })]))
    expect(junto.aplicacao.itens.map((i) => [i.slug, i.acao, i.publicado])).toEqual([
      ['c', 'criar', true],
      // O rascunho já estava no 3: nada a gravar, só publicar (é a publicação que solta o 2).
      ['b', 'igual', true],
    ])
  })

  test('mudou entre a prévia e o aplicar: 409 MANIFESTO_DESATUALIZADO e nada é gravado', async () => {
    await subir(manifesto([item('corrida')]))
    const m = manifesto([
      item('corrida', { conteudo: { ...item('corrida').conteudo, titulo: 'Versão do arquivo' } }),
    ])
    const c = await conferir(m)
    const d = [...desafios.linhas.values()][0]
    if (!d) throw new Error('sem desafio')
    const outra = await chamar('PUT', `/desafios/${d.id}`, {
      revisaoBase: d.revisao,
      metadados: d.metadados,
      conteudo: { ...item('corrida').conteudo, titulo: 'Versão de outra pessoa' },
    })
    expect(outra.status).toBe(200)
    const r = await chamar('POST', '/manifestos/aplicar', { manifesto: m, impressao: c.impressao })
    expect(r.status).toBe(409)
    expect(r.json).toMatchObject({ error: { code: 'MANIFESTO_DESATUALIZADO' } })
    const depois = [...desafios.linhas.values()][0]
    expect((depois?.conteudo as { titulo: string }).titulo).toBe('Versão de outra pessoa')
  })

  test('o arquivo confere sozinho: slug repetido, escopo de ilha misturado, quadro repetido', () => {
    const base = { formato: 'arquipelago-desafios', versao: 1 }
    expect(
      ManifestoDeDesafiosSchema.safeParse({
        ...base,
        desafios: [item('a'), item('a', { quadro: 2 })],
      }).success,
    ).toBe(false)
    expect(
      ManifestoDeDesafiosSchema.safeParse({
        ...base,
        escopo: 'ilha',
        desafios: [item('a'), item('b', { ilha: 'vila-doce', quadro: 2 })],
      }).success,
    ).toBe(false)
    expect(
      ManifestoDeDesafiosSchema.safeParse({ ...base, desafios: [item('a'), item('b')] }).success,
    ).toBe(false)
    expect(
      ManifestoDeDesafiosSchema.safeParse({
        ...base,
        escopo: 'desafio',
        desafios: [item('a'), item('b', { quadro: 2 })],
      }).success,
    ).toBe(false)
    expect(
      ManifestoDeDesafiosSchema.safeParse({ ...base, desafios: [item('a', { quadro: null })] })
        .success,
    ).toBe(false)
  })

  test('exportar a ilha, o jogo e um desafio volta o mesmo formato, que sobe de novo como igual', async () => {
    await subir(
      manifesto([
        item('corrida'),
        item('vila', { ilha: 'vila-doce' }),
        item('rascunho', { quadro: 2, publicar: false }),
      ]),
    )
    const ilha = await chamar(
      'GET',
      '/manifestos/exportar?publico=kids&ilha=bosque',
      undefined,
      'staff',
    )
    expect(ilha.status).toBe(200)
    const daIlha = ManifestoDeDesafiosSchema.parse(ilha.json)
    expect(daIlha.escopo).toBe('ilha')
    expect(daIlha.desafios.map((d) => [d.slug, d.publicar])).toEqual([
      ['corrida', true],
      ['rascunho', false],
    ])
    const jogo = ManifestoDeDesafiosSchema.parse(
      (await chamar('GET', '/manifestos/exportar', undefined, 'staff')).json,
    )
    expect(jogo.escopo).toBe('jogo')
    expect(jogo.desafios).toHaveLength(3)
    expect((await conferir(jogo)).contagem).toMatchObject({ igual: 3, criar: 0, atualizar: 0 })
    const um = [...desafios.linhas.values()][0]
    const r = await chamar('GET', `/desafios/${um?.id}/manifesto`, undefined, 'staff')
    expect(ManifestoDeDesafiosSchema.parse(r.json).escopo).toBe('desafio')
    expect((await chamar('GET', '/manifestos/exportar?ilha=pico', undefined, 'staff')).status).toBe(
      404,
    )
  })

  test('staff confere e exporta, mas só a administração aplica', async () => {
    const m = manifesto([item('corrida')])
    const c = await conferir(m, 'staff')
    const r = await chamar(
      'POST',
      '/manifestos/aplicar',
      { manifesto: m, impressao: c.impressao },
      'staff',
    )
    expect(r.status).toBe(403)
    expect(desafios.linhas.size).toBe(0)
  })

  test('exportação acima do limite recusa sem truncar nem entregar manifesto não importável', async () => {
    for (let n = 0; n < 201; n++) {
      const entrada = item(`pedido-${n}`, { tipo: 'pedido-de-morador', quadro: null })
      const { publicar: _, conteudo, ...metadados } = entrada
      await desafios.criar({
        id: `88888888-8888-4888-8888-${String(n).padStart(12, '0')}`,
        metadados,
        conteudo,
        agora: AGORA,
        por: ADMIN,
      })
    }
    const r = await chamar('GET', '/manifestos/exportar', undefined, 'staff')
    expect(r.status).toBe(422)
    expect(r.json).toMatchObject({ error: { code: 'MANIFESTO_EXCEDE_LIMITE' } })
    expect(desafios.linhas.size).toBe(201)
    const um = await chamar(
      'GET',
      '/desafios/88888888-8888-4888-8888-000000000000/manifesto',
      undefined,
      'staff',
    )
    expect(um.status).toBe(200)
    expect(ManifestoDeDesafiosSchema.parse(um.json).desafios).toHaveLength(1)
  })
})
