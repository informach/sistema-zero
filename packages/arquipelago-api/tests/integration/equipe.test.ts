import { beforeEach, describe, expect, mock, test } from 'bun:test'
import {
  AnaliseDoDesafioSchema,
  type AnaliseDosMembros,
  type CriarDesafio,
  type CurriculoDeBlocos,
  DesafioDaEquipeSchema,
  POSTOS_DA_JORNADA,
  ProblemasDePublicacaoSchema,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import type { PortaDosMembros } from '../../src/domain/membros.port'
import { CORPO_DA_EQUIPE, createServer } from '../../src/interfaces/http/server'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'
import { membrosDeMentira } from '../fakes/membros'
import { RepositorioEmMemoria } from '../fakes/memoria'

const TOKEN = 'token-interno-de-teste'
const ADMIN = '66666666-6666-4666-8666-666666666666'
const AGORA = new Date('2026-10-27T15:00:00Z')
const CURSO = '77777777-7777-4777-8777-777777777777'

const projeto = { files: { 'index.html': '', 'style.css': '', 'script.js': '' } }
const pedido = (over: Partial<CriarDesafio['metadados']> = {}): CriarDesafio => ({
  metadados: {
    slug: 'borboleta',
    publico: 'kids',
    ilha: 'bosque',
    tipo: 'quadro-das-cores',
    quadro: 1,
    ordem: 0,
    ...over,
  },
  conteudo: {
    versao: 1,
    titulo: 'A borboleta que voa',
    enunciado: 'Faça a borboleta voar até a flor.',
    dicas: [],
    projetoInicial: projeto,
    gabarito: projeto,
    objetivos: [{ id: 'o1', label: 'Chega na flor', rule: { type: 'usesBlock', block: 'x' } }],
    recompensa: { cor: true, moedas: 20, moedasExtra: 10 },
    blocosManuais: { acrescentar: ['sz_js_repeat'], retirar: ['mover_esq'] },
  },
})

const curriculo: CurriculoDeBlocos = {
  versao: 1,
  cursos: [
    {
      courseId: CURSO,
      titulo: 'Movimentos',
      slug: 'movimentos',
      posto: 'coder',
      papel: 'base2d',
      blocos: ['mover_dir', 'sz_js_repeat'],
    },
  ],
  catalogo: [
    { type: 'mover_dir', rotulo: 'Mover para a direita', categoria: 'Jogo 2D' },
    { type: 'sz_js_repeat', rotulo: 'Repetir vezes', categoria: 'Programação' },
  ],
}
const analiseOk: AnaliseDosMembros = {
  blocosDoGabarito: ['mover_dir'],
  blocosDesconhecidos: [],
  vista: [{ id: 'o1', label: 'Chega na flor', kind: 'game' }],
  problemas: [],
  gabarito: [{ id: 'o1', passou: true }],
  inicial: [{ id: 'o1', passou: false }],
}

let desafios: DesafiosEmMemoria
let membros: PortaDosMembros | null
let analisar: ReturnType<typeof mock>
let app: ReturnType<typeof createServer>

function montar() {
  const politica = {
    modo: 'aberto' as const,
    publicos: new Set(['kids' as const]),
    lista: new Set<string>(),
  }
  const leituras = new LeiturasDosMembros(membros)
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
      () => '88888888-8888-4888-8888-888888888888',
    ),
    desafios: desafiosDesligados(politica),
    cliente: { dir: '/nao-existe', servirMapas: false },
    tokenInterno: TOKEN,
    readiness: async () => {},
  })
}

beforeEach(() => {
  desafios = new DesafiosEmMemoria()
  analisar = mock(async () => analiseOk)
  membros = membrosDeMentira({
    analisarObjetivos: analisar as unknown as PortaDosMembros['analisarObjetivos'],
    lerCurriculo: async () => curriculo,
    lerJornada: async () => ({
      kids: { versao: 1, postos: [...POSTOS_DA_JORNADA] },
      adulto: { versao: 0, configurada: false, etapas: [] },
    }),
  })
  montar()
})

const equipe = (papel = 'admin', extra: Record<string, string> = {}) => ({
  'x-internal-token': TOKEN,
  'x-auth-user-id': ADMIN,
  'x-auth-user-role': papel,
  'x-auth-user-status': 'active',
  ...extra,
})

async function chamar(
  metodo: string,
  caminho: string,
  headers: Record<string, string>,
  corpo?: unknown,
) {
  const r = await app.handle(
    new Request(`http://local/arquipelago/admin${caminho}`, {
      method: metodo,
      headers: corpo === undefined ? headers : { ...headers, 'content-type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),
  )
  return { status: r.status, json: (await r.json().catch(() => null)) as Record<string, unknown> }
}

describe('barreiras da seção Jogo', () => {
  test('aluno, responsável e perfil da equipe não entram; staff lê mas não escreve', async () => {
    const aluno = equipe('member', { 'x-auth-account-id': ADMIN, 'x-auth-kids-context': 'student' })
    expect((await chamar('GET', '/desafios', aluno)).status).toBe(403)
    expect((await chamar('GET', '/desafios', equipe('member'))).status).toBe(403)
    const perfilDaEquipe = equipe('admin', { 'x-auth-account-id': ADMIN })
    expect((await chamar('GET', '/desafios', perfilDaEquipe)).status).toBe(403)
    expect((await chamar('GET', '/desafios', equipe('staff'))).status).toBe(200)
    expect((await chamar('POST', '/desafios', equipe('staff'), pedido())).status).toBe(403)
    const suporte = equipe('admin', { 'x-auth-impersonator-id': ADMIN })
    expect((await chamar('POST', '/desafios', suporte, pedido())).status).toBe(403)
    const { 'x-internal-token': _, ...semToken } = equipe()
    expect((await chamar('GET', '/desafios', semToken)).status).toBe(401)
  })
})

describe('cadastro', () => {
  test('cria rascunho, lista, lê e grava por revisão (a velha recebe 409 com o atual)', async () => {
    const criado = await chamar('POST', '/desafios', equipe(), pedido())
    expect(criado.status).toBe(201)
    const d = DesafioDaEquipeSchema.parse(criado.json)
    expect(d.resumo).toMatchObject({
      situacao: 'rascunho',
      revisao: 1,
      alteradoDepoisDePublicar: false,
    })
    const lista = await chamar('GET', '/desafios?publico=kids&ilha=bosque', equipe('staff'))
    expect((lista.json.desafios as unknown[]).length).toBe(1)
    const gravar = {
      revisaoBase: 1,
      metadados: d.metadados,
      conteudo: { ...d.conteudo, titulo: 'Novo' },
    }
    const gravado = await chamar('PUT', `/desafios/${d.resumo.id}`, equipe(), gravar)
    expect(gravado.status).toBe(200)
    expect(DesafioDaEquipeSchema.parse(gravado.json).resumo.revisao).toBe(2)
    const velho = await chamar('PUT', `/desafios/${d.resumo.id}`, equipe(), gravar)
    expect(velho.status).toBe(409)
    expect(velho.json).toMatchObject({ error: { code: 'DESAFIO_DESATUALIZADO' } })
    expect(DesafioDaEquipeSchema.parse(velho.json.atual).conteudo.titulo).toBe('Novo')
  })

  test('corpo inválido é 400; id que não é uuid é 400; desafio que não existe é 404', async () => {
    expect((await chamar('POST', '/desafios', equipe(), { metadados: {} })).status).toBe(400)
    expect((await chamar('GET', '/desafios/nao-e-uuid', equipe())).status).toBe(400)
    expect(
      (await chamar('GET', '/desafios/99999999-9999-4999-8999-999999999999', equipe())).status,
    ).toBe(404)
  })
})

describe('análise e publicação', () => {
  async function criar() {
    const r = await chamar('POST', '/desafios', equipe(), pedido())
    return DesafioDaEquipeSchema.parse(r.json)
  }

  test('retirar manualmente um bloco derivado não esconde sua cobertura nem permite publicar', async () => {
    analisar.mockImplementation(async () => ({
      ...analiseOk,
      blocosDoGabarito: ['mover_dir', 'mover_esq'],
    }))
    const d = await criar()
    const previa = await chamar('POST', `/desafios/${d.resumo.id}/analisar`, equipe(), {
      revisaoBase: 1,
    })
    const analise = AnaliseDoDesafioSchema.parse(previa.json)
    expect(analise.blocosExigidos).toContain('mover_esq')
    expect(analise.problemas.map((p) => p.codigo)).toContain('BLOCO_DERIVADO_RETIRADO')
    const r = await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), {
      revisaoBase: 1,
    })
    expect(r.status).toBe(422)
    expect(desafios.linhas.get(d.resumo.id)?.situacao).toBe('rascunho')
  })

  test('uma resposta antiga do Members com desconhecidos também impede publicar', async () => {
    analisar.mockImplementation(async () => ({
      ...analiseOk,
      blocosDoGabarito: [],
      blocosDesconhecidos: ['bloco_fantasma'],
      problemas: [],
    }))
    const d = await criar()
    const r = await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), {
      revisaoBase: 1,
    })
    expect(r.status).toBe(422)
    expect(ProblemasDePublicacaoSchema.parse(r.json).problemas.map((p) => p.codigo)).toContain(
      'BLOCO_DESCONHECIDO',
    )
    expect(desafios.linhas.get(d.resumo.id)?.situacao).toBe('rascunho')
  })

  test('retirar um acréscimo manual antigo continua válido quando ele não é derivado', async () => {
    const entrada = pedido()
    entrada.conteudo.blocosManuais = {
      acrescentar: ['sz_js_repeat', 'requisito_antigo'],
      retirar: ['requisito_antigo'],
    }
    const criado = await chamar('POST', '/desafios', equipe(), entrada)
    const d = DesafioDaEquipeSchema.parse(criado.json)
    const r = await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), {
      revisaoBase: 1,
    })
    expect(r.status).toBe(200)
    expect(desafios.linhas.get(d.resumo.id)?.blocosPublicados).toEqual([
      'mover_dir',
      'sz_js_repeat',
    ])
  })

  test('o problema de bloco desconhecido do Members não é duplicado pela API', async () => {
    analisar.mockImplementation(async () => ({
      ...analiseOk,
      blocosDesconhecidos: ['bloco_fantasma'],
      problemas: [{ codigo: 'BLOCO_DESCONHECIDO', mensagem: 'O bloco não existe.' }],
    }))
    const d = await criar()
    const r = await chamar('POST', `/desafios/${d.resumo.id}/analisar`, equipe(), {
      revisaoBase: 1,
    })
    const analise = AnaliseDoDesafioSchema.parse(r.json)
    expect(analise.problemas.filter((p) => p.codigo === 'BLOCO_DESCONHECIDO')).toHaveLength(1)
  })

  test('cobertura sem curso impede publicar mesmo com gabarito correto', async () => {
    membros = membrosDeMentira({
      analisarObjetivos: async () => analiseOk,
      lerCurriculo: async () => ({ ...curriculo, cursos: [] }),
    })
    montar()
    const d = await criar()
    const previa = await chamar('POST', `/desafios/${d.resumo.id}/analisar`, equipe(), {
      revisaoBase: 1,
    })
    expect(
      AnaliseDoDesafioSchema.parse(previa.json).problemas.some(
        (p) => p.codigo === 'BLOCO_SEM_CURSO',
      ),
    ).toBe(true)
    const r = await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), {
      revisaoBase: 1,
    })
    expect(r.status).toBe(422)
    expect(desafios.linhas.get(d.resumo.id)?.situacao).toBe('rascunho')
  })

  test('reativar confere a cobertura da publicação anterior sem confiar no rascunho', async () => {
    const d = await criar()
    await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), { revisaoBase: 1 })
    await chamar('POST', `/desafios/${d.resumo.id}/arquivar`, equipe(), { revisaoBase: 1 })
    membros = membrosDeMentira({
      analisarObjetivos: async () => analiseOk,
      lerCurriculo: async () => ({ ...curriculo, cursos: [] }),
    })
    montar()
    const r = await chamar('POST', `/desafios/${d.resumo.id}/reativar`, equipe(), {
      revisaoBase: 2,
    })
    expect(r.status).toBe(422)
    expect(desafios.linhas.get(d.resumo.id)?.situacao).toBe('arquivado')
  })

  test('reativar recusa lista histórica que omite um requisito agora derivado, mesmo com curso', async () => {
    analisar.mockImplementation(async () => ({ ...analiseOk, blocosDoGabarito: [] }))
    const d = await criar()
    await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), { revisaoBase: 1 })
    await chamar('POST', `/desafios/${d.resumo.id}/arquivar`, equipe(), { revisaoBase: 1 })
    analisar.mockImplementation(async () => analiseOk)
    const r = await chamar('POST', `/desafios/${d.resumo.id}/reativar`, equipe(), {
      revisaoBase: 2,
    })
    expect(r.status).toBe(422)
    expect(ProblemasDePublicacaoSchema.parse(r.json).problemas.map((p) => p.codigo)).toContain(
      'PUBLICACAO_REQUER_NOVOS_REQUISITOS',
    )
    expect(desafios.linhas.get(d.resumo.id)?.situacao).toBe('arquivado')
    expect(desafios.linhas.get(d.resumo.id)?.blocosPublicados).toEqual(['sz_js_repeat'])
  })

  test('reativar não contorna um gabarito que a análise atual recusa', async () => {
    const d = await criar()
    await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), { revisaoBase: 1 })
    await chamar('POST', `/desafios/${d.resumo.id}/arquivar`, equipe(), { revisaoBase: 1 })
    analisar.mockImplementation(async () => ({
      ...analiseOk,
      problemas: [{ codigo: 'GABARITO_NAO_PASSA', mensagem: 'O gabarito não passa.' }],
    }))
    const r = await chamar('POST', `/desafios/${d.resumo.id}/reativar`, equipe(), {
      revisaoBase: 2,
    })
    expect(r.status).toBe(422)
    expect(ProblemasDePublicacaoSchema.parse(r.json).problemas.map((p) => p.codigo)).toContain(
      'GABARITO_NAO_PASSA',
    )
    expect(desafios.linhas.get(d.resumo.id)?.situacao).toBe('arquivado')
  })

  test('quadro não exige Poder específico; desafio opcional pode usá-lo', async () => {
    membros = membrosDeMentira({
      analisarObjetivos: async () => analiseOk,
      lerCurriculo: async () => ({
        ...curriculo,
        cursos: curriculo.cursos.map((c) => ({ ...c, papel: 'power' })),
      }),
    })
    montar()
    const d = await criar()
    const recusado = await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), {
      revisaoBase: 1,
    })
    expect(recusado.status).toBe(422)
    expect(ProblemasDePublicacaoSchema.parse(recusado.json).problemas[0]?.codigo).toBe(
      'QUADRO_DEPENDE_DE_OPCIONAL',
    )
    const g = await chamar('PUT', `/desafios/${d.resumo.id}`, equipe(), {
      revisaoBase: 1,
      metadados: { ...d.metadados, tipo: 'desafio-do-dia', quadro: null },
      conteudo: { ...d.conteudo, recompensa: { ...d.conteudo.recompensa, cor: false } },
    })
    expect(g.status).toBe(200)
    expect(
      (await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), { revisaoBase: 2 }))
        .status,
    ).toBe(200)
  })

  test.each([
    'ausente',
    'ilegível',
  ] as const)('publicação %s não reativa nem chama o executor', async (caso) => {
    const d = await criar()
    await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), { revisaoBase: 1 })
    await chamar('POST', `/desafios/${d.resumo.id}/arquivar`, equipe(), { revisaoBase: 1 })
    if (caso === 'ausente') desafios.publicacoes.delete(d.resumo.id)
    else {
      const copia = desafios.publicacoes.get(d.resumo.id)?.[0]
      if (!copia) throw new Error('Publicação de teste ausente')
      copia.conteudo = { versao: 999 }
    }
    analisar.mockClear()
    const r = await chamar('POST', `/desafios/${d.resumo.id}/reativar`, equipe(), {
      revisaoBase: 2,
    })
    expect(r.status).toBe(422)
    expect(ProblemasDePublicacaoSchema.parse(r.json).problemas[0]?.codigo).toBe(
      'PUBLICACAO_INVALIDA',
    )
    expect(analisar).not.toHaveBeenCalled()
    expect(desafios.linhas.get(d.resumo.id)?.situacao).toBe('arquivado')
  })

  test('sem Members a publicação permanece arquivada', async () => {
    const d = await criar()
    await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), { revisaoBase: 1 })
    await chamar('POST', `/desafios/${d.resumo.id}/arquivar`, equipe(), { revisaoBase: 1 })
    membros = null
    montar()
    const r = await chamar('POST', `/desafios/${d.resumo.id}/reativar`, equipe(), {
      revisaoBase: 2,
    })
    expect(r.status).toBe(424)
    expect(desafios.linhas.get(d.resumo.id)?.situacao).toBe('arquivado')
  })

  test('edição durante a análise impede reativar e preserva o rascunho novo', async () => {
    const d = await criar()
    await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), { revisaoBase: 1 })
    await chamar('POST', `/desafios/${d.resumo.id}/arquivar`, equipe(), { revisaoBase: 1 })
    analisar.mockImplementation(async () => {
      const gravado = await desafios.gravar({
        id: d.resumo.id,
        revisaoBase: 2,
        metadados: d.metadados,
        conteudo: { ...d.conteudo, titulo: 'Revisão de outra pessoa' },
        por: ADMIN,
        agora: AGORA,
      })
      expect(gravado.ok).toBe(true)
      return analiseOk
    })
    const r = await chamar('POST', `/desafios/${d.resumo.id}/reativar`, equipe(), {
      revisaoBase: 2,
    })
    expect(r.status).toBe(409)
    expect(DesafioDaEquipeSchema.parse(r.json.atual)).toMatchObject({
      resumo: { situacao: 'arquivado', revisao: 3 },
      conteudo: { titulo: 'Revisão de outra pessoa' },
    })
  })

  test('reativação usa público, ilha e blocos congelados, não uma alteração do rascunho', async () => {
    const d = await criar()
    await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), { revisaoBase: 1 })
    await chamar('POST', `/desafios/${d.resumo.id}/arquivar`, equipe(), { revisaoBase: 1 })
    await chamar('PUT', `/desafios/${d.resumo.id}`, equipe(), {
      revisaoBase: 2,
      metadados: { ...d.metadados, publico: 'adulto', ilha: 'sua-ilha' },
      conteudo: {
        ...d.conteudo,
        gabarito: { files: { 'script.js': 'rascunho diferente' } },
        projetoInicial: { files: { 'script.js': 'outro inicial' } },
        blocosManuais: { acrescentar: ['futuro'], retirar: [] },
      },
    })
    const publicos: string[] = []
    membros = membrosDeMentira({
      analisarObjetivos: async (entrada) => {
        expect(entrada).toEqual({
          audience: 'kids',
          projetoInicial: d.conteudo.projetoInicial,
          gabarito: d.conteudo.gabarito,
          objetivos: d.conteudo.objetivos,
        })
        return analiseOk
      },
      lerCurriculo: async (publico) => {
        publicos.push(publico)
        return curriculo
      },
    })
    montar()
    const r = await chamar('POST', `/desafios/${d.resumo.id}/reativar`, equipe(), {
      revisaoBase: 3,
    })
    expect(r.status).toBe(200)
    expect(publicos).toEqual(['kids'])
    expect(desafios.linhas.get(d.resumo.id)?.blocosPublicados).toEqual([
      'mover_dir',
      'sz_js_repeat',
    ])
  })

  test('arquivar e reativar rascunho sem publicação não exigem Members', async () => {
    const d = await criar()
    membros = null
    montar()
    expect(
      (await chamar('POST', `/desafios/${d.resumo.id}/arquivar`, equipe(), { revisaoBase: 1 }))
        .status,
    ).toBe(200)
    expect(
      (await chamar('POST', `/desafios/${d.resumo.id}/reativar`, equipe(), { revisaoBase: 2 }))
        .status,
    ).toBe(200)
    expect(desafios.linhas.get(d.resumo.id)?.situacao).toBe('rascunho')
  })

  test('analisa: preserva os derivados e os acréscimos, com a cobertura de cada um', async () => {
    const d = await criar()
    const r = await chamar('POST', `/desafios/${d.resumo.id}/analisar`, equipe('staff'), {
      revisaoBase: 1,
    })
    expect(r.status).toBe(200)
    expect(r.json.blocosExigidos).toEqual(['mover_dir', 'sz_js_repeat'])
    expect(r.json.problemas).toEqual([])
    expect(analisar).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'kids', objetivos: d.conteudo.objetivos }),
    )
  })

  test('publica congelando os blocos; mudar depois marca "alterado depois de publicar"', async () => {
    const d = await criar()
    const pub = await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), {
      revisaoBase: 1,
    })
    expect(pub.status).toBe(200)
    const publicado = DesafioDaEquipeSchema.parse(pub.json)
    expect(publicado.resumo).toMatchObject({ situacao: 'publicado', revisaoPublicada: 1 })
    expect(publicado.blocosPublicados).toEqual(['mover_dir', 'sz_js_repeat'])
    const g = await chamar('PUT', `/desafios/${d.resumo.id}`, equipe(), {
      revisaoBase: 1,
      metadados: d.metadados,
      conteudo: d.conteudo,
    })
    expect(DesafioDaEquipeSchema.parse(g.json).resumo.alteradoDepoisDePublicar).toBe(false)
    const edited = await chamar('PUT', `/desafios/${d.resumo.id}`, equipe(), {
      revisaoBase: 2,
      metadados: d.metadados,
      conteudo: { ...d.conteudo, titulo: 'Título revisado' },
    })
    expect(DesafioDaEquipeSchema.parse(edited.json).resumo.alteradoDepoisDePublicar).toBe(true)
  })

  test('com problema na análise, publicar é 422 com a lista e nada muda', async () => {
    analisar.mockImplementation(async () => ({
      ...analiseOk,
      problemas: [
        { codigo: 'GABARITO_NAO_PASSA', mensagem: 'O gabarito não passa', objetivoId: 'o1' },
      ],
    }))
    const d = await criar()
    const r = await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), {
      revisaoBase: 1,
    })
    expect(r.status).toBe(422)
    expect(r.json).toMatchObject({
      error: { code: 'DESAFIO_COM_PROBLEMAS' },
      problemas: [{ codigo: 'GABARITO_NAO_PASSA' }],
    })
    expect(desafios.linhas.get(d.resumo.id)?.situacao).toBe('rascunho')
  })

  test('publicar uma revisão velha é 409; sem Members é 424', async () => {
    const d = await criar()
    expect(
      (await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), { revisaoBase: 9 }))
        .status,
    ).toBe(409)
    membros = null
    montar()
    expect(
      (await chamar('POST', `/desafios/${d.resumo.id}/analisar`, equipe(), { revisaoBase: 1 }))
        .status,
    ).toBe(424)
  })

  test('arquivar libera o quadro; reativar volta a publicado só se o quadro estiver livre', async () => {
    const d = await criar()
    await chamar('POST', `/desafios/${d.resumo.id}/publicar`, equipe(), { revisaoBase: 1 })
    const arq = await chamar('POST', `/desafios/${d.resumo.id}/arquivar`, equipe(), {
      revisaoBase: 1,
    })
    expect(DesafioDaEquipeSchema.parse(arq.json).resumo.situacao).toBe('arquivado')
    // Outro desafio ocupa o quadro 1 enquanto o primeiro está arquivado.
    desafios.linhas.set('outro', {
      ...structuredClone(desafios.linhas.get(d.resumo.id)!),
      id: 'outro',
      situacao: 'rascunho',
      metadados: { ...d.metadados, slug: 'outro' },
    })
    const re = await chamar('POST', `/desafios/${d.resumo.id}/reativar`, equipe(), {
      revisaoBase: 2,
    })
    expect(re.status).toBe(409)
    expect(re.json).toMatchObject({ error: { code: 'QUADRO_OCUPADO' } })
    desafios.linhas.delete('outro')
    const ok = await chamar('POST', `/desafios/${d.resumo.id}/reativar`, equipe(), {
      revisaoBase: 2,
    })
    expect(DesafioDaEquipeSchema.parse(ok.json).resumo.situacao).toBe('publicado')
  })
})

describe('cobertura e corpo', () => {
  test('cobertura: cartões com os cursos que ensinam e o mapa das ilhas', async () => {
    const r = await chamar('GET', '/cobertura?publico=kids', equipe('staff'))
    expect(r.status).toBe(200)
    const cartas = r.json.cartas as { id: string; cursos: unknown[]; avisos: string[] }[]
    expect(cartas.find((c) => c.id === 'repetir')?.cursos).toHaveLength(1)
    expect(cartas.find((c) => c.id === 'se')?.avisos).toContain('sem-curso')
    expect(cartas.find((c) => c.id === 'regar')?.avisos).toEqual([])
    expect((r.json.mapa as { situacao: string }).situacao).toBe('pendente')
  })

  test('o Admin aceita corpo grande (dois projetos) e o jogo continua com o teto pequeno', async () => {
    const grande = 'x'.repeat(200 * 1024)
    const corpo = pedido()
    corpo.conteudo.projetoInicial = {
      files: { 'index.html': grande, 'style.css': '', 'script.js': '' },
    }
    expect((await chamar('POST', '/desafios', equipe(), corpo)).status).toBe(201)
    const r = await app.handle(
      new Request('http://local/arquipelago/salvamento', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'content-length': String(200 * 1024) },
        body: grande,
      }),
    )
    expect(r.status).toBe(413)
    expect(CORPO_DA_EQUIPE).toBeGreaterThan(3 * 1024 * 1024)
  })
})

describe('conflitos do cadastro', () => {
  test('slug repetido e quadro ocupado são recusados com o código certo', async () => {
    const outro = () =>
      new ServicoDaEquipe(
        desafios,
        membros,
        new LeiturasDosMembros(membros),
        new ConferenciaDoMapa(membros, createLogger({ level: 'error' })),
        () => AGORA,
        () => crypto.randomUUID(),
      )
    const s = outro()
    const admin = { id: ADMIN, podeEscrever: true, podeRevisar: true }
    await s.criar(admin, pedido())
    await expect(s.criar(admin, pedido({ quadro: 2 }))).rejects.toMatchObject({
      motivo: 'slug-em-uso',
    })
    await expect(s.criar(admin, pedido({ slug: 'outra' }))).rejects.toMatchObject({
      motivo: 'quadro-ocupado',
    })
    expect((await s.criar(admin, pedido({ slug: 'outra', quadro: 2 }))).resumo.situacao).toBe(
      'rascunho',
    )
  })
})
