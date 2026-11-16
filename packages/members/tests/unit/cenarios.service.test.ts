import { describe, expect, test } from 'bun:test'
import type { ComandoDeCenario, InstanciaDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import {
  CenariosService,
  type ModeloParaRegistrar,
} from '../../src/application/cenarios/cenarios.service'
import {
  type AberturaDosCenarios,
  type Ator,
  chaveDoBlob,
  type ModoDosCenarios,
} from '../../src/domain/cenarios/cenarios'
import {
  CenarioArquivoAusenteError,
  CenarioDesatualizadoError,
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

function montar(modo: ModoDosCenarios = 'equipe', lista: string[] = []) {
  const repo = new CenariosEmMemoria()
  const abertura: AberturaDosCenarios = { modo, lista: new Set(lista) }
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
async function comBiblioteca(ator: Ator = ana, modo: ModoDosCenarios = 'equipe') {
  const base = montar(modo)
  const [espaco] = await base.servico.espacos(ator)
  const biblioteca = await base.servico.criarBiblioteca(ator, espaco!.id, {
    nome: 'Aventura',
    licenca: 'restrita',
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
    [digest('a'), digest('b')],
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
      [digest('a')],
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
    base.repo.espacosGuardados.get(base.espaco.id)!.limiteBytes = 1500
    await expect(
      base.servico.reservarModelos(ana, base.biblioteca.id, [
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
      digest: digest('c'),
      bytes: 900,
    })
    expect(reserva.enviar[0]).toMatchObject({ tipo: 'capa', tipoDoConteudo: 'image/webp' })
    await expect(
      base.servico.definirCapa(ana, base.cenario.id, digest('c'), false),
    ).rejects.toBeInstanceOf(CenarioArquivoAusenteError)
    await base.servico.definirCapa(ana, base.cenario.id, digest('c'), true)
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
