import { beforeEach, describe, expect, mock, test } from 'bun:test'
import {
  type ConteudoDoDesafio,
  CoresConquistadasSchema,
  type CurriculoDeBlocos,
  DesafioAbertoSchema,
  DesafiosDoJogadorSchema,
  type MetadadosDoDesafio,
  ResultadoDaVerificacaoSchema,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import {
  type ModoDosDesafios,
  ServicoDosDesafios,
} from '../../src/application/servico-dos-desafios'
import type { PoliticaDeAcesso } from '../../src/domain/acesso'
import { chaveDasMoedas } from '../../src/domain/desafios'
import {
  AmbienteRecusadoError,
  ConferenciaIndisponivelError,
  MembrosIndisponiveisError,
  type PortaDosMembros,
} from '../../src/domain/membros.port'
import { MoedasIndisponiveisError, type PortaDasMoedas } from '../../src/domain/moedas.port'
import { CORPO_DA_CONFERENCIA, createServer } from '../../src/interfaces/http/server'
import { DesafiosEmMemoria, JogadorNosDesafiosEmMemoria } from '../fakes/desafios'
import { membrosDeMentira } from '../fakes/membros'
import { RepositorioEmMemoria } from '../fakes/memoria'

const TOKEN = 'token-interno-de-teste'
const PERFIL = '11111111-1111-4111-8111-111111111111'
const CONTA = '22222222-2222-4222-8222-222222222222'
const ADULTO = '44444444-4444-4444-8444-444444444444'
const EQUIPE = '66666666-6666-4666-8666-666666666666'
const CURSO = '55555555-5555-4555-8555-555555555555'
const AGORA = new Date('2026-10-27T15:00:00Z')
const BORBOLETA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const PONTE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const FAROL = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

const projeto = { files: { 'index.html': '', 'style.css': '', 'script.js': '' } }
const conteudo = (titulo: string, over: Partial<ConteudoDoDesafio> = {}): ConteudoDoDesafio => ({
  versao: 1,
  titulo,
  enunciado: 'Faça a borboleta voar até a flor.',
  dicas: ['Comece pelo bloco de repetir.'],
  projetoInicial: projeto,
  gabarito: { segredo: 'gabarito-nunca-vai-ao-navegador' },
  objetivos: [
    { id: 'o1', label: 'Chega na flor', rule: { type: 'segredo-da-regra' } },
    { id: 'o2', label: 'Pousa devagar', optional: true, rule: { type: 'outra-regra' } },
  ],
  desafioExtra: { titulo: 'Voo bonito', texto: 'Faça a borboleta pousar devagar.' },
  recompensa: { cor: true, moedas: 20, moedasExtra: 10 },
  blocosManuais: { acrescentar: [], retirar: [] },
  ...over,
})
const metadados = (over: Partial<MetadadosDoDesafio>): MetadadosDoDesafio => ({
  slug: 'borboleta',
  publico: 'kids',
  ilha: 'bosque',
  tipo: 'quadro-das-cores',
  quadro: 1,
  ordem: 0,
  ...over,
})
const vista = [
  { id: 'o1', label: 'Chega na flor', kind: 'game' as const },
  { id: 'o2', label: 'Pousa devagar', kind: 'game' as const, optional: true as const },
]

const CURRICULO: CurriculoDeBlocos = {
  versao: 1,
  cursos: [
    {
      courseId: CURSO,
      titulo: 'Repetições',
      slug: 'repeticoes',
      posto: 'coder',
      papel: 'base2d',
      blocos: ['sz_js_repeat'],
    },
  ],
  catalogo: [{ type: 'sz_js_repeat', rotulo: 'Repetir vezes', categoria: 'Programação' }],
}

let repo: JogadorNosDesafiosEmMemoria
let agora: Date
let politica: PoliticaDeAcesso
let modo: ModoDosDesafios
let blocos: string[]
let curriculo: CurriculoDeBlocos
let cursosBase: string[]
let posicao: number
let verificar: ReturnType<typeof mock>
let creditar: ReturnType<typeof mock>
let membros: PortaDosMembros | null
let moedas: PortaDasMoedas | null
let app: ReturnType<typeof createServer>

function publicar(
  id: string,
  m: MetadadosDoDesafio,
  c: ConteudoDoDesafio,
  blocosExigidos: string[],
  revisao = 1,
) {
  const atual = repo.desafios.get(id)
  const publicacao = { desafioId: id, revisao, conteudo: c, blocosExigidos, vista }
  repo.desafios.set(id, {
    id,
    metadados: m,
    situacao: 'publicado',
    publicacoes: [...(atual?.publicacoes ?? []), publicacao],
  })
}

function montar() {
  const logger = createLogger({ level: 'error' })
  const leituras = new LeiturasDosMembros(membros)
  app = createServer({
    logger,
    servico: new ServicoDoJogo(new RepositorioEmMemoria(), politica, () => AGORA),
    cartas: new ServicoDasCartas(politica, leituras),
    equipe: new ServicoDaEquipe(
      new DesafiosEmMemoria(),
      membros,
      leituras,
      new ConferenciaDoMapa(membros, logger),
      () => AGORA,
    ),
    desafios: new ServicoDosDesafios({
      politica,
      modo,
      repo,
      leituras,
      membros,
      moedas,
      logger,
      agora: () => agora,
    }),
    cliente: { dir: '/nao-existe', servirMapas: false },
    tokenInterno: TOKEN,
    readiness: async () => {},
  })
}

beforeEach(() => {
  repo = new JogadorNosDesafiosEmMemoria()
  agora = AGORA
  politica = { modo: 'aberto', publicos: new Set(['kids', 'adulto']), lista: new Set() }
  modo = 'aberto'
  blocos = ['sz_js_repeat']
  posicao = 2
  curriculo = CURRICULO
  cursosBase = []
  verificar = mock(async () => ({
    passou: true,
    resultados: [
      { id: 'o1', passou: true },
      { id: 'o2', passou: false },
    ],
  }))
  creditar = mock(async () => ({ situacao: 'creditado' as const }))
  membros = membrosDeMentira({
    lerJogador: async () => ({ posicao, total: 8, blocos, cursosBase }),
    lerCurriculo: async () => curriculo,
    verificarObjetivos: verificar as unknown as PortaDosMembros['verificarObjetivos'],
  })
  moedas = { creditar: creditar as unknown as PortaDasMoedas['creditar'] }
  // Bosque (posto coder = posição 2) e Farol (a Lenda, posição 8).
  publicar(BORBOLETA, metadados({}), conteudo('A borboleta que voa'), ['sz_js_repeat'])
  publicar(
    PONTE,
    metadados({ slug: 'ponte', tipo: 'desafio-do-dia', quadro: null, ordem: 1 }),
    conteudo('A ponte'),
    ['sz_js_while'],
  )
  publicar(
    FAROL,
    metadados({ slug: 'farol', ilha: 'farol', quadro: 1 }),
    conteudo('A luz do farol'),
    [],
  )
  montar()
})

const crianca = (extra: Record<string, string> = {}) => ({
  'x-internal-token': TOKEN,
  'x-auth-user-id': PERFIL,
  'x-auth-account-id': CONTA,
  'x-auth-kids-context': 'student',
  'x-auth-user-role': 'member',
  'x-auth-user-status': 'active',
  ...extra,
})
const adulto = {
  'x-internal-token': TOKEN,
  'x-auth-user-id': ADULTO,
  'x-auth-user-role': 'member',
  'x-auth-user-status': 'active',
}
const daEquipe = {
  'x-internal-token': TOKEN,
  'x-auth-user-id': EQUIPE,
  'x-auth-account-id': CONTA,
  'x-auth-kids-context': 'student',
  'x-auth-user-role': 'staff',
  'x-auth-user-status': 'active',
}

async function chamar(
  metodo: string,
  caminho: string,
  headers: Record<string, string>,
  corpo?: unknown,
) {
  const r = await app.handle(
    new Request(`http://local/arquipelago/desafios${caminho}`, {
      method: metodo,
      headers: corpo === undefined ? headers : { ...headers, 'content-type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),
  )
  return { status: r.status, corpo: (await r.json()) as Record<string, unknown> }
}

const conferir = (id = BORBOLETA, revisao = 1, headers = crianca()) =>
  chamar('POST', `/${id}/verificar`, headers, { revisao, projeto })

describe('cores conquistadas', () => {
  test('suporte lê a cor sem gravar conclusão nem recompensa', async () => {
    await conferir()
    const antes = structuredClone([...repo.concluidos.entries()])
    creditar.mockClear()
    const r = await chamar('GET', '/cores', crianca({ 'x-auth-impersonator-id': EQUIPE }))
    expect(r.status).toBe(200)
    expect(
      CoresConquistadasSchema.parse(r.corpo).ilhas.find((i) => i.id === 'bosque')?.quadros,
    ).toEqual([1])
    expect([...repo.concluidos.entries()]).toEqual(antes)
    expect(creditar).not.toHaveBeenCalled()
  })
  test('arquivar e mover o cadastro preserva a posição ganha, mesmo com catálogo e Members desligados', async () => {
    expect((await conferir()).status).toBe(200)
    const d = repo.desafios.get(BORBOLETA)!
    d.situacao = 'arquivado'
    d.metadados = { ...d.metadados, ilha: 'vila-doce', quadro: 5 }
    modo = 'desligado'
    membros = null
    montar()
    creditar.mockClear()
    const antes = [...repo.concluidos.entries()]
    const r = await chamar('GET', '/cores', crianca())
    expect(r.status).toBe(200)
    const cores = CoresConquistadasSchema.parse(r.corpo)
    expect(cores.ilhas.find((i) => i.id === 'bosque')?.quadros).toEqual([1])
    expect(cores.ilhas.find((i) => i.id === 'vila-doce')?.quadros).toEqual([])
    expect([...repo.concluidos.entries()]).toEqual(antes)
    expect(creditar).not.toHaveBeenCalled()
    expect((await chamar('GET', '', crianca())).status).toBe(403)
  })

  test('não revela conquista de outra pessoa ou de outro público', async () => {
    await conferir()
    for (const h of [
      adulto,
      crianca({ 'x-auth-user-id': ADULTO }),
      { ...adulto, 'x-auth-user-id': PERFIL },
    ]) {
      const r = await chamar('GET', '/cores', h)
      expect(r.status).toBe(200)
      expect(
        CoresConquistadasSchema.parse(r.corpo).ilhas.every((i) => i.quadros.length === 0),
      ).toBe(true)
    }
  })

  test('sem acesso ao jogo não lê cores; rota não oferece escrita', async () => {
    expect(
      (await chamar('GET', '/cores', crianca({ 'x-internal-token': 'invalido' }))).status,
    ).toBe(401)
    politica.modo = 'desligado'
    montar()
    expect((await chamar('GET', '/cores', crianca())).status).toBe(403)
    expect((await chamar('POST', '/cores', crianca(), {})).status).not.toBe(200)
    expect(repo.concluidos.size).toBe(0)
  })
})

describe('liga e desliga', () => {
  test('desligado: 403 DESAFIOS_DESLIGADOS, inclusive para a equipe', async () => {
    modo = 'desligado'
    montar()
    for (const h of [crianca(), daEquipe]) {
      const r = await chamar('GET', '', h)
      expect(r.status).toBe(403)
      expect((r.corpo.error as { code: string }).code).toBe('DESAFIOS_DESLIGADOS')
    }
  })

  test('só a equipe: criança recebe 403 e a equipe joga', async () => {
    modo = 'equipe'
    montar()
    expect((await chamar('GET', '', crianca())).status).toBe(403)
    expect((await chamar('GET', '', daEquipe)).status).toBe(200)
  })

  test('jogo fora da lista vence o modo dos desafios (403 ACESSO_BLOQUEADO)', async () => {
    politica = { modo: 'lista', publicos: new Set(['kids']), lista: new Set() }
    montar()
    const r = await chamar('GET', '', crianca())
    expect(r.status).toBe(403)
    expect((r.corpo.error as { code: string }).code).toBe('ACESSO_BLOQUEADO')
  })

  test('sem Members: 424 PLATAFORMA_INDISPONIVEL', async () => {
    membros = null
    montar()
    expect((await chamar('GET', '', crianca())).status).toBe(424)
  })
})

describe('lista da ilha', () => {
  test('situação de cada desafio, "Aprenda isso em" e a cor das ilhas', async () => {
    const r = await chamar('GET', '', crianca())
    expect(r.status).toBe(200)
    const lista = DesafiosDoJogadorSchema.parse(r.corpo)
    const por = new Map(lista.desafios.map((d) => [d.id, d]))
    expect(por.get(BORBOLETA)?.situacao).toBe('disponivel')
    expect(por.get(PONTE)?.situacao).toBe('faltam-blocos')
    expect(por.get(PONTE)?.faltam).toEqual([{ bloco: 'sz_js_while', rotulo: null, cursos: [] }])
    expect(por.get(FAROL)?.situacao).toBe('ilha-fechada')
    expect(lista.ilhas.find((i) => i.id === 'bosque')).toEqual({
      id: 'bosque',
      aberta: true,
      quadro: { feitos: 0, total: 6 },
    })
    expect(lista.ilhas.find((i) => i.id === 'farol')?.aberta).toBe(false)
  })

  test('filtro por ilha e o público certo (adulto não vê desafio do Kids)', async () => {
    const r = DesafiosDoJogadorSchema.parse((await chamar('GET', '?ilha=farol', crianca())).corpo)
    expect(r.desafios.map((d) => d.id)).toEqual([FAROL])
    expect((await chamar('GET', '?ilha=lugar-nenhum', crianca())).status).toBe(400)
    const doAdulto = DesafiosDoJogadorSchema.parse((await chamar('GET', '', adulto)).corpo)
    expect(doAdulto.desafios).toEqual([])
  })

  test('o "Aprenda isso em" traz o curso que libera o bloco que falta', async () => {
    blocos = []
    montar()
    const r = DesafiosDoJogadorSchema.parse((await chamar('GET', '', crianca())).corpo)
    expect(r.desafios.find((d) => d.id === BORBOLETA)?.faltam).toEqual([
      {
        bloco: 'sz_js_repeat',
        rotulo: 'Repetir vezes',
        cursos: [{ courseId: CURSO, titulo: 'Repetições', slug: 'repeticoes', posto: 'coder' }],
      },
    ])
  })

  test('o cartão do Quadro: a linha "o que se faz" e a miniatura chegam à lista e à abertura', async () => {
    const imagem = 'data:image/webp;base64,AAAA'
    publicar(
      BORBOLETA,
      metadados({}),
      conteudo('A borboleta que voa', { resumo: 'Leve a borboleta até a flor.', imagem }),
      ['sz_js_repeat'],
    )
    const r = DesafiosDoJogadorSchema.parse((await chamar('GET', '', crianca())).corpo)
    const borboleta = r.desafios.find((d) => d.id === BORBOLETA)
    expect(borboleta?.resumo).toBe('Leve a borboleta até a flor.')
    expect(borboleta?.imagem).toBe(imagem)
    // Sem a linha escrita, a primeira frase do enunciado.
    expect(r.desafios.find((d) => d.id === PONTE)?.resumo).toBe('Faça a borboleta voar até a flor.')
    const aberto = DesafioAbertoSchema.parse(
      (await chamar('GET', `/${BORBOLETA}`, crianca())).corpo,
    )
    expect(aberto.imagem).toBe(imagem)
  })

  test('A24: o "Aprenda isso em" vem também no desafio disponível', async () => {
    const r = DesafiosDoJogadorSchema.parse((await chamar('GET', '', crianca())).corpo)
    const borboleta = r.desafios.find((d) => d.id === BORBOLETA)
    expect(borboleta?.situacao).toBe('disponivel')
    expect(borboleta?.aprenda).toEqual([
      { courseId: CURSO, titulo: 'Repetições', slug: 'repeticoes', posto: 'coder' },
    ])
  })

  test('A3: a linguagem do posto espera o curso-base do posto, e o mostra', async () => {
    const PYTHON = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
    publicar(
      PYTHON,
      metadados({ slug: 'python', quadro: 6 }),
      conteudo('Em Python', { projetoInicial: { ...projeto, programmingLanguage: 'python' } }),
      [],
    )
    curriculo = {
      ...curriculo,
      cursosBase: [{ posto: 'coder', courseId: CURSO, titulo: 'Curso-base', slug: 'base' }],
    }
    montar()
    const sem = DesafiosDoJogadorSchema.parse((await chamar('GET', '', crianca())).corpo)
    const trancado = sem.desafios.find((d) => d.id === PYTHON)
    expect(trancado?.situacao).toBe('falta-curso')
    expect(trancado?.aprenda?.map((c) => c.titulo)).toEqual(['Curso-base'])
    expect((await chamar('GET', `/${PYTHON}`, crianca())).corpo.situacao).toBe('falta-curso')
    // O desafio em blocos da mesma ilha não muda.
    expect(sem.desafios.find((d) => d.id === BORBOLETA)?.situacao).toBe('disponivel')
    cursosBase = ['coder']
    montar()
    const com = DesafiosDoJogadorSchema.parse((await chamar('GET', '', crianca())).corpo)
    expect(com.desafios.find((d) => d.id === PYTHON)?.situacao).toBe('disponivel')
  })

  test('equipe vê todas as ilhas abertas e todos os blocos', async () => {
    const r = DesafiosDoJogadorSchema.parse((await chamar('GET', '', daEquipe)).corpo)
    expect(r.desafios.every((d) => d.situacao === 'disponivel')).toBe(true)
    expect(r.ilhas.every((i) => i.aberta)).toBe(true)
  })

  test('nada da regra nem do gabarito vai na lista', async () => {
    const texto = JSON.stringify((await chamar('GET', '', crianca())).corpo)
    expect(texto).not.toContain('gabarito-nunca-vai-ao-navegador')
    expect(texto).not.toContain('segredo-da-regra')
  })
})

describe('abrir', () => {
  test('disponível: o que o Estúdio de desafio precisa, sem gabarito e sem regra', async () => {
    const r = await chamar('GET', `/${BORBOLETA}`, crianca())
    expect(r.status).toBe(200)
    const aberto = DesafioAbertoSchema.parse(r.corpo)
    expect(aberto.objetivos).toEqual(vista)
    expect(aberto.projetoInicial).toEqual(projeto)
    expect(aberto.concluido).toBe(false)
    expect(JSON.stringify(r.corpo)).not.toContain('gabarito-nunca-vai-ao-navegador')
    expect(JSON.stringify(r.corpo)).not.toContain('segredo-da-regra')
  })

  test('faltam blocos ou ilha fechada: 403 DESAFIO_BLOQUEADO com a situação', async () => {
    const ponte = await chamar('GET', `/${PONTE}`, crianca())
    expect(ponte.status).toBe(403)
    expect(ponte.corpo.situacao).toBe('faltam-blocos')
    const farol = await chamar('GET', `/${FAROL}`, crianca())
    expect(farol.corpo.situacao).toBe('ilha-fechada')
  })

  test('desconhecido, de outro público ou arquivado: 404', async () => {
    expect((await chamar('GET', `/${BORBOLETA}`, adulto)).status).toBe(404)
    const d = repo.desafios.get(BORBOLETA)
    if (d) d.situacao = 'arquivado'
    expect((await chamar('GET', `/${BORBOLETA}`, crianca())).status).toBe(404)
    expect((await chamar('GET', '/nao-e-uuid', crianca())).status).toBe(400)
  })

  test('feito continua feito: concluído abre mesmo depois de perder os blocos', async () => {
    await conferir()
    blocos = []
    montar()
    const aberto = DesafioAbertoSchema.parse(
      (await chamar('GET', `/${BORBOLETA}`, crianca())).corpo,
    )
    expect(aberto.concluido).toBe(true)
    expect(aberto.ultimosResultados).toEqual([
      { id: 'o1', passou: true },
      { id: 'o2', passou: false },
    ])
    const lista = DesafiosDoJogadorSchema.parse((await chamar('GET', '', crianca())).corpo)
    expect(lista.desafios.find((d) => d.id === BORBOLETA)?.situacao).toBe('concluido')
  })

  test('resultados de outra revisão não voltam ao abrir', async () => {
    await conferir()
    publicar(BORBOLETA, metadados({}), conteudo('A borboleta que voa'), ['sz_js_repeat'], 2)
    const aberto = DesafioAbertoSchema.parse(
      (await chamar('GET', `/${BORBOLETA}`, crianca())).corpo,
    )
    expect(aberto.revisao).toBe(2)
    expect(aberto.ultimosResultados).toEqual([])
  })
})

describe('conferir', () => {
  test('passou: conclui uma vez só, paga as moedas com a chave única e pinta o quadro', async () => {
    const r = await conferir()
    expect(r.status).toBe(200)
    expect(ResultadoDaVerificacaoSchema.parse(r.corpo)).toEqual({
      passou: true,
      resultados: [
        { id: 'o1', passou: true },
        { id: 'o2', passou: false },
      ],
      concluidoAgora: true,
      extraAgora: false,
    })
    expect(verificar).toHaveBeenCalledTimes(1)
    const pedido = verificar.mock.calls[0]?.[0] as Record<string, unknown>
    expect(pedido.requester).toBe(PERFIL)
    expect(pedido.audience).toBe('kids')
    expect(pedido.projeto).toEqual(projeto)
    expect(creditar).toHaveBeenCalledTimes(1)
    expect(creditar.mock.calls[0]?.[0]).toEqual({
      userId: PERFIL,
      accountId: CONTA,
      audience: 'kids',
      key: chaveDasMoedas(PERFIL, BORBOLETA, 'principal'),
      amount: 20,
    })
    expect(repo.concluidos.get(`${PERFIL}:${BORBOLETA}`)?.moedasSituacao).toBe('creditado')

    const denovo = await conferir()
    expect(denovo.corpo.concluidoAgora).toBe(false)
    expect(creditar).toHaveBeenCalledTimes(1)
    const lista = DesafiosDoJogadorSchema.parse((await chamar('GET', '', crianca())).corpo)
    expect(lista.ilhas.find((i) => i.id === 'bosque')?.quadro.feitos).toBe(1)
  })

  test('o extra paga uma vez, com o principal passando junto', async () => {
    await conferir()
    verificar.mockImplementation(async () => ({
      passou: true,
      resultados: [
        { id: 'o1', passou: true },
        { id: 'o2', passou: true },
      ],
    }))
    const r = await conferir()
    expect(r.corpo).toMatchObject({ passou: true, concluidoAgora: false, extraAgora: true })
    expect(creditar).toHaveBeenCalledTimes(2)
    expect(creditar.mock.calls[1]?.[0]).toMatchObject({
      key: chaveDasMoedas(PERFIL, BORBOLETA, 'extra'),
      amount: 10,
    })
    expect((await conferir()).corpo.extraAgora).toBe(false)
    expect(creditar).toHaveBeenCalledTimes(2)
  })

  test('não passou: guarda a tentativa e não conclui', async () => {
    verificar.mockImplementation(async () => ({
      passou: false,
      resultados: [
        { id: 'o1', passou: false },
        { id: 'o2', passou: true },
      ],
    }))
    const r = await conferir()
    expect(r.corpo).toMatchObject({ passou: false, concluidoAgora: false, extraAgora: false })
    expect(repo.concluidos.size).toBe(0)
    expect(repo.progressos.get(`${PERFIL}:${BORBOLETA}`)?.revisao).toBe(1)
    expect(creditar).not.toHaveBeenCalled()
  })

  test('A26: a conclusão guarda as tentativas e as dicas abertas até ela', async () => {
    verificar.mockImplementationOnce(async () => ({
      passou: false,
      resultados: [
        { id: 'o1', passou: false },
        { id: 'o2', passou: false },
      ],
    }))
    const caminho = `/${BORBOLETA}/verificar`
    expect(
      (await chamar('POST', caminho, crianca(), { revisao: 1, projeto, dicas: 1 })).status,
    ).toBe(200)
    expect((await chamar('POST', caminho, crianca(), { revisao: 1, projeto })).status).toBe(200)
    expect(repo.medidasDaConclusao.get(`${PERFIL}:${BORBOLETA}`)).toEqual({
      tentativas: 2,
      dicas: 1,
    })
    // Dicas além do teto do desafio: pedido recusado, nada guardado.
    expect(
      (await chamar('POST', caminho, crianca(), { revisao: 1, projeto, dicas: 99 })).status,
    ).toBe(400)
  })

  test('teto semanal: o prêmio espera e chega na semana seguinte', async () => {
    creditar.mockImplementation(async () => ({ situacao: 'teto' as const }))
    await conferir()
    const feito = () => repo.concluidos.get(`${PERFIL}:${BORBOLETA}`)
    expect(feito()?.moedasSituacao).toBe('teto')
    // 27/10/2026 é uma terça: a semana começa na segunda, 26/10.
    expect(feito()?.moedasTetoSemana).toBe('2026-10-26')
    // Na mesma semana (até domingo à noite em São Paulo) não insiste.
    agora = new Date('2026-11-02T02:59:00Z')
    await chamar('GET', '', crianca())
    expect(creditar).toHaveBeenCalledTimes(1)
    // Segunda-feira em São Paulo: cobra de novo com a MESMA chave.
    agora = new Date('2026-11-02T03:01:00Z')
    creditar.mockImplementation(async () => ({ situacao: 'creditado' as const }))
    await chamar('GET', '', crianca())
    expect(creditar).toHaveBeenCalledTimes(2)
    expect(creditar.mock.calls[1]?.[0]).toMatchObject({
      key: chaveDasMoedas(PERFIL, BORBOLETA, 'principal'),
    })
    expect(feito()?.moedasSituacao).toBe('creditado')
    expect(feito()?.moedasTetoSemana).toBeNull()
  })

  test('teto cheio para os outros prêmios da mesma ida', async () => {
    creditar.mockImplementation(async () => ({ situacao: 'teto' as const }))
    verificar.mockImplementation(async () => ({
      passou: true,
      resultados: [
        { id: 'o1', passou: true },
        { id: 'o2', passou: true },
      ],
    }))
    const r = await conferir()
    expect(r.corpo).toMatchObject({ concluidoAgora: true, extraAgora: true })
    expect(creditar).toHaveBeenCalledTimes(1)
    expect(repo.concluidos.get(`${PERFIL}:${BORBOLETA}`)?.moedasExtraSituacao).toBe('pendente')
  })

  test('porta de moedas fora: prêmio pendente, cobrado de novo na lista', async () => {
    creditar.mockImplementation(async () => {
      throw new MoedasIndisponiveisError()
    })
    const r = await conferir()
    expect(r.corpo.concluidoAgora).toBe(true)
    expect(repo.concluidos.get(`${PERFIL}:${BORBOLETA}`)?.moedasSituacao).toBe('pendente')
    creditar.mockImplementation(async () => ({ situacao: 'creditado' as const }))
    await chamar('GET', '', crianca())
    expect(creditar).toHaveBeenCalledTimes(2)
    expect(creditar.mock.calls[1]?.[0]).toMatchObject({
      key: chaveDasMoedas(PERFIL, BORBOLETA, 'principal'),
    })
    expect(repo.concluidos.get(`${PERFIL}:${BORBOLETA}`)?.moedasSituacao).toBe('creditado')
  })

  test('sem porta de moedas: conclui e o prêmio espera pendente', async () => {
    moedas = null
    montar()
    expect((await conferir()).corpo.concluidoAgora).toBe(true)
    expect(repo.concluidos.get(`${PERFIL}:${BORBOLETA}`)?.moedasSituacao).toBe('pendente')
  })

  test('recusa definitiva do Members vai ao log e o prêmio continua pendente', async () => {
    creditar.mockImplementation(async () => ({ situacao: 'recusado' as const, codigo: 'X' }))
    await conferir()
    expect(repo.concluidos.get(`${PERFIL}:${BORBOLETA}`)?.moedasSituacao).toBe('pendente')
  })

  test('prêmio zero não chama a porta de moedas', async () => {
    publicar(
      BORBOLETA,
      metadados({}),
      conteudo('A borboleta que voa', {
        recompensa: { cor: true, moedas: 0, moedasExtra: 0 },
      }),
      ['sz_js_repeat'],
      2,
    )
    await conferir(BORBOLETA, 2)
    expect(creditar).not.toHaveBeenCalled()
    expect(repo.concluidos.get(`${PERFIL}:${BORBOLETA}`)?.moedasSituacao).toBe('nenhuma')
  })

  test('suporte confere sem gravar e sem prêmio', async () => {
    const r = await conferir(BORBOLETA, 1, crianca({ 'x-auth-impersonator-id': EQUIPE }))
    expect(r.corpo).toMatchObject({ passou: true, concluidoAgora: false })
    expect(repo.concluidos.size).toBe(0)
    expect(repo.progressos.size).toBe(0)
    expect(creditar).not.toHaveBeenCalled()
  })

  test('revisão antiga continua conferível; arquivado ou revisão inexistente: 409/404', async () => {
    publicar(BORBOLETA, metadados({}), conteudo('A borboleta que voa'), ['sz_js_repeat'], 2)
    expect((await conferir(BORBOLETA, 1)).status).toBe(200)
    expect((await conferir(BORBOLETA, 7)).status).toBe(404)
    const d = repo.desafios.get(BORBOLETA)
    if (d) d.situacao = 'arquivado'
    const r = await conferir(BORBOLETA, 2)
    expect(r.status).toBe(409)
    expect((r.corpo.error as { code: string }).code).toBe('DESAFIO_MUDOU')
  })

  test('bloqueado não confere (e não gasta o executor)', async () => {
    expect((await conferir(PONTE)).status).toBe(403)
    expect(verificar).not.toHaveBeenCalled()
  })

  test('executor fora, cheio ou Members fora: nada é guardado', async () => {
    const casos: [Error, number, string][] = [
      [new ConferenciaIndisponivelError('indisponivel'), 424, 'CONFERENCIA_INDISPONIVEL'],
      [new ConferenciaIndisponivelError('ocupado'), 429, 'CONFERENCIA_OCUPADA'],
      [new ConferenciaIndisponivelError('recusado'), 400, 'PROJETO_RECUSADO'],
      [new MembrosIndisponiveisError('rede'), 424, 'PLATAFORMA_INDISPONIVEL'],
    ]
    for (const [erro, status, codigo] of casos) {
      verificar.mockImplementation(async () => {
        throw erro
      })
      const r = await conferir()
      expect(r.status).toBe(status)
      expect((r.corpo.error as { code: string }).code).toBe(codigo)
    }
    expect(repo.progressos.size).toBe(0)
    expect(repo.concluidos.size).toBe(0)
  })

  test('corpo: projeto grande passa até o teto da conferência; o resto do jogo segue pequeno', async () => {
    const grande = 'x'.repeat(500_000)
    const r = await chamar('POST', `/${BORBOLETA}/verificar`, crianca(), {
      revisao: 1,
      projeto: { files: { 'script.js': grande } },
    })
    expect(r.status).toBe(200)
    const demais = await app.handle(
      new Request(`http://local/arquipelago/desafios/${BORBOLETA}/verificar`, {
        method: 'POST',
        headers: {
          ...crianca(),
          'content-type': 'application/json',
          'content-length': String(CORPO_DA_CONFERENCIA + 1),
        },
        body: '{}',
      }),
    )
    expect(demais.status).toBe(413)
    const salvamento = await app.handle(
      new Request('http://local/arquipelago/salvamento', {
        method: 'PUT',
        headers: {
          ...crianca(),
          'content-type': 'application/json',
          'content-length': String(500_000),
        },
        body: '{}',
      }),
    )
    expect(salvamento.status).toBe(413)
  })
})

describe('ambiente Python do Estúdio de desafio (C02b)', () => {
  const pedido = { operation: 'analyze', context: { kind: 'arquipelago' } }
  const pedirAmbiente = (id = BORBOLETA, revisao = 1, headers = crianca()) =>
    chamar('POST', `/${id}/ambiente`, headers, { revisao, pedido })
  let autorizar: ReturnType<typeof mock>
  beforeEach(() => {
    autorizar = mock(async () => ({ version: 1, decisao: 'do-members' }))
    membros = membrosDeMentira({
      lerJogador: async () => ({ posicao, total: 8, blocos }),
      lerCurriculo: async () => curriculo,
      autorizarAmbiente: autorizar as unknown as PortaDosMembros['autorizarAmbiente'],
    })
    montar()
  })

  test('repassa ao Members quem joga, o público, o inicial da revisão e o pedido do Estúdio', async () => {
    const r = await pedirAmbiente()
    expect(r.status).toBe(200)
    expect(r.corpo).toEqual({ version: 1, decisao: 'do-members' })
    expect(autorizar).toHaveBeenCalledWith({
      requester: PERFIL,
      accountId: CONTA,
      audience: 'kids',
      projetoInicial: projeto,
      pedido,
    })
  })

  test('bloqueado, revisão inexistente ou arquivado: não pede ao Members', async () => {
    expect((await pedirAmbiente(PONTE)).status).toBe(403)
    expect((await pedirAmbiente(BORBOLETA, 7)).status).toBe(404)
    const d = repo.desafios.get(BORBOLETA)
    if (d) d.situacao = 'arquivado'
    expect((await pedirAmbiente()).status).toBe(409)
    expect(autorizar).not.toHaveBeenCalled()
    expect((await chamar('POST', `/${FAROL}/ambiente`, crianca(), { revisao: 1 })).status).toBe(400)
  })

  test('recusa do Members vira 403 com a frase dele; Members fora, 424', async () => {
    autorizar.mockImplementation(async () => {
      throw new AmbienteRecusadoError('O projeto aberto não é do ambiente deste desafio.')
    })
    const recusado = await pedirAmbiente()
    expect(recusado.status).toBe(403)
    expect(recusado.corpo.error).toMatchObject({
      code: 'AMBIENTE_RECUSADO',
      message: 'O projeto aberto não é do ambiente deste desafio.',
    })
    autorizar.mockImplementation(async () => {
      throw new MembrosIndisponiveisError('rede')
    })
    expect((await pedirAmbiente()).status).toBe(424)
  })
})

describe('recompensa vista', () => {
  test('marca uma vez; suporte não marca', async () => {
    await conferir()
    await chamar(
      'POST',
      `/${BORBOLETA}/recompensa-vista`,
      crianca({ 'x-auth-impersonator-id': EQUIPE }),
    )
    expect(repo.concluidos.get(`${PERFIL}:${BORBOLETA}`)?.recompensaVistaEm).toBeNull()
    expect((await chamar('POST', `/${BORBOLETA}/recompensa-vista`, crianca())).status).toBe(200)
    const lista = DesafiosDoJogadorSchema.parse((await chamar('GET', '', crianca())).corpo)
    expect(lista.desafios.find((d) => d.id === BORBOLETA)?.recompensaVista).toBe(true)
  })

  test('sem o token do gateway: 401', async () => {
    const r = await chamar('GET', '', { ...crianca(), 'x-internal-token': 'outro' })
    expect(r.status).toBe(401)
  })
})

describe('desafio do dia', () => {
  const RIO = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  const doDia = async (headers = crianca(), filtro = '') =>
    DesafiosDoJogadorSchema.parse((await chamar('GET', filtro, headers)).corpo).doDia
  // AGORA = 27/10/2026 ao meio-dia em São Paulo: dia par (a ilha mais nova).
  const amanha = () => {
    agora = new Date(AGORA.getTime() + 86_400_000)
    montar()
  }

  test('sem desafio do dia ao alcance (faltam blocos): null, e nada fica guardado', async () => {
    expect(await doDia()).toBeNull()
    expect(repo.doDia.size).toBe(0)
  })

  test('escolhe na primeira leitura e fica fixo no dia, mesmo com outro publicado', async () => {
    blocos = ['sz_js_repeat', 'sz_js_while']
    montar()
    expect(await doDia()).toEqual({ id: PONTE, dia: '2026-10-27', feito: false })
    publicar(
      RIO,
      metadados({ slug: 'rio', tipo: 'desafio-do-dia', quadro: null, ordem: 0 }),
      conteudo('O rio', { recompensa: { cor: false, moedas: 10, moedasExtra: 5 } }),
      [],
    )
    expect((await doDia())?.id).toBe(PONTE)
    amanha()
    expect((await doDia())?.id).toBe(RIO)
  })

  test('feito hoje: "Amanhã tem outro"; vem junto no filtro de outra ilha', async () => {
    blocos = ['sz_js_repeat', 'sz_js_while']
    montar()
    await doDia()
    expect((await conferir(PONTE)).corpo.concluidoAgora).toBe(true)
    expect(await doDia()).toEqual({ id: PONTE, dia: '2026-10-27', feito: true })
    const farol = DesafiosDoJogadorSchema.parse(
      (await chamar('GET', '?ilha=farol', crianca())).corpo,
    )
    expect(farol.desafios.map((d) => d.id).sort()).toEqual([FAROL, PONTE].sort())
    expect(farol.doDia?.feito).toBe(true)
  })

  test('todos feitos: o banco recomeça e refazer não paga de novo', async () => {
    blocos = ['sz_js_repeat', 'sz_js_while']
    montar()
    await doDia()
    await conferir(PONTE)
    expect(creditar).toHaveBeenCalledTimes(1)
    amanha()
    expect(await doDia()).toEqual({ id: PONTE, dia: '2026-10-28', feito: false })
    expect((await conferir(PONTE)).corpo.concluidoAgora).toBe(false)
    expect(await doDia()).toEqual({ id: PONTE, dia: '2026-10-28', feito: true })
    expect(creditar).toHaveBeenCalledTimes(1)
  })

  test('passar num desafio que não é o do dia não marca o dia', async () => {
    blocos = ['sz_js_repeat', 'sz_js_while']
    montar()
    await doDia()
    await conferir(BORBOLETA)
    expect((await doDia())?.feito).toBe(false)
  })

  test('arquivado no meio do dia: some até amanhã', async () => {
    blocos = ['sz_js_repeat', 'sz_js_while']
    montar()
    await doDia()
    const ponte = repo.desafios.get(PONTE)
    if (ponte) repo.desafios.set(PONTE, { ...ponte, situacao: 'arquivado' })
    expect(await doDia()).toBeNull()
  })

  test('suporte vê a escolha sem guardar nada', async () => {
    blocos = ['sz_js_repeat', 'sz_js_while']
    montar()
    const suporte = crianca({ 'x-auth-impersonator-id': EQUIPE })
    expect(await doDia(suporte)).toEqual({ id: PONTE, dia: '2026-10-27', feito: false })
    expect(repo.doDia.size).toBe(0)
  })
})
