import { expect, test } from 'bun:test'
import {
  apoioNaAgua,
  capturarFragmento,
  criarDocumentoVazio,
  prepararOperacaoDeAgua,
  transformacaoResolvida,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  alvosDaTransferencia,
  comandosParaRecortarEscolha,
} from '../src/oficina/area-de-transferencia'
import { criarControlador } from '../src/oficina/controlador'
import { criarHostHttp } from '../src/oficina/host-http'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'

function origem() {
  const d = criarDocumentoVazio('origem', 'Origem')
  d.formas = [{ id: 'f', nome: 'Caixa', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 }]
  d.instancias = [
    {
      id: 'a',
      nome: 'Caixa',
      grupo: null,
      bloqueado: false,
      oculto: false,
      modelo: 'f',
      colisao: 'caixa',
      apoio: { tipo: 'absoluto' },
      transformacao: {
        posicao: { x: 1, y: 0, z: 1 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    },
  ]
  return d
}

test('recortar água mantém o objeto apoiado fora da escolha; undo restaura água e vínculo', async () => {
  const host = criarHostEmMemoria(),
    mundo = await host.criarMundo('conta', 'Mundo'),
    cenario = await host.criarCenario(mundo.id, 'Água'),
    doc = { ...origem(), id: cenario.id }
  doc.aguas = [
    prepararOperacaoDeAgua({ id: 'mar', nome: 'Mar' }, { tipo: 'mar', nivel: 1 }, null).agua,
  ]
  const objeto = doc.instancias[0]!
  objeto.transformacao.posicao.y = 1.5
  objeto.apoio = apoioNaAgua(doc, 'mar', objeto.transformacao)
  await host.editarCenario(
    cenario.id,
    0,
    [{ tipo: 'cenario.restaurar', documento: doc }],
    'fixture',
  )
  const ctl = criarControlador(host, await host.abrirCenario(cenario.id))
  ctl.selecionar([], 'mar')
  const alvos = alvosDaTransferencia(ctl.getState()),
    f = capturarFragmento(doc, alvos, 'conta'),
    pose = transformacaoResolvida(doc, objeto)
  expect(alvos).toEqual(['mar'])
  expect(ctl.executar(comandosParaRecortarEscolha(doc, f, alvos))).toBe(true)
  await ctl.terminar()
  const removido = (await host.abrirCenario(cenario.id)).documento
  expect(removido.aguas).toEqual([])
  expect(transformacaoResolvida(removido, removido.instancias[0]!)).toEqual(pose)
  expect(removido.instancias[0]!.apoio.tipo).toBe('absoluto')
  const reaberto = criarControlador(host, await host.abrirCenario(cenario.id))
  await reaberto.desfazer()
  expect(reaberto.getState().documento).toEqual(doc)
})

test('recortar pasta grande com água não gasta comandos liberando objetos que também serão removidos', async () => {
  const host = criarHostEmMemoria(),
    mundo = await host.criarMundo('conta', 'Mundo'),
    cenario = await host.criarCenario(mundo.id, 'Porto'),
    doc = { ...origem(), id: cenario.id }
  doc.grupos = [{ id: 'g', nome: 'Porto', grupo: null, bloqueado: false, oculto: false }]
  doc.aguas = [
    {
      ...prepararOperacaoDeAgua({ id: 'mar', nome: 'Mar' }, { tipo: 'mar', nivel: 1 }, null).agua,
      grupo: 'g',
    },
  ]
  const original = doc.instancias[0]!
  doc.instancias = Array.from({ length: 600 }, (_, i) => ({
    ...structuredClone(original),
    id: `o${i}`,
    grupo: 'g',
    apoio: apoioNaAgua(doc, 'mar', original.transformacao),
  }))
  await host.editarCenario(
    cenario.id,
    0,
    [{ tipo: 'cenario.restaurar', documento: doc }],
    'fixture',
  )
  const ctl = criarControlador(host, await host.abrirCenario(cenario.id)),
    f = capturarFragmento(doc, ['g'], 'conta')
  expect(ctl.executar(comandosParaRecortarEscolha(doc, f, ['g']))).toBe(true)
  await ctl.terminar()
  expect(ctl.getState().documento.instancias).toEqual([])
  expect(ctl.getState().documento.aguas).toEqual([])
  await ctl.desfazer()
  expect(ctl.getState().documento).toEqual(doc)
})

test('fila de autoria grava colagem em um passo e conserva undo/redo após reabrir', async () => {
  const host = criarHostEmMemoria({ equipe: true }),
    mundo = await host.criarMundo('conta', 'Mundo'),
    a = await host.criarCenario(mundo.id, 'A'),
    b = await host.criarCenario(mundo.id, 'B')
  const doc = { ...origem(), id: a.id }
  await host.editarCenario(
    a.id,
    0,
    [{ tipo: 'cenario.restaurar', documento: doc }],
    crypto.randomUUID(),
  )
  const fragmento = capturarFragmento(doc, ['a'], 'conta'),
    ctl = criarControlador(host, await host.abrirCenario(b.id))
  expect(
    ctl.executar([
      { tipo: 'fragmento.colar', fragmento, prefixo: 'p', ponto: { x: 3, y: 0, z: 3 } },
    ]),
  ).toBe(true)
  await ctl.terminar()
  expect((await host.abrirCenario(a.id)).documento).toEqual(doc)
  expect((await host.abrirCenario(b.id)).historico.desfazer).toBe(1)
  const reaberto = criarControlador(host, await host.abrirCenario(b.id))
  await reaberto.desfazer()
  expect(reaberto.getState().documento.instancias).toEqual([])
  await reaberto.refazer()
  expect(reaberto.getState().documento.instancias[0]!.id).toBe('p/objeto/0')
  const outro = await host.criarMundo('equipe', 'Equipe'),
    estrangeiro = await host.criarCenario(outro.id, 'Estrangeiro')
  await expect(
    host.editarCenario(
      estrangeiro.id,
      0,
      [{ tipo: 'fragmento.colar', fragmento, prefixo: 'q', ponto: fragmento.ancora }],
      crypto.randomUUID(),
    ),
  ).rejects.toThrow('outro espaço')
  expect((await host.abrirCenario(estrangeiro.id)).revisao).toBe(0)
})

test('recortar recusa vínculo de apoio externo ou bloqueado sem apagar parcialmente', async () => {
  const host = criarHostEmMemoria(),
    mundo = await host.criarMundo('conta', 'Mundo'),
    c = await host.criarCenario(mundo.id, 'C'),
    doc = { ...origem(), id: c.id }
  doc.instancias.push({
    ...doc.instancias[0]!,
    id: 'b',
    apoio: { tipo: 'objeto', objeto: 'a', deslocamento: 1 },
  })
  await host.editarCenario(
    c.id,
    0,
    [{ tipo: 'cenario.restaurar', documento: doc }],
    crypto.randomUUID(),
  )
  const ctl = criarControlador(host, await host.abrirCenario(c.id))
  expect(ctl.executar([{ tipo: 'elementos.remover', ids: ['a'] }])).toBe(false)
  expect(ctl.getState().documento).toEqual(doc)
  expect((await host.abrirCenario(c.id)).revisao).toBe(1)
})

test('referência copiada abre binários pelo espaço autorizado sem depender de biblioteca ainda existente no catálogo', async () => {
  const caminhos: string[] = [],
    envios: RequestInit[] = []
  const host = criarHostHttp({
    buscar: async (url) => {
      caminhos.push(url)
      return Response.json({ url: 'https://r2.example/arquivo' })
    },
    enviar: async (_url, init) => {
      envios.push(init ?? {})
      return new Response(new Uint8Array([1, 2, 3]))
    },
  })
  const ref = {
    biblioteca: 'biblioteca-apagada',
    espacoId: 'espaco-autorizado',
    digest: 'a'.repeat(64),
  }
  expect(new Uint8Array(await host.conteudoDoModelo(ref))).toEqual(new Uint8Array([1, 2, 3]))
  expect(new Uint8Array(await host.conteudoDaTextura(ref))).toEqual(new Uint8Array([1, 2, 3]))
  expect(caminhos).toEqual([
    `/api/cenarios/espacos/${ref.espacoId}/arquivos/${ref.digest}?tipo=modelo&como=endereco`,
    `/api/cenarios/espacos/${ref.espacoId}/arquivos/${ref.digest}?tipo=textura&como=endereco`,
  ])
  expect(envios.every((e) => e.headers === undefined)).toBe(true)
  expect(envios[1]!.credentials).toBe('omit')
})
