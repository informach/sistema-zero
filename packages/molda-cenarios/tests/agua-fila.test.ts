import { expect, test } from 'bun:test'
import {
  abrirEdicaoDeTerreno,
  type BaseDeTerreno,
  prepararOperacaoDeAgua,
} from '@sistemazero/molda-cenarios-core/v2'
import { guardarAgua } from '../src/oficina/agua-autoria'
import { criarControlador } from '../src/oficina/controlador'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'
import { gravarEstadoDoTerreno } from '../src/oficina/terreno-autoria'

async function preparar() {
  const host = criarHostEmMemoria(),
    mundo = await host.criarMundo('conta', 'Água'),
    cenario = await host.criarCenario(mundo.id, 'Rio')
  let op = 0
  const controlador = criarControlador(
      host,
      await host.abrirCenario(cenario.id),
      () => `agua-op-${++op}`,
    ),
    base: BaseDeTerreno = {
      tipo: 'terreno',
      cobertura: 'grade',
      origem: { x: 0, z: 0 },
      colunas: 64,
      linhas: 64,
      passo: 1,
      min: -20,
      max: 40,
      fundo: 10,
      pecas: [],
    }
  controlador.executar([{ tipo: 'base.definir', base }])
  await controlador.terminar()
  const documentoDeOrigem = controlador.getState().documento,
    estado = abrirEdicaoDeTerreno(base, new Map()),
    finais: boolean[] = [],
    descartados: string[][] = []
  const palco = {
    async prepararRecursosDoTerreno() {},
    descartarRecursosDoTerreno(digests: readonly string[]) {
      descartados.push([...digests])
    },
    finalizarEscultura(cancelar = false) {
      finais.push(cancelar)
    },
  }
  return { host, cenario, controlador, base, documentoDeOrigem, estado, palco, finais, descartados }
}

test('aplicação da água encerra sua prévia uma vez e conserva o histórico da escultura', async () => {
  const q = await preparar(),
    finais: boolean[] = []
  const operacao = prepararOperacaoDeAgua(
    { id: 'rio', nome: 'Rio' },
    {
      tipo: 'rio',
      pontos: [
        { x: 8, z: 32 },
        { x: 56, z: 32 },
      ],
      largura: 4,
      profundidade: 2,
    },
    q.estado,
  )
  const palco = { ...q.palco, finalizarPreviaDeAgua: (cancelar = true) => finais.push(cancelar) }
  expect(await guardarAgua({ ...q, palco, operacao })).toEqual({ alterado: true, guardado: true })
  expect(finais).toEqual([false])
  expect(q.finais).toEqual([])
  expect(q.controlador.getState().documento.aguas[0]?.id).toBe('rio')
  await q.controlador.desfazer()
  expect(q.controlador.getState().documento.aguas).toEqual([])
  expect(q.controlador.getState().documento.base).toEqual(q.base)
})

test('água inalterada não cria revisão e cancela a prévia', async () => {
  const q = await preparar(),
    finais: boolean[] = [],
    operacao = prepararOperacaoDeAgua({ id: 'mar', nome: 'Mar' }, { tipo: 'mar', nivel: 12 }, null),
    palco = { ...q.palco, finalizarPreviaDeAgua: (cancelar = true) => finais.push(cancelar) }
  await guardarAgua({ ...q, palco, operacao })
  const doc = q.controlador.getState().documento,
    revisao = (await q.host.abrirCenario(q.cenario.id)).revisao
  expect(await guardarAgua({ ...q, palco, operacao, documentoDeOrigem: doc })).toEqual({
    alterado: false,
    guardado: true,
  })
  expect((await q.host.abrirCenario(q.cenario.id)).revisao).toBe(revisao)
  expect(finais).toEqual([false, true])
})

test('resposta de água atrasada restaura prévia sem substituir a cabeça atual', async () => {
  const q = await preparar(),
    finais: boolean[] = [],
    operacao = prepararOperacaoDeAgua({ id: 'mar', nome: 'Mar' }, { tipo: 'mar', nivel: 12 }, null),
    palco = { ...q.palco, finalizarPreviaDeAgua: (cancelar = true) => finais.push(cancelar) }
  q.controlador.executar([{ tipo: 'cenario.renomear', nome: 'Outra cabeça' }])
  const atual = q.controlador.getState().documento
  await expect(guardarAgua({ ...q, palco, operacao })).rejects.toThrow('O cenário mudou')
  expect(q.controlador.getState().documento).toBe(atual)
  expect(q.controlador.getState().documento.aguas).toEqual([])
  expect(finais).toEqual([true])
})

test('intenção de água sem alterar alturas não é descartada como terreno sem mudança', async () => {
  const q = await preparar(),
    agua = prepararOperacaoDeAgua({ id: 'mar', nome: 'Mar' }, { tipo: 'mar', nivel: 12 }, null).agua
  const r = await gravarEstadoDoTerreno({
    ...q,
    regioes: {},
    antes: [{ tipo: 'agua.definir', agua }],
  })
  expect(r).toEqual({ alterado: true, guardado: true })
  const salvo = await q.host.abrirCenario(q.cenario.id)
  expect(salvo.revisao).toBe(2)
  expect(salvo.documento.aguas).toEqual([agua])
  expect(salvo.documento.base).toEqual(q.base)
  expect(q.finais).toEqual([false])
  await q.controlador.desfazer()
  expect(q.controlador.getState().documento.aguas).toEqual([])
  expect(q.controlador.getState().documento.base).toEqual(q.base)
})

test('escavar rio grava água e peças no mesmo passo, com undo/redo durável após reabrir', async () => {
  const q = await preparar(),
    r = prepararOperacaoDeAgua(
      { id: 'rio', nome: 'Rio' },
      {
        tipo: 'rio',
        pontos: [
          { x: 8, z: 32 },
          { x: 56, z: 32 },
        ],
        largura: 4,
        profundidade: 2,
      },
      q.estado,
    )
  if (!r.terreno) throw Error('A escavação precisa retornar terreno')
  await gravarEstadoDoTerreno({
    ...q,
    estado: r.terreno,
    regioes: r.regioes,
    antes: [{ tipo: 'agua.definir', agua: r.agua }],
  })
  const salvo = await q.host.abrirCenario(q.cenario.id)
  expect(salvo.revisao).toBe(2)
  expect(salvo.documento.aguas).toEqual([r.agua])
  if (salvo.documento.base.tipo !== 'terreno') throw Error('Terreno esperado')
  expect(salvo.documento.base.pecas).toHaveLength(1)
  const reaberto = criarControlador(q.host, salvo)
  await reaberto.desfazer()
  expect(reaberto.getState().documento.base).toEqual(q.base)
  expect(reaberto.getState().documento.aguas).toEqual([])
  await reaberto.refazer()
  expect(reaberto.getState().documento).toEqual(salvo.documento)
  expect(q.estado.campo.alturas.every((h) => h === 10)).toBe(true)
})

test('sem alteração e sem comandos não cria revisão nem ocupa espaço', async () => {
  const q = await preparar(),
    r = await gravarEstadoDoTerreno({ ...q, regioes: {} })
  expect(r).toEqual({ alterado: false, guardado: true })
  expect(q.controlador.getState().revisao).toBe(1)
  expect((await q.host.espacos())[0]!.usadoBytes).toBe(0)
})

test('falha de envio e resposta perdida conservam o lote inteiro e repetem a mesma operação sem duplicar recursos', async () => {
  const q = await preparar(),
    operacoes: string[] = []
  let uploads = 0,
    perder = true
  const controlador = criarControlador(
      {
        ...q.host,
        async guardarRecursos(...args) {
          if (++uploads === 1) throw Error('Sem conexão')
          return q.host.guardarRecursos(...args)
        },
        async editarCenario(...args) {
          operacoes.push(args[3])
          const r = await q.host.editarCenario(...args)
          if (perder) {
            perder = false
            throw Error('Resposta perdida')
          }
          return r
        },
      },
      await q.host.abrirCenario(q.cenario.id),
      () => 'agua-tentativa-0001',
    ),
    documentoDeOrigem = controlador.getState().documento,
    r = prepararOperacaoDeAgua(
      { id: 'rio', nome: 'Rio' },
      {
        tipo: 'rio',
        pontos: [
          { x: 8, z: 32 },
          { x: 56, z: 32 },
        ],
        largura: 4,
        profundidade: 2,
      },
      q.estado,
    )
  if (!r.terreno) throw Error('Escavação esperada')
  const resultado = await gravarEstadoDoTerreno({
    ...q,
    controlador,
    documentoDeOrigem,
    estado: r.terreno,
    regioes: r.regioes,
    antes: [{ tipo: 'agua.definir', agua: r.agua }],
  })
  expect(resultado).toEqual({ alterado: true, guardado: false })
  expect(controlador.getState().documento.aguas).toEqual([r.agua])
  expect((await q.host.abrirCenario(q.cenario.id)).documento.aguas).toEqual([])
  controlador.tentarDeNovo()
  await controlador.terminar()
  expect(controlador.getState().salvamento).toBe('erro')
  expect((await q.host.abrirCenario(q.cenario.id)).documento.aguas).toEqual([r.agua])
  controlador.tentarDeNovo()
  await controlador.terminar()
  expect(controlador.getState().salvamento).toBe('guardado')
  expect(operacoes).toEqual(['agua-tentativa-0001', 'agua-tentativa-0001'])
  expect((await q.host.abrirCenario(q.cenario.id)).revisao).toBe(2)
  expect((await q.host.espacos())[0]!.usadoBytes).toBe(8474)
  expect(q.finais).toEqual([false])
})

test('cabeça nova durante o preparo impede água e relevo atrasados de substituir a edição atual', async () => {
  const q = await preparar(),
    r = prepararOperacaoDeAgua(
      { id: 'rio', nome: 'Rio' },
      {
        tipo: 'rio',
        pontos: [
          { x: 8, z: 32 },
          { x: 56, z: 32 },
        ],
        largura: 4,
        profundidade: 2,
      },
      q.estado,
    )
  if (!r.terreno) throw Error('Escavação esperada')
  let entrou!: () => void, liberar!: () => void
  const iniciou = new Promise<void>((resolve) => {
      entrou = resolve
    }),
    pausa = new Promise<void>((resolve) => {
      liberar = resolve
    }),
    gravando = gravarEstadoDoTerreno({
      ...q,
      palco: {
        ...q.palco,
        async prepararRecursosDoTerreno() {
          entrou()
          await pausa
        },
      },
      estado: r.terreno,
      regioes: r.regioes,
      antes: [{ tipo: 'agua.definir', agua: r.agua }],
    }).catch((e: unknown) => e)
  await iniciou
  q.controlador.executar([{ tipo: 'cenario.renomear', nome: 'Outra edição' }])
  liberar()
  const erro = await gravando
  expect(erro).toBeInstanceOf(DOMException)
  if (!(erro instanceof DOMException)) throw Error('Cancelamento esperado')
  expect(erro.name).toBe('AbortError')
  await q.controlador.terminar()
  const salvo = await q.host.abrirCenario(q.cenario.id)
  expect(salvo.documento.nome).toBe('Outra edição')
  expect(q.descartados).toHaveLength(1)
  expect(q.descartados[0]).toHaveLength(1)
  expect(salvo.documento.aguas).toEqual([])
  expect(salvo.documento.base).toEqual(q.base)
  expect(q.finais).toEqual([true])
})
