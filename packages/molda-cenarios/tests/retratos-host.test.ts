import { expect, test } from 'bun:test'
import { capturarConteudoDeConjunto } from '@sistemazero/molda-cenarios-core/v2'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'

const imagem = (letra: number) =>
  new Blob([new Uint8Array([letra, letra, letra, letra])], { type: 'image/webp' })
async function base(atrasoMs = 0) {
  const host = criarHostEmMemoria({ equipe: true, atrasoMs }),
    mundo = await host.criarMundo('conta', 'Fotos'),
    c = await host.criarCenario(mundo.id, 'Praça')
  return { host, mundo, c }
}
test('retratos locais são fixados por revisão; imagem atrasada e repetida não mudam a capa atual', async () => {
  const { host, c } = await base(),
    a = imagem(1),
    b = imagem(2)
  const zero = await host.guardarCapa(c.id, 0, a)
  expect((await host.listarRevisoes(c.id)).retratoInicial).toBe(zero)
  await host.editarCenario(
    c.id,
    0,
    [{ tipo: 'cenario.renomear', nome: 'Praça viva' }],
    'foto-mudar-nome',
  )
  const um = await host.guardarCapa(c.id, 1, b)
  expect(um).not.toBe(zero)
  expect(await host.guardarCapa(c.id, 0, b)).toBe(zero)
  expect((await host.abrirCenario(c.id)).resumo.capa).toBe(um)
  expect((await host.listarRevisoes(c.id)).itens[0]!.miniatura).toBe(um)
  expect((await host.listarRevisoes(c.id)).retratoInicial).toBe(zero)
  await host.moverHistorico(c.id, 1, 'desfazer', 'foto-desfazer')
  expect((await host.listarRevisoes(c.id)).itens.find((r) => r.revisao === 1)!.miniatura).toBe(um)
})
test('fotos compartilham o mesmo recurso por espaço e a última referência libera sua cota', async () => {
  const { host, mundo, c } = await base(),
    a = imagem(1)
  const outra = await host.criarCenario(mundo.id, 'Horta'),
    equipe = await host.criarMundo('equipe', 'Equipe'),
    daEquipe = await host.criarCenario(equipe.id, 'Teste')
  const antes = (await host.espacos())[0]!.usadoBytes
  const url = await host.guardarCapa(c.id, 0, a)
  expect(await host.guardarCapa(outra.id, 0, a)).toBe(url)
  expect(await host.guardarCapa(daEquipe.id, 0, a)).not.toBe(url)
  expect((await host.espacos())[0]!.usadoBytes).toBe(antes + a.size)
  await host.apagarCenario(c.id)
  expect((await host.espacos())[0]!.usadoBytes).toBe(antes + a.size)
  await host.apagarMundo(mundo.id)
  expect((await host.espacos())[0]!.usadoBytes).toBe(antes)
  expect((await host.espacos())[1]!.usadoBytes).toBe(a.size)
})
test('cancelamento e revisão inválida não alocam imagens nem alteram a autoria', async () => {
  const { host, c } = await base(10),
    antes = await host.abrirCenario(c.id),
    sinal = new AbortController()
  const tarefa = host.guardarCapa(c.id, 0, imagem(1), sinal.signal)
  sinal.abort()
  expect((await tarefa.catch((e) => e)).name).toBe('AbortError')
  await expect(host.guardarCapa(c.id, 2, imagem(2))).rejects.toThrow('Revisão')
  expect(await host.abrirCenario(c.id)).toEqual(antes)
  expect((await host.espacos())[0]!.usadoBytes).toBe(0)
})
test('miniatura de conjunto e retrato do cenário compartilham a imagem sem duplicar a cota', async () => {
  const { host, c } = await base(),
    a = imagem(7),
    biblioteca = await host.criarBiblioteca('conta', { nome: 'Peças', licenca: 'propria' })
  const doc = (await host.abrirCenario(c.id)).documento
  doc.formas = [{ id: 'f', nome: 'Base', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 }]
  doc.instancias = [
    {
      id: 'base',
      nome: 'Base',
      modelo: 'f',
      grupo: null,
      oculto: false,
      bloqueado: false,
      colisao: 'caixa',
      apoio: { tipo: 'absoluto' },
      transformacao: {
        posicao: { x: 0, y: 0, z: 0 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    },
  ]
  const conjunto = await host.criarConjunto(biblioteca.id, {
    nome: 'Base',
    conteudo: capturarConteudoDeConjunto(doc, ['base'], 'conta'),
    operacaoId: 'foto-conjunto-01',
  })
  const antes = (await host.espacos())[0]!.usadoBytes
  await host.guardarMiniaturaDoConjunto(conjunto.id, 1, a)
  expect(await host.guardarCapa(c.id, 0, a)).toBe(
    (await host.obterConjunto(conjunto.id)).miniatura!,
  )
  expect((await host.espacos())[0]!.usadoBytes).toBe(antes + a.size)
  await host.apagarCenario(c.id)
  expect((await host.espacos())[0]!.usadoBytes).toBe(antes + a.size)
  await host.apagarConjunto(conjunto.id)
  expect((await host.espacos())[0]!.usadoBytes).toBe(0)
})
