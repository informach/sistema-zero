import { expect, test } from 'bun:test'
import {
  type BaseDeTerreno,
  codificarPecaDeAlturas,
  digestDosBytes,
} from '@sistemazero/molda-cenarios-core/v2'
import { criarControlador } from '../src/oficina/controlador'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'

async function preparar() {
  const host = criarHostEmMemoria({ equipe: true }),
    mundo = await host.criarMundo('conta', 'Mundo'),
    cenario = await host.criarCenario(mundo.id, 'Terreno'),
    aberto = await host.abrirCenario(cenario.id),
    conteudo = codificarPecaDeAlturas(new Float64Array(65 * 65).fill(3), 0, 255),
    digest = await digestDosBytes(conteudo)
  const base: BaseDeTerreno = {
    tipo: 'terreno',
    origem: { x: 0, z: 0 },
    passo: 1,
    colunas: 64,
    linhas: 64,
    min: 0,
    max: 255,
    fundo: 0,
    pecas: [{ coluna: 0, linha: 0, digest }],
  }
  return {
    host,
    cenario,
    aberto,
    arquivo: { digest, conteudo },
    comandos: [{ tipo: 'base.definir' as const, base }],
  }
}

test('fila envia recursos antes de confirmar a base e conserva uma revisão de undo após reabrir', async () => {
  const q = await preparar(),
    eventos: string[] = []
  let liberar!: () => void
  const pausa = new Promise<void>((r) => {
    liberar = r
  })
  const controlador = criarControlador(
    {
      ...q.host,
      guardarRecursos: async (...args) => {
        eventos.push('upload')
        await pausa
        return q.host.guardarRecursos(...args)
      },
      editarCenario: async (...args) => {
        eventos.push('editar')
        return q.host.editarCenario(...args)
      },
    },
    q.aberto,
    () => 'terreno-gesto-0001',
  )
  expect(controlador.executar(q.comandos, [q.arquivo])).toBe(true)
  expect(controlador.getState().revisao).toBe(1)
  expect((await q.host.abrirCenario(q.cenario.id)).revisao).toBe(0)
  expect(eventos).toEqual(['upload'])
  q.arquivo.conteudo[0] = 0 // A fila é dona dos bytes capturados, não do buffer mutável do pincel.
  liberar()
  await controlador.terminar()
  expect(eventos).toEqual(['upload', 'editar'])
  expect(controlador.getState().salvamento).toBe('guardado')
  const reaberto = criarControlador(q.host, await q.host.abrirCenario(q.cenario.id))
  await reaberto.desfazer()
  expect(reaberto.getState().documento.base.tipo).toBe('plano')
  await reaberto.refazer()
  expect(reaberto.getState().documento.base).toEqual(q.comandos[0]!.base)
})

test('falha de upload e resposta perdida retomam o mesmo gesto, sem duplicar cota ou revisão', async () => {
  const q = await preparar(),
    operacoes: string[] = []
  let uploads = 0,
    perderResposta = true
  const controlador = criarControlador(
    {
      ...q.host,
      guardarRecursos: async (...args) => {
        if (++uploads === 1) throw new Error('Envio interrompido')
        return q.host.guardarRecursos(...args)
      },
      editarCenario: async (...args) => {
        operacoes.push(args[3])
        const r = await q.host.editarCenario(...args)
        if (perderResposta) {
          perderResposta = false
          throw new Error('Resposta perdida')
        }
        return r
      },
    },
    q.aberto,
    () => 'terreno-gesto-0002',
  )
  controlador.executar(q.comandos, [q.arquivo])
  await controlador.terminar()
  expect(controlador.getState().salvamento).toBe('erro')
  expect((await q.host.abrirCenario(q.cenario.id)).revisao).toBe(0)
  controlador.tentarDeNovo()
  await controlador.terminar()
  expect(controlador.getState().salvamento).toBe('erro')
  expect((await q.host.abrirCenario(q.cenario.id)).revisao).toBe(1)
  controlador.tentarDeNovo()
  await controlador.terminar()
  expect(controlador.getState().salvamento).toBe('guardado')
  expect((await q.host.abrirCenario(q.cenario.id)).revisao).toBe(1)
  expect(operacoes).toEqual(['terreno-gesto-0002', 'terreno-gesto-0002'])
  expect(uploads).toBe(3)
  expect((await q.host.espacos())[0]!.usadoBytes).toBe(8474)
})
