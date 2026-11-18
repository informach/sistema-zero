import { expect, test } from 'bun:test'
import {
  abrirEdicaoDeTerreno,
  type BaseDeTerreno,
  prepararOperacaoDeCaminho,
} from '@sistemazero/molda-cenarios-core/v2'
import { guardarCaminho } from '../src/oficina/caminho-autoria'
import { processarCaminho } from '../src/oficina/caminho-processamento'
import { criarControlador } from '../src/oficina/controlador'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'

const intencao = (tipo = 'estrada') => ({
  id: 'c',
  nome: 'Passeio',
  tipo,
  grupo: null,
  oculto: false,
  bloqueado: false,
  acabamento: null,
  largura: 2.5,
  pontos: [
    { x: 8, z: 32 },
    { x: 56, z: 32 },
  ],
  ...(tipo === 'estrada' ? { molde: { deslocamento: -0.25, borda: 2, suavizacao: 4 } } : {}),
})
async function preparar() {
  const host = criarHostEmMemoria(),
    mundo = await host.criarMundo('conta', 'Caminhos'),
    cenario = await host.criarCenario(mundo.id, 'Circulação'),
    controlador = criarControlador(host, await host.abrirCenario(cenario.id)),
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
  return {
    host,
    cenario,
    controlador,
    base,
    documentoDeOrigem,
    estado,
    finais,
    descartados,
    palco: {
      async prepararRecursosDoTerreno() {},
      finalizarEscultura() {
        throw Error('A estrada não encerra a escultura')
      },
      finalizarPreviaDeCaminho(cancelar = true) {
        finais.push(cancelar)
      },
      descartarRecursosDoTerreno(ids: readonly string[]) {
        descartados.push([...ids])
      },
    },
  }
}

test('estrada e relevo entram em uma revisão e undo/redo duram depois de reabrir', async () => {
  const q = await preparar(),
    operacao = processarCaminho({ intencao: intencao(), estado: q.estado })
  expect(await guardarCaminho({ ...q, operacao })).toEqual({ alterado: true, guardado: true })
  const salvo = await q.host.abrirCenario(q.cenario.id)
  expect(salvo.revisao).toBe(2)
  expect(salvo.documento.caminhos).toEqual([operacao.caminho])
  if (salvo.documento.base.tipo !== 'terreno') throw Error('Terreno esperado')
  expect(salvo.documento.base.pecas).toHaveLength(1)
  expect(q.finais).toEqual([false])
  expect(q.estado.campo.alturas.every((h) => h === 10)).toBe(true)
  const reaberto = criarControlador(q.host, salvo)
  await reaberto.desfazer()
  expect(reaberto.getState().documento.caminhos).toEqual([])
  expect(reaberto.getState().documento.base).toEqual(q.base)
  await reaberto.refazer()
  expect(reaberto.getState().documento).toEqual(salvo.documento)
})

test('sem mudança não cria revisão e editar acabamento não repete a moldagem', async () => {
  const q = await preparar(),
    operacao = prepararOperacaoDeCaminho(intencao(), q.estado)
  await guardarCaminho({ ...q, operacao })
  const documentoDeOrigem = q.controlador.getState().documento,
    semMolde = processarCaminho({ intencao: operacao.caminho, estado: null, moldarTerreno: false })
  expect(semMolde.terreno).toBeUndefined()
  expect(await guardarCaminho({ ...q, documentoDeOrigem, operacao: semMolde })).toEqual({
    alterado: false,
    guardado: true,
  })
  expect((await q.host.abrirCenario(q.cenario.id)).revisao).toBe(2)
  expect(q.finais).toEqual([false, true])
})

test('falha de upload e resposta perdida retomam estrada e campo sem duplicar revisão', async () => {
  const q = await preparar(),
    operacao = processarCaminho({ intencao: intencao(), estado: q.estado }),
    ids: string[] = []
  let envios = 0,
    perder = true
  const controlador = criarControlador(
    {
      ...q.host,
      async guardarRecursos(...args) {
        if (++envios === 1) throw Error('Sem conexão')
        return q.host.guardarRecursos(...args)
      },
      async editarCenario(...args) {
        ids.push(args[3])
        const r = await q.host.editarCenario(...args)
        if (perder) {
          perder = false
          throw Error('Resposta perdida')
        }
        return r
      },
    },
    await q.host.abrirCenario(q.cenario.id),
  )
  const documentoDeOrigem = controlador.getState().documento
  expect(await guardarCaminho({ ...q, controlador, documentoDeOrigem, operacao })).toEqual({
    alterado: true,
    guardado: false,
  })
  expect(controlador.getState().documento.caminhos).toEqual([operacao.caminho])
  expect((await q.host.abrirCenario(q.cenario.id)).revisao).toBe(1)
  controlador.tentarDeNovo()
  await controlador.terminar()
  expect(controlador.getState().salvamento).toBe('erro')
  controlador.tentarDeNovo()
  await controlador.terminar()
  expect(controlador.getState().salvamento).toBe('guardado')
  expect(ids.length).toBe(2)
  expect(new Set(ids).size).toBe(1)
  const salvo = await q.host.abrirCenario(q.cenario.id)
  expect(salvo.revisao).toBe(2)
  expect(salvo.documento.caminhos).toHaveLength(1)
})

test('cancelamento e cabeça nova durante preparo não substituem o documento atual', async () => {
  for (const acao of ['cancelar', 'mudar']) {
    const q = await preparar(),
      operacao = processarCaminho({ intencao: intencao(), estado: q.estado }),
      abortador = new AbortController()
    const palco = {
      ...q.palco,
      async prepararRecursosDoTerreno() {
        if (acao === 'cancelar') abortador.abort()
        else q.controlador.executar([{ tipo: 'cenario.renomear', nome: 'Outra cabeça' }])
      },
    }
    await expect(
      guardarCaminho({ ...q, palco, operacao, sinal: abortador.signal }),
    ).rejects.toThrow()
    expect(q.controlador.getState().documento.caminhos).toEqual([])
    expect(q.controlador.getState().documento.base).toEqual(q.base)
    expect(q.finais).toEqual([true])
    expect(q.descartados[0]!.length).toBeGreaterThan(0)
  }
})
