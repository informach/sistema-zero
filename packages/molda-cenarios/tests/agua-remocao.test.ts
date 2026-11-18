import { expect, test } from 'bun:test'
import {
  apoioNaAgua,
  criarDocumentoVazio,
  executarLote,
  inverterLote,
  prepararOperacaoDeAgua,
  transformacaoResolvida,
} from '@sistemazero/molda-cenarios-core/v2'
import { comandosParaRemoverAgua } from '../src/oficina/agua-remocao'

function exemplo() {
  const doc = criarDocumentoVazio('c', 'Água')
  doc.aguas = [
    prepararOperacaoDeAgua({ id: 'mar', nome: 'Mar' }, { tipo: 'mar', nivel: -1 }, null).agua,
  ]
  doc.modelos = [{ id: 'barco', modelo: 'barco', biblioteca: 'b', digest: 'a'.repeat(64) }]
  const t = {
    posicao: { x: 2, y: 0, z: 4 },
    rotacao: { x: 0.1, y: 0.7, z: 0.2 },
    escala: { x: 1, y: 2, z: 3 },
  }
  doc.instancias = [
    {
      id: 'barco',
      nome: 'Barco',
      modelo: 'barco',
      grupo: null,
      bloqueado: false,
      oculto: false,
      colisao: 'nenhuma',
      transformacao: t,
      apoio: apoioNaAgua(doc, 'mar', t),
    },
  ]
  return doc
}
test('remover água preserva objetos apoiados e undo restaura o vínculo completo', () => {
  const doc = exemplo(),
    pose = transformacaoResolvida(doc, doc.instancias[0]!),
    antes = structuredClone(doc),
    comandos = comandosParaRemoverAgua(doc, 'mar')
  const removido = executarLote(
    { documento: doc, revisao: 0 },
    { revisaoEsperada: 0, comandos },
  ).documento
  const inversos = inverterLote(doc, removido)
  expect(doc).toEqual(antes)
  expect(removido.aguas).toEqual([])
  expect(removido.instancias).toHaveLength(1)
  expect(removido.instancias[0]!.apoio.tipo).toBe('absoluto')
  expect(transformacaoResolvida(removido, removido.instancias[0]!)).toEqual(pose)
  expect(
    executarLote({ documento: removido, revisao: 1 }, { revisaoEsperada: 1, comandos: inversos })
      .documento,
  ).toEqual(antes)
})
test('remoção é recusada antes de mudar objetos trancados ou água ausente', () => {
  const doc = exemplo()
  doc.instancias[0]!.bloqueado = true
  expect(() => comandosParaRemoverAgua(doc, 'mar')).toThrow('Destranque')
  expect(() => comandosParaRemoverAgua(doc, 'ausente')).toThrow('não está mais')
  expect(doc.aguas).toHaveLength(1)
})
