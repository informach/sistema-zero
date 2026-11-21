import { describe, expect, test } from 'bun:test'
import { digestDoDocumentoDeCenario } from '@sistemazero/molda-cenarios-core/compilar'
import {
  type ComandoDeCenario,
  capturarFragmento,
  conteudoDoCenarioDeConjunto,
  criarDocumentoVazio,
  type InstanciaDeCenario,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  CenariosService,
  type ModeloParaRegistrar,
} from '../../src/application/cenarios/cenarios.service'
import {
  type AberturaDosCenarios,
  type Ator,
  chaveDoBlob,
  type Espaco,
  LIMITES_DOS_CENARIOS,
  type ModoDosCenarios,
  podeNoMundo,
} from '../../src/domain/cenarios/cenarios'
import {
  BibliotecaRestritaError,
  CenarioArquivoAusenteError,
  CenarioDesatualizadoError,
  CenarioFerramentaTrancadaError,
  CenarioInvalidoError,
  CenarioNaoEncontradoError,
  CenariosFechadosError,
  CenariosSemEspacoError,
} from '../../src/domain/cenarios/cenarios.errors'
import { CenariosEmMemoria } from '../fakes/cenarios-in-memory'

const CONTA = '11111111-1111-4111-8111-111111111111'
const OUTRA = '22222222-2222-4222-8222-222222222222'
const ana: Ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
const cliente: Ator = { usuarioId: OUTRA, contaId: OUTRA, equipe: false, suporte: false }
const digest = (letra: string) => letra.repeat(64)
const AGORA = new Date('2026-11-16T12:00:00Z')

function montar(
  modo: ModoDosCenarios = 'equipe',
  lista: string[] = [],
  produto: AberturaDosCenarios['produto'] = async () => true,
  faixas: AberturaDosCenarios['faixas'] = async () => ['basic', 'intermediate', 'professional'],
) {
  const repo = new CenariosEmMemoria()
  const abertura: AberturaDosCenarios = { modo, lista: new Set(lista), produto, faixas }
  let n = 0
  const servico = new CenariosService(
    repo,
    () => AGORA,
    abertura,
    () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  )
  return { repo, servico }
}
test('biblioteca do Molda é idempotente por perfil, pertence à conta e não se confunde pelo nome', async () => {
  const { servico } = montar('aberto')
  const [espaco, equipe] = await servico.espacos(ana)
  await servico.criarBiblioteca(ana, espaco!.id, { nome: 'Meus moldes', licenca: 'propria' })
  const a = await servico.bibliotecaDoMolda(ana, espaco!.id)
  expect((await servico.bibliotecaDoMolda(ana, espaco!.id)).id).toBe(a.id)
  const irma = { ...ana, usuarioId: OUTRA }
  const b = await servico.bibliotecaDoMolda(irma, espaco!.id)
  expect(b.id).not.toBe(a.id)
  expect(a.fonte).toBe(`molda:${ana.usuarioId}`)
  expect(b.fonte).toBe(`molda:${irma.usuarioId}`)
  await expect(servico.bibliotecaDoMolda(cliente, espaco!.id)).rejects.toBeInstanceOf(
    CenarioNaoEncontradoError,
  )
  await expect(servico.bibliotecaDoMolda(ana, equipe!.id)).rejects.toThrow('espaço da conta')
})
test('licença restrita é só do acervo da equipe: numa conta, criar ou trocar para ela é recusado', async () => {
  const { servico } = montar('aberto')
  const [conta, equipe] = await servico.espacos(ana)
  await expect(
    servico.criarBiblioteca(ana, conta!.id, { nome: 'Pacote', licenca: 'restrita' }),
  ).rejects.toThrow(/restrita/)
  const propria = await servico.criarBiblioteca(ana, conta!.id, {
    nome: 'Pacote',
    licenca: 'propria',
  })
  await expect(servico.editarBiblioteca(ana, propria.id, { licenca: 'restrita' })).rejects.toThrow(
    /restrita/,
  )
  expect(
    (await servico.criarBiblioteca(ana, equipe!.id, { nome: 'Acervo', licenca: 'restrita' }))
      .licenca,
  ).toBe('restrita')
})
async function comBiblioteca(ator: Ator = ana, modo: ModoDosCenarios = 'equipe') {
  const base = montar(modo)
  const [espaco] = await base.servico.espacos(ator)
  const biblioteca = await base.servico.criarBiblioteca(ator, espaco!.id, {
    nome: 'Aventura',
    licenca: 'propria',
  })
  return { ...base, espaco: espaco!, biblioteca }
}
const arvore: ModeloParaRegistrar = {
  nome: 'Árvore',
  pasta: 'natureza',
  etiquetas: ['verde'],
  digest: digest('a'),
  triangulos: 120,
  min: [-1, 0, -1],
  max: [1, 3, 1],
  miniatura: digest('b'),
}
async function trazerArvore(base: Awaited<ReturnType<typeof comBiblioteca>>, ator: Ator = ana) {
  await base.servico.reservarModelos(ator, base.biblioteca.id, [
    { digest: digest('a'), bytes: 1000, miniatura: { digest: digest('b'), bytes: 50 } },
  ])
  return base.servico.registrarModelos(
    ator,
    base.biblioteca.id,
    [arvore],
    [
      { digest: digest('a'), bytes: 1000, tipoDoConteudo: 'model/gltf-binary' },
      { digest: digest('b'), bytes: 50, tipoDoConteudo: 'image/webp' },
    ],
  )
}
const objeto = (id: string, modelo: string): InstanciaDeCenario => ({
  id,
  nome: id,
  grupo: null,
  bloqueado: false,
  oculto: false,
  modelo,
  transformacao: {
    posicao: { x: 0, y: 0, z: 0 },
    rotacao: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },
  apoio: { tipo: 'terreno', deslocamento: 0, inclinar: false },
  colisao: 'caixa',
})

test('double conserva rascunho persistente, revisão publicada e histórico da mesma oficina', async () => {
  const { repo, servico, biblioteca, espaco } = await comBiblioteca()
  const original = criarDocumentoVazio('original', 'Jardim')
  original.formas = [
    { id: 'caixa', nome: 'Caixa', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 },
  ]
  original.instancias = [objeto('flor', 'caixa')]
  const conteudo = capturarFragmento(original, ['flor'], espaco.id)
  const conjunto = (await repo.criarConjunto(
    {
      id: 'conjunto',
      bibliotecaId: biblioteca.id,
      operacaoId: 'criar',
      nome: 'Jardim',
      pasta: '',
      etiquetas: [],
      conteudo,
      autorId: CONTA,
    },
    10,
    AGORA,
  ))!
  const fonte = (await repo.prepararEdicaoDeConjunto(conjunto.id, CONTA, AGORA))!
  expect(await repo.prepararEdicaoDeConjunto(conjunto.id, CONTA, AGORA)).toEqual(fonte)
  expect(await servico.mundos(ana, espaco.id)).toEqual([])
  const c = await servico.abrirCenario(ana, fonte.cenarioId)
  const d = structuredClone(c.documento)
  d.instancias[0]!.transformacao.posicao.x += 4
  await servico.editarCenario(ana, c.id, {
    revisaoEsperada: 0,
    operacaoId: 'mover',
    comandos: [{ tipo: 'cenario.restaurar', documento: d }],
  })
  const pedido = {
    id: conjunto.id,
    revisaoEsperada: 1,
    operacaoId: 'publicar',
    conteudo,
    autorId: CONTA,
  }
  await expect(repo.publicarConjunto(pedido, 1000, AGORA)).rejects.toBeInstanceOf(
    CenarioInvalidoError,
  )
  const publicado = (await repo.publicarConjunto(
    {
      ...pedido,
      conteudo: conteudoDoCenarioDeConjunto(d, espaco.id),
      rascunho: { cenarioId: c.id, revisao: 1 },
    },
    1000,
    AGORA,
  ))!
  expect(publicado.conjunto.revisao).toBe(2)
  expect(publicado.conjunto.revisaoPublicadaDoCenario).toBe(1)
  await servico.moverHistorico(ana, c.id, {
    acao: 'desfazer',
    revisaoEsperada: 1,
    operacaoId: 'desfazer',
  })
  expect((await servico.abrirCenario(ana, c.id)).documento).toEqual(c.documento)
  expect((await repo.conjunto(conjunto.id))!.revisaoPublicadaDoCenario).toBe(1)
  await expect(servico.apagarCenario(ana, c.id)).rejects.toBeInstanceOf(CenarioInvalidoError)
  await repo.apagarConjunto(conjunto.id, AGORA)
  expect(await repo.cenario(c.id)).toBeNull()
  expect(await repo.mundo(fonte.mundoId)).toBeNull()
})

describe('quem entra', () => {
  test('desligado fecha para todo mundo; equipe abre só para a equipe', async () => {
    await expect(montar('desligado').servico.espacos(ana)).rejects.toBeInstanceOf(
      CenariosFechadosError,
    )
    const { servico } = montar('equipe')
    expect(await servico.espacos(ana)).toHaveLength(2)
    await expect(servico.espacos(cliente)).rejects.toBeInstanceOf(CenariosFechadosError)
  })
  test('lista abre para as contas listadas e aberto para todas, sem o espaço da equipe', async () => {
    expect((await montar('lista', [OUTRA]).servico.espacos(cliente)).map((e) => e.tipo)).toEqual([
      'conta',
    ])
    await expect(montar('lista').servico.espacos(cliente)).rejects.toBeInstanceOf(
      CenariosFechadosError,
    )
    expect(await montar('aberto').servico.espacos(cliente)).toHaveLength(1)
  })
  test('fora da equipe, lista e aberto exigem também o Molda de quem pede', async () => {
    const pedidos: Ator[] = []
    const semMolda = async (ator: Ator) => {
      pedidos.push(ator)
      return false
    }
    await expect(montar('aberto', [], semMolda).servico.espacos(cliente)).rejects.toBeInstanceOf(
      CenariosFechadosError,
    )
    await expect(
      montar('lista', [OUTRA], semMolda).servico.espacos(cliente),
    ).rejects.toBeInstanceOf(CenariosFechadosError)
    expect(pedidos).toEqual([cliente, cliente])
    // Sem a conferência ligada, a ferramenta fica só para a equipe.
    const semConferencia = new CenariosService(new CenariosEmMemoria(), () => AGORA, {
      modo: 'aberto',
      lista: new Set(),
    })
    await expect(semConferencia.espacos(cliente)).rejects.toBeInstanceOf(CenariosFechadosError)
    expect(await semConferencia.aberto(cliente)).toBe(false)
    // A equipe na própria conta nem pergunta; em suporte, vale o Molda da conta olhada.
    expect(await montar('aberto', [], semMolda).servico.espacos(ana)).toHaveLength(2)
    expect(pedidos).toHaveLength(2)
    const suporte: Ator = { ...ana, contaId: OUTRA, usuarioId: OUTRA, suporte: true }
    expect(await montar('aberto', [], semMolda).servico.aberto(suporte)).toBe(false)
    expect(pedidos.at(-1)).toEqual(suporte)
  })
  test('a equipe em sessão de suporte não entra como equipe nem vê o espaço da equipe', async () => {
    const suporte: Ator = { ...ana, contaId: OUTRA, usuarioId: OUTRA, suporte: true }
    await expect(montar('equipe').servico.espacos(suporte)).rejects.toBeInstanceOf(
      CenariosFechadosError,
    )
    expect((await montar('aberto').servico.espacos(suporte)).map((e) => e.tipo)).toEqual(['conta'])
  })
  test('o que é de outro espaço responde "não existe", nunca "proibido"', async () => {
    const base = await comBiblioteca(ana, 'aberto')
    await expect(base.servico.bibliotecas(cliente, base.espaco.id)).rejects.toBeInstanceOf(
      CenarioNaoEncontradoError,
    )
    await expect(
      base.servico.editarBiblioteca(cliente, base.biblioteca.id, { nome: 'Minha' }),
    ).rejects.toBeInstanceOf(CenarioNaoEncontradoError)
    const [, equipe] = await base.servico.espacos(ana)
    await expect(base.servico.mundos(cliente, equipe!.id)).rejects.toBeInstanceOf(
      CenarioNaoEncontradoError,
    )
  })
})

describe('trazer modelos', () => {
  test('descrição e capa editáveis só usam o retrato de um modelo do mesmo espaço', async () => {
    const base = await comBiblioteca(ana, 'aberto')
    const [m] = await trazerArvore(base)
    expect(
      await base.servico.editarBiblioteca(ana, base.biblioteca.id, {
        descricao: '  Vila  ',
        capaModelo: m!.id,
      }),
    ).toMatchObject({ descricao: 'Vila', capaModelo: m!.id, capa: digest('b') })
    const [outroEspaco] = await base.servico.espacos(cliente)
    const outra = await base.servico.criarBiblioteca(cliente, outroEspaco!.id, {
      nome: 'Outra',
      licenca: 'propria',
    })
    const [estrangeiro] = await trazerArvore(
      { ...base, espaco: outroEspaco!, biblioteca: outra },
      cliente,
    )
    await expect(
      base.servico.editarBiblioteca(ana, base.biblioteca.id, { capaModelo: estrangeiro!.id }),
    ).rejects.toBeInstanceOf(CenarioNaoEncontradoError)
    expect(
      (await base.servico.editarBiblioteca(ana, base.biblioteca.id, { capaModelo: null }))
        .capaModelo,
    ).toBeNull()
  })
  test('reserva diz o que subir, com a chave do espaço e o tipo exato', async () => {
    const base = await comBiblioteca()
    const reserva = await base.servico.reservarModelos(ana, base.biblioteca.id, [
      { digest: digest('a'), bytes: 1000, miniatura: { digest: digest('b'), bytes: 50 } },
    ])
    expect(reserva.enviar).toEqual([
      {
        digest: digest('a'),
        tipo: 'modelo',
        bytes: 1000,
        chave: chaveDoBlob(base.espaco.id, digest('a')),
        tipoDoConteudo: 'model/gltf-binary',
      },
      {
        digest: digest('b'),
        tipo: 'miniatura',
        bytes: 50,
        chave: chaveDoBlob(base.espaco.id, digest('b')),
        tipoDoConteudo: 'image/webp',
      },
    ])
  })
  test('modelo só entra depois de o arquivo ser conferido no bucket', async () => {
    const base = await comBiblioteca()
    await base.servico.reservarModelos(ana, base.biblioteca.id, [
      { digest: digest('a'), bytes: 1000 },
    ])
    const semArquivo = base.servico.registrarModelos(ana, base.biblioteca.id, [arvore], [])
    await expect(semArquivo).rejects.toBeInstanceOf(CenarioArquivoAusenteError)
    const [criado] = await base.servico.registrarModelos(
      ana,
      base.biblioteca.id,
      [arvore],
      [{ digest: digest('a'), bytes: 1000, tipoDoConteudo: 'model/gltf-binary' }],
    )
    // O retrato não chegou: o modelo entra sem ele.
    expect(criado).toMatchObject({ nome: 'Árvore', bytes: 1000, miniatura: null })
    expect((await base.servico.bibliotecas(ana, base.espaco.id))[0]!.modelos).toBe(1)
  })
  test('o mesmo conteúdo não sobe de novo nem repete na biblioteca', async () => {
    const base = await comBiblioteca()
    await trazerArvore(base)
    const reserva = await base.servico.reservarModelos(ana, base.biblioteca.id, [
      { digest: digest('a'), bytes: 1000 },
    ])
    expect(reserva.enviar).toEqual([])
    expect(await base.servico.registrarModelos(ana, base.biblioteca.id, [arvore], [])).toEqual([])
    expect((await base.servico.espacos(ana))[0]!.usadoBytes).toBe(1050)
  })
  test('reserva acima da cota é recusada inteira', async () => {
    const base = await comBiblioteca()
    const servico = new CenariosService(base.repo, () => AGORA, {
      modo: 'equipe',
      lista: new Set(),
      cotaDaContaBytes: 1500,
    })
    await expect(
      servico.reservarModelos(ana, base.biblioteca.id, [
        { digest: digest('a'), bytes: 1000 },
        { digest: digest('c'), bytes: 1000 },
      ]),
    ).rejects.toBeInstanceOf(CenariosSemEspacoError)
    expect((await base.servico.espacos(ana))[0]!.usadoBytes).toBe(0)
  })
  test('busca sem acento, por nome, pasta e etiqueta, com páginas', async () => {
    const base = await comBiblioteca()
    await trazerArvore(base)
    const achar = async (busca: string) =>
      (await base.servico.modelos(ana, base.biblioteca.id, { busca })).itens.map((m) => m.nome)
    expect(await achar('arvore')).toEqual(['Árvore'])
    expect(await achar('NATUREZA verde')).toEqual(['Árvore'])
    expect(await achar('pedra')).toEqual([])
    const pagina = await base.servico.modelos(ana, base.biblioteca.id, { limite: 1 })
    expect(pagina).toMatchObject({ total: 1, proximo: null })
  })
  test('apagar devolve só os arquivos que ninguém mais usa', async () => {
    const base = await comBiblioteca()
    const [modelo] = await trazerArvore(base)
    const mundo = await base.servico.criarMundo(ana, base.espaco.id, 'Ilha')
    const cenario = await base.servico.criarCenario(ana, mundo.id, 'Praia')
    await base.servico.editarCenario(ana, cenario.id, {
      revisaoEsperada: 0,
      operacaoId: 'op-1',
      comandos: [
        {
          tipo: 'modelo.definir',
          modelo: {
            id: 'arvore',
            biblioteca: base.biblioteca.id,
            modelo: modelo!.id,
            digest: digest('a'),
          },
        },
      ],
    })
    // O cenário ainda usa o arquivo do modelo: só o retrato fica sem dono.
    expect(await base.servico.apagarModelos(ana, base.biblioteca.id, [modelo!.id])).toEqual({
      apagar: [chaveDoBlob(base.espaco.id, digest('b'))],
    })
    expect((await base.servico.espacos(ana))[0]!.usadoBytes).toBe(1000)
  })
})

describe('faixas do posto', () => {
  const zona = (id: string): ComandoDeCenario => ({
    tipo: 'marcador.definir',
    marcador: {
      id,
      nome: 'Chegada',
      grupo: null,
      bloqueado: false,
      oculto: false,
      posicao: { x: 0, y: 0, z: 0 },
      giro: 0,
      noChao: true,
      objeto: null,
      configuracao: { tipo: 'zona', forma: { tipo: 'esfera', raio: 2 } },
    },
  })
  const inicio: ComandoDeCenario = {
    tipo: 'marcador.definir',
    marcador: {
      id: 'inicio',
      nome: 'Início',
      grupo: null,
      bloqueado: false,
      oculto: false,
      posicao: { x: 1, y: 0, z: 1 },
      giro: 0,
      noChao: true,
      objeto: null,
      configuracao: { tipo: 'inicio', principal: true },
    },
  }

  test('no básico o lote não cria zona; desfazer, refazer e voltar versão seguem livres', async () => {
    let faixas: string[] = ['basic', 'intermediate']
    const { servico } = montar(
      'aberto',
      [],
      async () => true,
      async () => faixas,
    )
    const [espaco] = await servico.espacos(cliente)
    const mundo = await servico.criarMundo(cliente, espaco!.id, 'Ilha')
    const c = await servico.criarCenario(cliente, mundo.id, 'Praia')
    // Com o intermediário, a zona entra (revisão 1); depois, só o básico.
    await servico.editarCenario(cliente, c.id, {
      revisaoEsperada: 0,
      operacaoId: 'zona-0001',
      comandos: [zona('z1')],
    })
    faixas = ['basic']
    const recusa = await servico
      .editarCenario(cliente, c.id, {
        revisaoEsperada: 1,
        operacaoId: 'zona-0002',
        comandos: [zona('z2')],
      })
      .catch((e) => e)
    expect(recusa).toBeInstanceOf(CenarioFerramentaTrancadaError)
    expect(recusa.familias.map((f: { id: string }) => f.id)).toEqual(['jogo.zonas-e-rotas'])
    // O básico mexe no resto do cenário que já tem a zona.
    expect(
      await servico.editarCenario(cliente, c.id, {
        revisaoEsperada: 1,
        operacaoId: 'inicio-001',
        comandos: [inicio],
      }),
    ).toEqual({ revisao: 2 })
    // Desfazer e refazer repõem o que já foi aceito.
    await servico.moverHistorico(cliente, c.id, {
      acao: 'desfazer',
      revisaoEsperada: 2,
      operacaoId: 'desfazer-01',
    })
    await servico.moverHistorico(cliente, c.id, {
      acao: 'desfazer',
      revisaoEsperada: 3,
      operacaoId: 'desfazer-02',
    })
    expect((await servico.abrirCenario(cliente, c.id)).documento.marcadores).toEqual([])
    await servico.moverHistorico(cliente, c.id, {
      acao: 'refazer',
      revisaoEsperada: 4,
      operacaoId: 'refazer-001',
    })
    expect(
      (await servico.abrirCenario(cliente, c.id)).documento.marcadores.map((m) => m.id),
    ).toEqual(['z1'])
    // Voltar a uma versão do histórico também.
    await servico.restaurarRevisao(cliente, c.id, {
      revisao: 0,
      revisaoEsperada: 5,
      operacaoId: 'restaurar-1',
    })
    await servico.restaurarRevisao(cliente, c.id, {
      revisao: 2,
      revisaoEsperada: 6,
      operacaoId: 'restaurar-2',
    })
    expect(
      (await servico.abrirCenario(cliente, c.id)).documento.marcadores.map((m) => m.id).sort(),
    ).toEqual(['inicio', 'z1'])
  })

  test('a equipe tem todas as faixas; sem a conferência, só o básico; conjuntos são do intermediário', async () => {
    const { servico } = montar(
      'aberto',
      [],
      async () => true,
      async () => ['basic'],
    )
    expect(await servico.faixasDe(ana)).toEqual(['basic', 'intermediate', 'professional'])
    expect(await servico.faixasDe(cliente)).toEqual(['basic'])
    const sem = new CenariosService(new CenariosEmMemoria(), () => AGORA, {
      modo: 'aberto',
      lista: new Set(),
      produto: async () => true,
    })
    expect(await sem.faixasDe(cliente)).toEqual(['basic'])
    const [espaco] = await servico.espacos(cliente)
    const biblioteca = await servico.criarBiblioteca(cliente, espaco!.id, {
      nome: 'Kits',
      licenca: 'propria',
    })
    const recusa = await servico.conjuntos
      .criar(cliente, biblioteca.id, { nome: 'Casa', conteudo: {}, operacaoId: 'conjunto-01' })
      .catch((e) => e)
    expect(recusa).toBeInstanceOf(CenarioFerramentaTrancadaError)
  })
})

describe('cota da conta', () => {
  test('a cota configurada vale para o espaço novo e para o que já existia com outra', async () => {
    const repo = new CenariosEmMemoria()
    const antigo = await repo.espacoDaConta(OUTRA, LIMITES_DOS_CENARIOS.bytesDaConta)
    expect(antigo.limiteBytes).toBe(2 * 1024 ** 3)
    const servico = new CenariosService(repo, () => AGORA, {
      modo: 'aberto',
      lista: new Set(),
      produto: async () => true,
      cotaDaContaBytes: 5 * 1024 ** 3,
    })
    const biblioteca = await servico.criarBiblioteca(cliente, antigo.id, {
      nome: 'Pedras',
      licenca: 'propria',
    })
    expect(biblioteca.espacoId).toBe(antigo.id)
    expect((await repo.espaco(antigo.id))!.limiteBytes).toBe(5 * 1024 ** 3)
    const [novo] = await servico.espacos({ ...cliente, contaId: CONTA, usuarioId: CONTA })
    expect(novo!.limiteBytes).toBe(5 * 1024 ** 3)
    // A equipe não muda com a cota da conta.
    const [, equipe] = await servico.espacos(ana)
    expect(equipe!.limiteBytes).toBe(LIMITES_DOS_CENARIOS.bytesDaEquipe)
  })
})

describe('mundos de cada criança no Kids', () => {
  const PERFIL_A = '44444444-4444-4444-8444-444444444444'
  const PERFIL_B = '55555555-5555-4555-8555-555555555555'
  const irmaA: Ator = {
    usuarioId: PERFIL_A,
    contaId: OUTRA,
    equipe: false,
    suporte: false,
    perfil: true,
  }
  const irmaoB: Ator = { ...irmaA, usuarioId: PERFIL_B }
  const responsavel: Ator = { ...cliente, perfil: false }

  test('cada perfil vê e abre só os mundos que criou; as bibliotecas seguem da família', async () => {
    const { servico } = montar('aberto')
    const [espaco] = await servico.espacos(irmaA)
    const dela = await servico.criarMundo(irmaA, espaco!.id, 'Ilha da Ana')
    const cenario = await servico.criarCenario(irmaA, dela.id, 'Praia')
    const dele = await servico.criarMundo(irmaoB, espaco!.id, 'Vulcão do Beto')
    const biblioteca = await servico.criarBiblioteca(irmaA, espaco!.id, {
      nome: 'Árvores',
      licenca: 'propria',
    })

    expect((await servico.mundos(irmaA, espaco!.id)).map((m) => m.nome)).toEqual(['Ilha da Ana'])
    expect((await servico.mundos(irmaoB, espaco!.id)).map((m) => m.nome)).toEqual([
      'Vulcão do Beto',
    ])
    for (const pedir of [
      () => servico.abrirMundo(irmaoB, dela.id),
      () => servico.cenarios(irmaoB, dela.id),
      () => servico.abrirCenario(irmaoB, cenario.id),
      () => servico.criarCenario(irmaoB, dela.id, 'Invasão'),
      () => servico.apagarMundo(irmaoB, dela.id),
    ])
      await expect(pedir()).rejects.toBeInstanceOf(CenarioNaoEncontradoError)
    expect((await servico.abrirMundo(irmaoB, dele.id)).nome).toBe('Vulcão do Beto')
    expect((await servico.bibliotecas(irmaoB, espaco!.id)).map((b) => b.id)).toContain(
      biblioteca.id,
    )
    // Fora de uma sessão de perfil, a conta vê todos.
    expect((await servico.mundos(responsavel, espaco!.id)).map((m) => m.nome).sort()).toEqual([
      'Ilha da Ana',
      'Vulcão do Beto',
    ])
  })

  test('os rascunhos de conjunto seguem a biblioteca da família, e o espaço da equipe não filtra', () => {
    const mundo = {
      id: 'm',
      espacoId: 'e',
      nome: 'Rascunhos',
      cenarios: 0,
      bibliotecas: [],
      capa: null,
      criadoPor: PERFIL_A,
      atualizadoEm: AGORA,
    }
    const conta = { tipo: 'conta' } as Espaco
    expect(podeNoMundo(mundo, conta, irmaoB)).toBe(false)
    expect(podeNoMundo({ ...mundo, bibliotecaConjuntosId: 'b' }, conta, irmaoB)).toBe(true)
    expect(podeNoMundo(mundo, { tipo: 'equipe' } as Espaco, irmaoB)).toBe(true)
  })
})

describe('mundos e cenários', () => {
  async function comCenario() {
    const base = await comBiblioteca()
    const [modelo] = await trazerArvore(base)
    const mundo = await base.servico.criarMundo(ana, base.espaco.id, 'Ilha do Farol')
    const cenario = await base.servico.criarCenario(ana, mundo.id, 'Vila da praia')
    const definir: ComandoDeCenario = {
      tipo: 'modelo.definir',
      modelo: {
        id: 'arvore',
        biblioteca: base.biblioteca.id,
        modelo: modelo!.id,
        digest: digest('a'),
      },
    }
    return { ...base, mundo, cenario, definir }
  }

  test('exportação usa revisão salva, ignora acervo ocioso e recebe licença/papel reais', async () => {
    const base = await comCenario()
    const vazio = await base.servico.exportacao.preparar(ana, base.cenario.id, 0)
    expect(vazio.contexto.bibliotecas).toEqual([])
    await base.servico.editarCenario(ana, base.cenario.id, {
      revisaoEsperada: 0,
      operacaoId: 'preparar-exportacao',
      comandos: [base.definir, { tipo: 'instancia.criar', instancia: objeto('a', 'arvore') }],
    })
    const antes = await base.servico.abrirCenario(ana, base.cenario.id),
      p = await base.servico.exportacao.preparar(ana, base.cenario.id, 1)
    expect(p.espacoId).toBe(base.espaco.id)
    expect(p.fonte).toEqual({ cenario: base.cenario.id, revisao: 1 })
    expect(p.documento).toEqual(antes.documento)
    expect(p.digest).toBe(await digestDoDocumentoDeCenario(antes.documento))
    expect(p.contexto).toEqual({
      equipe: true,
      bibliotecas: [{ id: base.biblioteca.id, nome: 'Aventura', licenca: 'propria' }],
    })
    expect(await base.servico.abrirCenario(ana, base.cenario.id)).toEqual(antes)
    await expect(base.servico.exportacao.preparar(ana, base.cenario.id, 0)).rejects.toBeInstanceOf(
      CenarioDesatualizadoError,
    )
    await expect(
      base.servico.exportacao.preparar(ana, base.cenario.id, NaN),
    ).rejects.toBeInstanceOf(CenarioInvalidoError)
  })

  test('exportação não herda privilégio da conta nem de sessão de suporte e não abre outro espaço', async () => {
    const base = await comCenario()
    await base.servico.editarCenario(ana, base.cenario.id, {
      revisaoEsperada: 0,
      operacaoId: 'preparar-exportacao',
      comandos: [base.definir, { tipo: 'instancia.criar', instancia: objeto('a', 'arvore') }],
    })
    for (const ator of [
      { ...ana, equipe: false },
      { ...ana, suporte: true },
    ])
      await expect(base.servico.exportacao.preparar(ator, base.cenario.id, 1)).rejects.toThrow()
    await expect(
      base.servico.exportacao.preparar({ ...ana, contaId: OUTRA }, base.cenario.id, 1),
    ).rejects.toBeInstanceOf(CenarioNaoEncontradoError)
    // Abre a ferramenta para a conta, sem promover a pessoa a membro da equipe.
    const comum = await comBiblioteca(ana, 'aberto')
    // Biblioteca restrita numa conta só existe em dado antigo (hoje o serviço recusa criar).
    await comum.repo.editarBiblioteca(comum.biblioteca.id, { licenca: 'restrita' }, AGORA)
    const [modelo] = await trazerArvore(comum),
      mundo = await comum.servico.criarMundo(ana, comum.espaco.id, 'Mundo'),
      c = await comum.servico.criarCenario(ana, mundo.id, 'Cena')
    await comum.servico.editarCenario(ana, c.id, {
      revisaoEsperada: 0,
      operacaoId: 'guardar-modelo',
      comandos: [
        {
          tipo: 'modelo.definir',
          modelo: {
            id: 'm',
            biblioteca: comum.biblioteca.id,
            modelo: modelo!.id,
            digest: digest('a'),
          },
        },
        { tipo: 'instancia.criar', instancia: objeto('a', 'm') },
      ],
    })
    for (const ator of [
      { ...ana, equipe: false },
      { ...ana, suporte: true },
    ])
      await expect(comum.servico.exportacao.preparar(ator, c.id, 1)).rejects.toBeInstanceOf(
        BibliotecaRestritaError,
      )
  })

  test('exportação recusa arquivo ausente/papel incorreto e edição concorrente durante o preparo', async () => {
    const base = await comCenario()
    await base.servico.editarCenario(ana, base.cenario.id, {
      revisaoEsperada: 0,
      operacaoId: 'preparar-exportacao',
      comandos: [base.definir, { tipo: 'instancia.criar', instancia: objeto('a', 'arvore') }],
    })
    const lerBlobs = base.repo.blobsConfirmados.bind(base.repo)
    base.repo.blobsConfirmados = async () => new Map()
    await expect(base.servico.exportacao.preparar(ana, base.cenario.id, 1)).rejects.toBeInstanceOf(
      CenarioArquivoAusenteError,
    )
    base.repo.blobsConfirmados = async () =>
      new Map([[digest('a'), { tipo: 'textura', bytes: 1000, tipoDoConteudo: 'image/png' }]])
    await expect(base.servico.exportacao.preparar(ana, base.cenario.id, 1)).rejects.toBeInstanceOf(
      CenarioArquivoAusenteError,
    )
    base.repo.blobsConfirmados = lerBlobs
    const listar = base.repo.bibliotecas.bind(base.repo)
    base.repo.bibliotecas = async () => []
    await expect(base.servico.exportacao.preparar(ana, base.cenario.id, 1)).rejects.toBeInstanceOf(
      CenarioNaoEncontradoError,
    )
    base.repo.bibliotecas = async (id) => {
      const lista = await listar(id)
      await base.servico.editarCenario(ana, base.cenario.id, {
        revisaoEsperada: 1,
        operacaoId: 'edicao-concorrente',
        comandos: [{ tipo: 'cenario.renomear', nome: 'Novo nome' }],
      })
      return lista
    }
    await expect(base.servico.exportacao.preparar(ana, base.cenario.id, 1)).rejects.toBeInstanceOf(
      CenarioDesatualizadoError,
    )
  })

  test('um mundo só usa bibliotecas do próprio espaço', async () => {
    const base = await comCenario()
    const [, equipe] = await base.servico.espacos(ana)
    const daEquipe = await base.servico.criarBiblioteca(ana, equipe!.id, {
      nome: 'Acervo',
      licenca: 'restrita',
    })
    const editado = await base.servico.editarMundo(ana, base.mundo.id, {
      bibliotecas: [base.biblioteca.id, daEquipe.id, 'inexistente'],
    })
    expect(editado.bibliotecas).toEqual([base.biblioteca.id])
  })
  test('abrir mundo por identidade conserva a autorização do espaço', async () => {
    const base = await comCenario()
    expect((await base.servico.abrirMundo(ana, base.mundo.id)).id).toBe(base.mundo.id)
    await expect(
      base.servico.abrirMundo({ ...ana, usuarioId: OUTRA, contaId: OUTRA }, base.mundo.id),
    ).rejects.toBeInstanceOf(CenarioNaoEncontradoError)
  })
  test('o lote aplica tudo, sobe a revisão e o nome do cenário segue o documento', async () => {
    const base = await comCenario()
    const resposta = await base.servico.editarCenario(ana, base.cenario.id, {
      revisaoEsperada: 0,
      operacaoId: 'op-1',
      comandos: [
        base.definir,
        { tipo: 'instancia.criar', instancia: objeto('a', 'arvore') },
        { tipo: 'cenario.renomear', nome: 'Praia do farol' },
      ],
    })
    expect(resposta).toEqual({ revisao: 1 })
    const aberto = await base.servico.abrirCenario(ana, base.cenario.id)
    expect(aberto).toMatchObject({ revisao: 1, nome: 'Praia do farol', espacoId: base.espaco.id })
    expect(aberto.documento.instancias).toHaveLength(1)
    expect((await base.servico.mundos(ana, base.espaco.id))[0]!.cenarios).toBe(1)
  })
  test('a mesma operação mandada duas vezes vale uma só', async () => {
    const base = await comCenario()
    const lote = { revisaoEsperada: 0, operacaoId: 'op-1', comandos: [base.definir] }
    expect(await base.servico.editarCenario(ana, base.cenario.id, lote)).toEqual({ revisao: 1 })
    expect(await base.servico.editarCenario(ana, base.cenario.id, lote)).toEqual({ revisao: 1 })
  })
  test('revisão atrasada é recusada e diz qual é a atual', async () => {
    const base = await comCenario()
    await base.servico.editarCenario(ana, base.cenario.id, {
      revisaoEsperada: 0,
      operacaoId: 'op-1',
      comandos: [base.definir],
    })
    const atrasado = base.servico.editarCenario(ana, base.cenario.id, {
      revisaoEsperada: 0,
      operacaoId: 'op-2',
      comandos: [{ tipo: 'cenario.renomear', nome: 'Outro' }],
    })
    await expect(atrasado).rejects.toMatchObject({ revisaoAtual: 1 })
    await expect(atrasado).rejects.toBeInstanceOf(CenarioDesatualizadoError)
  })
  test('lote inválido não grava nada e diz o problema', async () => {
    const base = await comCenario()
    const invalido = base.servico.editarCenario(ana, base.cenario.id, {
      revisaoEsperada: 0,
      operacaoId: 'op-1',
      comandos: [base.definir, { tipo: 'instancia.criar', instancia: objeto('a', 'pedra') }],
    })
    await expect(invalido).rejects.toBeInstanceOf(CenarioInvalidoError)
    await expect(invalido).rejects.toMatchObject({
      problemas: ['Modelo fora da tabela do cenário: a'],
    })
    expect((await base.servico.abrirCenario(ana, base.cenario.id)).revisao).toBe(0)
  })
  test('modelo cujo arquivo não está guardado neste espaço não entra no cenário', async () => {
    const base = await comCenario()
    const deFora = base.servico.editarCenario(ana, base.cenario.id, {
      revisaoEsperada: 0,
      operacaoId: 'op-1',
      comandos: [
        {
          tipo: 'modelo.definir',
          modelo: { id: 'fora', biblioteca: 'b', modelo: 'm', digest: digest('f') },
        },
      ],
    })
    await expect(deFora).rejects.toMatchObject({ problemas: ['Modelo ausente: fora'] })
  })
  test('copiar um cenário leva o conteúdo com nome e identidade novos', async () => {
    const base = await comCenario()
    await base.servico.editarCenario(ana, base.cenario.id, {
      revisaoEsperada: 0,
      operacaoId: 'op-1',
      comandos: [base.definir, { tipo: 'instancia.criar', instancia: objeto('a', 'arvore') }],
    })
    const copia = await base.servico.duplicarCenario(ana, base.cenario.id)
    expect(copia).toMatchObject({ nome: 'Vila da praia (cópia)', revisao: 0 })
    const aberta = await base.servico.abrirCenario(ana, copia.id)
    expect(aberta.documento.id).toBe(copia.id)
    expect(aberta.documento.instancias).toHaveLength(1)
  })
  test('a capa só vale depois de o retrato ser conferido', async () => {
    const base = await comCenario()
    const reserva = await base.servico.reservarCapa(ana, base.cenario.id, {
      revisao: 0,
      digest: digest('c'),
      bytes: 900,
    })
    expect(reserva.enviar[0]).toMatchObject({ tipo: 'capa', tipoDoConteudo: 'image/webp' })
    await expect(
      base.servico.definirCapa(ana, base.cenario.id, 0, digest('c'), null),
    ).rejects.toBeInstanceOf(CenarioArquivoAusenteError)
    await base.servico.definirCapa(ana, base.cenario.id, 0, digest('c'), {
      digest: digest('c'),
      bytes: 900,
      tipoDoConteudo: 'image/webp',
    })
    expect((await base.servico.cenarios(ana, base.mundo.id))[0]!.capa).toBe(digest('c'))
    expect((await base.servico.mundos(ana, base.espaco.id))[0]!.capa).toBe(digest('c'))
  })
  test('apagar o mundo leva os cenários dele', async () => {
    const base = await comCenario()
    await base.servico.apagarMundo(ana, base.mundo.id)
    await expect(base.servico.abrirCenario(ana, base.cenario.id)).rejects.toBeInstanceOf(
      CenarioNaoEncontradoError,
    )
  })
})

test('equipe num perfil de criança usa a ferramenta, mas sem o espaço da equipe nem o acervo', async () => {
  const { servico } = montar('equipe')
  const [, equipe] = await servico.espacos(ana)
  expect(equipe?.tipo).toBe('equipe')
  // O mesmo papel numa sessão de perfil (o filho de alguém da equipe, no Kids).
  const noPerfil: Ator = { ...ana, usuarioId: OUTRA, perfil: true }
  const espacos = await servico.espacos(noPerfil)
  expect(espacos.map((e) => e.tipo)).toEqual(['conta'])
  await expect(servico.bibliotecas(noPerfil, equipe!.id)).rejects.toBeInstanceOf(
    CenarioNaoEncontradoError,
  )
  // Pedido antigo sem o campo: perfil é quando o usuário não é a própria conta.
  const antigo: Ator = { usuarioId: OUTRA, contaId: CONTA, equipe: true, suporte: false }
  expect((await servico.espacos(antigo)).map((e) => e.tipo)).toEqual(['conta'])
})
