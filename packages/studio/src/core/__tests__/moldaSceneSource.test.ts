import { expect, spyOn, test } from 'bun:test'
import { digestDoDocumentoDeCenario } from '@sistemazero/molda-cenarios-core/compilar'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { conferirConteudoCompilado } from '@sistemazero/molda-cenarios-motor/conteudo'
import { criarHostEmMemoria } from '../../../../molda-cenarios/src/oficina/host-memoria'
import { CenarioDesatualizado } from '../../../../molda-cenarios/src/oficina/portas'
import {
  listarCenariosParaStudio,
  prepararCenarioParaStudio,
} from '../../../../molda-cenarios/src/studio-library'
import { exemplo, glb } from '../../../../molda-cenarios-motor/tests/fixtures/glb-compilacao'

test('galeria de cenários mantém jogo, espaço, revisão e ordem sem gravar no host', async () => {
  const host = criarHostEmMemoria({ equipe: true }),
    a = await host.criarMundo('conta', 'Meu jogo'),
    b = await host.criarMundo('equipe', 'Arquipélago'),
    primeiro = await host.criarCenario(a.id, 'Praça'),
    segundo = await host.criarCenario(b.id, 'Faísca'),
    antes = JSON.stringify([
      await host.abrirCenario(primeiro.id),
      await host.abrirCenario(segundo.id),
    ]),
    lista = await listarCenariosParaStudio(host, new AbortController().signal)
  expect(lista).toHaveLength(2)
  expect(lista.find((c) => c.id === segundo.id)).toMatchObject({
    nome: 'Faísca',
    revisao: 0,
    jogo: { id: b.id, nome: 'Arquipélago' },
    espaco: { id: 'equipe', tipo: 'equipe' },
  })
  expect(
    JSON.stringify([await host.abrirCenario(primeiro.id), await host.abrirCenario(segundo.id)]),
  ).toBe(antes)
})

test('ponte compila bytes reais e conserva licença, hierarquia/propriedades e fonte autorizada', async () => {
  const host = criarHostEmMemoria({ equipe: true }),
    biblioteca = await host.criarBiblioteca('equipe', { nome: 'Aventura', licenca: 'restrita' }),
    m = exemplo(),
    bytes = glb(m.j, m.bin),
    digest = await digestDosBytes(bytes),
    [modelo] = await host.importarModelos(biblioteca.id, [
      {
        nome: 'Marco',
        pasta: '',
        etiquetas: [],
        conteudo: bytes,
        digest,
        miniatura: new Blob(),
        min: [0, 0, 0],
        max: [1, 1, 1],
        triangulos: 2,
      },
    ]),
    jogo = await host.criarMundo('equipe', 'Faísca'),
    c = await host.criarCenario(jogo.id, 'Praça')
  await host.editarCenario(
    c.id,
    0,
    [
      {
        tipo: 'modelo.definir',
        modelo: { id: 'm', biblioteca: biblioteca.id, modelo: modelo!.id, digest },
      },
      {
        tipo: 'instancia.criar',
        instancia: {
          id: 'ator',
          nome: 'Íris',
          modelo: 'm',
          grupo: null,
          oculto: false,
          bloqueado: false,
          apoio: { tipo: 'absoluto' },
          colisao: 'caixa',
          propriedades: { ator: 'iris' },
          transformacao: {
            posicao: { x: 3, y: 0, z: 2 },
            rotacao: { x: 0, y: 0.2, z: 0 },
            escala: { x: 1, y: 1, z: 1 },
          },
        },
      },
    ],
    'criar-marco',
  )
  const antes = await host.abrirCenario(c.id),
    progresso: string[] = [],
    r = await prepararCenarioParaStudio(host, c.id, 1, {
      sinal: new AbortController().signal,
      progresso: (p) => progresso.push(p.etapa),
    })
  expect(r.pacote.cena.fonte).toEqual({
    cenario: c.id,
    revisao: 1,
    digest: await digestDoDocumentoDeCenario(antes.documento),
  })
  expect(r.pacote.cena.licencas).toEqual([
    { id: biblioteca.id, nome: 'Aventura', licenca: 'restrita' },
  ])
  expect(r.pacote.cena.entidades.find((e) => e.id === 'ator')?.propriedades).toEqual({
    ator: 'iris',
  })
  expect(r.pacote.cena.nos.some((n) => n.entidade === 'ator' && n.preservarHierarquia)).toBe(true)
  await conferirConteudoCompilado(r.pacote.cena, r.pacote.arquivos)
  expect(progresso.length).toBeGreaterThan(0)
  expect(await host.abrirCenario(c.id)).toEqual(antes)
})

test('cancelamento no meio da galeria e revisão inexistente recusam sem cena parcial', async () => {
  const host = criarHostEmMemoria(),
    jogo = await host.criarMundo('conta', 'Meu jogo'),
    c = await host.criarCenario(jogo.id, 'Praça'),
    controller = new AbortController(),
    listar = host.listarCenarios.bind(host),
    consulta = spyOn(host, 'listarCenarios').mockImplementation(async (...args) => {
      const resultado = await listar(...args)
      controller.abort()
      return resultado
    })
  try {
    await expect(listarCenariosParaStudio(host, controller.signal)).rejects.toHaveProperty(
      'name',
      'AbortError',
    )
  } finally {
    consulta.mockRestore()
  }
  await expect(
    prepararCenarioParaStudio(host, c.id, 1, { sinal: new AbortController().signal }),
  ).rejects.toBeInstanceOf(CenarioDesatualizado)
})

test('acesso/revisão são conferidos novamente depois da compilação antes de entregar os bytes', async () => {
  for (const problema of [new CenarioDesatualizado(1), Error('Acesso revogado')]) {
    const host = criarHostEmMemoria(),
      jogo = await host.criarMundo('conta', 'Meu jogo'),
      c = await host.criarCenario(jogo.id, 'Praça'),
      preparar = host.prepararExportacao.bind(host)
    let chamadas = 0
    const conferir = spyOn(host, 'prepararExportacao').mockImplementation(async (...args) => {
      if (++chamadas === 2) throw problema
      return preparar(...args)
    })
    try {
      await expect(
        prepararCenarioParaStudio(host, c.id, 0, { sinal: new AbortController().signal }),
      ).rejects.toBe(problema)
      expect(chamadas).toBe(2)
    } finally {
      conferir.mockRestore()
    }
  }
})
