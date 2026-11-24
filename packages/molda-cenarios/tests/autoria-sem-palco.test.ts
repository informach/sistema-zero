import { expect, test } from 'bun:test'
import { alturaDoCampo } from '@sistemazero/molda-cenarios-core/v2'
import {
  abrirParaEditar,
  baseInicialDeTerreno,
  gravarSemPalco,
  prepararGravacaoDoTerreno,
  prepararReceita,
} from '../src/oficina/autoria'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'

/** Um planalto a 12 m, pelas mesmas peças e o mesmo lote da oficina, sem palco nem tela. */
async function cenarioComPlanalto() {
  const host = criarHostEmMemoria({ equipe: true }),
    mundo = await host.criarMundo('conta', 'Ilha'),
    c = await host.criarCenario(mundo.id, 'Praia')
  const aberto = await abrirParaEditar(host, c.id)
  expect(aberto.terreno).toBeNull()
  const base = baseInicialDeTerreno(aberto.documento.base)
  const edicao = prepararReceita(base, null, { tipo: 'plano', altura: 12 })
  const preparo = await prepararGravacaoDoTerreno({ documentoDeOrigem: aberto.documento, edicao })
  return { host, c, aberto, preparo }
}

test('a edição do relevo vira peças novas e um base.definir, gravados como um lote só', async () => {
  const { host, c, aberto, preparo } = await cenarioComPlanalto()
  expect(preparo.comandos.map((x) => x.tipo)).toEqual(['base.definir'])
  expect(preparo.arquivos.length).toBeGreaterThan(0)
  const r = await gravarSemPalco(host, {
    cenarioId: c.id,
    revisaoEsperada: aberto.revisao,
    ...preparo,
  })
  expect(r).toEqual({ revisao: aberto.revisao + 1, alterado: true })
  // Reaberto do zero, como outra aba: o relevo vem das peças guardadas.
  const depois = await abrirParaEditar(host, c.id)
  expect(depois.revisao).toBe(r.revisao)
  expect(depois.historico.desfazer).toBe(1)
  expect(alturaDoCampo(depois.terreno!.estado.campo, 0, 0)).toBeCloseTo(12, 1)
  expect(alturaDoCampo(depois.terreno!.estado.campo, 20, -15)).toBeCloseTo(12, 1)
  // A fonte de alturas diz o mesmo e que ali há chão.
  expect(depois.terreno!.fonte(0, 0)).toBeCloseTo(12, 1)
  expect(depois.terreno!.fonte.temChao!({ x: 0, z: 0 })).toBe(true)
})

test('sem mudança nada é enviado; desfazer volta ao cenário vazio num passo', async () => {
  const { host, c, aberto, preparo } = await cenarioComPlanalto()
  await gravarSemPalco(host, { cenarioId: c.id, revisaoEsperada: aberto.revisao, ...preparo })
  const depois = await abrirParaEditar(host, c.id)
  const base = depois.documento.base
  if (base.tipo !== 'terreno') throw Error('O lote devia ter guardado um relevo.')
  // A mesma edição de novo: as peças já estão no documento, nada a gravar.
  const repetida = await prepararGravacaoDoTerreno({
    documentoDeOrigem: depois.documento,
    edicao: {
      base,
      estado: depois.terreno!.estado,
      regioes: { alturas: { x0: 0, z0: 0, x1: 1, z1: 1 } },
    },
  })
  expect(repetida).toEqual({ comandos: [], arquivos: [] })
  expect(
    await gravarSemPalco(host, { cenarioId: c.id, revisaoEsperada: depois.revisao, ...repetida }),
  ).toEqual({ revisao: depois.revisao, alterado: false })
  const voltou = await host.moverHistorico(c.id, depois.revisao, 'desfazer', crypto.randomUUID())
  expect(voltou.documento.base.tipo).toBe(aberto.documento.base.tipo)
})

test('a mesma operação repetida depois de uma resposta perdida não aplica duas vezes', async () => {
  const { host, c, aberto, preparo } = await cenarioComPlanalto()
  const operacaoId = crypto.randomUUID()
  const a = await gravarSemPalco(host, {
    cenarioId: c.id,
    revisaoEsperada: aberto.revisao,
    operacaoId,
    ...preparo,
  })
  const b = await gravarSemPalco(host, {
    cenarioId: c.id,
    revisaoEsperada: aberto.revisao,
    operacaoId,
    ...preparo,
  })
  expect(b.revisao).toBe(a.revisao)
  expect((await host.abrirCenario(c.id)).historico.desfazer).toBe(1)
})
